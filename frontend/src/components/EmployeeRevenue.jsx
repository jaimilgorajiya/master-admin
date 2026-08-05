import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("employeeToken") || sessionStorage.getItem("employeeToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const SEL = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: 'white', outline: 'none', cursor: 'pointer', colorScheme: 'dark' };
const OPT = { background: '#1a1535', color: 'white' };

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear - i);

const EmployeeRevenue = () => {
    const [revenue, setRevenue] = useState([]);
    const [trend, setTrend] = useState([]);
    const [breakdown, setBreakdown] = useState([]);
    const [allTimeData, setAllTimeData] = useState({ revenue: 0, conversions: 0 });
    const [loading, setLoading] = useState(true);
    const [softwareList, setSoftwareList] = useState([]);

    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: currentYear,
        softwareId: ""
    });

    useEffect(() => { fetchSoftware(); }, []);
    useEffect(() => { fetchRevenue(); }, [filters]);

    const fetchSoftware = async () => {
        try {
            const res = await axios.get(`${API}/api/software/all`, { headers: authHeaders() });
            if (res.data.success) setSoftwareList(res.data.softwares || res.data.softwareList || []);
        } catch (err) { console.error(err); }
    };

    const fetchRevenue = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/admin-actions/employee-revenue`, {
                params: filters,
                headers: authHeaders()
            });
            setRevenue(res.data.data || []);
            setTrend(res.data.trend || []);
            setBreakdown(res.data.breakdown || []);
            setAllTimeData({ revenue: res.data.allTimeRevenue || 0, conversions: res.data.allTimeConversions || 0 });
        } catch (err) {
            toast.error("Failed to load revenue data");
        } finally { setLoading(false); }
    };

    const periodRevenue = revenue.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ background: 'rgba(15,18,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>{label}</div>
                <div style={{ color: '#00c8ff', fontWeight: 700 }}>₹{payload[0].value.toLocaleString()}</div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn 0.5s ease' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 6px' }}>
                        My <span style={{ color: '#00c8ff', textShadow: '0 0 20px rgba(0,200,255,0.4)' }}>Revenue</span>
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>Track earnings from clients you onboarded</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 20px', borderRadius: 100, fontSize: 13, color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {MONTHS[filters.month - 1]} {filters.year}
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                {[
                    { label: 'All-Time Revenue', value: `₹${Math.round(allTimeData.revenue).toLocaleString()}`, icon: '₹', color: '#00c8ff', glow: 'rgba(0,200,255,0.15)' },
                    { label: 'Total Conversions', value: allTimeData.conversions, icon: '👥', color: '#a855f7', glow: 'rgba(168,85,247,0.15)' },
                    { label: 'Period Revenue', value: `₹${Math.round(periodRevenue).toLocaleString()}`, icon: '📈', color: '#34c759', glow: 'rgba(52,199,89,0.15)' },
                ].map((s, i) => (
                    <div key={i} className="pro-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ width: 52, height: 52, borderRadius: 16, background: s.glow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: s.color, flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>{s.value}</div>
                        </div>
                        <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, background: s.color, filter: 'blur(40px)', opacity: 0.12 }} />
                    </div>
                ))}
            </div>

            {/* Chart + Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
                {/* Trend Chart */}
                <div className="pro-card" style={{ padding: 32 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Revenue Trend</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 24px' }}>Your earnings over the last 6 months</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={trend}>
                            <defs>
                                <linearGradient id="empRevGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00c8ff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00c8ff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={v => `₹${v}`} width={55} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="revenue" stroke="#00c8ff" strokeWidth={3} fill="url(#empRevGrad)" animationDuration={1200} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Filters */}
                <div className="pro-card" style={{ padding: 28 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 20px' }}>Filters</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Period</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} style={{ ...SEL, flex: 2 }}>
                                    {MONTHS.map((m, i) => <option key={m} value={i + 1} style={OPT}>{m}</option>)}
                                </select>
                                <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} style={{ ...SEL, flex: 1 }}>
                                    {YEARS.map(y => <option key={y} value={y} style={OPT}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Software</label>
                            <select value={filters.softwareId} onChange={e => setFilters(f => ({ ...f, softwareId: e.target.value }))} style={{ ...SEL, width: '100%' }}>
                                <option value="" style={OPT}>All Software</option>
                                {softwareList.map(sw => <option key={sw._id} value={sw._id} style={OPT}>{sw.name}</option>)}
                            </select>
                        </div>
                        <button onClick={() => setFilters({ month: new Date().getMonth() + 1, year: currentYear, softwareId: "" })} style={{ marginTop: 4, background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '10px', borderRadius: 10, fontSize: 12, cursor: 'pointer', width: '100%' }}>
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Breakdown + Table */}
            <div style={{ display: 'flex', gap: 24 }}>
                {/* Software Breakdown */}
                {breakdown.length > 0 && (
                    <div className="pro-card" style={{ padding: 28, flex: 1 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>By Software</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>Revenue contribution per product</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={breakdown} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fill: 'white', fontSize: 11 }} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
                                <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={18}>
                                    {breakdown.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#00c8ff' : '#a855f7'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Transactions Table */}
                <div className="pro-card" style={{ padding: 28, flex: 2 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>Transaction Ledger</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>Completed payments from your clients</p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Client', 'Software', 'Package', 'Amount', 'Date', 'Status'].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</td></tr>
                                ) : revenue.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)', fontSize: 13 }}>No completed payments for this period.</td></tr>
                                ) : revenue.map(item => (
                                    <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '14px 12px' }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{item.businessName || item.ownerName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.email}</div>
                                        </td>
                                        <td style={{ padding: '14px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{item.softwareId?.name || item.softwareName || '—'}</td>
                                        <td style={{ padding: '14px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{item.packageName || '—'}</td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <span style={{ color: '#00c8ff', fontWeight: 700, fontSize: 14 }}>₹{Math.round(item.paymentAmount || 0).toLocaleString()}</span>
                                        </td>
                                        <td style={{ padding: '14px 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>
                                            {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-GB') : new Date(item.createdAt).toLocaleDateString('en-GB')}
                                        </td>
                                        <td style={{ padding: '14px 12px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#00c8ff', fontWeight: 600, background: 'rgba(0,200,255,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c8ff', boxShadow: '0 0 6px #00c8ff' }} />
                                                Completed
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeRevenue;
