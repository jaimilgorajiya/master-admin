import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ClientRenewal from "./pages/ClientRenewal";
import ServiceRenewal from "./pages/ServiceRenewal";
import ClientPayment from "./pages/ClientPayment";
import ServiceClientPayment from "./pages/ServiceClientPayment";
import ResellerLogin from "./pages/ResellerLogin";
import ResellerDashboard from "./pages/ResellerDashboard";
import ResellerEmployeeDashboard from "./pages/ResellerEmployeeDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import MobileLayout from "./mobile/MobileLayout";
import MobileResellerDashboard from "./mobile/ResellerDashboard";
import MobileStaffDashboard from "./mobile/StaffDashboard";
import MobileClientList from "./mobile/MobileClientList";
import MobileMarginTool from "./mobile/MobileMarginTool";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "var(--toast-bg)",
              color: "var(--toast-text)",
              border: "1px solid var(--toast-border)",
              borderRadius: "12px",
              padding: "16px",
              fontSize: "14px",
              fontWeight: "500",
            },
            success: {
              iconTheme: {
                primary: "#3b82f6",
                secondary: "#fff",
              },
            },
            error: {
              iconTheme: {
                primary: "#ff3b30",
                secondary: "#fff",
              },
            },
          }}
        />
        <div className="futuristic-background">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
          <div className="grid-overlay"></div>
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Reseller Routes (Moved to Top for Priority) */}
          <Route path="/reseller/login" element={<ResellerLogin />} />
          <Route
            path="/reseller/dashboard"
            element={
              <ProtectedRoute tokenKey="resellerToken" redirectTo="/reseller/login">
                <ResellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reseller/employee/dashboard"
            element={
              <ProtectedRoute tokenKey="resellerToken" redirectTo="/reseller/login">
                <ResellerEmployeeDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/software" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/software/:softwareKey" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Employee Routes */}
          <Route path="/employee/login" element={<EmployeeLogin />} />
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute tokenKey="employeeToken" redirectTo="/employee/login">
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Public Routes - Removed Renewal Links */}
          <Route path="/pay-client/:id" element={<ClientPayment />} />
          <Route path="/pay-service/:id" element={<ServiceClientPayment />} />

          {/* Mobile Panel Routes */}
          <Route path="/mobile/reseller/dashboard" element={<MobileLayout><MobileResellerDashboard /></MobileLayout>} />
          <Route path="/mobile/reseller/clients" element={<MobileLayout><MobileClientList /></MobileLayout>} />
          <Route path="/mobile/reseller/margins" element={<MobileLayout><MobileMarginTool /></MobileLayout>} />
          <Route path="/mobile/staff/dashboard" element={<MobileLayout><MobileStaffDashboard /></MobileLayout>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
