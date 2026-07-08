import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="rounded-full bg-muted p-4">
        <Home className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-6 text-4xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">Page not found</p>
      <p className="mt-1 text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild className="mt-6">
        <Link to="/">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
