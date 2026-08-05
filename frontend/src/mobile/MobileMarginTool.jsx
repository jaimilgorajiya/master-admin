import React from 'react';
import './MobilePanel.css';

const MobileMarginTool = () => {
    const margins = [
        { id: 1, service: 'Enterprise ERP', margin: '25%', type: 'Percentage' },
        { id: 2, service: 'Cloud Storage', margin: '₹500', type: 'Flat' },
        { id: 3, service: 'Security Suite', margin: '15%', type: 'Percentage' },
        { id: 4, service: 'API Gateway', margin: '₹1,200', type: 'Flat' },
    ];

    return (
        <div className="p-4">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white">Margin <span className="text-orange-400">Tool</span></h1>
                <p className="text-slate-400 text-sm">Your commission configuration</p>
            </header>

            <div className="flex flex-col gap-4">
                {margins.map((item) => (
                    <div key={item.id} className="mobile-card">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{item.type} Basis</p>
                                <h4 className="font-bold text-white text-lg">{item.service}</h4>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                                    {item.margin}
                                </p>
                                <p className="text-[10px] text-slate-500">Net Commission</p>
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-400">Status: Locked</span>
                            <span className="text-xs text-slate-400">Updated: 2 days ago</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 mobile-card bg-orange-500/10 border-orange-500/20">
                <p className="text-xs text-orange-400 leading-relaxed">
                    <strong>Note:</strong> Margins are configured by the master administrator and are read-only. Contact support if you need to request a margin adjustment.
                </p>
            </div>
        </div>
    );
};

export default MobileMarginTool;
