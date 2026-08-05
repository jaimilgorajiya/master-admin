import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import ResellerTeamManagement from "../components/ResellerTeamManagement";
import ResellerClientManagement from "../components/ResellerClientManagement";
import ResellerInventory from "../components/ResellerInventory";
import ResellerPerformanceMatrix from "../components/ResellerPerformanceMatrix";
import ResellerRevenue from "../components/ResellerRevenue";
import ResellerEarnings from "../components/ResellerEarnings";
import ProfileDropdown from "../components/ProfileDropdown";

const ResellerDashboard = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeMenu, setActiveMenu] = useState(searchParams.get("b") || "dashboard");
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ clients: 0, team: 0, software: 0 });
    const [loadingStats, setLoadingStats] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
        const userData = localStorage.getItem("resellerUser") || sessionStorage.getItem("resellerUser");
        
        if (!token) {
            navigate("/reseller/login");
        } else if (userData) {
            setUser(JSON.parse(userData));
            fetchStats(token);
        }
    }, [navigate]);

    useEffect(() => {
        const tab = searchParams.get("tab") || "dashboard";
        if (tab !== activeMenu) {
            setActiveMenu(tab);
        }
    }, [searchParams, activeMenu]);

    const fetchStats = async (token) => {
        setLoadingStats(true);
        try {
            const [clientRes, teamRes, permRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/clients`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/team`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/my-permissions`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setStats({
                clients: clientRes.data.data.length,
                team: teamRes.data.data.length,
                software: permRes.data.data.allowedSoftware.length
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
        { id: "team", label: "My Team" },
        { id: "revenue", label: "Revenue Trend" },
        { id: "earnings", label: "My Earnings" },
        { id: "inventory", label: "My Inventory" },
    ];

    const handleMenuChange = (menuId) => {  
        if (menuId === "dashboard") {
            setSearchParams({});
        } else {
            setSearchParams({ tab: menuId });
        }
    };

    const getActiveLabel = () => {
        const item = menuItems.find(m => m.id === activeMenu);
        return item ? item.label : "Dashboard";
    };

    if (!user) return null;

    return (
        <div className="dashboard-layout">
            <header className="dashboard-header glass-header">
                <div className="header-left">
                    <button 
                        className="mobile-menu-toggle"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div className="logo futuristic-logo">
                        <img src="/logo.png" alt="Logo" className="logo-image" />
                        <span className="logo-text">PARTNER <span className="highlight">PANEL</span></span>
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
                        <span className="logo-text">PARTNER <span className="highlight">PANEL</span></span>
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
                            onClick={() => {
                                handleMenuChange(item.id);
                                setIsSidebarOpen(false);
                            }}
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
                            <div className="page-description">Welcome back, {user.name.split(' ')[0]}! Here's your performance summary.</div>
                        </div>
                    )}

                    {activeMenu === "dashboard" && (
                        <div>
                            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                                <div className="stat-card" onClick={() => handleMenuChange("clients")}>
                                    <div className="stat-icon" style={{ background: 'rgba(0, 200, 255, 0.1)', color: 'var(--accent-primary)' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.clients}</div>
                                        <div className="stat-label">Total Clients</div>
                                    </div>
                                </div>
                                <div className="stat-card" onClick={() => handleMenuChange("team")}>
                                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.team}</div>
                                        <div className="stat-label">Team Members</div>
                                    </div>
                                </div>
                                <div className="stat-card" onClick={() => handleMenuChange("inventory")}>
                                    <div className="stat-icon" style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34c759' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.software}</div>
                                        <div className="stat-label">Software Access</div>
                                    </div>
                                </div>
                            </div>

                            {/* Integrated Performance Matrix */}
                            <ResellerPerformanceMatrix />
                            
                            <div className="section-header" style={{ marginTop: '48px' }}>
                                <h2 className="section-title">Quick Client Access</h2>
                            </div>
                            <ResellerClientManagement />
                        </div>
                    )}

                    {activeMenu === "clients" && <ResellerClientManagement />}
                    {activeMenu === "team" && <ResellerTeamManagement />}
                    {activeMenu === "revenue" && <ResellerRevenue />}
                    {activeMenu === "earnings" && <ResellerEarnings />}
                    {activeMenu === "inventory" && <ResellerInventory />}
                </div>
            </main>
        </div>
    );
};

export default ResellerDashboard;
