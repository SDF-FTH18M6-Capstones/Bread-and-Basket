import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../features/auth/authContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    switch (user?.role) {
      case "consumer":
        return <Navigate to="/shop" replace />;

      case "seller":
        return <Navigate to="/seller" replace />;

      case "admin":
        return <Navigate to="/admin" replace />;

      default:
        return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}
