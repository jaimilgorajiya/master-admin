import React, { useState, useEffect, useContext } from 'react';
import { employeeApi } from '../utils/axiosConfig';
import { SocketContext } from '../context/SocketContext';
import './MobilePanel.css';

const MobileClientList = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const socket = useContext(SocketContext);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await employeeApi.get('/api/client/my-clients');
            if (res.data.success) {
                setClients(res.data.clients);
            }
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handleClientChange = () => fetchClients();
        socket.on("client_data_change", handleClientChange);
        socket.on("software_client_change", handleClientChange);
        return () => {
            socket.off("client_data_change", handleClientChange);
            socket.off("software_client_change", handleClientChange);
        };
    }, [socket]);

    return (
        <div className="p-4">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white">Client <span className="text-purple-400">List</span></h1>
                <p className="text-slate-400 text-sm">Manage your portfolio</p>
            </header>

            {loading ? (
                <div className="text-center py-10 text-slate-500">Loading clients...</div>
            ) : (
                <div className="flex flex-col gap-6 perspective-1000">
                    {clients.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                            No clients found
                        </div>
                    ) : (
                        clients.map((client, index) => (
                            <div key={client._id} className="relative group" style={{ zIndex: clients.length - index }}>
                                {/* Main Card with Tinder-like slight tilt */}
                                <div className="mobile-card relative z-10 translate-x-0 transition-all hover:scale-[1.02]"
                                     style={{ transform: `rotate(${index % 2 === 0 ? '0.5deg' : '-0.5deg'})` }}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl border border-slate-700/50">
                                                {(client.clientName || client.ownerName || "?").charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-xl tracking-tight">{client.clientName || client.ownerName}</h4>
                                                <p className="text-xs text-slate-400 font-medium">
                                                    {client.packageName || client.validityPeriod || "Standard Plan"}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`badge ${client.isActive ? 'badge-active' : 'badge-expiring'}`}>
                                            {client.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    
                                    <div className="mt-4 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                                                {client.isActive ? "Expiry Date" : "Status"}
                                            </p>
                                            <p className="text-lg font-bold text-white">
                                                {client.expiryDate ? new Date(client.expiryDate).toLocaleDateString() : (client.isActive ? "Unlimited" : "Activation Pending")}
                                            </p>
                                        </div>
                                        <div className="text-xs text-slate-500 italic">
                                            {client.businessName || ""}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <div className="mt-8 p-6 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-500 text-sm mb-4">View your clients and their current subscription status.</p>
            </div>
        </div>
    );
};

export default MobileClientList;
