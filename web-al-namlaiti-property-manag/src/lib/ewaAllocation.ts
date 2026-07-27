// src/lib/ewaAllocation.ts
// EWA shared-meter allocation engine. Takes a shared EWA account, a monthly
// bill amount, and the current units/leases/tenants, then computes each
// linked unit's share of the bill according to the account's allocation
// method. Pure function — no side effects — so it can be unit-tested and
// reused for preview/recalculation/distribution.

import type {
  EWAAccount,
  EWABillAllocation,
  Lease,
  Tenant,
  Unit,
} from "@/types";

export interface AllocationInput {
  account: EWAAccount;
  totalAmount: number;
  units: Unit[];
  leases: Lease[];
  tenants: Tenant[];
}

export interface AllocationResult {
  allocations: EWABillAllocation[];
  /** Sum of amounts actually charged to tenants (excludes landlord/excluded). */
  allocatedAmount: number;
  /** Amount charged to the landlord (vacant + landlord action). */
  landlordAmount: number;
  /** Amount not allocated to anyone (excluded vacant units). */
  unallocatedAmount: number;
  /** allocated + landlord + unallocated — should equal totalAmount. */
  remainingBalance: number;
  warnings: string[];
}

/**
 * Resolve the active lease and tenant for a unit (if any).
 */
function resolveUnitOccupancy(
  unitId: string,
  leases: Lease[],
  tenants: Tenant[],
): { lease?: Lease; tenant?: Tenant; vacant: boolean } {
  const lease = leases.find(
    (l) => l.unitId === unitId && l.status === "Active",
  );
  const tenant = lease
    ? tenants.find((t) => t.id === lease.tenantId)
    : undefined;
  return { lease, tenant, vacant: !lease || !tenant };
}

/**
 * Compute the per-unit allocation for an EWA bill.
 *
 * Supported methods:
 *  - equal:       split evenly across units that are chargeable
 *  - percentage:  custom percentages per unit (must total 100%)
 *  - fixed:       fixed monthly amount per unit (leftover goes to landlord)
 *  - meter:       sub-meter reading deltas (proportional to consumption)
 */
export function computeAllocation(input: AllocationInput): AllocationResult {
  const { account, totalAmount, units, leases, tenants } = input;
  const warnings: string[] = [];

  const linkedUnits = account.linkedUnitIds
    .map((id) => units.find((u) => u.id === id))
    .filter((u): u is Unit => Boolean(u));

  if (linkedUnits.length === 0) {
    warnings.push("No units linked to this EWA account.");
    return {
      allocations: [],
      allocatedAmount: 0,
      landlordAmount: 0,
      unallocatedAmount: totalAmount,
      remainingBalance: totalAmount,
      warnings,
    };
  }

  // Resolve occupancy for every linked unit.
  const resolved = linkedUnits.map((unit) => {
    const occ = resolveUnitOccupancy(unit.id, leases, tenants);
    return { unit, ...occ };
  });

  // Determine which units are chargeable (occupied) vs vacant.
  const occupied = resolved.filter((r) => !r.vacant);
  const vacant = resolved.filter((r) => r.vacant);

  // For vacant units, decide based on account.vacantAction:
  //  - exclude      → skip (share redistributed to others)
  //  - landlord     → charge the landlord (no tenant invoice, but tracked)
  const excludedVacant = vacant.filter(
    (r) => account.vacantAction === "exclude",
  );
  const landlordVacant = vacant.filter(
    (r) => account.vacantAction === "landlord",
  );

  // Units that participate in the tenant-side allocation pool.
  const chargeablePool = [...occupied, ...landlordVacant];

  // Raw per-unit amounts before vacancy handling.
  const rawAmounts = new Map<string, number>();

  switch (account.allocationMethod) {
    case "equal": {
      if (chargeablePool.length === 0) {
        warnings.push("No chargeable units — bill goes to landlord.");
        rawAmounts.set("__landlord__", totalAmount);
        break;
      }
      const share = totalAmount / chargeablePool.length;
      for (const r of chargeablePool) rawAmounts.set(r.unit.id, share);
      // Excluded vacant units' share is redistributed to the chargeable pool.
      // (Already excluded from chargeablePool, so the share covers them.)
      break;
    }

    case "percentage": {
      // Validate percentages sum to 100.
      const totalPct = account.rules.reduce(
        (sum, r) => sum + (r.percentage ?? 0),
        0,
      );
      if (Math.abs(totalPct - 100) > 0.01) {
        warnings.push(
          `Percentages total ${totalPct.toFixed(2)}% — they should total 100%.`,
        );
      }
      for (const r of chargeablePool) {
        const rule = account.rules.find((rl) => rl.unitId === r.unit.id);
        const pct = rule?.percentage ?? 0;
        rawAmounts.set(r.unit.id, (totalAmount * pct) / 100);
      }
      // Excluded vacant units' percentage is redistributed proportionally.
      const excludedPct = excludedVacant.reduce((sum, rv) => {
        const rule = account.rules.find((rl) => rl.unitId === rv.unit.id);
        return sum + (rule?.percentage ?? 0);
      }, 0);
      if (excludedPct > 0 && chargeablePool.length > 0) {
        const poolPct = chargeablePool.reduce((sum, rp) => {
          const rule = account.rules.find((rl) => rl.unitId === rp.unit.id);
          return sum + (rule?.percentage ?? 0);
        }, 0);
        for (const r of chargeablePool) {
          const rule = account.rules.find((rl) => rl.unitId === r.unit.id);
          const pct = rule?.percentage ?? 0;
          const redistributed =
            poolPct > 0 ? (excludedPct * pct) / poolPct : 0;
          rawAmounts.set(
            r.unit.id,
            (totalAmount * (pct + redistributed)) / 100,
          );
        }
      }
      break;
    }

    case "fixed": {
      let fixedTotal = 0;
      for (const r of chargeablePool) {
        const rule = account.rules.find((rl) => rl.unitId === r.unit.id);
        const amt = rule?.fixedAmount ?? 0;
        rawAmounts.set(r.unit.id, amt);
        fixedTotal += amt;
      }
      // Any leftover (totalAmount - sum of fixed) goes to the landlord.
      const leftover = totalAmount - fixedTotal;
      if (leftover > 0) {
        rawAmounts.set(
          "__landlord__",
          (rawAmounts.get("__landlord__") ?? 0) + leftover,
        );
        warnings.push(
          `Fixed amounts total ${fixedTotal.toFixed(2)} BHD; leftover ${leftover.toFixed(2)} BHD charged to landlord.`,
        );
      } else if (leftover < 0) {
        warnings.push(
          `Fixed amounts exceed bill by ${Math.abs(leftover).toFixed(2)} BHD — check allocation rules.`,
        );
      }
      break;
    }

    case "meter": {
      // Proportional to consumption (currentReading - previousReading).
      const consumptions = new Map<string, number>();
      let totalConsumption = 0;
      for (const r of chargeablePool) {
        const rule = account.rules.find((rl) => rl.unitId === r.unit.id);
        const prev = rule?.previousReading ?? 0;
        const curr = rule?.currentReading ?? 0;
        const consumed = Math.max(0, curr - prev);
        consumptions.set(r.unit.id, consumed);
        totalConsumption += consumed;
      }
      if (totalConsumption === 0) {
        warnings.push(
          "No sub-meter consumption recorded — falling back to equal split.",
        );
        const share = totalAmount / Math.max(chargeablePool.length, 1);
        for (const r of chargeablePool) rawAmounts.set(r.unit.id, share);
      } else {
        for (const r of chargeablePool) {
          const consumed = consumptions.get(r.unit.id) ?? 0;
          rawAmounts.set(r.unit.id, (totalAmount * consumed) / totalConsumption);
        }
      }
      break;
    }
  }

  // Build the allocation records.
  const allocations: EWABillAllocation[] = [];
  let allocatedAmount = 0;
  let landlordAmount = rawAmounts.get("__landlord__") ?? 0;
  let unallocatedAmount = 0;

  for (const r of resolved) {
    const amount = rawAmounts.get(r.unit.id) ?? 0;

    if (r.vacant) {
      if (account.vacantAction === "exclude") {
        unallocatedAmount += amount;
        allocations.push({
          unitId: r.unit.id,
          amount: 0,
          vacant: true,
          excluded: true,
          chargeToLandlord: false,
        });
      } else {
        // landlord
        landlordAmount += amount;
        allocations.push({
          unitId: r.unit.id,
          amount,
          vacant: true,
          excluded: false,
          chargeToLandlord: true,
        });
      }
    } else {
      allocatedAmount += amount;
      allocations.push({
        unitId: r.unit.id,
        leaseId: r.lease?.id,
        tenantId: r.tenant?.id,
        amount,
        vacant: false,
        excluded: false,
        chargeToLandlord: false,
      });
    }
  }

  const remainingBalance =
    Math.round((allocatedAmount + landlordAmount + unallocatedAmount) * 100) /
      100;

  // Sanity check: allocated + landlord + unallocated should equal totalAmount.
  const drift = Math.abs(remainingBalance - totalAmount);
  if (drift > 0.01) {
    warnings.push(
      `Allocation totals ${remainingBalance.toFixed(2)} BHD but bill is ${totalAmount.toFixed(2)} BHD — rounding difference of ${drift.toFixed(2)} BHD.`,
    );
  }

  return {
    allocations,
    allocatedAmount: round2(allocatedAmount),
    landlordAmount: round2(landlordAmount),
    unallocatedAmount: round2(unallocatedAmount),
    remainingBalance: round2(remainingBalance),
    warnings,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Validate that linked unit IDs all belong to the account's building and
 * that no unit is linked to another active account. Returns error strings.
 */
export function validateLinkedUnits(
  account: EWAAccount,
  allAccounts: EWAAccount[],
  units: Unit[],
): string[] {
  const errors: string[] = [];
  for (const unitId of account.linkedUnitIds) {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) {
      errors.push(`Unit ${unitId} not found.`);
      continue;
    }
    if (unit.buildingId !== account.buildingId) {
      errors.push(
        `Unit ${unit.unitNumber} does not belong to this account's building.`,
      );
    }
    // A unit can only belong to one active EWA account at a time.
    const conflict = allAccounts.find(
      (a) =>
        a.id !== account.id &&
        a.status === "Active" &&
        a.linkedUnitIds.includes(unitId),
    );
    if (conflict) {
      errors.push(
        `Unit ${unit.unitNumber} is already linked to account ${conflict.accountNumber}.`,
      );
    }
  }
  return errors;
}

/**
 * Validate percentage rules sum to 100.
 */
export function validatePercentageRules(
  account: EWAAccount,
): string[] {
  if (account.allocationMethod !== "percentage") return [];
  const total = account.rules.reduce(
    (sum, r) => sum + (r.percentage ?? 0),
    0,
  );
  if (Math.abs(total - 100) > 0.01) {
    return [`Percentages total ${total.toFixed(2)}% — they must total 100%.`];
  }
  return [];
}
