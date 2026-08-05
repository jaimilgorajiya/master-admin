import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";

const EmployeeLogin = () => {
  const [formData, setFormData] = useState({
    iiplId: "",
    password: "",
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in (Employee) & Load Saved Credentials
  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    if (token) {
      navigate("/employee/dashboard", { replace: true });
      return;
    }

    const savedIiplId = localStorage.getItem("rememberedIiplId");
    const savedPassword = localStorage.getItem("rememberedEmployeePassword");

    if (savedIiplId && savedPassword) {
      setFormData((prev) => ({
        ...prev,
        iiplId: savedIiplId,
        password: savedPassword,
        rememberMe: true
      }));
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.iiplId || !formData.password) {
      toast.error("Please enter IIPL ID and Password");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/staff-auth/login`, {
        iiplId: formData.iiplId,
        password: formData.password,
      });

      if (response.data.success) {
        const { token, staff } = response.data;
        
        // Handle Remember Me
        if (formData.rememberMe) {
          localStorage.setItem("rememberedIiplId", formData.iiplId);
          localStorage.setItem("rememberedEmployeePassword", formData.password);
        } else {
          localStorage.removeItem("rememberedIiplId");
          localStorage.removeItem("rememberedEmployeePassword");
        }

        // Direct Login - No Password Change Force
        localStorage.setItem("employeeToken", token);
        localStorage.setItem("employeeData", JSON.stringify(staff));
        toast.success(`Welcome, ${staff.name}!`);
        navigate("/employee/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">
          <img src="/logo.png" alt="Logo" />
        </div>
        
        <h1 className="login-title">Employee Login</h1>
        <p className="login-subtitle">IIPL Staff Portal</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="iiplId">IIPL ID</label>
            <input
              type="text"
              id="iiplId"
              name="iiplId"
              value={formData.iiplId}
              onChange={handleChange}
              placeholder="Enter your IIPL ID"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group-checkbox">
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
            />
            <label htmlFor="rememberMe">Remember Me</label>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmployeeLogin;
