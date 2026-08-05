import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AdminResellerEarnings = () => {
    const [summary, setSummary] = useState([]);
    const [filteredSummary, setFilteredSummary] = useState([]);
    const [stats, setStats] = useState({ totalPayouts: 0, netRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [payoutLoading, setPayoutLoading] = useState(null);
    
    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = [2024, 2025, 2026];

    const [selectedItem, setSelectedItem] = useState(null);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState("");

    useEffect(() => {
        fetchSummary();
    }, [filters]);

    useEffect(() => {
        applyFilters();
    }, [summary, search, statusFilter]);

    const applyFilters = () => {
        let list = [...summary];

        if (search) {
            const s = search.toLowerCase();
            list = list.filter(item => 
                item.resellerId?.companyName?.toLowerCase().includes(s) ||
                item.resellerId?.email?.toLowerCase().includes(s)
            );
        }

        if (statusFilter !== "all") {
            list = list.filter(item => item.status === statusFilter);
        }

        setFilteredSummary(list);
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-earnings/summary`, {
                params: filters,
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data.summary || []);
            setStats(res.data.stats || { totalPayouts: 0, netRevenue: 0 });
        } catch (err) {
            toast.error("Failed to load earnings summary");
        } finally {
            setLoading(false);
        }
    };

    const handlePayout = (item) => {
        setSelectedItem(item);
        setPayoutAmount(Math.round(item.pendingAmount).toString());
        setShowPayoutModal(true);
    };

    const submitPayout = async () => {
        if (!payoutAmount || isNaN(payoutAmount) || parseFloat(payoutAmount) <= 0) {
            return toast.error("Please enter a valid amount");
        }

        const amount = parseFloat(payoutAmount);
        if (amount > selectedItem.pendingAmount + 0.5) { // Allow tiny floating point margin
            return toast.error("Payout amount cannot exceed pending amount");
        }

        setPayoutLoading(selectedItem.resellerId?._id);
        try {
            const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
            await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-earnings/payout`, {
                resellerId: selectedItem.resellerId?._id,
                month: filters.month,
                year: filters.year,
                amount: amount
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Payout recorded successfully");
            setShowPayoutModal(false);
            fetchSummary();
        } catch (err) {
            toast.error(err.response?.data?.message || "Payout failed");
        } finally {
            setPayoutLoading(null);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'paid': return '#10b981';
            case 'partial_paid': return '#3b82f6';
            default: return '#ef4444';
        }
    };

    return (
        <div className="earnings-dashboard animate-slide-up">
            <div className="dash-header">
                <div className="title-block">
                    <h1>Reseller <span className="text-glow">Earnings</span></h1>
                    <p>Track commission distribution and manage monthly payouts</p>
                </div>

                <div className="filter-row">
                    <div className="search-box glass-pill">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Search Reseller..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <div className="filter-label">Month</div>
                        <div className="glass-pill">
                            <select value={filters.month} onChange={(e) => setFilters({...filters, month: parseInt(e.target.value)})}>
                                {months.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="filter-group">
                        <div className="filter-label">Year</div>
                        <div className="glass-pill">
                            <select value={filters.year} onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="filter-group">
                        <div className="filter-label">Status</div>
                        <div className="glass-pill">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="all">All Status</option>
                                <option value="paid">Paid</option>
                                <option value="partial_paid">Partial Paid</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="summary-section">
                <div className="summary-badge glass-card">
                    <span className="badge-text">Total Commission Distribution</span>
                    <span className="badge-amount">₹{stats.totalPayouts.toLocaleString()}</span>
                </div>
            </div>

            <div className="ledger-table-container glass-card">
                <table className="earnings-table">
                    <thead>
                        <tr>
                            <th>RESELLER</th>
                            <th>REVENUE</th>
                            <th>EARNED</th>
                            <th>PAID</th>
                            <th>PENDING</th>
                            <th>STATUS</th>
                            <th>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="row-msg">Loading ledger data...</td></tr>
                        ) : filteredSummary.length === 0 ? (
                            <tr><td colSpan={7} className="row-msg">No earnings found matching your filters.</td></tr>
                        ) : (
                            filteredSummary.map(item => (
                                <tr key={item._id}>
                                    <td>
                                        <div className="res-name">{item.resellerId?.companyName}</div>
                                        <div className="res-email">{item.resellerId?.email}</div>
                                    </td>
                                    <td><div className="amount-val">₹{Math.round(item.totalRevenue).toLocaleString()}</div></td>
                                    <td><div className="amount-val earned">₹{Math.round(item.totalCommission).toLocaleString()}</div></td>
                                    <td><div className="amount-val paid">₹{Math.round(item.paidAmount).toLocaleString()}</div></td>
                                    <td><div className="amount-val pending">₹{Math.round(item.pendingAmount).toLocaleString()}</div></td>
                                    <td>
                                        <div className="status-badge" style={{ backgroundColor: `${getStatusColor(item.status)}20`, color: getStatusColor(item.status), borderColor: `${getStatusColor(item.status)}40` }}>
                                            {item.status.replace('_', ' ').toUpperCase()}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className="action-pay-btn" 
                                                disabled={item.pendingAmount <= 0 || payoutLoading === item.resellerId?._id}
                                                onClick={() => handlePayout(item)}
                                            >
                                                {payoutLoading === item.resellerId?._id ? "..." : "Pay"}
                                            </button>
                                            <button 
                                                className="action-history-btn"
                                                onClick={() => { setSelectedItem(item); setShowHistoryModal(true); }}
                                                title="View History"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showPayoutModal && selectedItem && (
                <div className="modal-overlay" onClick={() => setShowPayoutModal(false)}>
                    <div className="modal-content glass-card animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Record Payout</h3>
                            <button className="close-btn" onClick={() => setShowPayoutModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="info-row">
                                <span>Reseller:</span>
                                <strong>{selectedItem.resellerId?.companyName}</strong>
                            </div>
                            <div className="info-row">
                                <span>Pending Balance:</span>
                                <strong style={{ color: '#ef4444' }}>₹{Math.round(selectedItem.pendingAmount).toLocaleString()}</strong>
                            </div>
                            <div className="input-group">
                                <label>Amount to Pay</label>
                                <div className="amount-input-wrapper">
                                    <span>₹</span>
                                    <input 
                                        type="text" 
                                        value={payoutAmount} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                                setPayoutAmount(val);
                                            }
                                        }}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowPayoutModal(false)}>Cancel</button>
                            <button 
                                className="btn-primary" 
                                onClick={submitPayout}
                                disabled={payoutLoading === selectedItem.resellerId?._id}
                            >
                                {payoutLoading === selectedItem.resellerId?._id ? "Processing..." : "Confirm Payout"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showHistoryModal && selectedItem && (
                <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="modal-content glass-card history-modal animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Payout History</h3>
                            <button className="close-btn" onClick={() => setShowHistoryModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="history-info">
                                <strong>{selectedItem.resellerId?.companyName}</strong>
                                <span>{months[filters.month-1]} {filters.year}</span>
                            </div>
                            {!selectedItem.payouts || selectedItem.payouts.length === 0 ? (
                                <p className="no-history">No payout records found for this period.</p>
                            ) : (
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItem.payouts.map((p, idx) => (
                                            <tr key={idx}>
                                                <td>{new Date(p.date).toLocaleString()}</td>
                                                <td className="h-amount">₹{Math.round(p.amount).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .earnings-dashboard { display: flex; flex-direction: column; gap: 24px; padding: 10px; }
                .dash-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
                .title-block h1 { font-size: 24px; font-weight: 800; color: white; margin-bottom: 4px; }
                .title-block p { font-size: 13px; color: var(--text-tertiary); }
                .text-glow { color: #3b82f6; text-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }

                .filter-row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
                .filter-group { display: flex; flex-direction: column; gap: 6px; }
                .filter-label { font-size: 10px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; margin-left: 4px; }

                .glass-pill { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px 16px; display: flex; gap: 10px; align-items: center; transition: 0.3s; }
                .glass-pill:focus-within { background: rgba(255,255,255,0.08); border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
                .glass-pill select { background: transparent; border: none; color: white; outline: none; font-size: 13px; cursor: pointer; }
                .glass-pill select option { background: #1a1a2e; color: white; }
                .glass-pill input { background: transparent; border: none; color: white; outline: none; font-size: 13px; width: 180px; }
                .search-box svg { color: var(--text-tertiary); }

                .summary-section { margin-bottom: -8px; }
                .summary-badge { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-radius: 16px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); }
                .badge-text { font-size: 14px; color: var(--text-tertiary); font-weight: 500; }
                .badge-amount { font-size: 22px; font-weight: 800; color: #3b82f6; text-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }

                .ledger-table-container { padding: 0; border-radius: 20px; overflow: hidden; }
                .earnings-table { width: 100%; border-collapse: collapse; }
                .earnings-table th { padding: 15px 20px; text-align: left; font-size: 10px; color: var(--text-tertiary); text-transform: uppercase; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); }
                .earnings-table td { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.02); }
                
                .res-name { font-size: 14px; font-weight: 600; color: white; }
                .res-email { font-size: 11px; color: var(--text-tertiary); }
                
                .amount-val { font-size: 14px; font-weight: 700; color: #ddd; }
                .amount-val.earned { color: #a15dfd; }
                .amount-val.paid { color: #10b981; }
                .amount-val.pending { color: #ef4444; }
                
                .status-badge { padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 700; border: 1px solid; }
                
                .action-pay-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.3s; }
                .action-pay-btn:hover:not(:disabled) { background: #2563eb; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }
                .action-pay-btn:disabled { opacity: 0.3; cursor: not-allowed; }

                .action-history-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); padding: 8px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
                .action-history-btn:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.2); }

                /* Modal Styles */
                .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
                .modal-content { width: 100%; max-width: 400px; border-radius: 24px; overflow: hidden; }
                .modal-content.history-modal { max-width: 500px; }
                
                .modal-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .modal-header h3 { font-size: 18px; font-weight: 700; color: white; margin: 0; }
                .close-btn { background: none; border: none; color: var(--text-tertiary); font-size: 24px; cursor: pointer; line-height: 1; }
                .close-btn:hover { color: white; }

                .modal-body { padding: 24px; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
                .info-row span { color: var(--text-tertiary); }
                
                .input-group { margin-top: 24px; }
                .input-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 10px; }
                .amount-input-wrapper { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); padding: 12px 20px; border-radius: 12px; }
                .amount-input-wrapper span { font-size: 20px; font-weight: 700; color: #3b82f6; }
                .amount-input-wrapper input { background: transparent; border: none; color: white; font-size: 24px; font-weight: 800; width: 100%; outline: none; }
                
                .modal-footer { padding: 20px 24px; background: rgba(255,255,255,0.02); display: flex; gap: 12px; }
                .btn-primary { flex: 1; background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.3s; }
                .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-2px); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.3s; }
                .btn-secondary:hover { background: rgba(255,255,255,0.1); }

                .history-info { margin-bottom: 20px; display: flex; flex-direction: column; gap: 4px; }
                .history-info strong { font-size: 16px; color: white; }
                .history-info span { font-size: 12px; color: var(--text-tertiary); }

                .history-table { width: 100%; border-collapse: collapse; }
                .history-table th { text-align: left; font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .history-table td { padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; }
                .h-amount { color: #10b981; font-weight: 700; text-align: right; }
                .no-history { text-align: center; color: var(--text-tertiary); font-style: italic; padding: 20px 0; }

                .row-msg { text-align: center; padding: 40px; color: var(--text-tertiary); font-style: italic; }
                
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default AdminResellerEarnings;
