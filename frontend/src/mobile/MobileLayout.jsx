import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './MobilePanel.css';

const MobileLayout = ({ children }) => {
    const location = useLocation();

    const navItems = [
        { path: '/mobile/reseller/dashboard', icon: '🏠', label: 'Home' },
        { path: '/mobile/reseller/clients', icon: '👥', label: 'Clients' },
        { path: '/mobile/reseller/margins', icon: '📊', label: 'Margins' },
        { path: '/mobile/reseller/profile', icon: '👤', label: 'Profile' }
    ];

    // Check if it's staff panel to adjust nav items
    const isStaff = location.pathname.includes('/mobile/staff');
    const staffNavItems = [
        { path: '/mobile/staff/dashboard', icon: '⚡', label: 'Tasks' },
        { path: '/mobile/staff/search', icon: '🔍', label: 'Search' },
        { path: '/mobile/staff/profile', icon: '👤', label: 'Profile' }
    ];

    const items = isStaff ? staffNavItems : navItems;

    const getIcon = (icon) => {
        const iconMap = {
            '🏠': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
            '👥': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
            '📊': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
            '👤': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
            '⚡': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
            '🔍': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        };
        return iconMap[icon] || icon;
    };

    return (
        <div className="mobile-container">
            <main>{children}</main>
            
            <nav className="floating-nav">
                {items.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <div className="nav-icon" style={{ width: '24px', height: '24px' }}>
                            {getIcon(item.icon)}
                        </div>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default MobileLayout;
