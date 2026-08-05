import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ResellerPerformanceMatrix from "./ResellerPerformanceMatrix";

const ResellerTeamManagement = ({ resellerId }) => {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [permissions, setPermissions] = useState({ allowedSoftware: [], allowedServices: [] });
    const [newMember, setNewMember] = useState({ name: "", email: "", phone: "", assignedSoftware: [], assignedServices: [] });

    useEffect(() => {
        fetchTeam();
        fetchPermissions();
    }, []);

    const fetchTeam = async () => {
        try {
            const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/team`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTeam(res.data.data);
        } catch (err) {
            toast.error("Failed to load team");
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/my-permissions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPermissions(res.data.data);
        } catch (err) {
            toast.error("Failed to load your inventory");
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/team`, newMember, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Team member added successfully");
            setShowAddModal(false);
            fetchTeam();
        } catch (err) {
            toast.error(err.response?.data?.message || "Addition failed");
        }
    };

    const toggleItem = (type, id) => {
        setNewMember(prev => ({
            ...prev,
            [type]: prev[type].includes(id) ? prev[type].filter(i => i !== id) : [...prev[type], id]
        }));
    };

    return (
        <div className="module-container">
            <div className="page-header">
                <h1 className="page-title">My Team</h1>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Team Member</button>
            </div>

            <div className="search-filter-section">
                <div className="search-box">
                    <input type="text" placeholder="Search team members..." className="search-input" />
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Member Name</th>
                            <th>Contact Info</th>
                            <th>Added By</th>
                            <th>Assigned Inventory</th>
                            <th>Joined Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {team.length === 0 ? (
                            <tr><td colSpan="6" className="no-data">No team members found.</td></tr>
                        ) : (
                            team.map(member => (
                                <tr key={member._id} onClick={() => setSelectedMember(member)} style={{ cursor: 'pointer' }} className="member-row">
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '13px' }}>{member.email}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{member.phone}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {member.createdByReseller ? (
                                                <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Owner</span>
                                            ) : member.createdByEmployee ? (
                                                <span>{member.createdByEmployee.name} <br/><small>(Staff)</small></span>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>System</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            <span className="info-badge" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                                                {[...(member.assignedSoftware || []), ...(member.assignedServices || [])].length} Items
                                            </span>
                                        </div>
                                    </td>
                                    <td>{new Date(member.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <span className="status-badge active">Active</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-modal" style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add New Member</h2>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleAddMember} style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input type="text" required value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Email ID</label>
                                    <input type="email" required value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input type="text" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', width: '100%' }}>
                                        <div style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '13px' }}>Safe Credentials</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>A secure auto-generated password will be sent directly to the member's email.</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '24px' }}>
                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>Delegate Inventory Access</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {[...permissions.allowedSoftware, ...permissions.allowedServices].map(item => (
                                        <div 
                                            key={item._id} 
                                            onClick={() => toggleItem(item.price ? 'assignedServices' : 'assignedSoftware', item._id)}
                                            style={{
                                                padding: '10px', borderRadius: '8px', cursor: 'pointer',
                                                border: (newMember.assignedSoftware.includes(item._id) || newMember.assignedServices.includes(item._id)) ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                                                background: (newMember.assignedSoftware.includes(item._id) || newMember.assignedServices.includes(item._id)) ? 'rgba(0, 200, 255, 0.1)' : 'transparent'
                                            }}
                                        >
                                            {item.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '32px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Add Member</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Staff Profile Modal */}
            {selectedMember && (
                <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
                    <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Staff Profile</h2>
                            <button className="premium-close-x" onClick={() => setSelectedMember(null)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '32px' }}>
                                <div style={{ 
                                    width: '64px', height: '64px', 
                                    background: 'linear-gradient(135deg, var(--accent-primary), #a855f7)', 
                                    borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '24px', fontWeight: 'bold', color: 'white'
                                }}>
                                    {selectedMember.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedMember.name}</h3>
                                    <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{selectedMember.email}</div>
                                </div>
                            </div>

                            {/* Header Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '32px' }}>
                                <div className="detail-item-premium">
                                    <div className="d-icon" style={{ background: 'rgba(0, 210, 255, 0.1)', color: '#00d2ff' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    </div>
                                    <div>
                                        <label>PHONE NUMBER</label>
                                        <div className="d-value">{selectedMember.phone || 'Not provided'}</div>
                                    </div>
                                </div>
                                <div className="detail-item-premium">
                                    <div className="d-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    </div>
                                    <div>
                                        <label>JOINED DATE</label>
                                        <div className="d-value">{new Date(selectedMember.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Assignments Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', marginBottom: '40px' }}>
                                <div className="assignment-box-premium">
                                    <h4 className="a-title">Assigned Software</h4>
                                    <div className="a-list">
                                        {selectedMember.assignedSoftware.length > 0 ? selectedMember.assignedSoftware.map(sw => (
                                            <span key={sw._id} className="a-pill sw-pill">{sw.name}</span>
                                        )) : <span className="a-empty">No software assigned</span>}
                                    </div>
                                </div>
                                <div className="assignment-box-premium">
                                    <h4 className="a-title">Assigned Services</h4>
                                    <div className="a-list">
                                        {selectedMember.assignedServices.length > 0 ? selectedMember.assignedServices.map(srv => (
                                            <span key={srv._id} className="a-pill srv-pill">{srv.name}</span>
                                        )) : <span className="a-empty">No services assigned</span>}
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button className="premium-footer-btn" onClick={() => setSelectedMember(null)}>CLOSE PROFILE</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Premium Staff Profile Styles */}
            <style>{`
                .detail-item-premium {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    background: rgba(255,255,255,0.03);
                    padding: 16px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .d-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .detail-item-premium label {
                    display: block;
                    font-size: 10px;
                    color: var(--text-tertiary);
                    letter-spacing: 1px;
                    margin-bottom: 4px;
                }
                .d-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: white;
                }
                
                .assignment-box-premium {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 24px;
                }
                .a-title {
                    font-size: 12px;
                    color: var(--text-tertiary);
                    margin: 0 0 16px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .a-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .a-pill {
                    padding: 6px 14px;
                    border-radius: 100px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .sw-pill { background: rgba(0, 210, 255, 0.1); color: #00d2ff; }
                .srv-pill { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
                .a-empty { font-size: 13px; color: var(--text-tertiary); font-style: italic; }
                
                .matrix-wrapper-modal {
                    margin: 0 -16px;
                }

                .premium-close-x {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.5);
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .premium-close-x:hover {
                    background: rgba(255, 0, 0, 0.1);
                    border-color: rgba(255, 0, 0, 0.2);
                    color: #ff4b2b;
                    transform: rotate(90deg);
                }

                .modal-footer {
                    padding: 24px 32px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    justify-content: flex-end;
                }
                .premium-footer-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 10px 24px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                }
                .premium-footer-btn:hover {
                    background: white;
                    color: black;
                    box-shadow: 0 0 20px rgba(255,255,255,0.2);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};

export default ResellerTeamManagement;
