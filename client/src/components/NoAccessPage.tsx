import { Link } from "wouter";
import { ShieldX, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NoAccessPageProps {
  module?: string;
}

export function NoAccessPage({ module = "this section" }: NoAccessPageProps) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="bg-zinc-900 border-zinc-800 p-8 text-center max-w-md w-full">
        <div className="flex justify-center mb-4">
          <ShieldX className="h-16 w-16 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-zinc-400 mb-6">
          You don't have permission to access {module}. Contact your administrator to request access.
        </p>
        <Button asChild className="bg-primary hover:bg-primary/80">
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Link>
        </Button>
      </Card>
    </div>
  );
}