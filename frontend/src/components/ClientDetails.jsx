import { useState, useEffect } from "react";
import axios from "axios";
import "./ClientDetails.css"; // Import the premium styles

const ClientDetails = ({ client, onBack }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line
    }, [client]);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("employeeToken")
                || sessionStorage.getItem("adminToken") || sessionStorage.getItem("employeeToken");
            if (client.source === 'external') {
                 setLoading(false);
                 return;
            }

            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/client/history/${client._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setHistory(res.data.history);
            }
        } catch (error) {
            console.error("Fetch history error", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to calculate days remaining for visual urgency
    const getExpiryStatus = (dateString) => {
        if (!dateString) return 'neutral';
        const expiry = new Date(dateString);
        const now = new Date();
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'expired';
        if (diffDays <= 7) return 'warning'; // Less than 7 days
        return 'active';
    };

    const expiryStatus = getExpiryStatus(client.expiryDate);
    
    return (
        <div className="client-details-page">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="btn-secondary" onClick={onBack}>
                        ← Back to List
                    </button>
                    <h1 className="page-title" style={{ fontSize: '24px', margin: 0 }}>
                        {client.clientName}
                    </h1>
                </div>
                
                {/* Optional Top Actions */}
                <div className="header-actions">
                     {/* Placeholder for future actions like 'Edit Profile' */}
                </div>
            </div>

            {/* Client Profile Card */}
            <div className="pro-card">
                <div className="details-grid">
                    {/* Column 1: Contact Info */}
                    <div className="detail-group">
                        <label className="detail-label">Client Details</label>
                        <div className="detail-value highlight">{client.clientName}</div>
                        <div className="detail-value" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {client.clientEmail}
                        </div>
                        <div className="detail-value" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {client.clientPhone}
                        </div>
                        <div className="detail-value" style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                            Created By: <span style={{ color: 'var(--text-secondary)' }}>
                                {client.creatorName || (client.createdByType === 'User' ? 'Admin' : (client.createdBy?.name || 'Admin'))}
                            </span>
                        </div>
                    </div>

                    {/* Column 2: Software or Services Access */}
                    <div className="detail-group">
                        <label className="detail-label">
                            {client.clientType === 'service' ? 'Service Access' : 'Software Access'}
                        </label>
                        <div className="detail-value">
                            {client.clientType === 'service' ? (
                                client.serviceIds?.length > 0 
                                ? client.serviceIds.map(s => s.name).join(", ") 
                                : "No Services Linked"
                            ) : (
                                client.softwareId?.name || "N/A"
                            )}
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className={`status-badge ${client.isActive ? 'active' : 'inactive'}`}>
                                {client.isActive ? 'Active' : 'Inactive'}
                            </span>
                             <span className="info-badge" 
                                style={{ 
                                    background: client.clientType === 'service' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                    color: client.clientType === 'service' ? '#8b5cf6' : '#3b82f6',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase'
                                }}
                            >
                                {client.clientType === 'service' ? 'Service ' : 'Software '}
                            </span>
                        </div>
                    </div>

                    {/* Column 3: Plan & Validity */}
                    <div className="detail-group">
                        <label className="detail-label">Current Subscription</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span className="plan-badge">
                                {client.validityPeriod || "No Plan"}
                            </span>
                        </div>
                        <div className={`detail-value ${expiryStatus === 'expired' ? 'text-red-500' : (expiryStatus === 'warning' ? 'text-orange-500' : 'text-green-500')}`}>
                             {client.expiryDate 
                                ? `Expires ${new Date(client.expiryDate).toLocaleDateString('en-GB')}` 
                                : "No Expiry Date"}
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table Section */}
            <div className="section-header">
                <h2 className="section-title">Payment History</h2>
            </div>
            
            <div className="table-container">
                <table className="data-table history-table">
                    <thead>
                        <tr>
                            <th style={{ width: '20%' }}>Date</th>
                            <th style={{ width: '25%' }}>Package</th>
                            <th style={{ width: '15%' }}>Amount</th>
                            <th style={{ width: '15%' }}>Duration</th>
                            <th style={{ width: '15%' }}>Reference ID</th>
                            <th style={{ width: '10%', textAlign: 'right' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="no-data">Loading history...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan="6" className="no-data">No payment history found.</td></tr>
                        ) : (
                            history.map((record) => (
                                <tr key={record._id}>
                                    <td>
                                        <span className="date-text">
                                            {new Date(record.createdAt).toLocaleDateString('en-GB')}
                                        </span>
                                        <div style={{ fontSize: '11px', color: '#666' }}>
                                            {new Date(record.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 500, color: 'white' }}>
                                            {record.packageId?.name || record.packageName || "Unknown Package"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="amount-text">
                                            <span className="currency-symbol">₹</span>
                                            {record.amount}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="duration-text">
                                            {record.packageId?.durationDays} {record.packageId?.unit || 'Days'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="detail-value mono" style={{ fontSize: '12px' }}>
                                            {record.paymentId}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className={`status-badge ${record.status}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientDetails;
