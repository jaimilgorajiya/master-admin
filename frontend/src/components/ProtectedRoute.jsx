import { Navigate } from "react-router-dom";

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch (e) {
    return true; // if unparseable, consider expired
  }
};

const ProtectedRoute = ({
  children,
  tokenKey = "adminToken",
  redirectTo = "/login",
}) => {
  const token =
    localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);

  if (!token || isTokenExpired(token)) {
    // Clear stale keys
    localStorage.removeItem(tokenKey);
    sessionStorage.removeItem(tokenKey);
    if (tokenKey === "adminToken") {
      localStorage.removeItem("adminUser");
      sessionStorage.removeItem("adminUser");
    } else if (tokenKey === "employeeToken") {
      localStorage.removeItem("employeeData");
    } else if (tokenKey === "resellerToken") {
      localStorage.removeItem("resellerData");
    }
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
