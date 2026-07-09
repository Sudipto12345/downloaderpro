import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
