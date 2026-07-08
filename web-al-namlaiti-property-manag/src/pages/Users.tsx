import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import UserForm from "@/components/forms/UserForm";
import { Shield, Mail, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

const initialUsers: User[] = [
  { id: "u-1", name: "Super Admin", email: "admin@propvault.com", role: "Super Admin", status: "Active" },
  { id: "u-2", name: "Property Manager", email: "manager@propvault.com", role: "Manager", status: "Active" },
  { id: "u-3", name: "Finance User", email: "finance@propvault.com", role: "Finance", status: "Active" },
];

export default function Users() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [viewingUser, setViewingUser] = useState<User | undefined>();
  const [deletingUser, setDeletingUser] = useState<User | undefined>();

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditingUser(undefined);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(undefined);
  };

  const handleSave = (user: User) => {
    if (editingUser) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
      toast.success("User updated");
    } else {
      setUsers((prev) => [...prev, user]);
      toast.success("User created");
    }
  };

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("User deleted");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle={`${users.length} user(s)`} action={{ label: "Add User", onClick: openAdd }} />

      <div className="relative max-w-md">
        <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-white">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{u.name}</p>
                    <p className="text-sm text-muted-foreground">{u.role}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    u.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {u.status}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {u.email}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" size="sm" onClick={() => setViewingUser(u)}>
                  <Eye className="mr-2 h-4 w-4" /> View
                </Button>
                <Button variant="outline" className="flex-1" size="sm" onClick={() => openEdit(u)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeletingUser(u)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DeleteConfirmDialog
        open={Boolean(deletingUser)}
        onOpenChange={(o) => !o && setDeletingUser(undefined)}
        itemName={deletingUser?.name}
        onConfirm={() => deletingUser && handleDelete(deletingUser.id)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>Fill in the user details below.</DialogDescription>
          </DialogHeader>
          <UserForm initialData={editingUser} onClose={closeDialog} onSave={handleSave} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingUser)} onOpenChange={() => setViewingUser(undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingUser?.name}</DialogTitle>
            <DialogDescription>User details</DialogDescription>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" /> {viewingUser.email}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{viewingUser.role}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        viewingUser.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {viewingUser.status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => { setViewingUser(undefined); openEdit(viewingUser); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
