import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import ResellerClientManagement from "../components/ResellerClientManagement";
import ResellerInventory from "../components/ResellerInventory";
import ResellerPerformanceMatrix from "../components/ResellerPerformanceMatrix";
import ResellerRevenue from "../components/ResellerRevenue";
import ProfileDropdown from "../components/ProfileDropdown";

const ResellerEmployeeDashboard = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeMenu, setActiveMenu] = useState(searchParams.get("tab") || "dashboard");
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ clients: 0, software: 0, services: 0 });
    const [loadingStats, setLoadingStats] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
        const userData = localStorage.getItem("resellerUser") || sessionStorage.getItem("resellerUser");
        
        if (!token) {
            navigate("/reseller/login");
            return;
        } 
        
        if (userData) {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.role !== "RESELLER_EMPLOYEE") {
                navigate("/reseller/login");
                return;
            }
            setUser(parsedUser);
            fetchStats(token, parsedUser);
        }
    }, [navigate]);

    useEffect(() => {
        const tab = searchParams.get("tab") || "dashboard";
        if (tab !== activeMenu) {
            setActiveMenu(tab);
        }
    }, [searchParams, activeMenu]);

    const fetchStats = async (token, userData) => {
        setLoadingStats(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/clients`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats({
                clients: res.data.data.length,
                software: userData?.assignedSoftware?.length || 0,
                services: userData?.assignedServices?.length || 0
            });
        } catch (err) {
            console.error("Stats fail", err);
        } finally {
            setLoadingStats(false);
        }
    };

    const menuItems = [
        { id: "dashboard", label: "Dashboard" },
        { id: "clients", label: "My Clients" },
        { id: "revenue", label: "Revenue" },
        { id: "inventory", label: "My Access" },
    ];

    const handleMenuChange = (menuId) => {  
        if (menuId === "dashboard") {
            setSearchParams({});
        } else {
            setSearchParams({ tab: menuId });
        }
        setIsSidebarOpen(false);
    };

    if (!user) return null;

    return (
        <div className="dashboard-layout">
            <header className="dashboard-header glass-header">
                <div className="header-left">
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setIsSidebarOpen(true)}
                        aria-label="Open Menu"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div className="logo futuristic-logo">
                        <img src="/logo.png" alt="Logo" className="logo-image" />
                        <span className="logo-text">STAFF <span className="highlight">PANEL</span></span>
                    </div>
                </div>
                <div className="header-right">
                    <ProfileDropdown panelType="reseller" />
                </div>
            </header>

            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-mobile-header">
                    <div className="logo futuristic-logo">
                        <img src="/logo.png" alt="Logo" className="logo-image" />
                        <span className="logo-text">STAFF <span className="highlight">PANEL</span></span>
                    </div>
                    <button className="sidebar-close-x" onClick={() => setIsSidebarOpen(false)} aria-label="Close menu">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activeMenu === item.id ? "active" : ""}`}
                            onClick={() => handleMenuChange(item.id)}
                        >
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <p className="footer-text">
                        Developed & Managed by ❤️ <a href="https://iflorainfo.com/" target="_blank" rel="noopener noreferrer">IIPL</a>
                    </p>
                </div>
            </aside>

            <main className="dashboard-content">
                <div className="content-inner">
                    {activeMenu === "dashboard" && (
                        <div className="page-header">
                            <h1 className="page-title">Dashboard</h1>
                            <div className="page-description">Welcome back! You have access to {stats.clients} clients.</div>
                        </div>
                    )}

                    {activeMenu === "dashboard" && (
                        <div>
                            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                                <div className="stat-card" onClick={() => handleMenuChange("clients")}>
                                    <div className="stat-icon" style={{ background: 'rgba(0, 200, 255, 0.1)', color: 'var(--accent-primary)' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.clients}</div>
                                        <div className="stat-label">Assigned Clients</div>
                                    </div>
                                </div>
                                <div className="stat-card" onClick={() => handleMenuChange("inventory")}>
                                    <div className="stat-icon" style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34c759' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.software + stats.services}</div>
                                        <div className="stat-label">System Access</div>
                                    </div>
                                </div>
                            </div>

                            {/* Staff Performance Matrix - Only shows their data */}
                            <ResellerPerformanceMatrix />

                            <div className="section-header" style={{ marginTop: '48px' }}>
                                <h2 className="section-title">My Recent Clients</h2>
                            </div>
                            <ResellerClientManagement />
                        </div>
                    )}

                    {activeMenu === "clients" && <ResellerClientManagement />}
                    {activeMenu === "revenue" && <ResellerRevenue />}
                    {activeMenu === "inventory" && <ResellerInventory />}
                </div>
            </main>
        </div>
    );
};

export default ResellerEmployeeDashboard;
