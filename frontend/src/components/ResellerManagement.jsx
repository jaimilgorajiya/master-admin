import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import AddReseller from "./AddReseller";
import EditResellerMargin from "./EditResellerMargin";
import ResellerProfile from "./ResellerProfile";
import { TableSkeleton } from "./LoadingSkeleton";

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const ResellerManagement = ({ initialShowAddForm = false, onFormClose }) => {
    const [resellers, setResellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(initialShowAddForm);
    const [editReseller, setEditReseller] = useState(null);
    const [selectedReseller, setSelectedReseller] = useState(null);
    const [profileResellerId, setProfileResellerId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchResellers();
    }, []);

    useEffect(() => {
        if (initialShowAddForm) setShowAdd(true);
    }, [initialShowAddForm]);

    const fetchResellers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/reseller/all`, { headers: authHeaders() });
            if (res.data.success) {
                setResellers(res.data.list);
            }
        } catch (err) {
            toast.error("Failed to fetch resellers");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (reseller) => {
        const result = await Swal.fire({
            title: "Delete Reseller?",
            text: `Are you sure you want to delete "${reseller.companyName}"? This will revoke all their access.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#00c8ff",
            cancelButtonColor: "rgba(255,255,255,0.05)",
            confirmButtonText: "Yes, Delete",
            cancelButtonText: "Cancel",
            background: "#0f172a",
            color: "#fff",
            customClass: {
                popup: "premium-swal-popup",
                confirmButton: "premium-swal-confirm-danger",
                cancelButton: "premium-swal-cancel",
            }
        });

        if (!result.isConfirmed) return;

        try {
            await axios.delete(`${API}/api/reseller/${reseller._id}`, { headers: authHeaders() });
            toast.success("Reseller deleted successfully");
            fetchResellers();
        } catch (err) {
            toast.error("Error deleting reseller");
        }
    };

    const filtered = resellers.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (profileResellerId) {
        return <ResellerProfile resellerId={profileResellerId} onBack={() => setProfileResellerId(null)} />;
    }

    return (
        <>
            <div>
                <div className="page-header">
                <h1 className="page-title">Reseller Management</h1>
                <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add Reseller</button>
            </div>

            {showAdd && (
                <AddReseller 
                    onClose={() => { setShowAdd(false); if(onFormClose) onFormClose(); }} 
                    onSuccess={() => { setShowAdd(false); if(onFormClose) onFormClose(); fetchResellers(); }}
                />
            )}

            {editReseller && (
                <EditResellerMargin 
                    reseller={editReseller}
                    onClose={() => setEditReseller(null)}
                    onSuccess={() => { setEditReseller(null); fetchResellers(); }}
                />
            )}

            {selectedReseller && (
                <div className="modal-overlay" onClick={() => setSelectedReseller(null)}>
                    <div className="reseller-detail-modal glass-card animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="detail-modal-header">
                            <h2>Partner Details</h2>
                            <button className="close-btn" onClick={() => setSelectedReseller(null)}>&times;</button>
                        </div>
                        <div className="detail-modal-body">
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>Partner Name</label>
                                    <p>{selectedReseller.name}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Company Name</label>
                                    <p>{selectedReseller.companyName}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Email Address</label>
                                    <p>{selectedReseller.email}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Phone Number</label>
                                    <p>{selectedReseller.phone}</p>
                                </div>
                            </div>

                            <div className="detail-section">
                                <label>Allowed Software</label>
                                <div className="tag-container">
                                    {selectedReseller.allowedSoftware?.length > 0 ? selectedReseller.allowedSoftware.map(s => (
                                        <span key={s._id} className="detail-tag blue">{s.name}</span>
                                    )) : <span className="no-tags">No software assigned</span>}
                                </div>
                            </div>

                            <div className="detail-section">
                                <label>Assigned Services</label>
                                <div className="tag-container">
                                    {selectedReseller.allowedServices?.length > 0 ? selectedReseller.allowedServices.map(s => (
                                        <span key={s._id} className="detail-tag purple">{s.name}</span>
                                    )) : <span className="no-tags">No services assigned</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="search-filter-section">
                <div className="search-box">
                    <input 
                        type="text" 
                        placeholder="Search resellers..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                </div>
            </div>

            {loading ? <TableSkeleton rows={5} columns={6} /> : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Partner Details</th>
                                <th>Company</th>
                                <th>Allowed Software</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan="6" className="no-data">No resellers found.</td></tr>
                            ) : filtered.map(r => (
                                <tr key={r._id}>
                                    <td onClick={() => setProfileResellerId(r._id)} style={{ cursor: 'pointer' }} className="partner-cell">
                                        <div style={{ fontWeight: 600, color: '#00c8ff' }} className="partner-name-hover">{r.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{r.email}</div>
                                    </td>
                                    <td>{r.companyName}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {r.allowedSoftware?.length > 0 ? r.allowedSoftware.map(s => (
                                                <span key={s._id} style={{ background: 'rgba(0,200,255,0.1)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>{s.name}</span>
                                            )) : <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>None</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ 
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                                            background: r.status === 'Active' ? 'rgba(40,167,69,0.1)' : 'rgba(255,59,48,0.1)',
                                            color: r.status === 'Active' ? '#28a745' : '#ff3b30'
                                        }}>{r.status}</span>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn-icon" onClick={() => setEditReseller(r)} title="Commission Setup" style={{ color: '#3b82f6' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                            </button>
                                            <button className="btn-icon delete-btn" onClick={() => handleDelete(r)} title="Delete" style={{ color: '#ff3b30' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
        <style>{`
            .partner-cell:hover .partner-name-hover {
                color: var(--accent-primary) !important;
                text-decoration: underline;
            }

            .modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
            }

            .reseller-detail-modal {
                width: 100%;
                max-width: 550px;
                background: rgba(23, 23, 35, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 32px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                position: relative;
                overflow: hidden;
            }

            .reseller-detail-modal::before {
                content: '';
                position: absolute;
                top: 0; left: 0; width: 100%; height: 4px;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            }

            .detail-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 28px;
            }

            .detail-modal-header h2 {
                font-size: 20px;
                font-weight: 800;
                color: white;
                margin: 0;
                letter-spacing: -0.5px;
            }

            .close-btn {
                background: rgba(255, 255, 255, 0.05);
                border: none;
                color: rgba(255, 255, 255, 0.5);
                width: 32px;
                height: 32px;
                border-radius: 10px;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .close-btn:hover {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }

            .detail-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                margin-bottom: 32px;
            }

            .detail-item label {
                display: block;
                font-size: 11px;
                font-weight: 700;
                color: rgba(255, 255, 255, 0.4);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 6px;
            }

            .detail-item p {
                font-size: 14px;
                color: white;
                margin: 0;
                font-weight: 500;
            }

            .detail-section {
                margin-bottom: 24px;
            }

            .detail-section label {
                display: block;
                font-size: 11px;
                font-weight: 700;
                color: rgba(255, 255, 255, 0.4);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 12px;
            }

            .tag-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .detail-tag {
                padding: 6px 12px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 600;
            }

            .detail-tag.blue {
                background: rgba(59, 130, 246, 0.1);
                color: #60a5fa;
                border: 1px solid rgba(59, 130, 246, 0.2);
            }

            .detail-tag.purple {
                background: rgba(139, 92, 246, 0.1);
                color: #a78bfa;
                border: 1px solid rgba(139, 92, 246, 0.2);
            }

            .no-tags {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.2);
                font-style: italic;
            }
        `}</style>
        </>
    );
};

export default ResellerManagement;
