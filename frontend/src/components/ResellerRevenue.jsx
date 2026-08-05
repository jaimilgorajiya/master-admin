import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

const ResellerRevenue = () => {
    const [revenue, setRevenue] = useState([]);
    const [trend, setTrend] = useState([]);
    const [allTimeData, setAllTimeData] = useState({ revenue: 0, conversions: 0 });
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState([]);
    const [userRole, setUserRole] = useState("");
    
    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        employeeId: ""
    });

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 3}, (_, i) => currentYear - i);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("resellerUser") || sessionStorage.getItem("resellerUser") || "{}");
        setUserRole(user.role);
        if (user.role === "RESELLER") {
            fetchTeam();
        }
    }, []);

    useEffect(() => {
        fetchRevenue();
    }, [filters]);

    const fetchTeam = async () => {
        try {
            const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/team`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTeam(res.data.data);
        } catch (err) {
            console.error("Team fetch error", err);
        }
    };

    const fetchRevenue = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
            const { month, year, employeeId } = filters;
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/revenue`, {
                params: { month, year, employeeId },
                headers: { Authorization: `Bearer ${token}` }
            });
            setRevenue(res.data.data);
            setTrend(res.data.trend || []);
            setAllTimeData({
                revenue: res.data.allTimeRevenue || 0,
                conversions: res.data.allTimeConversions || 0
            });
        } catch (err) {
            toast.error("Failed to load revenue data");
        } finally {
            setLoading(false);
        }
    };

    const periodRevenue = revenue.reduce((acc, curr) => acc + (curr.paymentAmount || 0), 0);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="premium-tooltip">
                    <div className="tooltip-header">{label}</div>
                    <div className="tooltip-body">
                        <div className="tooltip-row">
                            <span className="tooltip-dot" style={{ backgroundColor: '#00f5a0' }}></span>
                            <span className="tooltip-name">Revenue:</span>
                            <span className="tooltip-value">₹{payload[0].value.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="revenue-module-advanced">
            {/* Header Section */}
            <div className="rev-header">
                <div className="rev-title-group">
                    <h1 className="rev-page-title">Revenue <span className="highlight">Intelligence</span></h1>
                    <p className="rev-page-subtitle">Track, analyze, and optimize your financial performance</p>
                </div>
                <div className="rev-period-pill">
                    <div className="pill-entry">
                        <span className="p-label">{months[filters.month - 1]} {filters.year}</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid - Updated with All Time Stats */}
            <div className="rev-stats-grid">
                <div className="rev-stat-card glass-card">
                    <div className="r-stat-icon mon-icon">₹</div>
                    <div className="r-stat-body">
                        <div className="r-stat-label">All Time Revenue</div>
                        <div className="r-stat-value">₹{allTimeData.revenue.toLocaleString()}</div>
                    </div>
                    <div className="r-stat-glow green"></div>
                </div>
                <div className="rev-stat-card glass-card">
                    <div className="r-stat-icon cli-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div className="r-stat-body">
                        <div className="r-stat-label">Total Conversions</div>
                        <div className="r-stat-value">{allTimeData.conversions}</div>
                    </div>
                    <div className="r-stat-glow purple"></div>
                </div>
                <div className="rev-stat-card glass-card">
                    <div className="r-stat-icon avg-icon">₹</div>
                    <div className="r-stat-body">
                        <div className="r-stat-label">{months[filters.month - 1]} Revenue</div>
                        <div className="r-stat-value">₹{periodRevenue.toLocaleString()}</div>
                    </div>
                    <div className="r-stat-glow blue"></div>
                </div>
            </div>

            <div className="rev-main-section">
                {/* Visual Chart Section */}
                <div className="rev-chart-card glass-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Revenue Velocity</h3>
                        <p className="chart-subtitle">Monthly trajectory over the last 6 months</p>
                    </div>
                    <div className="chart-content">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={trend}>
                                <defs>
                                    <linearGradient id="revGradMain" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00f5a0" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#00f5a0" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                    tickFormatter={(val) => `₹${val}`}
                                    width={50}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#00f5a0" 
                                    strokeWidth={3}
                                    fill="url(#revGradMain)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="rev-filter-sidebar glass-card">
                    <h3 className="sidebar-title">Filters</h3>
                    <div className="filter-stack">
                        <div className="rev-filter-group">
                            <label>Analysis Month</label>
                            <select 
                                value={filters.month}
                                onChange={(e) => setFilters({...filters, month: e.target.value})}
                            >
                                {months.map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="rev-filter-group">
                            <label>Year</label>
                            <select 
                                value={filters.year}
                                onChange={(e) => setFilters({...filters, year: e.target.value})}
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        {userRole === "RESELLER" && (
                            <div className="rev-filter-group">
                                <label>Individual Staff</label>
                                <select 
                                    value={filters.employeeId}
                                    onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
                                >
                                    <option value="">Full Team View</option>
                                    {team.map(emp => (
                                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button className="reset-filter-btn" onClick={() => setFilters({month: new Date().getMonth() + 1, year: new Date().getFullYear(), employeeId: ""})}>
                            Reset View
                        </button>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="rev-table-section glass-card">
                <div className="table-header">
                    <h3 className="chart-title">Transaction Ledger</h3>
                    <p className="chart-subtitle">Detailed breakdown of generated revenue</p>
                </div>
                <div className="rev-table-wrapper">
                    <table className="rev-data-table">
                        <thead>
                            <tr>
                                <th>CLIENT</th>
                                <th>PRODUCT / SERVICE</th>
                                <th>REVENUE</th>
                                <th>TIMESTAMP</th>
                                {userRole === "RESELLER" && <th>ATTRIBUTION</th>}
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={userRole === "RESELLER" ? 6 : 5} className="no-data">Syncing financial records...</td></tr>
                            ) : revenue.length === 0 ? (
                                <tr><td colSpan={userRole === "RESELLER" ? 6 : 5} className="no-data">No revenue events detected for this configuration.</td></tr>
                            ) : (
                                revenue.map(item => (
                                    <tr key={item._id}>
                                        <td>
                                            <div className="c-name">{item.businessName}</div>
                                            <div className="c-owner">{item.ownerName}</div>
                                        </td>
                                        <td>
                                            <div className="p-name">{item.softwareName || "Service Package"}</div>
                                            {item.packageName && <div className="p-pkg">{item.packageName}</div>}
                                        </td>
                                        <td>
                                            <div className="r-val">₹{item.paymentAmount?.toLocaleString()}</div>
                                        </td>
                                        <td>
                                            <div className="r-date">{new Date(item.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</div>
                                        </td>
                                        {userRole === "RESELLER" && (
                                            <td>
                                                {item.createdByResellerEmployee ? (
                                                    <span className="attr-tag staff">{item.createdByResellerEmployee.name}</span>
                                                ) : (
                                                    <span className="attr-tag owner">Master Admin</span>
                                                )}
                                            </td>
                                        )}
                                        <td>
                                            <span className="rev-status-pill">
                                                <span className="s-dot"></span> Completed
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .revenue-module-advanced {
                    animation: fadeIn 0.6s ease-out;
                }
                
                /* Header Styles */
                .rev-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 32px;
                }
                .rev-page-title {
                    font-size: 28px;
                    font-weight: 800;
                    color: white;
                    margin: 0 0 8px 0;
                    letter-spacing: -0.5px;
                }
                .rev-page-subtitle {
                    font-size: 14px;
                    color: var(--text-tertiary);
                    margin: 0;
                }
                .highlight {
                    color: #3b82f6;
                    text-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
                }
                .rev-period-pill {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 8px 20px;
                    border-radius: 100px;
                    font-size: 13px;
                    font-weight: 600;
                    color: white;
                }

                /* Stats Grid */
                .rev-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 24px;
                    margin-bottom: 32px;
                }
                .rev-stat-card {
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    position: relative;
                    overflow: hidden;
                }
                .r-stat-icon {
                    width: 52px;
                    height: 52px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: 700;
                }
                .mon-icon { background: rgba(0, 245, 160, 0.1); color: #00f5a0; }
                .cli-icon { background: rgba(161, 93, 253, 0.1); color: #a15dfd; }
                .avg-icon { background: rgba(0, 210, 255, 0.1); color: #00d2ff; }
                
                .r-stat-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 4px; }
                .r-stat-value { font-size: 22px; font-weight: 800; color: white; }
                
                .r-stat-glow {
                    position: absolute;
                    bottom: -20px;
                    right: -20px;
                    width: 80px;
                    height: 80px;
                    filter: blur(40px);
                    border-radius: 50%;
                    opacity: 0.15;
                }
                .green { background: #00f5a0; }
                .purple { background: #a15dfd; }
                .blue { background: #00d2ff; }

                /* Main Section (Chart + Filters) */
                .rev-main-section {
                    display: grid;
                    grid-template-columns: 1fr 300px;
                    gap: 24px;
                    margin-bottom: 32px;
                }
                .rev-chart-card { padding: 32px; }
                .chart-title { font-size: 16px; font-weight: 700; color: white; margin: 0 0 6px 0; }
                .chart-subtitle { font-size: 12px; color: var(--text-tertiary); margin: 0 0 24px 0; }
                
                .rev-filter-sidebar { padding: 24px; }
                .sidebar-title { font-size: 14px; font-weight: 700; color: white; margin: 0 0 20px 0; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; }
                .filter-stack { display: flex; flex-direction: column; gap: 20px; }
                .rev-filter-group label { display: block; font-size: 10px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 8px; padding-left: 4px; }
                .rev-filter-group select {
                    width: 100%;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 12px 14px;
                    color: white;
                    font-size: 13px;
                    outline: none;
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    background-size: 16px;
                    transition: all 0.3s ease;
                }
                .rev-filter-group select:hover {
                    background-color: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.2);
                }
                .rev-filter-group select option {
                    background: #1a1c2e;
                    color: white;
                    padding: 12px;
                }
                .reset-filter-btn {
                    margin-top: 10px;
                    background: transparent;
                    border: 1px dashed rgba(255,255,255,0.1);
                    color: var(--text-secondary);
                    padding: 10px;
                    border-radius: 10px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .reset-filter-btn:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }

                /* Table Styles */
                .rev-table-section { padding: 32px; }
                .rev-table-wrapper { margin-top: 24px; overflow-x: auto; }
                .rev-data-table { width: 100%; border-collapse: collapse; }
                .rev-data-table th { text-align: left; padding: 16px; font-size: 11px; color: var(--text-tertiary); letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .rev-data-table td { padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.02); }
                
                .c-name { font-size: 14px; font-weight: 600; color: white; }
                .c-owner { font-size: 11px; color: var(--text-tertiary); }
                .p-name { font-size: 13px; color: var(--text-secondary); }
                .p-pkg { font-size: 10px; color: #a15dfd; text-transform: uppercase; margin-top: 2px; }
                .r-val { font-size: 15px; font-weight: 700; color: #00f5a0; }
                .r-date { font-size: 12px; color: var(--text-tertiary); }
                
                .attr-tag { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; }
                .attr-tag.staff { background: rgba(161, 93, 253, 0.1); color: #a15dfd; }
                .attr-tag.owner { background: rgba(0, 210, 255, 0.1); color: #00d2ff; }
                
                .rev-status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    background: rgba(0, 245, 160, 0.05);
                    border: 1px solid rgba(0, 245, 160, 0.1);
                    color: #00f5a0;
                    border-radius: 100px;
                    font-size: 11px;
                    font-weight: 600;
                }
                .s-dot { width: 6px; height: 6px; border-radius: 50%; background: #00f5a0; box-shadow: 0 0 10px #00f5a0; }

                /* Premium Tooltip */
                .premium-tooltip {
                    background: rgba(15, 18, 30, 0.9);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 12px 16px;
                    border-radius: 14px;
                }
                .tooltip-header { font-size: 12px; font-weight: 700; color: white; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; }
                .tooltip-row { display: flex; align-items: center; gap: 8px; }
                .tooltip-dot { width: 6px; height: 6px; border-radius: 50%; }
                .tooltip-name { font-size: 11px; color: rgba(255,255,255,0.5); }
                .tooltip-value { font-size: 12px; font-weight: 700; color: #00f5a0; margin-left: auto; }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 1200px) {
                    .rev-main-section { grid-template-columns: 1fr; }
                    .rev-stats-grid { grid-template-columns: 1fr 1fr; }
                }
                @media (max-width: 768px) {
                    .rev-stats-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default ResellerRevenue;
