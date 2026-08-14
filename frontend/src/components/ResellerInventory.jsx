import { useState, useEffect } from "react";
import axios from "axios";
import { TableSkeleton } from "./LoadingSkeleton";

const ResellerInventory = () => {
    const [inventory, setInventory] = useState({ allowedSoftware: [], allowedServices: [] });
    const [loading, setLoading] = useState(true);
    const [expandedSw, setExpandedSw] = useState(null);
    const [packagesMap, setPackagesMap] = useState({});
    const [fetchingPkgs, setFetchingPkgs] = useState(null);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/my-permissions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setInventory(res.data.data);
            }
        } catch (err) {
            console.error("Failed to load inventory", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPackages = async (sw) => {
        if (expandedSw === sw._id) {
            setExpandedSw(null);
            return;
        }

        setExpandedSw(sw._id);
        if (packagesMap[sw._id]) return;

        setFetchingPkgs(sw._id);
        try {
            const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
            // Use the proxy to fetch external packages
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`, {
                targetUrl: sw.packageGetApi,
                method: "GET"
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const pList = Array.isArray(res.data) ? res.data : (res.data.packages || res.data.data || []);
            setPackagesMap(prev => ({ ...prev, [sw._id]: pList }));
        } catch (err) {
            console.error("Failed to fetch packages", err);
            // Fallback: try local packages if proxy fails or just show empty
            setPackagesMap(prev => ({ ...prev, [sw._id]: [] }));
        } finally {
            setFetchingPkgs(null);
        }
    };

    if (loading) return <TableSkeleton rows={4} columns={3} />;

    return (
        <div className="module-container">
            <div className="page-header">
                <h1 className="page-title">My Assigned Inventory</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '10px' }}>
                {/* Software Section */}
                <div className="pro-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                        <div style={{ padding: '10px', background: 'rgba(0, 200, 255, 0.1)', color: 'var(--accent-primary)', borderRadius: '12px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Software Access</h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Click software to view available packages</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {inventory.allowedSoftware?.length === 0 ? (
                            <div className="no-data" style={{ padding: '20px' }}>No software assigned.</div>
                        ) : inventory.allowedSoftware.map(sw => (
                            <div key={sw._id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div 
                                    onClick={() => fetchPackages(sw)}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 18px', background: 'rgba(255,255,255,0.03)', 
                                        border: expandedSw === sw._id ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)', 
                                        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {sw.name}
                                        <svg style={{ transform: expandedSw === sw._id ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="m6 9 6 6 6-6"/>
                                        </svg>
                                    </div>
                                    <span className="status-badge active">Active</span>
                                </div>
                                
                                {expandedSw === sw._id && (
                                    <div style={{ 
                                        padding: '16px', background: 'rgba(0, 200, 255, 0.05)', 
                                        borderRadius: '12px', border: '1px solid rgba(0, 200, 255, 0.1)',
                                        animation: 'fadeInDown 0.3s ease'
                                    }}>
                                        {fetchingPkgs === sw._id ? (
                                            <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: 'var(--text-tertiary)' }}>Loading packages...</div>
                                        ) : packagesMap[sw._id]?.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: 'var(--text-tertiary)' }}>No packages found for this platform.</div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                {packagesMap[sw._id]?.map((pkg, idx) => (
                                                    <div key={pkg._id || idx} style={{ 
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.05)'
                                                    }}>
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{pkg.name}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                                {pkg.panelDays ? `${pkg.panelDays} Days` : (pkg.durationDays ? `${pkg.durationDays} Days` : `${pkg.duration?.value || pkg.durationValue || '0'} ${pkg.unit || 'Days'}`)} Validity
                                                            </div>
                                                        </div>
                                                        <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '14px' }}>
                                                            ₹{pkg.totalPrice ?? pkg.price ?? pkg.basePrice ?? 0}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Services Section */}
                <div className="pro-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                        <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', borderRadius: '12px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Service Access</h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>Authorized services and base pricing</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {inventory.allowedServices?.length === 0 ? (
                            <div className="no-data" style={{ padding: '20px' }}>No services assigned.</div>
                        ) : inventory.allowedServices.map(srv => (
                            <div key={srv._id} style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 18px', background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid var(--glass-border)', borderRadius: '12px'
                            }}>
                                <div style={{ fontWeight: 600, color: '#fff' }}>{srv.name}</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#a855f7' }}>₹{srv.price}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ResellerInventory;
