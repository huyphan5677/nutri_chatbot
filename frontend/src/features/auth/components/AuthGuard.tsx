import { Navigate, Outlet } from "react-router-dom";

export default function AuthGuard() {
  const token = localStorage.getItem("nutri_token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
