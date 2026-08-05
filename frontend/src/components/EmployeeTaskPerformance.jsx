import React, { useMemo, useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const EmployeeTaskPerformance = () => {
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  const socket = useContext(SocketContext);

  // Fetch Logic
  const fetchPerformance = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("employeeToken");
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/task/performance-employee?range=${range}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setPerformanceTrend(res.data.performanceTrend || []);
        }
      } catch (error) {
        console.error("Error fetching task performance", error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchPerformance();
  }, [range]); // Refetch on range change

  useEffect(() => {
    if (!socket) return;
    const handleTaskChange = () => {
        fetchPerformance();
    };
    socket.on("task_data_change", handleTaskChange);
    return () => {
        socket.off("task_data_change", handleTaskChange);
    };
  }, [socket, range]);

  // Format Data for X Axis
  const chartData = useMemo(() => {
      return performanceTrend.map(d => ({
          ...d,
          displayDate: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      }));
  }, [performanceTrend]);

  const isEmpty = !performanceTrend.some(d => d.completed > 0 || d.due > 0 || d.assigned > 0);

  return (
    <div className="analytics-section" style={{ marginTop: '30px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Task Performance</h2>
        
        {/* Date Range Toggle */}
        <div style={{ background: '#1a1a1a', padding: '4px', borderRadius: '8px', border: '1px solid #333' }}>
            <button 
                onClick={() => setRange(7)}
                style={{
                    background: range === 7 ? '#333' : 'transparent',
                    color: range === 7 ? '#fff' : '#888',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                7 Days
            </button>
            <button 
                onClick={() => setRange(30)}
                style={{
                    background: range === 30 ? '#333' : 'transparent',
                    color: range === 30 ? '#fff' : '#888',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                30 Days
            </button>
        </div>
      </div>
      
      <div className="chart-card" style={{ 
            background: '#1a1a1a', 
            borderRadius: '12px', 
            padding: '24px',
            border: '1px solid #333',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
            height: '400px',
            position: 'relative'
        }}>
            
            {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,26,0.8)', zIndex: 10 }}>
                    <span style={{ color: '#888' }}>Loading...</span>
                </div>
            )}

             {isEmpty && !loading ? (
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                     <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" style={{marginBottom: '10px'}}>
                         <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                         <polyline points="17 8 12 3 7 8"></polyline>
                         <line x1="12" y1="3" x2="12" y2="15"></line>
                     </svg>
                     <p style={{ color: '#666', fontSize: '14px' }}>No task activity found for this period</p>
                 </div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradAssigned" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="gradDue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis 
                            dataKey="displayDate" 
                            stroke="#666" 
                            fontSize={12} 
                            tickMargin={10}
                            interval="preserveStartEnd"
                        />
                        <YAxis stroke="#666" fontSize={12} allowDecimals={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444', color: '#fff' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelStyle={{ color: '#aaa', marginBottom: '8px' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle"/>
                        
                        <Area 
                            type="monotone" 
                            dataKey="assigned" 
                            name="Tasks Assigned"
                            stroke="#3b82f6" 
                            fill="url(#gradAssigned)" 
                            strokeWidth={2}
                            stackId="1" 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="due" 
                            name="Tasks Pending / In Progress" 
                            stroke="#8b5cf6" 
                            fill="url(#gradDue)" 
                            strokeWidth={2}
                            stackId="1"
                        />
                         <Area 
                            type="monotone" 
                            dataKey="completed" 
                            name="Tasks Completed"
                            stroke="#10b981" 
                            fill="url(#gradCompleted)" 
                            strokeWidth={2}
                            stackId="2"
                        />
                    </AreaChart>
                </ResponsiveContainer>
             )}
      </div>
    </div>
  );
};

export default EmployeeTaskPerformance;
