import { AuthLayout } from "@/components/AppHeader";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Climber attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <AuthLayout>
      <div className="surface w-full max-w-sm p-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Oops! Page not found</p>
        <a href="/" className="btn-primary">
          Return to Home
        </a>
      </div>
    </AuthLayout>
  );
};

export default NotFound;
