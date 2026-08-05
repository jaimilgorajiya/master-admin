import { useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import ClientManagement from "../components/ClientManagement";
import ClientsManagement from "../components/ClientsManagement";
import StaffManagement from "../components/StaffManagement";
import DepartmentManagement from "../components/DepartmentManagement";
import PositionManagement from "../components/PositionManagement";
import PackageManagement from "../components/PackageManagement";
import ServiceManagement from "../components/ServiceManagement";
import SoftwareModulePage from "../components/SoftwareModulePage";
import { softwareRegistry } from "../config/softwareRegistry";
import ResellerManagement from "../components/ResellerManagement";
import CouponManagement from "../components/CouponManagement";
import AdminTaskManagement from "./AdminTaskManagement";
import AdminRevenue from "../components/AdminRevenue";
import AdminResellerEarnings from "../components/AdminResellerEarnings";
import { StatsSkeleton } from "../components/LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";
import ProfileDropdown from "../components/ProfileDropdown";
import Sidebar from "../components/Sidebar";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { softwareKey } = useParams();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deptRefreshKey, setDeptRefreshKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalStaff: 0,
    totalDepartments: 0,
    totalPositions: 0,
    totalResellers: 0,
  });
  const [expiringClients, setExpiringClients] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState([]);
  const [productStats, setProductStats] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
    
    if (!token) {
      navigate("/login");
    } else {
      fetchStats();
    }
  }, [navigate]);

  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    const handleDataChange = (data) => {
        fetchStats();
    };

    socket.on("client_data_change", handleDataChange);
    socket.on("service_data_change", handleDataChange);
    socket.on("package_data_change", handleDataChange);
    socket.on("software_data_change", handleDataChange);
    socket.on("staff_data_change", handleDataChange); 
    socket.on("software_client_change", handleDataChange);

    return () => {
        socket.off("client_data_change", handleDataChange);
        socket.off("service_data_change", handleDataChange);
        socket.off("package_data_change", handleDataChange);
        socket.off("software_data_change", handleDataChange);
        socket.off("staff_data_change", handleDataChange);
        socket.off("software_client_change", handleDataChange);
    };
  }, [socket]);

  useEffect(() => {
    const action = searchParams.get("action");
    setShowAddForm(action === "add");

    if (location.pathname === "/software" || location.pathname === "/software/") {
      if (softwareRegistry.length > 0) {
        navigate(`/software/${softwareRegistry[0].key}`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } else if (location.pathname.startsWith("/software/") && softwareKey) {
      const sw = softwareRegistry.find(s => s.key === softwareKey);
      if (sw) {
        setActiveMenu(`software-${softwareKey}`);
      } else {
        navigate("/dashboard", { replace: true });
      }
    } else {
      const tab = searchParams.get("tab") || "dashboard";
      setActiveMenu(tab);
    }
  }, [location.pathname, softwareKey, searchParams, navigate]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const headers = { Authorization: `Bearer ${token}` };
      const API = import.meta.env.VITE_API_BASE_URL;
      
      const [clientsRes, swClientsRes, staffRes, deptRes, posRes, taskRes, softwareRes] = await Promise.all([
        axios.get(`${API}/api/client/all`, { headers }),
        axios.get(`${API}/api/software-clients/all`, { headers }),
        axios.get(`${API}/api/staff/all`, { headers }),
        axios.get(`${API}/api/department/all`, { headers }),
        axios.get(`${API}/api/position/all`, { headers }),
        axios.get(`${API}/api/task/stats-admin`, { headers }),
        axios.get(`${API}/api/software/all`, { headers })
      ]);

      // 1. Fetch Basic Data
      const softwares = (softwareRes.data.softwares || []).filter(s => s.isActive && s.clientsGetApi);
      const resellerRes = await axios.get(`${API}/api/reseller/all`, { headers });
      const revRes = await axios.get(`${API}/api/admin-actions/revenue`, { 
        params: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
        headers 
      });

      // 2. Fetch External Clients
      let allExternalClients = [];
      if (softwares.length > 0) {
        const externalResults = await Promise.allSettled(
          softwares.map(sw =>
            axios.post(`${API}/api/proxy/external`, { targetUrl: sw.clientsGetApi, method: "GET" }, { headers })
              .then(res => {
                const list = Array.isArray(res.data) ? res.data : (res.data.clients || res.data.data || []);
                return list.map(c => ({ ...c, _softwareName: sw.name, _isSoftwareType: true }));
              })
              .catch(() => [])
          )
        );
        allExternalClients = externalResults.flatMap(r => r.status === "fulfilled" ? r.value : []);
      }

      // 3. Calculate Reconciled Stats (Local + External)
      if (clientsRes.data.success && swClientsRes.data.success) {
        const localRegular = (clientsRes.data.clients || []).filter(c => !c.source);
        const localSoftware = swClientsRes.data.clients || [];

        // Deduplicate: find external clients that aren't already in our local DB
        const localEmails = new Set([
          ...localRegular.map(c => (c.clientEmail || "").toLowerCase().trim()),
          ...localSoftware.map(c => (c.email || "").toLowerCase().trim())
        ]);

        const externalOnly = allExternalClients.filter(ec => {
          const email = (ec.email || ec.ownerEmail || "").toLowerCase().trim();
          return email && !localEmails.has(email);
        });

        const totalClientsCount = localRegular.length + localSoftware.length + externalOnly.length;
        const activeClientsCount = 
          localRegular.filter(c => c.isActive).length + 
          localSoftware.filter(c => c.isActive).length + 
          externalOnly.filter(ec => ec.status === 'active' || ec.isActive).length;

        setStats({
          totalClients: totalClientsCount,
          activeClients: activeClientsCount,
          totalStaff: staffRes.data.staffList?.length || 0,
          totalDepartments: deptRes.data.departments?.length || 0,
          totalPositions: posRes.data.positions?.length || 0,
          totalTasks: taskRes.data.stats?.total || 0,
          pendingTasks: taskRes.data.stats?.pending || 0,
          totalResellers: resellerRes.data.list?.length || 0
        });
      }

      // 4. Update Revenue Trends
      if (revRes.data.success) {
        setRevenueTrend(revRes.data.trend || []);
        setRevenueBreakdown(revRes.data.breakdown || []);
        setProductStats((revRes.data.softwareBreakdown || []).map(p => ({ name: p.name, value: p.amount })));
      }

      // 5. Handle Expiring Clients Alert
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);
      sevenDaysLater.setHours(23, 59, 59, 999);

      const isExpiringSoon = (dateVal) => {
          if (!dateVal) return false;
          const d = new Date(dateVal);
          return d >= today && d <= sevenDaysLater;
      };

      // Service clients expiring soon
      const localExpiring = (clientsRes.data.clients || [])
          .filter(c => isExpiringSoon(c.expiryDate))
          .map(c => ({
              ...c,
              name: c.clientName,
              email: c.clientEmail,
              packageEndDate: c.expiryDate,
              _softwareName: c.validityPeriod || "Service Plan",
              _isSoftwareType: false
          }));

      // Local software clients expiring soon
      const localSwExpiring = (swClientsRes.data.clients || [])
          .filter(c => isExpiringSoon(c.packageEndDate))
          .map(c => ({
              ...c,
              name: c.ownerName || c.businessName,
              email: c.email,
              packageEndDate: c.packageEndDate,
              _softwareName: c.softwareName || c.softwareId?.name || "Software",
              _isSoftwareType: true
          }));

      // External clients expiring soon
      const externalExpiring = allExternalClients.filter(c => {
          const expiryDate = c.packageEndDate ? new Date(c.packageEndDate) : null;
          return expiryDate && expiryDate >= today && expiryDate <= sevenDaysLater;
      });

      const expiring = [...localExpiring, ...localSwExpiring, ...externalExpiring]
          .sort((a, b) => new Date(a.packageEndDate) - new Date(b.packageEndDate));

      // Deduplicate by email
      const seen = new Set();
      const uniqueExpiring = expiring.filter(c => {
          const key = (c.email || c.clientEmail || "").toLowerCase().trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
      });

      setExpiringClients(uniqueExpiring.slice(0, 10));

    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoadingStats(false);
    }
  };



  const handleLogout = async () => {
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

    if (!result.isConfirmed) return;

    localStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    sessionStorage.removeItem("adminUser");
    navigate("/login");
  };



  const handleMenuChange = (menuId) => {  
    if (menuId === "dashboard") {
      setSearchParams({});
      navigate("/dashboard");
    } else if (menuId.startsWith("software-")) {
      const key = menuId.replace("software-", "");
      navigate(`/software/${key}`);
    } else {
      setSearchParams({ tab: menuId });
      navigate(`/dashboard?tab=${menuId}`);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Header */}
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
            <span className="logo-text">MASTER <span className="highlight">ADMIN</span></span>
          </div>
        </div>
        <div className="header-right">
          <ProfileDropdown panelType="admin" />
        </div>
      </header>

      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        activeMenu={activeMenu} 
        handleMenuChange={handleMenuChange} 
      />

      <main className="dashboard-content">
        <div className="content-wrapper">
          {activeMenu === "dashboard" && (
            <div>
              <h1 className="page-title">Dashboard Overview</h1>
              
              {loadingStats ? (
                <StatsSkeleton />
              ) : (
                <>
                  <div className="stats-grid" style={{ marginBottom: '32px' }}>
                    <div className="stat-card" onClick={() => handleMenuChange("clients")}>
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{stats.totalClients}</div>
                        <div className="stat-label">Total Clients</div>
                      </div>
                    </div>
                    
                    <div className="stat-card" onClick={() => handleMenuChange("software-clients")}>
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{stats.activeClients}</div>
                        <div className="stat-label">Active Clients</div>
                      </div>
                    </div>

                    <div className="stat-card" onClick={() => handleMenuChange("staff")}>
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{stats.totalStaff}</div>
                        <div className="stat-label">Total Employees</div>
                      </div>
                    </div>

                    <div className="stat-card" onClick={() => handleMenuChange("resellers")}>
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                           <circle cx="9" cy="7" r="4" />
                           <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{stats.totalResellers}</div>
                        <div className="stat-label">Total Resellers</div>
                      </div>
                    </div>
                  </div>

                  {/* 🚨 ATTENTION REQUIRED: EXPIRING SOON SECTION (REMINDER REMOVED) */}
                  {expiringClients.length > 0 && (
                    <div className="dashboard-section" style={{ marginBottom: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2.5">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#ff3b30', letterSpacing: '0.5px' }}>
                          ATTENTION REQUIRED <span style={{ fontSize: '12px', background: '#ff3b30', color: 'white', padding: '2px 8px', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '8px' }}>{expiringClients.length} EXPIRING SOON</span>
                        </h2>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                        {expiringClients.map((client, idx) => {
                          const expiryDate = new Date(client.packageEndDate);
                          const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <div key={idx} className="alert-card" style={{
                              background: 'rgba(255, 59, 48, 0.03)',
                              border: '1px solid rgba(255, 59, 48, 0.1)',
                              borderRadius: '16px',
                              padding: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              position: 'relative',
                              overflow: 'hidden'
                            }} onClick={() => navigate(client._isSoftwareType ? `/dashboard?tab=software-clients` : `/dashboard?tab=clients`)}>
                              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: '#ff3b30' }}></div>
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{client.clientName || client.ownerName || client.name}</div>
                                  <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>{client.clientEmail || client.email}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                   <div style={{ fontSize: '11px', fontWeight: 700, color: '#ff3b30', textTransform: 'uppercase' }}>{client._softwareName}</div>
                                   <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{client._isSoftwareType ? 'Software' : 'Service'}</div>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', background: 'rgba(255, 59, 48, 0.05)', padding: '10px 12px', borderRadius: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2">
                                     <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                     <line x1="16" y1="2" x2="16" y2="6"/>
                                     <line x1="8" y1="2" x2="8" y2="6"/>
                                     <line x1="3" y1="10" x2="21" y2="10"/>
                                   </svg>
                                   <span style={{ fontSize: '13px', fontWeight: 600, color: '#ff3b30' }}>
                                     Expires: {expiryDate.toLocaleDateString('en-GB')}
                                   </span>
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ff3b30' }}>
                                  {daysLeft === 0 ? "Expires Today" : `${daysLeft} days left`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!loadingStats && (
                    <div className="dashboard-analytics-section">
                      {/* Top Row: Full Width Revenue Growth */}
                      <div className="dash-chart-full glass-card">
                        <div className="chart-header">
                          <h3 className="chart-title">Revenue Growth Trajectory</h3>
                          <p className="chart-subtitle">Direct insights into monthly organizational expansion</p>
                        </div>
                        <div className="chart-content" style={{ height: '320px', marginTop: '20px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTrend}>
                              <defs>
                                <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} />
                              <YAxis hide />
                              <Tooltip 
                                contentStyle={{ background: '#1a1c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                itemStyle={{ color: '#3b82f6' }}
                                formatter={(value) => `₹${value.toLocaleString()}`}
                              />
                              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} fill="url(#dashRevGrad)" animationDuration={2000} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Bottom Row: Side-by-Side tactical charts */}
                      <div className="dashboard-charts-grid">
                        <div className="dash-chart-container glass-card">
                          <div className="chart-header">
                            <h3 className="chart-title">Product Profitability</h3>
                            <p className="chart-subtitle">Revenue breakdown by software integration</p>
                          </div>
                          <div className="chart-content" style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={productStats}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                  animationDuration={1500}
                                >
                                  {productStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#a15dfd', '#00f5a0', '#ff8d72', '#ffcc00'][index % 5]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value) => `₹${value.toLocaleString()}`}
                                  contentStyle={{ background: '#1a1c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="dash-chart-container glass-card">
                          <div className="chart-header">
                            <h3 className="chart-title">Reseller Leaderboard</h3>
                            <p className="chart-subtitle">Partner revenue distribution</p>
                          </div>
                          <div className="chart-content" style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={revenueBreakdown} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                                <Tooltip 
                                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                                  contentStyle={{ background: '#1a1c2e', border: '1px solid rgba(255,255,255,0.1)' }}
                                  formatter={(value) => `₹${value.toLocaleString()}`}
                                />
                                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={16}>
                                  {revenueBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#a15dfd'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                </>
              )}

              <div className="quick-actions">
                <h2 className="quick-actions-title">Quick Actions</h2>
                <div className="quick-actions-grid">

                  <button 
                    className="quick-action-card"
                    onClick={() => navigate("/dashboard?tab=clients&action=add")
                    }
                  >
                    <div className="quick-action-icon">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                        <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="quick-action-content">
                      <h3>Add Client</h3>
                      <p>Create a new client account</p>
                    </div>
                    <div className="quick-action-arrow">→</div>
                  </button>

                  <button 
                    className="quick-action-card"
                    onClick={() => navigate("/dashboard?tab=staff&action=add")
                    }
                  >
                    <div className="quick-action-icon">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                    </div>
                    <div className="quick-action-content">
                      <h3>Add Employee</h3>
                      <p>Register a new staff member</p>
                    </div>
                    <div className="quick-action-arrow">→</div>
                  </button>

                  <button 
                    className="quick-action-card"
                    onClick={() => navigate("/dashboard?tab=packages&action=add")
                    }
                  >
                    <div className="quick-action-icon">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                    </div>
                    <div className="quick-action-content">
                      <h3>Add Package</h3>
                      <p>Create a new subscription package</p>
                    </div>
                    <div className="quick-action-arrow">→</div>
                  </button>



                  <button 
                    className="quick-action-card"
                    onClick={() => navigate("/dashboard?tab=services&action=add")
                    }
                  >
                    <div className="quick-action-icon">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                      </svg>
                    </div>
                    <div className="quick-action-content">
                      <h3>Add Service</h3>
                      <p>Add a new service offering</p>
                    </div>
                    <div className="quick-action-arrow">→</div>
                  </button>
                  <button 
                    className="quick-action-card"
                    onClick={() => navigate("/dashboard?tab=resellers&action=add")
                    }
                  >
                    <div className="quick-action-icon">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div className="quick-action-content">
                      <h3>Add Reseller</h3>
                      <p>Onboard a new partner</p>
                    </div>
                    <div className="quick-action-arrow">→</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeMenu.startsWith("software-") && (() => {
            const key = activeMenu.replace("software-", "");
            const sw = softwareRegistry.find(s => s.key === key);
            return sw ? <SoftwareModulePage software={sw} /> : null;
          })()}

          {activeMenu === "clients" && (
            <ClientManagement 
              initialShowAddForm={showAddForm}
              onFormClose={() => setSearchParams({ tab: "clients" })}
            />
          )}

          {activeMenu === "resellers" && (
            <ResellerManagement
              initialShowAddForm={showAddForm}
              onFormClose={() => setSearchParams({ tab: "resellers" })}
            />
          )}

          {activeMenu === "packages" && (
            <PackageManagement 
              initialShowAddForm={showAddForm}
              onFormClose={() => setSearchParams({ tab: "packages" })}
            />
          )}

          {activeMenu === "tasks" && <AdminTaskManagement />}
          {activeMenu === "revenue" && <AdminRevenue />}
          {activeMenu === "reseller-earnings" && <AdminResellerEarnings />}

          {activeMenu === "dept_positions" && (
            <div>
              <div className="page-header">
                <h1 className="page-title">Departments & Positions</h1>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <DepartmentManagement onDepartmentChange={() => setDeptRefreshKey(k => k + 1)} />
                </div>
                <div>
                  <PositionManagement refreshKey={deptRefreshKey} />
                </div>
              </div>
            </div>
          )}
          {activeMenu === "staff" && (
            <StaffManagement 
              initialShowAddForm={showAddForm}
              onFormClose={() => setSearchParams({ tab: "staff" })}
            />
          )}

          {activeMenu === "services" && (
            <ServiceManagement 
              initialShowAddForm={showAddForm}
              onFormClose={() => setSearchParams({ tab: "services" })}
            />
          )}

          {activeMenu === "coupons" && (
            <CouponManagement 
              initialShowAddForm={showAddForm}
              onFormClose={() => setSearchParams({ tab: "coupons" })}
            />
          )}

         
        </div>
      </main>
    </div>
  );
};



export default Dashboard;
