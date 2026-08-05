import { useState, useEffect, useContext } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { SocketContext } from "../context/SocketContext";

const AdminTaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // New Task Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium",
    dueDate: "",
    assignedTo: "",
    attachments: []
  });

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const socket = useContext(SocketContext);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      let url = `${import.meta.env.VITE_API_BASE_URL}/api/task/all?`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterEmployee) url += `employeeId=${filterEmployee}&`;
      if (filterStartDate) url += `startDate=${filterStartDate}&`;
      if (filterEndDate) url += `endDate=${filterEndDate}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTasks(res.data.tasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/staff/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStaffList(res.data.staffList);
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchStaff();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleTaskChange = (data) => {
      fetchTasks();
    };
    socket.on("task_data_change", handleTaskChange);
    return () => {
      socket.off("task_data_change", handleTaskChange);
    };
  }, [socket]);

  useEffect(() => {
    fetchTasks();
  }, [filterEmployee, filterStatus, filterStartDate, filterEndDate]);
  
  /* Restoring missing functions */
  const handleFileChange = (e) => {
      if (e.target.files) {
          setFormData(prev => ({
              ...prev,
              attachments: [...prev.attachments, ...Array.from(e.target.files)]
          }));
      }
  };

  const removeFile = (index) => {
      setFormData(prev => ({
          ...prev,
          attachments: prev.attachments.filter((_, i) => i !== index)
      }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("adminToken");
      
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("priority", formData.priority);
      data.append("dueDate", formData.dueDate);
      data.append("assignedTo", formData.assignedTo);
      
      if (formData.attachments && formData.attachments.length > 0) {
          formData.attachments.forEach(file => {
              data.append("attachments", file);
          });
      }

      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/task/create`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Task created successfully");
        setShowAddModal(false);
        setFormData({ title: "", description: "", priority: "Medium", dueDate: "", assignedTo: "", attachments: [] });
        fetchTasks();
      }
    } catch (error) {
       console.error("Create task error", error);
       toast.error(error.response?.data?.message || "Failed to create task");
    }
  };

  const handleDeleteTask = async (id) => {
    const result = await Swal.fire({
      title: "Delete Task?",
      text: "This task and its history will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#fff",
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      customClass: {
        popup: "premium-swal-popup",
        confirmButton: "premium-swal-confirm-danger",
        cancelButton: "premium-swal-cancel",
      },
    });
    
        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem("adminToken");
                await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/task/delete/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Task deleted");
                fetchTasks();
            } catch (error) {
                toast.error("Failed to delete task");
            }
        }
  };
  
  const handleReviewTask = async (taskId, status, remarks) => {
      try {
          const token = localStorage.getItem("adminToken");
          await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/api/task/review/${taskId}`, 
            { status, remarks },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success(`Task ${status}`);
          fetchTasks();
          setShowViewModal(false);
          setSelectedTask(null);
      } catch (error) {
          toast.error("Failed to review task");
      }
  };

  const getPriorityColor = (p) => {
      if (p === 'High') return '#ef4444';
      if (p === 'Medium') return '#f59e0b';
      return '#3b82f6';
  };

  const getStatusColor = (s) => {
      if (s === 'Completed') return '#10b981';
      if (s === 'Rejected') return '#ef4444';
      if (s === 'Submitted') return '#8b5cf6';
      if (s === 'In Progress') return '#3b82f6';
      return '#6b7280';
  };

  const getDueStatus = (dateStr) => {
      if (!dateStr) return null;
      const [y, m, d] = dateStr.split('-').map(Number);
      const due = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: '#ef4444' };
      if (diffDays === 0) return { text: 'Due Today', color: '#f59e0b' };
      if (diffDays === 1) return { text: 'Due Tomorrow', color: '#10b981' };
      if (diffDays < 7) return { text: `Due in ${diffDays} days (${due.toLocaleDateString('en-US', { weekday: 'long' })})`, color: '#10b981' };
      return { text: `Due in ${diffDays} days`, color: '#10b981' };
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          + New Task
        </button>
      </div>

      <div className="search-filter-section" style={{ marginBottom: '24px' }}>
          <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '24px', 
              alignItems: 'flex-end',
              width: '100%'
          }}>
              
              {/* Employee Filter */}
              <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</label>
                  <select 
                    value={filterEmployee} 
                    onChange={e => setFilterEmployee(e.target.value)} 
                    className="filter-select"
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                  >
                      <option value="">All Employees</option>
                      {staffList.map(emp => (
                          <option key={emp._id} value={emp._id}>{emp.name}</option>
                      ))}
                  </select>
              </div>

              {/* Status Filter */}
              <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
                   <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                   <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)} 
                    className="filter-select"
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                   >
                      <option value="">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                  </select>
              </div>

              {/* Date Filters (Grouped) */}
              <div style={{ flex: '2 1 380px', minWidth: '300px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Range</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input 
                      type="date" 
                      title="From Date"
                      value={filterStartDate}
                      onChange={e => setFilterStartDate(e.target.value)}
                      style={{ 
                        flex: 1, width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        colorScheme: 'dark',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                    />
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', whiteSpace: 'nowrap' }}>to</span>
                    <input 
                      type="date"
                      title="To Date" 
                      value={filterEndDate}
                      onChange={e => setFilterEndDate(e.target.value)}
                      style={{ 
                        flex: 1, width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        colorScheme: 'dark',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>
              </div>

          </div>
      </div>

      {loading ? (
        <div className="text-center" style={{ color: 'var(--text-secondary)' }}>Loading tasks...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                 <tr><td colSpan="7" className="no-data">No tasks found</td></tr>
              ) : (
                  tasks.map(task => (
                      <tr key={task._id}>
                          <td>{task.title}</td>
                          <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-primary)' }}>
                                      {task.assignedTo?.name?.charAt(0) || 'U'}
                                  </div>
                                  {task.assignedTo?.name}
                              </div>
                          </td>
                          <td>
                              <span style={{ 
                                  color: getPriorityColor(task.priority), 
                                  fontWeight: 600,
                                  border: `1px solid ${getPriorityColor(task.priority)}`,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '12px'
                              }}>
                                  {task.priority}
                              </span>
                          </td>
                          <td>
                              <span style={{ 
                                  color: getStatusColor(task.status),
                                  fontWeight: 600 
                              }}>
                                  {task.status}
                              </span>
                          </td>
                          <td>{new Date(task.createdAt).toLocaleDateString()}</td>
                          <td>{new Date(task.dueDate).toLocaleDateString()}</td>
                          <td>
                              <button 
                                className="btn-icon" 
                                onClick={() => { setSelectedTask(task); setShowViewModal(true); }}
                                title="View Details"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              </button>
                               <button 
                                className="btn-icon btn-delete" 
                                onClick={() => handleDeleteTask(task._id)}
                                title="Delete Task"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                          </td>
                      </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)} style={{ backdropFilter: 'blur(5px)', padding: '20px' }}>
          <div 
            className="modal-content glass-card" 
            onClick={e => e.stopPropagation()} 
            style={{ 
                maxWidth: '900px', 
                width: '100%', 
                height: 'auto',
                display: 'flex', 
                flexDirection: 'column', 
                padding: '0',
                overflow: 'hidden',
            }}
          >
            <div className="modal-header" style={{ padding: '20px 32px' }}>
              <h2>Create New Task</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}
              >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '32px' }}>
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  
                  {/* Two Column Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '40px' }}>
                    
                    {/* LEFT COLUMN: Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Title */}
                        <div className="form-group">
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block' }}>Title</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="Task title"
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                style={{ height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '0 16px', color: 'var(--text-primary)', width: '100%', fontSize: '14px' }}
                            />
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block' }}>Description</label>
                            <textarea 
                                rows="4"
                                placeholder="Detailed description..."
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                style={{ height: '120px', resize: 'none', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '12px 16px', color: 'var(--text-primary)', width: '100%', fontSize: '14px', fontFamily: 'inherit' }}
                            ></textarea>
                        </div>

                        {/* Attachments */}
                        <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block' }}>Attachments</label>
                            <div className="file-upload-wrapper" style={{ 
                                border: '1px dashed var(--border-color)', 
                                padding: '16px', 
                                borderRadius: '12px', 
                                textAlign: 'center', 
                                background: 'var(--bg-tertiary)',
                                transition: 'border-color 0.2s',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100px'
                            }}>
                                <input 
                                    type="file" 
                                    multiple 
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    id="admin-task-upload"
                                />
                                <label htmlFor="admin-task-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%', margin: 0 }}>
                                    <div style={{ color: '#00c8ff' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                    </div>
                                    <span style={{ color: '#00c8ff', fontSize: '13px', fontWeight: '500' }}>Click to Upload</span>
                                </label>
                            </div>
                            
                            {/* Selected Files List (Scrollable) */}
                            {formData.attachments && formData.attachments.length > 0 && (
                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                                    {formData.attachments.map((file, index) => (
                                        <div key={index} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            background: '#1a1a1a',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #2a2a2a'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                                    <polyline points="13 2 13 9 20 9"></polyline>
                                                </svg>
                                                <span style={{ fontSize: '12px', color: '#eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Settings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Priority */}
                        <div className="form-group">
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block' }}>Priority</label>
                            <div style={{ position: 'relative' }}>
                                <select 
                                    value={formData.priority} 
                                    onChange={e => setFormData({...formData, priority: e.target.value})}
                                    style={{ height: '48px', width: '100%', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '0 36px 0 16px', appearance: 'none', color: 'var(--text-primary)', fontSize: '14px' }}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                                <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                                </div>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="form-group">
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block' }}>Due Date</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="date" 
                                    required 
                                    min={new Date().toISOString().split('T')[0]}
                                    value={formData.dueDate}
                                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                    className="custom-date-input"
                                    style={{ 
                                        height: '48px', 
                                        width: '100%', 
                                        borderRadius: 'var(--radius-md)', 
                                        background: 'var(--input-bg)', 
                                        border: '1px solid var(--glass-border)', 
                                        padding: '0 16px', 
                                        color: 'var(--text-primary)', 
                                        fontFamily: 'inherit', 
                                        fontSize: '14px',
                                        colorScheme: 'inherit',
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>
                            {formData.dueDate && (
                                <div style={{ marginTop: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                                    {(() => {
                                        const status = getDueStatus(formData.dueDate);
                                        if (!status) return null;
                                        return (
                                            <>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.color }}></div>
                                                <span style={{ color: status.color }}>{status.text}</span>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Assign To */}
                        <div className="form-group">
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'block' }}>Assign To</label>
                            <div style={{ position: 'relative' }}>
                                <select 
                                    required 
                                    value={formData.assignedTo}
                                    onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                                    style={{ height: '48px', width: '100%', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', padding: '0 36px 0 16px', appearance: 'none', color: formData.assignedTo ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: '14px' }}
                                >
                                    <option value="" disabled>Select an employee</option>
                                    {staffList.map(emp => (
                                        <option key={emp._id} value={emp._id} style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)' }}>{emp.name}</option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                                </div>
                            </div>
                        </div>

                    </div>

                  </div>

                  {/* Submit Button */}
                  <div style={{ marginTop: '0px' }}>
                      <button 
                        type="submit" 
                        className="btn-primary" 
                        style={{ width: '100%', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '600', borderRadius: '12px', background: 'linear-gradient(135deg, #00c8ff 0%, #0099cc 100%)', boxShadow: '0 4px 12px rgba(0, 200, 255, 0.2)' }}
                        disabled={!formData.title || !formData.dueDate || !formData.assignedTo}
                       >
                        Create Task
                      </button>
                  </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Task Modal */}
      {showViewModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Task Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ color: '#00c8ff', marginBottom: '8px' }}>{selectedTask.title}</h3>
                  <p style={{ color: '#aaa', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{selectedTask.description || "No description provided."}</p>
              
                  {/* Admin Attachments */}
                  {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                          <h4 style={{ color: '#666', fontSize: '12px', marginBottom: '6px' }}>Attachments:</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {selectedTask.attachments.map((att, i) => (
                                  <a 
                                    key={i} 
                                    href={`${import.meta.env.VITE_API_BASE_URL}${att.url}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        background: '#333', 
                                        padding: '4px 8px', 
                                        borderRadius: '4px', 
                                        color: '#00c8ff', 
                                        fontSize: '12px',
                                        textDecoration: 'none',
                                        border: '1px solid #444'
                                    }}
                                  >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                      {att.filename}
                                  </a>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                      <label style={{ color: '#666', fontSize: '12px' }}>Assigned To</label>
                      <p>{selectedTask.assignedTo?.name}</p>
                  </div>
                  <div>
                      <label style={{ color: '#666', fontSize: '12px' }}>Due Date</label>
                      <p>{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label style={{ color: '#666', fontSize: '12px' }}>Status</label>
                    <p style={{ color: getStatusColor(selectedTask.status) }}>{selectedTask.status}</p>
                  </div>
                   <div>
                    <label style={{ color: '#666', fontSize: '12px' }}>Priority</label>
                    <p style={{ color: getPriorityColor(selectedTask.priority) }}>{selectedTask.priority}</p>
                  </div>
              </div>

              {selectedTask.submission && selectedTask.submission.submittedAt && (
                   <div style={{ background: '#222', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                       <h4 style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>Submission Details</h4>
                       <p style={{ color: '#ccc', fontSize: '14px' }}>{selectedTask.submission.summary || "No summary."}</p>
                       {selectedTask.submission.links && selectedTask.submission.links.length > 0 && (
                           <div style={{ marginTop: '8px' }}>
                               <p style={{ color: '#666', fontSize: '12px' }}>Links:</p>
                               <ul style={{ paddingLeft: '20px' }}>
                                   {selectedTask.submission.links.map((link, i) => (
                                       <li key={i}><a href={link} target="_blank" rel="noreferrer" style={{ color: '#00c8ff' }}>{link}</a></li>
                                   ))}
                               </ul>
                           </div>
                       )}

                       {/* Employee Submission Attachments */}
                       {selectedTask.submission.attachments && selectedTask.submission.attachments.length > 0 && (
                           <div style={{ marginTop: '12px' }}>
                               <p style={{ color: '#666', fontSize: '12px', marginBottom: '6px' }}>Submitted Files:</p>
                               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                   {selectedTask.submission.attachments.map((att, i) => (
                                       <a 
                                         key={i} 
                                         href={`${import.meta.env.VITE_API_BASE_URL}${att.url}`} 
                                         target="_blank" 
                                         rel="noreferrer"
                                         style={{ 
                                             display: 'inline-flex', 
                                             alignItems: 'center', 
                                             gap: '6px',
                                             background: '#333', 
                                             padding: '6px 10px', 
                                             borderRadius: '6px', 
                                             color: '#00c8ff', 
                                             fontSize: '13px',
                                             textDecoration: 'none',
                                             border: '1px solid #444',
                                             transition: 'all 0.2s',
                                             maxWidth: '100%'
                                         }}
                                         onMouseEnter={(e) => { e.currentTarget.style.background = '#444'; e.currentTarget.style.borderColor = '#00c8ff'; }}
                                         onMouseLeave={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.borderColor = '#444'; }}
                                       >
                                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                           <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '150px' }}>{att.filename}</span>
                                       </a>
                                   ))}
                               </div>
                           </div>
                       )}
                       <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>Submitted: {new Date(selectedTask.submission.submittedAt).toLocaleString()}</p>
                   </div>
              )}

              {/* Review Actions */}
              {selectedTask.status === 'Submitted' && (
                  <div style={{ borderTop: '1px solid #333', paddingTop: '20px' }}>
                      <h4 style={{ marginBottom: '10px' }}>Admin Review</h4>
                      <textarea 
                        id="remarks"
                        className="form-control" 
                        placeholder="Add remarks (optional)"
                        style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}
                      />
                      <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            className="btn-primary" 
                            style={{ background: '#10b981' }}
                            onClick={() => {
                                const remarks = document.getElementById('remarks').value;
                                handleReviewTask(selectedTask._id, 'Completed', remarks);
                            }}
                          >
                            Approve
                          </button>
                           <button 
                            className="btn-primary" 
                            style={{ background: '#ef4444' }}
                            onClick={() => {
                                const remarks = document.getElementById('remarks').value;
                                if (!remarks) return toast.error("Remarks required for rejection");
                                handleReviewTask(selectedTask._id, 'Rejected', remarks);
                            }}
                          >
                            Reject
                          </button>
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTaskManagement;
