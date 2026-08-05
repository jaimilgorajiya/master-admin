import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { TableSkeleton } from "./LoadingSkeleton";
import { SocketContext } from "../context/SocketContext";

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("employeeToken") || sessionStorage.getItem("employeeToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const fmt = (days, unit) => {
    if (!days) return "—";
    const u = (unit || "days").toLowerCase();
    if (u === "one-time") return "One Time";
    return `${days} ${u.charAt(0).toUpperCase() + u.slice(1)}`;
};

const PackageCard = ({ pkg }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'var(--glass-bg)',
                border: `1px solid ${hovered ? 'rgba(0,200,255,0.35)' : 'var(--glass-border)'}`,
                borderRadius: '16px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '16px',
                transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
                transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
                boxShadow: hovered ? '0 8px 28px rgba(0,200,255,0.12)' : 'none',
            }}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #00c8ff, #a855f7)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff', flex: 1, paddingRight: '12px' }}>{pkg.name}</h3>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#00c8ff', whiteSpace: 'nowrap' }}>
                    ₹{(pkg.price || 0).toLocaleString()}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {fmt(pkg.durationDays, pkg.unit)}
            </div>

            {pkg.serviceIds?.length > 0 && (
                <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Includes</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {pkg.serviceIds.map(s => (
                            <span key={s._id} style={{
                                background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.2)',
                                color: '#00c8ff', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                            }}>{s.name}</span>
                        ))}
                    </div>
                </div>
            )}

            {pkg.description && (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {pkg.description}
                </p>
            )}
        </div>
    );
};

const EmployeePackageManagement = () => {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const socket = useContext(SocketContext);

    useEffect(() => { fetchPackages(); }, []);

    useEffect(() => {
        if (!socket) return;
        const handler = () => fetchPackages();
        socket.on("package_data_change", handler);
        return () => socket.off("package_data_change", handler);
    }, [socket]);

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/package/all`, { headers: authHeaders() });
            if (res.data.success) {
                // Match admin view: only active packages that have services assigned
                setPackages((res.data.packages || []).filter(p => p.isActive && p.serviceIds && p.serviceIds.length > 0));
            }
        } catch {
            toast.error("Failed to load packages");
        } finally {
            setLoading(false);
        }
    };

    const filtered = packages.filter(p => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(q) ||
            (p.serviceIds || []).some(s => s.name?.toLowerCase().includes(q)) ||
            (p.description || "").toLowerCase().includes(q)
        );
    });

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Available Packages</h1>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {filtered.length} package{filtered.length !== 1 ? 's' : ''} available
                </span>
            </div>

            <div className="search-filter-section" style={{ marginBottom: '24px' }}>
                <div className="search-box" style={{ maxWidth: '400px' }}>
                    <input type="text" placeholder="Search packages..." value={search}
                        onChange={e => setSearch(e.target.value)} className="search-input" />
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                </div>
            </div>

            {loading ? (
                <TableSkeleton rows={4} columns={4} />
            ) : filtered.length === 0 ? (
                <div className="table-container">
                    <div className="no-data" style={{ padding: '60px' }}>
                        {search ? "No packages match your search." : "No packages available."}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {filtered.map(pkg => <PackageCard key={pkg._id} pkg={pkg} />)}
                </div>
            )}
        </div>
    );
};

export default EmployeePackageManagement;
