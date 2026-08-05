import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const ResellerLogin = () => {
    const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
        const user = JSON.parse(localStorage.getItem("resellerUser") || sessionStorage.getItem("resellerUser") || "{}");
        if (token) {
            if (user.role === "RESELLER_EMPLOYEE") {
                navigate("/reseller/employee/dashboard", { replace: true });
            } else {
                navigate("/reseller/dashboard", { replace: true });
            }
            return;
        }

        // Load saved credentials for Reseller
        const savedEmail = localStorage.getItem("resellerRememberedEmail");
        const savedPassword = localStorage.getItem("resellerRememberedPassword");
        
        if (savedEmail && savedPassword) {
            setFormData({
                email: savedEmail,
                password: savedPassword,
                rememberMe: true,
            });
        }
    }, [navigate]);

    const handleSuccess = (data, isEmployee = false) => {
        const token = data.token;
        if (formData.rememberMe) {
            localStorage.setItem("resellerToken", token);
            localStorage.setItem("resellerUser", JSON.stringify(data.user));
            // Save credentials for pre-filling
            localStorage.setItem("resellerRememberedEmail", formData.email);
            localStorage.setItem("resellerRememberedPassword", formData.password);
        } else {
            sessionStorage.setItem("resellerToken", token);
            sessionStorage.setItem("resellerUser", JSON.stringify(data.user));
            // Clear saved credentials
            localStorage.removeItem("resellerRememberedEmail");
            localStorage.removeItem("resellerRememberedPassword");
        }
        toast.success("Welcome back!");
        if (isEmployee) {
            navigate("/reseller/employee/dashboard");
        } else {
            navigate("/reseller/dashboard");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Try Partner/Owner login
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-auth/login`, {
                email: formData.email,
                password: formData.password
            });
            
            if (res.data.success) {
                handleSuccess(res.data);
            }
        } catch (err) {
            // If owner login fails, try Partner Employee login
            try {
                const resEmp = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-auth/employee/login`, {
                    email: formData.email,
                    password: formData.password
                });
                if(resEmp.data.success) {
                    handleSuccess(resEmp.data, true);
                    return;
                }
            } catch (inner) {
                toast.error(err.response?.data?.message || "Invalid credentials");
            }
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
                <h1 className="login-title">Partner Login</h1>
                <p className="login-subtitle">Reseller Management Panel</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
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
                            checked={formData.rememberMe}
                            onChange={e => setFormData({...formData, rememberMe: e.target.checked})}
                        />
                        <label htmlFor="rememberMe">Remember Me</label>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResellerLogin;
