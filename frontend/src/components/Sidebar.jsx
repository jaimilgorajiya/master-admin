import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { softwareRegistry } from "../config/softwareRegistry";

const SidebarNavItem = ({ item, activeMenu, handleMenuChange }) => {
  const isActive = activeMenu === item.id || (item.submenu && item.submenu.some(sub => sub.id === activeMenu));
  const hasSubmenu = !!item.submenu;
  const [isExpanded, setIsExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) setIsExpanded(true);
  }, [isActive]);

  const handleClick = () => {
    if (hasSubmenu) {
      handleMenuChange(item.id);
      setIsExpanded(!isExpanded);
    } else {
      handleMenuChange(item.id);
    }
  };

  return (
    <div className="sidebar-menu-group">
      <button
        className={`sidebar-item ${isActive ? "active" : ""}`}
        onClick={handleClick}
        style={{ justifyContent: "space-between" }}
      >
        <span>{item.label}</span>
        {hasSubmenu && (
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ 
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease" 
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        )}
      </button>
      {hasSubmenu && (
        <div className={`sidebar-submenu ${isExpanded ? "open" : ""}`} style={{ 
          maxHeight: isExpanded ? "200px" : "0", 
          overflow: "hidden", 
          transition: "max-height 0.3s ease"
        }}>
          {item.submenu.map((sub) => (
            <button
              key={sub.id}
              className={`sidebar-subitem ${activeMenu === sub.id ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleMenuChange(sub.id);
              }}
            >
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px', opacity: 0.7}}>
                <circle cx="12" cy="12" r="4"></circle>
              </svg>
              {sub.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, activeMenu, handleMenuChange }) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard" },
    { 
      id: "software", 
      label: "Software",
      submenu: softwareRegistry.map(sw => ({
        id: `software-${sw.key}`,
        label: sw.name
      }))
    },
    { id: "clients", label: "Clients" },
    { id: "resellers", label: "Resellers" },
    { id: "revenue", label: "Revenue" },
    { id: "packages", label: "Packages" },
    { id: "services", label: "Services" },
    { id: "coupons", label: "Coupons" },
    { id: "tasks", label: "Tasks" },
    { 
      id: "staff", 
      label: "Employees",
      submenu: [
        { id: "dept_positions", label: "Departments & Positions" }
      ]
    },
    {
      id: "reseller-earnings",
      label: "Partner Payouts"
    },
  ];

  return (
    <>
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="mobile-menu-close" style={{ display: 'none', justifyContent: 'flex-end', padding: '10px' }}>
          <button 
            className="icon-button"
            onClick={() => setIsSidebarOpen(false)}
            style={{ display: 'flex' }}
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        {/* Scrollable Nav Area */}
        <div className="sidebar-nav-container" style={{ 
          flex: 1, 
          overflowY: 'auto', 
          paddingRight: '4px' 
        }}>
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <SidebarNavItem 
                key={item.id} 
                item={item} 
                activeMenu={activeMenu} 
                handleMenuChange={(menuId) => {
                  handleMenuChange(menuId);
                  setIsSidebarOpen(false);
                }} 
              />
            ))}
          </nav>
        </div>
        
        <div className="sidebar-footer">
          <p className="footer-text">
            Designed, developed & maintain by <a href="https://iflorainfo.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#007bff", textDecoration: "underline" }}>IIPL</a>
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
