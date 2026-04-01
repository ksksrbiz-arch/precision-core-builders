import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-6 max-w-md">
        <p className="text-7xl font-bold text-primary/20 font-[family-name:var(--font-mono)] mb-4">
          404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mb-3">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button onClick={() => setLocation("/")} size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
