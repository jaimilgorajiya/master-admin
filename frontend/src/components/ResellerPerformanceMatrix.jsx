import { useState, useEffect } from "react";
import axios from "axios";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const ResellerPerformanceMatrix = ({ employeeId = null, hideHeader = false }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const COLORS = [
        '#00d2ff', // Cyan Glow
        '#a15dfd', // Purple Glow
        '#00f5a0', // Mint Glow
        '#ff9966', // Orange Glow
        '#fb5a8c'  // Pink Glow
    ];

    useEffect(() => {
        fetchAnalytics();
    }, [employeeId]);

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
            const url = employeeId 
                ? `${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/analytics?employeeId=${employeeId}`
                : `${import.meta.env.VITE_API_BASE_URL}/api/reseller-actions/analytics`;
                
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error("Analytics fetch fail", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="perf-skeleton pro-card">
            <div className="skeleton-line" style={{ width: '40%' }}></div>
            <div className="skeleton-box" style={{ height: '300px', marginTop: '24px' }}></div>
        </div>
    );
    
    if (!data) return null;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="premium-tooltip">
                    <div className="tooltip-header">{label}</div>
                    <div className="tooltip-body">
                        {payload.map((entry, index) => (
                            <div key={index} className="tooltip-row">
                                <span className="tooltip-dot" style={{ backgroundColor: entry.color }}></span>
                                <span className="tooltip-name">{entry.name}:</span>
                                <span className="tooltip-value">
                                    {entry.name === 'revenue' ? '₹' : ''}{entry.value.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="performance-container">
            {!hideHeader && (
                <div className="perf-header">
                    <h2 className="perf-title">Performance <span className="glow-text">Analytics</span></h2>
                    <div className="perf-actions">
                        <div className="period-badge">Last 6 Months</div>
                    </div>
                </div>
            )}

            <div className="perf-main-grid">
                {/* Large Trend Chart */}
                <div className="perf-card">
                    <div className="card-top">
                        <div>
                            <h3 className="card-heading">Growth Perspective</h3>
                            <p className="card-subtext">Monthly acquisition and revenue flow</p>
                        </div>
                        <div className="chart-legend-custom">
                            <div className="legend-item"><span className="dot clients"></span> Clients</div>
                            <div className="legend-item"><span className="dot revenue"></span> Revenue</div>
                        </div>
                    </div>
                    <div className="chart-wrapper" style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.clientGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a15dfd" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#a15dfd" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="name" 
                                    hide={false} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                <Area 
                                    type="monotone" 
                                    dataKey="clients" 
                                    stroke="#00d2ff" 
                                    strokeWidth={4}
                                    fill="url(#clientGrad)" 
                                    animationDuration={2000}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#a15dfd" 
                                    strokeWidth={4}
                                    fill="url(#revGrad)" 
                                    animationDuration={2500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Doughnut */}
                <div className="perf-card">
                    <h3 className="card-heading">Subscription Health</h3>
                    <div className="chart-wrapper" style={{ height: 240 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data.statusDistribution}
                                    innerRadius={75}
                                    outerRadius={105}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={10} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pie-center-label">
                            <span className="total-num">{data.totalClients}</span>
                            <span className="total-text">Total</span>
                        </div>
                    </div>
                    <div className="status-legend">
                        {data.statusDistribution.map((item, i) => (
                            <div key={i} className="s-leg-item">
                                <span className="s-dot" style={{ background: COLORS[i] }}></span>
                                <span className="s-name">{item.name}</span>
                                <span className="s-val">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Software Bar Chart */}
                <div className="perf-card">
                    <h3 className="card-heading">Platform Synergy</h3>
                    <div className="chart-wrapper" style={{ height: 240 }}>
                        <ResponsiveContainer>
                            <BarChart data={data.softwareDistribution}>
                                <XAxis dataKey="name" hide />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar 
                                    dataKey="value" 
                                    fill="#00f5a0" 
                                    radius={[8, 8, 8, 8]} 
                                    barSize={32}
                                    animationDuration={3000}
                                >
                                    {data.softwareDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bar-labels">
                        {data.softwareDistribution.slice(0, 3).map((item, i) => (
                            <div key={i} className="b-label-item">
                                <span className="b-name">{item.name}</span>
                                <div className="b-progress-bg">
                                    <div className="b-progress-fill" style={{ width: `${(item.value / data.totalClients) * 100}%`, background: COLORS[(i + 2) % COLORS.length] }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .performance-container {
                    margin: 32px 0;
                    animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .perf-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .perf-title {
                    font-size: 22px;
                    font-weight: 700;
                    color: white;
                    margin: 0;
                }
                .glow-text {
                    color: #3b82f6;
                    text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
                }
                .period-badge {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 12px;
                    color: var(--text-secondary);
                }

                .perf-main-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: auto auto;
                    gap: 24px;
                    align-items: stretch;
                }
                .perf-card:first-child {
                    grid-column: 1 / -1; /* Growth Perspective spans full width */
                }
                .perf-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 24px;
                    padding: 32px;
                    display: flex;
                    flex-direction: column;
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                    min-height: 440px;
                }
                .perf-card:hover {
                    border-color: rgba(255, 255, 255, 0.12);
                    background: rgba(255, 255, 255, 0.05);
                    transform: translateY(-5px);
                }
                
                @media (max-width: 768px) {
                   .perf-main-grid { grid-template-columns: 1fr; }
                   .perf-card:first-child { grid-column: 1; }
                }

                .card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 24px;
                    min-height: 50px;
                }
                .chart-wrapper { 
                    flex: 1; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: center;
                    position: relative;
                    min-height: 250px;
                }
                
                /* Pie Chart Label */
                .pie-center-label {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    pointer-events: none;
                }
                .total-num { display: block; font-size: 28px; font-weight: 800; color: white; line-height: 1; }
                .total-text { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; }

                .status-legend {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 20px;
                }
                .s-leg-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .s-dot { width: 6px; height: 6px; border-radius: 50%; }
                .s-name { flex: 1; font-size: 12px; color: rgba(255,255,255,0.6); }
                .s-val { font-size: 13px; font-weight: 600; color: white; }

                .bar-labels {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-top: 20px;
                }
                .b-label-item {
                    width: 100%;
                }
                .b-name { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 6px; display: block; }
                .b-progress-bg { height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; position: relative; }
                .b-progress-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }

                /* Tooltip styling */
                .premium-tooltip {
                    background: rgba(15, 18, 30, 0.9);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 12px 16px;
                    border-radius: 14px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .tooltip-header {
                    font-size: 12px;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 8px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 6px;
                }
                .tooltip-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 4px 0;
                }
                .tooltip-dot { width: 6px; height: 6px; border-radius: 50%; }
                .tooltip-name { font-size: 11px; color: rgba(255,255,255,0.5); }
                .tooltip-value { font-size: 12px; font-weight: 600; color: white; margin-left: auto; }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .perf-skeleton {
                    padding: 32px;
                    margin: 32px 0;
                }
                .skeleton-line { height: 20px; background: rgba(255,255,255,0.05); border-radius: 4px; }
                .skeleton-box { background: rgba(255,255,255,0.03); border-radius: 12px; }
            `}</style>
        </div>
    );
};

export default ResellerPerformanceMatrix;
