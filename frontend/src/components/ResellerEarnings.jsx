import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const ResellerEarnings = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedLedger, setSelectedLedger] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-earnings/my-earnings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (err) {
            toast.error("Failed to load earnings data");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-state">Syncing your financial data...</div>;
    if (!data) return <div className="no-data-state">No earnings data found.</div>;

    const { history, currentLedger, marginConfig } = data;

    // Calculate Slab Progress if applicable
    const isSlabWise = marginConfig?.mode === 'slab_wise';
    const currentRevenue = currentLedger?.totalRevenue || 0;
    
    let activeSlab = null;
    let nextSlab = null;
    
    if (isSlabWise && marginConfig.slabs) {
        const sortedSlabs = [...marginConfig.slabs].sort((a, b) => a.minRevenue - b.minRevenue);
        activeSlab = sortedSlabs.find(s => currentRevenue >= s.minRevenue && currentRevenue <= s.maxRevenue);
        if (!activeSlab) {
            // Check if it's beyond the last slab
            if (sortedSlabs.length > 0 && currentRevenue > sortedSlabs[sortedSlabs.length - 1].maxRevenue) {
                activeSlab = sortedSlabs[sortedSlabs.length - 1];
            } else {
                nextSlab = sortedSlabs[0];
            }
        } else {
            const idx = sortedSlabs.indexOf(activeSlab);
            if (idx < sortedSlabs.length - 1) nextSlab = sortedSlabs[idx + 1];
        }
    }

    const progressPercent = nextSlab 
        ? Math.min(100, (currentRevenue / nextSlab.minRevenue) * 100) 
        : 100;

    return (
        <div className="reseller-earnings-page animate-fade-in">
            <div className="earnings-header">
                <div className="title-section">
                    <h1>My <span className="text-blue">Earnings</span></h1>
                    <p>Financial transparency and performance tracking</p>
                </div>
                <div className="strategy-pill glass-card">
                    <span className="s-label">Active Strategy:</span>
                    <span className="s-value">{marginConfig.mode.replace('_', ' ').toUpperCase()}</span>
                </div>
            </div>

            {/* Top Stats */}
            <div className="stats-row">
                <div className="stat-card glass-card">
                    <div className="st-icon earnings">₹</div>
                    <div className="st-body">
                        <div className="st-label">Total Earned</div>
                        <div className="st-value">₹{(currentLedger?.totalCommission || 0).toLocaleString()}</div>
                        <div className="st-sub">This Month</div>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <div className="st-icon paid">✓</div>
                    <div className="st-body">
                        <div className="st-label">Paid Out</div>
                        <div className="st-value">₹{(currentLedger?.paidAmount || 0).toLocaleString()}</div>
                        <div className="st-sub">Transfer process completed</div>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <div className="st-icon pending">!</div>
                    <div className="st-body">
                        <div className="st-label">Pending Payout</div>
                        <div className="st-value">₹{(currentLedger?.pendingAmount || 0).toLocaleString()}</div>
                        <div className="st-sub">Awaiting admin clearance</div>
                    </div>
                </div>
            </div>

            {/* Slab Progress for Performance Based */}
            {isSlabWise && (
                <div className="slab-progress-section glass-card">
                    <div className="slab-header">
                        <h3>Performance <span className="text-purple">Growth</span></h3>
                        <div className="slab-bonus">
                            Current Margin: <span>{activeSlab ? `${activeSlab.margin}${activeSlab.type === 'percentage' ? '%' : '₹'}` : 'Base'}</span>
                        </div>
                    </div>
                    
                    <div className="progress-container">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <div className="progress-markers">
                            <span>₹{currentRevenue.toLocaleString()} </span>
                            {nextSlab && <span>Next Goal: ₹{nextSlab.minRevenue.toLocaleString()} (+{nextSlab.margin}%)</span>}
                        </div>
                    </div>

                    <div className="slabs-grid">
                        {marginConfig.slabs.map((s, idx) => (
                            <div key={idx} className={`slab-mini-card ${activeSlab === s ? 'active' : ''}`}>
                                <div className="m-range">₹{s.minRevenue / 1000}k - ₹{s.maxRevenue / 1000}k</div>
                                <div className="m-val">{s.margin}{s.type === 'percentage' ? '%' : '₹'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* History Table */}
            <div className="history-section glass-card">
                <div className="section-header">
                    <h3>Ledger History</h3>
                </div>
                <div className="table-wrapper">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>PERIOD</th>
                                <th>TOTAL REVENUE</th>
                                <th>COMMISSION</th>
                                <th>PAID</th>
                                <th>PENDING</th>
                                <th>STATUS</th>
                                <th>PAYOUTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr><td colSpan={7} className="empty">No historical data available.</td></tr>
                            ) : (
                                history.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{new Date(0, item.month-1).toLocaleString('default', { month: 'long' })} {item.year}</td>
                                        <td>₹{Math.round(item.totalRevenue).toLocaleString()}</td>
                                        <td className="text-purple">₹{Math.round(item.totalCommission).toLocaleString()}</td>
                                        <td className="text-emerald">₹{Math.round(item.paidAmount).toLocaleString()}</td>
                                        <td className="text-red">₹{Math.round(item.pendingAmount).toLocaleString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span className={`status-dot ${item.status}`}></span>
                                                {item.status.replace('_', ' ').toUpperCase()}
                                            </div>
                                        </td>
                                        <td>
                                            <button 
                                                className="btn-view-payouts"
                                                onClick={() => { setSelectedLedger(item); setShowHistoryModal(true); }}
                                                disabled={!item.payouts || item.payouts.length === 0}
                                            >
                                                VIEW
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showHistoryModal && selectedLedger && (
                <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="modal-content glass-card animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Payout Details</h3>
                            <button className="close-btn" onClick={() => setShowHistoryModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="payout-period">
                                <strong>{new Date(0, selectedLedger.month-1).toLocaleString('default', { month: 'long' })} {selectedLedger.year}</strong>
                                <span>Complete payment history for this cycle</span>
                            </div>
                            <table className="payout-list-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedLedger.payouts.map((p, i) => (
                                        <tr key={i}>
                                            <td>{new Date(p.date).toLocaleString()}</td>
                                            <td className="p-amount">₹{Math.round(p.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .reseller-earnings-page { display: flex; flex-direction: column; gap: 32px; padding: 10px; }
                .earnings-header { display: flex; justify-content: space-between; align-items: center; }
                .title-section h1 { font-size: 32px; font-weight: 800; color: white; margin-bottom: 4px; }
                .title-section p { color: var(--text-tertiary); font-size: 14px; }
                .text-blue { color: #3b82f6; }
                .text-purple { color: #a15dfd; }
                .text-emerald { color: #10b981; }
                .text-red { color: #ef4444; }

                .strategy-pill { padding: 12px 24px; display: flex; gap: 12px; align-items: center; border-radius: 100px; }
                .s-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; }
                .s-value { font-size: 13px; font-weight: 700; color: #3b82f6; }

                .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                .stat-card { padding: 24px; display: flex; gap: 20px; align-items: center; }
                .st-icon { width: 50px; height: 50px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; }
                .st-icon.earnings { background: rgba(161, 93, 253, 0.1); color: #a15dfd; }
                .st-icon.paid { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .st-icon.pending { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .st-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 4px; }
                .st-value { font-size: 24px; font-weight: 800; color: white; }
                .st-sub { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px; }

                .slab-progress-section { padding: 32px; }
                .slab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .slab-bonus { background: rgba(161, 93, 253, 0.1); padding: 8px 16px; border-radius: 10px; font-size: 13px; color: white; }
                .slab-bonus span { color: #a15dfd; font-weight: 700; }
                
                .progress-container { margin-bottom: 24px; }
                .progress-bar { height: 12px; background: rgba(255,255,255,0.05); border-radius: 100px; overflow: hidden; margin-bottom: 12px; }
                .progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #a15dfd); border-radius: 100px; box-shadow: 0 0 20px rgba(161, 93, 253, 0.4); }
                .progress-markers { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-tertiary); }

                .slabs-grid { display: flex; gap: 12px; flex-wrap: wrap; }
                .slab-mini-card { flex: 1; min-width: 120px; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); text-align: center; }
                .slab-mini-card.active { border-color: #a15dfd; background: rgba(161, 93, 253, 0.1); }
                .m-range { font-size: 10px; color: var(--text-tertiary); margin-bottom: 4px; }
                .m-val { font-size: 14px; font-weight: 700; color: white; }

                .history-section { padding: 32px; }
                .history-table { width: 100%; border-collapse: collapse; }
                .history-table th { text-align: left; padding: 12px 15px; font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .history-table td { padding: 18px 15px; font-size: 13px; color: #ddd; border-bottom: 1px solid rgba(255,255,255,0.02); }
                .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 10px; }
                .status-dot.paid { background: #10b981; box-shadow: 0 0 10px #10b981; }
                .status-dot.pending { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
                .status-dot.partial_paid { background: #3b82f6; box-shadow: 0 0 10px #3b82f6; }

                .btn-view-payouts { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 6px 12px; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer; transition: 0.3s; }
                .btn-view-payouts:hover:not(:disabled) { background: #3b82f6; color: white; }
                .btn-view-payouts:disabled { opacity: 0.2; cursor: not-allowed; border-color: transparent; color: var(--text-tertiary); }

                /* Modal Styles */
                .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
                .modal-content { width: 100%; max-width: 450px; border-radius: 24px; overflow: hidden; }
                
                .modal-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .modal-header h3 { font-size: 18px; font-weight: 700; color: white; margin: 0; }
                .close-btn { background: none; border: none; color: var(--text-tertiary); font-size: 24px; cursor: pointer; line-height: 1; }
                .close-btn:hover { color: white; }

                .modal-body { padding: 24px; }
                .payout-period { margin-bottom: 24px; display: flex; flex-direction: column; gap: 4px; }
                .payout-period strong { font-size: 16px; color: white; }
                .payout-period span { font-size: 12px; color: var(--text-tertiary); }

                .payout-list-table { width: 100%; border-collapse: collapse; }
                .payout-list-table th { text-align: left; font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .payout-list-table td { padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; color: #ddd; }
                .p-amount { text-align: right; color: #10b981; font-weight: 700; font-size: 14px; }

                .loading-state, .no-data-state { padding: 100px; text-align: center; color: var(--text-tertiary); }
                .animate-fade-in { animation: fadeIn 0.8s ease-out; }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default ResellerEarnings;
