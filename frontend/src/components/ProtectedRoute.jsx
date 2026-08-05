import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
  children,
  tokenKey = "adminToken",
  redirectTo = "/login",
}) => {
  const token =
    localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);

  if (!token) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
