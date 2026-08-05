import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const EmployeeAnalytics = ({ clients = [] }) => {
  // --- 1. Client Growth Data (Last 30 Days) ---
  const growthData = useMemo(() => {
    const data = [];
    const today = new Date();
    // Create map for last 30 days
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
        data.push({
            date: dateStr,
            displayDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            count: 0
        });
    }

    clients.forEach(client => {
        const createdDate = new Date(client.createdAt).toLocaleDateString('en-CA');
        const entry = data.find(d => d.date === createdDate);
        if (entry) {
            entry.count += 1;
        }
    });

    // Make cumulative? Or daily? 
    // "Growth" usually implies cumulative total or daily rate. 
    // Let's do daily rate first, visualizes activity well.
    return data;
  }, [clients]);

  // --- 2. Active vs Inactive Data ---
  const statusData = useMemo(() => {
    let active = 0;
    let inactive = 0;
    clients.forEach(c => {
        if (c.isActive) active++;
        else inactive++;
    });
    // Prevent empty chart
    if (active === 0 && inactive === 0) return [];
    return [
        { name: 'Active', value: active },
        { name: 'Inactive', value: inactive }
    ];
  }, [clients]);



  // Colors
  const COLORS = ['#00c8ff', '#d33']; // Active (Blue/Cyan), Inactive (Red)
  const BLUE_GRADIENT = "url(#colorPv)";

  if (clients.length === 0) {
      return (
          <div className="analytics-empty" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No enough data to display analytics.</p>
          </div>
      );
  }

  return (
    <div className="analytics-section" style={{ marginTop: '30px' }}>
      <h2 className="section-title" style={{ marginBottom: '20px' }}>Performance Overview</h2>
      
      <div className="analytics-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px' 
      }}>
        
        {/* Chart 1: Client Growth Line/Area */}
        <div className="chart-card" style={{ 
            background: '#1a1a1a', 
            borderRadius: '12px', 
            padding: '24px',
            border: '1px solid #333',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
        }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#eee', marginBottom: '20px' }}>New Clients (Last 30 Days)</h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData}>
                        <defs>
                            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00c8ff" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#00c8ff" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis 
                            dataKey="displayDate" 
                            stroke="#666" 
                            fontSize={12} 
                            tickMargin={10}
                            interval={6} // Show roughly every week
                        />
                        <YAxis stroke="#666" fontSize={12} allowDecimals={false} tickCount={5} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444', color: '#fff' }}
                            itemStyle={{ color: '#00c8ff' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#00c8ff" 
                            fillOpacity={1} 
                            fill="url(#colorPv)" 
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Chart 2: Active vs Inactive (Donut) */}
        <div className="chart-card" style={{ 
            background: '#1a1a1a', 
            borderRadius: '12px', 
            padding: '24px',
            border: '1px solid #333',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
        }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#eee', marginBottom: '20px' }}>Active vs Inactive Clients</h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            fill="#8884d8"
                            paddingAngle={statusData.length > 1 ? 4 : 0}
                            dataKey="value"
                            stroke="none"
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                        >
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444', color: '#fff' }}
                            formatter={(value, name) => [`${value} clients`, name]}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value, entry) => <span style={{ color: '#ccc', fontSize: 13 }}>{value}: {entry.payload.value}</span>} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>



      </div>
    </div>
  );
};

export default EmployeeAnalytics;
