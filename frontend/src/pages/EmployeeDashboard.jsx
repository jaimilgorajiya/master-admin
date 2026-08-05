import { useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { employeeApi } from "../utils/axiosConfig";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import EmployeeClientManagement from "../components/EmployeeClientManagement";
import EmployeeTaskManagement from "../components/EmployeeTaskManagement";
import EmployeeTaskPerformance from "../components/EmployeeTaskPerformance";
import EmployeePackageManagement from "../components/EmployeePackageManagement";
import EmployeeServiceManagement from "../components/EmployeeServiceManagement";
import EmployeeSoftwareManagement from "../components/EmployeeSoftwareManagement";
import { StatsSkeleton } from "../components/LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";
import EmployeeAnalytics from "../components/EmployeeAnalytics";
import EmployeeRevenue from "../components/EmployeeRevenue";
import ProfileDropdown from "../components/ProfileDropdown";

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const activeMenu = searchParams.get("tab") || "dashboard";
  const [showAddForm, setShowAddForm] = useState(false);
  
  useEffect(() => {
     if (searchParams.get("action") === "add") {
         setShowAddForm(true);
     } else {
         setShowAddForm(false);
     }
  }, [searchParams]);
  
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    recentClients: 0,
    recentActivity: [],
    clientList: [],
    totalPackages: 0, 
    totalServices: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // ... (notifications state)

  // Socket
  const socket = useContext(SocketContext);

  // Define fetchStats first
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [clientsRes, packagesRes, servicesRes, taskRes, swClientsRes] = await Promise.all([
        employeeApi.get(`/api/client/my-clients`),
        employeeApi.get(`/api/package/all`),
        employeeApi.get(`/api/service/all`),
        employeeApi.get(`/api/task/stats-employee`),
        employeeApi.get(`/api/software-clients/my-clients`).catch(() => ({ data: { success: false } })),
      ]);

      if (clientsRes.data.success) {
        const serviceClients = clientsRes.data.clients;
        const softwareClients = swClientsRes.data.success
          ? swClientsRes.data.clients.map(c => ({
              _id: c._id,
              clientName: c.ownerName || c.businessName,
              clientEmail: c.email,
              clientPhone: c.phone,
              clientType: 'software',
              isActive: c.isActive,
              paymentAmount: c.packagePrice || 0,
              createdAt: c.createdAt,
            }))
          : [];

        const clients = [...serviceClients, ...softwareClients];
        const activeClientsList = clients.filter(client => client.isActive);
        const activeServices = servicesRes.data.services?.filter(service => service.isActive).length || 0;
        const totalRevenue = activeClientsList.reduce((sum, client) => sum + (client.paymentAmount || 0), 0);
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const recentClients = clients.filter(client => new Date(client.createdAt) >= thirtyDaysAgo).length;
        const recentActivity = [...clients].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

        setStats({
          totalClients: clients.length, 
          activeClients: activeClientsList.length,
          activeServices: activeServices,
          totalRevenue: totalRevenue,
          recentClients: recentClients,
          recentActivity: recentActivity,
          clientList: clients,
          totalPackages: packagesRes.data.packages?.length || 0,
          totalServices: servicesRes.data.services?.length || 0,
          totalTasks: taskRes.data.stats?.total || 0
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch Notifications from API
  const fetchNotifications = async () => {
      try {
          const res = await employeeApi.get(`/api/notification/my-notifications`);
          if (res.data.success) {
              setNotifications(res.data.notifications);
              setUnreadCount(res.data.notifications.filter(n => !n.isRead).length);
          }
      } catch (error) {
          console.error("Error fetching notifications", error);
      }
  };


  // Move Session Check Effect HERE
  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    const data = localStorage.getItem("employeeData");
    
    if (!token) {
      navigate("/employee/login");
      return;
    }

    if (data) {
      setEmployeeData(JSON.parse(data));
    }

    const checkSession = async () => {
        try {
            const response = await employeeApi.get(`/api/staff-auth/verify`);
            if (response.data.success) {
                localStorage.setItem("employeeData", JSON.stringify(response.data.user));
                setEmployeeData(response.data.user);
                fetchStats();
                fetchNotifications();
            }
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                 localStorage.removeItem("employeeToken");
                 localStorage.removeItem("employeeData");
                 navigate("/employee/login");
            }
        }
    };

    checkSession();
  }, [navigate]);

  // Socket Effect uses fetchStats
  useEffect(() => {
    if (!socket || !employeeData) return;

    const handleDataChange = (data) => {
        fetchStats();
    };
    
    const notificationEvent = `notification_${employeeData.id || employeeData._id}`;
    
    const handleNotification = (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        toast(newNotification.message, {
             icon: '🔔',
             style: {
                 background: '#333',
                 color: '#fff',
             }
        });
    };

    socket.on("client_data_change", handleDataChange);
    socket.on("software_client_change", handleDataChange);
    socket.on("software_data_change", handleDataChange);
    socket.on("service_data_change", handleDataChange);
    socket.on("package_data_change", handleDataChange);
    socket.on(notificationEvent, handleNotification);

    return () => {
        socket.off("client_data_change", handleDataChange);
        socket.off("software_client_change", handleDataChange);
        socket.off("software_data_change", handleDataChange);
        socket.off("service_data_change", handleDataChange);
        socket.off("package_data_change", handleDataChange);
        socket.off(notificationEvent, handleNotification);
    };
  }, [socket, employeeData]);


  const markAsRead = async (notification) => {
      if (notification.isRead) {
          if (notification.link) navigate(notification.link);
           return;
      }
      try {
          await employeeApi.patch(`/api/notification/${notification._id}/read`, {});
          
          setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
          setUnreadCount(prev => Math.max(0, prev - 1));
          
          if (notification.link) {
              // If link is a query param link like /dashboard?tab=tasks, we might need to handle it carefully if internal
               if(notification.link.startsWith('/dashboard') || notification.link.startsWith('/employee/dashboard')) {
                    const url = new URL(notification.link, window.location.origin);
                    const tab = url.searchParams.get("tab");
                    if (tab) handleMenuChange(tab);
               } else {
                   navigate(notification.link); 
               }
          }
      } catch (error) {
          console.error("Error marking read", error);
      }
  };
  
  const handleMarkAllRead = async () => {
       try {
          await employeeApi.patch(`/api/notification/read-all`, {});
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
       } catch (error) { console.error(error); }
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

    // Remove tokens
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("employeeData");
    navigate("/employee/login");
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "clients", label: "Clients" },
    { id: "packages", label: "Packages" },
    { id: "software", label: "Software" },
    { id: "services", label: "Services" },
    { id: "revenue", label: "Revenue" },
    { id: "tasks", label: "My Tasks" },
  ];

  const handleMenuChange = (menuId) => {
    if (menuId === "dashboard") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: menuId });
    }
    setIsSidebarOpen(false);
    setShowNotifications(false);
  };

  return (
    <div className="dashboard-layout employee-dashboard">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Header */}
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
          
          {/* Notification Bell */}
           <div style={{ position: 'relative', marginRight: '15px' }}>
              <button 
                className="icon-button" 
                onClick={() => setShowNotifications(!showNotifications)} 
                title="Notifications"
                style={{ position: 'relative' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                   <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        border: '2px solid #1a1a1a'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                  <div className="notification-dropdown glass-card" style={{
                      position: 'absolute',
                      top: '40px',
                      right: '-60px', /* Adjust for mobile/desktop */
                      width: '320px',
                      zIndex: 1001,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: '400px'
                  }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Notifications</h3>
                          {unreadCount > 0 && (
                              <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#00c8ff', fontSize: '12px', cursor: 'pointer' }}>Mark all read</button>
                          )}
                      </div>
                      <div style={{ overflowY: 'auto', flex: 1 }}>
                          {notifications.length === 0 ? (
                              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>No notifications</div>
                          ) : (
                              notifications.map(n => (
                                  <div 
                                    key={n._id} 
                                    onClick={() => markAsRead(n)}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #222',
                                        cursor: 'pointer',
                                        background: n.isRead ? 'transparent' : 'rgba(0, 200, 255, 0.05)',
                                        transition: 'background 0.2s'
                                    }}
                                    className="notification-item"
                                  >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                          <span style={{ fontSize: '13px', fontWeight: n.isRead ? 400 : 600, color: '#fff' }}>{n.title}</span>
                                          <span style={{ fontSize: '10px', color: '#666' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <p style={{ fontSize: '12px', color: '#aaa', margin: 0, lineHeight: '1.4' }}>{n.message}</p>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              )}
              {/* Overlay for closing notification dropdown */}
               {showNotifications && (
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} 
                    onClick={() => setShowNotifications(false)}
                  />
               )}
           </div>

          <ProfileDropdown panelType="employee" />
        </div>
      </header>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Employee Profile</h2>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-avatar-modal">
                {(employeeData?.name || "E").charAt(0).toUpperCase()}
              </div>
              <div className="profile-details">
                <div className="profile-detail-item">
                  <label>Name</label>
                  <p>{employeeData?.name || "Employee"}</p>
                </div>
                <div className="profile-detail-item">
                  <label>IIPL ID</label>
                  <p>{employeeData?.iiplId || "N/A"}</p>
                </div>
                <div className="profile-detail-item">
                  <label>Email</label>
                  <p>{employeeData?.email || "N/A"}</p>
                </div>
                <div className="profile-detail-item">
                  <label>Mobile</label>
                  <p>{employeeData?.mobile || "N/A"}</p>
                </div>
                <div className="profile-detail-item">
                  <label>Role</label>
                  <p>Employee</p>
                </div>
                <div className="profile-detail-item">
                  <label>Status</label>
                  <p className="status-active">Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${isSidebarOpen ? "open" : ""}`}>
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
          {menuItems.map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <div key={item.id} className="sidebar-menu-group">
                <button
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                  onClick={() => handleMenuChange(item.id)}
                  style={{ justifyContent: "space-between" }}
                >
                  <span>{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
        
        {/* Footer */}
        <div className="sidebar-footer">
          <p className="footer-text">
            Developed & Managed by ❤️ <a href="https://iflorainfo.com/" target="_blank" rel="noopener noreferrer">IIPL</a>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        <div className="content-wrapper">
          {activeMenu === "dashboard" && (
            <div>
              <h1 className="page-title">Dashboard</h1>
              
              {loadingStats ? (
              <StatsSkeleton />
              ) : (
                <div className="stats-grid">
                <div className="stat-card glass-card" onClick={() => handleMenuChange("clients")}>
                  <div className="stat-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalClients}</div>
                    <div className="stat-label">Total Clients</div>
                  </div>
                </div>

                <div className="stat-card glass-card" onClick={() => handleMenuChange("clients")}>
                  <div className="stat-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.activeClients}</div>
                    <div className="stat-label">Active Clients</div>
                  </div>
                </div>



                <div className="stat-card glass-card" onClick={() => handleMenuChange("services")}>
                   <div className="stat-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.activeServices}</div>
                    <div className="stat-label">Active Services</div>
                  </div>
                </div>

                <div className="stat-card glass-card" style={{ cursor: 'default' }}>
                    <div className="stat-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    </div>
                    <div className="stat-info">
                    <div className="stat-value">₹ {stats.totalRevenue?.toLocaleString()}</div>
                    <div className="stat-label">Revenue (Current Month)</div>
                    </div>
                </div>

                <div className="stat-card glass-card" onClick={() => handleMenuChange('tasks')} style={{ cursor: 'pointer' }}>
                  <div className="stat-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <line x1="10" y1="9" x2="8" y2="9"></line>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{stats.totalTasks || 0}</div>
                    <div className="stat-label">My Tasks</div>
                  </div>
                </div>
                </div>
              )}

              <div className="quick-actions" style={{ marginTop: '30px' }}>
                <h2 className="quick-actions-title">Quick Actions</h2>
                <div className="quick-actions-grid">
                  <button 
                    className="quick-action-card"
                    onClick={() => navigate("/employee/dashboard?tab=clients&action=add")}
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
                </div>
              </div>

              {/* Task Performance Graphs */}
              <EmployeeTaskPerformance />

              {/* Analytics Section */}
              <EmployeeAnalytics clients={stats.clientList} />
            </div>
          )}

          {activeMenu === "software" && (
            <EmployeeSoftwareManagement />
          )}

          {activeMenu === "clients" && (
            <EmployeeClientManagement 
              initialShowAddForm={showAddForm}
              onFormClose={() => setSearchParams({ tab: "clients" })}
              initialClientId={searchParams.get("clientId")}
            />
          )}

          {activeMenu === "packages" && (
            <EmployeePackageManagement />
          )}
          
          {activeMenu === "services" && (
            <EmployeeServiceManagement
              stats={stats}
              setStats={setStats}
            />
          )}

          {activeMenu === "tasks" && (
             <EmployeeTaskManagement />
          )}

          {activeMenu === "revenue" && (
            <EmployeeRevenue />
          )}

        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
