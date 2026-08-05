import React, { useState, useEffect, useContext } from 'react';
import { employeeApi } from '../utils/axiosConfig';
import { SocketContext } from '../context/SocketContext';
import './MobilePanel.css';

const MobileStaffDashboard = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const socket = useContext(SocketContext);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await employeeApi.get('/api/task/my-tasks');
            if (res.data.success) {
                setTasks(res.data.tasks);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handleTaskChange = () => fetchTasks();
        socket.on("task_data_change", handleTaskChange);
        return () => socket.off("task_data_change", handleTaskChange);
    }, [socket]);

    const openDetails = (task) => {
        setSelectedClient(task);
        setIsSheetOpen(true);
    };

    const filteredTasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-4">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white">Staff <span className="text-cyan-400">Hub</span></h1>
                <p className="text-slate-400 text-sm">Operations Command</p>
            </header>

            {/* Ultra-fast Search */}
            <div className="mb-8">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search tasks..." 
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                        🔍
                    </div>
                </div>
            </div>

            {/* Kanban-Lite Task Flow */}
            <section className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="section-title mb-0">Active Tasks</h3>
                    <span className="text-xs text-slate-500">{filteredTasks.length} Pending</span>
                </div>
                
                {loading ? (
                    <div className="text-center py-10 text-slate-500">Loading tasks...</div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                                No tasks found
                            </div>
                        ) : (
                            filteredTasks.map((task) => (
                                <div 
                                    key={task._id} 
                                    className="mobile-card"
                                    onClick={() => openDetails(task)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-lg text-white">{task.title}</h4>
                                            <p className="text-xs text-slate-400 truncate max-w-[200px]">{task.description}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            task.priority === 'High' ? 'text-orange-500 border border-orange-500/30' : 
                                            task.priority === 'Medium' ? 'text-cyan-400 border border-cyan-400/30' : 
                                            'text-slate-400 border border-slate-400/30'
                                        }`} style={{ boxShadow: task.priority === 'High' ? 'var(--neon-glow-cyan)' : 'none' }}>
                                            {task.priority}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mt-4">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                        <div className="flex gap-2">
                                            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all">
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </section>

            {/* Bottom Sheet Modal */}
            <div 
                className={`bottom-sheet-overlay ${isSheetOpen ? 'open' : ''}`}
                onClick={() => setIsSheetOpen(false)}
            />
            <div className={`bottom-sheet ${isSheetOpen ? 'open' : ''}`}>
                <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">{selectedClient?.title || 'Task Details'}</h3>
                <p className="text-slate-400 text-sm mb-6">Status: <span className="text-cyan-400">{selectedClient?.status}</span></p>
                
                <div className="space-y-4 mb-8">
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Description</p>
                        <p className="text-white text-sm">{selectedClient?.description || 'No description provided.'}</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Priority</p>
                        <p className="text-white font-medium">{selectedClient?.priority}</p>
                    </div>
                </div>

                <button 
                    className="w-full py-4 bg-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                    onClick={() => setIsSheetOpen(false)}
                >
                    Close Details
                </button>
            </div>
        </div>
    );
};

export default MobileStaffDashboard;
