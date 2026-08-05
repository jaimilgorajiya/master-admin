import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const ProfileDropdown = ({ panelType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
    const employeeToken = localStorage.getItem("employeeToken") || sessionStorage.getItem("employeeToken");
    const resellerToken = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
    
    const setAdminInfo = () => {
      const data = localStorage.getItem("adminUser") || sessionStorage.getItem("adminUser");
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.email || parsed.name) {
            setUserName(parsed.email || parsed.name);
            return;
          }
        } catch (_) {}
      }
      const userEmail = localStorage.getItem("rememberedEmail") || "Administrator";
      setUserName(userEmail);
    };

    const setResellerInfo = () => {
      const data = localStorage.getItem("resellerUser") || sessionStorage.getItem("resellerUser");
      if (data) {
        const parsed = JSON.parse(data);
        setUserName(parsed.email || parsed.name || "Partner");
      }
    };

    const setEmployeeInfo = () => {
      const data = localStorage.getItem("employeeData") || sessionStorage.getItem("employeeData");
      if (data) {
        const parsed = JSON.parse(data);
        setUserName(parsed.email || parsed.name || "Employee");
      }
    };

    if (panelType === "admin") {
      setAdminInfo();
    } else if (panelType === "reseller") {
      setResellerInfo();
    } else if (panelType === "employee") {
      setEmployeeInfo();
    } else {
      // Fallback to token presence priority
      if (adminToken) {
        setAdminInfo();
      } else if (resellerToken) {
        setResellerInfo();
      } else if (employeeToken) {
        setEmployeeInfo();
      }
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelType]);

  const handleLogout = async () => {
    setIsOpen(false);
    const result = await Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to log out?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#fff",
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      customClass: {
        popup: "premium-swal-popup",
        confirmButton: "premium-swal-confirm",
        cancelButton: "premium-swal-cancel",
      },
    });

    if (result.isConfirmed) {
      const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const resellerToken = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");

      if (panelType === "admin" || (!panelType && adminToken)) {
        localStorage.removeItem("adminToken");
        sessionStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        sessionStorage.removeItem("adminUser");
        navigate("/login");
      } else if (panelType === "reseller" || (!panelType && resellerToken)) {
        localStorage.removeItem("resellerToken");
        sessionStorage.removeItem("resellerToken");
        localStorage.removeItem("resellerUser");
        sessionStorage.removeItem("resellerUser");
        navigate("/reseller/login");
      } else {
        localStorage.removeItem("employeeToken");
        sessionStorage.removeItem("employeeToken");
        localStorage.removeItem("employeeData");
        sessionStorage.removeItem("employeeData");
        navigate("/employee/login");
      }
    }
  };

  const getRole = () => {
    const adminToken = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
    const employeeToken = localStorage.getItem("employeeToken") || sessionStorage.getItem("employeeToken");
    const resellerToken = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");

    if (panelType === "admin") return "ADMINISTRATOR";
    if (panelType === "reseller") {
      const data = localStorage.getItem("resellerUser") || sessionStorage.getItem("resellerUser");
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.role === "RESELLER_EMPLOYEE" ? "STAFF" : "PARTNER";
      }
      return "PARTNER";
    }
    if (panelType === "employee") return "EMPLOYEE";

    // Fallback
    if (adminToken) return "ADMINISTRATOR";
    if (resellerToken) {
      const data = localStorage.getItem("resellerUser") || sessionStorage.getItem("resellerUser");
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.role === "RESELLER_EMPLOYEE" ? "STAFF" : "PARTNER";
      }
      return "PARTNER";
    }
    return "EMPLOYEE";
  };

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button 
        className={`profile-button-premium ${isOpen ? "active" : ""}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="profile-avatar-premium">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info-premium">
          <div className="profile-name-premium">{userName}</div>
          <div className="profile-role-premium">{getRole()}</div>
        </div>
      </button>

      {isOpen && (
        <div className="profile-menu-premium">
          <div className="profile-menu-header-premium">
             <div className="profile-email-label">Connected as</div>
             <div className="profile-email-value">{userName}</div>
          </div>
          <div className="profile-menu-divider"></div>
          <button className="profile-menu-item-premium logout" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout Account</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
