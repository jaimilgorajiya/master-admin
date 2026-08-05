import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, CartesianGrid
} from 'recharts';

const AdminRevenue = () => {
    const [revenue, setRevenue] = useState([]);
    const [trend, setTrend] = useState([]);
    const [breakdown, setBreakdown] = useState([]);
    const [employeeBreakdown, setEmployeeBreakdown] = useState([]);
    const [allTimeData, setAllTimeData] = useState({ revenue: 0, conversions: 0 });
    const [loading, setLoading] = useState(true);
    const [resellers, setResellers] = useState([]);
    const [employees, setEmployees] = useState([]);
    
    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        resellerId: "",
        employeeId: ""
    });

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 3}, (_, i) => currentYear - i);

    useEffect(() => {
        fetchResellers();
        fetchEmployees();
    }, []);

    useEffect(() => {
        fetchRevenue();
    }, [filters]);

    const fetchResellers = async () => {
        try {
            const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/reseller/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResellers(res.data.list || []);
        } catch (err) {
            console.error("Reseller fetch error", err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/staff/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(res.data.staffList || res.data.staff || []);
        } catch (err) {
            console.error("Employee fetch error", err);
        }
    };

    const fetchRevenue = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
            const { month, year, resellerId, employeeId } = filters;
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/admin-actions/revenue`, {
                params: { month, year, resellerId, employeeId },
                headers: { Authorization: `Bearer ${token}` }
            });
            setRevenue(res.data.data);
            setTrend(res.data.trend || []);
            setBreakdown(res.data.breakdown || []);
            setEmployeeBreakdown(res.data.employeeBreakdown || []);
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
                            <span className="tooltip-dot" style={{ backgroundColor: '#3b82f6' }}></span>
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
        <div className="revenue-module-advanced admin-version">
            {/* Header Section */}
            <div className="rev-header">
                <div className="rev-title-group">
                    <h1 className="rev-page-title">Global <span className="highlight">Revenue</span></h1>
                    <p className="rev-page-subtitle">Track organizational growth and reseller performance</p>
                </div>
                <div className="rev-period-pill">
                    <div className="pill-entry">
                        <span className="p-label">{months[filters.month - 1]} {filters.year}</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="rev-stats-grid">
                <div className="rev-stat-card glass-card">
                    <div className="r-stat-icon mon-icon">₹</div>
                    <div className="r-stat-body">
                        <div className="r-stat-label">Total System Revenue</div>
                        <div className="r-stat-value">₹{Math.round(allTimeData.revenue).toLocaleString()}</div>
                    </div>
                    <div className="r-stat-glow blue-glow"></div>
                </div>
                <div className="rev-stat-card glass-card">
                    <div className="r-stat-icon cli-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div className="r-stat-body">
                        <div className="r-stat-label">Total Client Conversion</div>
                        <div className="r-stat-value">{allTimeData.conversions}</div>
                    </div>
                    <div className="r-stat-glow purple-glow"></div>
                </div>
                <div className="rev-stat-card glass-card">
                    <div className="r-stat-icon avg-icon">₹</div>
                    <div className="r-stat-body">
                        <div className="r-stat-label">Current Period Revenue</div>
                        <div className="r-stat-value">₹{Math.round(periodRevenue).toLocaleString()}</div>
                    </div>
                    <div className="r-stat-glow green-glow"></div>
                </div>
            </div>

            <div className="rev-main-section">
                {/* 6-Month Trend Chart */}
                <div className="rev-chart-card glass-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Growth Velocity</h3>
                        <p className="chart-subtitle">Cross-reseller revenue trajectory (Last 6 Months)</p>
                    </div>
                    <div className="chart-content">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={trend}>
                                <defs>
                                    <linearGradient id="revGradAdmin" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3}
                                    fill="url(#revGradAdmin)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Filters Sidebar */}
                <div className="rev-filter-sidebar glass-card">
                    <h3 className="sidebar-title">Global Controls</h3>
                    <div className="filter-stack">
                        <div className="rev-filter-group">
                            <label>Period Select</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select 
                                    value={filters.month}
                                    onChange={(e) => setFilters({...filters, month: e.target.value})}
                                    style={{ flex: 2, colorScheme: 'dark' }}
                                >
                                    {months.map((m, i) => (
                                        <option key={m} value={i + 1} style={{ background: '#1a1535', color: 'white' }}>{m}</option>
                                    ))}
                                </select>
                                <select 
                                    value={filters.year}
                                    onChange={(e) => setFilters({...filters, year: e.target.value})}
                                    style={{ flex: 1, colorScheme: 'dark' }}
                                >
                                    {years.map(y => (
                                        <option key={y} value={y} style={{ background: '#1a1535', color: 'white' }}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="rev-filter-group">
                            <label>Reseller Channel</label>
                            <select 
                                value={filters.resellerId}
                                onChange={(e) => setFilters({...filters, resellerId: e.target.value})}
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="" style={{ background: '#1a1535', color: 'white' }}>Global (All Channels)</option>
                                {resellers.map(res => (
                                    <option key={res._id} value={res._id} style={{ background: '#1a1535', color: 'white' }}>{res.companyName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="rev-filter-group">
                            <label>Employee</label>
                            <select
                                value={filters.employeeId}
                                onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="" style={{ background: '#1a1535', color: 'white' }}>All Employees</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id} style={{ background: '#1a1535', color: 'white' }}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                        <button className="reset-filter-btn" onClick={() => setFilters({month: new Date().getMonth() + 1, year: new Date().getFullYear(), resellerId: "", employeeId: ""})}>
                            Restore Global View
                        </button>
                    </div>
                </div>
            </div>

            <div className="rev-distribution-row">
                {/* Reseller Breakdown Chart */}
                <div className="rev-breakdown-card glass-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Revenue by Channel</h3>
                        <p className="chart-subtitle">Direct contribution mapping per reseller</p>
                    </div>
                    <div className="chart-content">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={breakdown} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: 'white', fontSize: 11 }} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={20}>
                                    {breakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#a15dfd'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Employee Breakdown Chart */}
                {employeeBreakdown.length > 0 && (
                <div className="rev-breakdown-card glass-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Revenue by Employee</h3>
                        <p className="chart-subtitle">Staff contribution to total revenue</p>
                    </div>
                    <div className="chart-content">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={employeeBreakdown} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fill: 'white', fontSize: 11 }} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={20}>
                                    {employeeBreakdown.map((_, index) => (
                                        <Cell key={`emp-cell-${index}`} fill={index % 2 === 0 ? '#00c8ff' : '#34c759'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                )}

                {/* Transaction List */}
                <div className="rev-table-section glass-card" style={{ flex: 2 }}>
                    <div className="table-header">
                        <h3 className="chart-title">Global Ledger</h3>
                        <p className="chart-subtitle">Consolidated audit trail of completed payments</p>
                    </div>
                    <div className="rev-table-wrapper">
                        <table className="rev-data-table">
                            <thead>
                                <tr>
                                    <th>CLIENT</th>
                                    <th>EMPLOYEE</th>
                                    <th>REVENUE</th>
                                    <th>DATE</th>
                                    <th>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="no-data">Aggregating global data...</td></tr>
                                ) : revenue.length === 0 ? (
                                    <tr><td colSpan={5} className="no-data">No transactions found for this period.</td></tr>
                                ) : (
                                    revenue.map(item => (
                                        <tr key={item._id}>
                                            <td>
                                                <div className="c-name">{item.businessName}</div>
                                                <div className="c-owner">{item.softwareName || "Product"}</div>
                                            </td>
                                            <td>
                                                {item.createdByAdminEmployee ? (
                                                    <span style={{ fontSize: 12, color: '#00c8ff', fontWeight: 600 }}>
                                                        {item.createdByAdminEmployee.name || '—'}
                                                    </span>
                                                ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
                                            </td>
                                            <td>
                                                <div className="r-val-amount">₹{Math.round(item.paymentAmount || 0).toLocaleString()}</div>
                                            </td>
                                            <td>
                                                <div className="r-date">{new Date(item.createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td>
                                                <div className="status-pill-completed">
                                                    <span className="status-dot-lite"></span>
                                                    <span>Completed</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                .revenue-module-advanced.admin-version {
                    animation: fadeIn 0.6s ease-out;
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                }
                
                .highlight { color: #3b82f6; text-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
                
                .rev-header { display: flex; justify-content: space-between; align-items: flex-start; }
                .rev-page-title { font-size: 28px; font-weight: 800; color: white; margin: 0 0 8px 0; }
                .rev-page-subtitle { font-size: 14px; color: var(--text-tertiary); }
                .rev-period-pill { background: rgba(255, 255, 255, 0.05); padding: 8px 20px; border-radius: 100px; font-size: 13px; color: white; border: 1px solid rgba(255,255,255,0.1); }

                .rev-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                .rev-stat-card { padding: 24px; display: flex; align-items: center; gap: 20px; position: relative; overflow: hidden; }
                .r-stat-icon { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; }
                .mon-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .cli-icon { background: rgba(161, 93, 253, 0.1); color: #a15dfd; }
                .avg-icon { background: rgba(0, 245, 160, 0.1); color: #00f5a0; }
                .r-stat-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 4px; }
                .r-stat-value { font-size: 22px; font-weight: 800; color: white; }
                
                .r-stat-glow { position: absolute; bottom: -20px; right: -20px; width: 80px; height: 80px; filter: blur(40px); opacity: 0.15; }
                .r-stat-glow.blue-glow { background: #3b82f6; }
                .r-stat-glow.purple-glow { background: #a15dfd; }
                .r-stat-glow.green-glow { background: #00f5a0; }

                .rev-main-section { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
                .rev-chart-card, .rev-filter-sidebar, .rev-breakdown-card, .rev-table-section { padding: 32px; }
                .chart-title { font-size: 16px; font-weight: 700; color: white; margin: 0 0 6px 0; }
                .chart-subtitle { font-size: 12px; color: var(--text-tertiary); margin: 0 0 24px 0; }

                .rev-distribution-row { display: flex; gap: 24px; }
                .rev-breakdown-card { flex: 1; }

                .rev-filter-group label { display: block; font-size: 10px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 8px; }
                .rev-filter-group select {
                    width: 100%;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 12px;
                    color: white;
                    outline: none;
                    cursor: pointer;
                    color-scheme: dark;
                }
                .rev-filter-group select option {
                    background: #1a1535;
                    color: white;
                }
                .reset-filter-btn { margin-top: 10px; background: transparent; border: 1px dashed rgba(255,255,255,0.1); color: var(--text-secondary); padding: 10px; border-radius: 10px; font-size: 12px; cursor: pointer; width: 100%; }

                .rev-data-table { width: 100%; border-collapse: collapse; }
                .rev-data-table th { text-align: left; padding: 12px; font-size: 11px; color: var(--text-tertiary); border-bottom: 1px solid rgba(255,255,255,0.05); }
                .rev-data-table td { padding: 16px 12px; border-bottom: 1px solid rgba(255,255,255,0.02); }
                
                .reseller-tag { font-size: 12px; color: #a15dfd; font-weight: 600; }
                .c-name { font-size: 13px; font-weight: 600; color: white; }
                .c-owner { font-size: 11px; color: var(--text-tertiary); }
                .r-val-amount { color: #3b82f6; font-weight: 700; font-size: 14px; text-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }
                
                .status-pill-completed { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #3b82f6; font-weight: 600; background: rgba(59, 130, 246, 0.1); padding: 4px 12px; border-radius: 20px; width: fit-content; }
                .status-dot-lite { width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 8px #3b82f6; }

                .premium-tooltip { background: rgba(15, 18, 30, 0.95); border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; }
                .no-data { text-align: center; color: var(--text-tertiary); font-size: 13px; font-style: italic; }

                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default AdminRevenue;
