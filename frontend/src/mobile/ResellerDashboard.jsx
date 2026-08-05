import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MobilePanel.css';

const MobileResellerDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalMargin: 12540,
        withdrawableBalance: 8420,
        weeklyTrend: [40, 60, 45, 80, 55, 90, 75]
    });

    useEffect(() => {
        // Simulate API fetch
        setTimeout(() => setLoading(false), 1500);
    }, []);

    if (loading) {
        return (
            <div className="mobile-container p-4">
                <div className="skeleton h-48 w-full mb-6" />
                <div className="skeleton h-12 w-3/4 mb-4" />
                <div className="skeleton h-32 w-full mb-4" />
                <div className="skeleton h-32 w-full mb-4" />
            </div>
        );
    }

    return (
        <div className="p-4">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Midnight <span className="text-purple-500">Prism</span></h1>
                    <p className="text-slate-400 text-sm">Reseller Panel</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    👤
                </div>
            </header>

            {/* Earnings Card */}
            <div className="mobile-card earnings-card mb-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Margin</p>
                        <h2 className="text-3xl font-bold text-white">₹{stats.totalMargin.toLocaleString()}</h2>
                    </div>
                    <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-bold">
                        +12.5%
                    </div>
                </div>
                
                <div className="mb-6">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Withdrawable Balance</p>
                    <h3 className="text-xl font-bold text-cyan-400">₹{stats.withdrawableBalance.toLocaleString()}</h3>
                </div>

                {/* Sparkline simulation */}
                <div className="flex items-end gap-1 h-12">
                    {stats.weeklyTrend.map((v, i) => (
                        <div 
                            key={i} 
                            className="flex-1 bg-purple-500/30 rounded-t-sm"
                            style={{ height: `${v}%`, minWidth: '4px' }}
                        />
                    ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">7-day revenue trend</p>
            </div>

            <section className="mb-8">
                <h3 className="section-title">Expiring Soon</h3>
                <div className="flex flex-col gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="mobile-card flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-white">Global Tech Solutions</h4>
                                <p className="text-xs text-slate-400">Expires in 3 days</p>
                            </div>
                            <span className="badge badge-expiring">Urgent</span>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h3 className="section-title">Recent Clients</h3>
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="mobile-card bg-slate-800/30">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-xl">
                                    🏢
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-white">Acme Corp {i}</h4>
                                    <p className="text-xs text-slate-400">Professional Plan</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white">₹2,499</p>
                                    <p className="text-[10px] text-green-400">Paid</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default MobileResellerDashboard;
