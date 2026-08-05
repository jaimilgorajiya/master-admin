import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { SocketContext } from "../context/SocketContext";

const EmployeeTaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submissionData, setSubmissionData] = useState({
      summary: '',
      link: '',
      attachments: []
  });

  const socket = useContext(SocketContext);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  useEffect(() => {
      if (!socket) return;
      const handleTaskChange = (data) => {
          // Check if task is ours implicitly by refetching or filtering
          // For simplicity, just refetch
          fetchMyTasks();
      };
      socket.on("task_data_change", handleTaskChange);
      return () => {
          socket.off("task_data_change", handleTaskChange);
      };
  }, [socket]);

  const fetchMyTasks = async () => {
    try {
      const token = localStorage.getItem("employeeToken");
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/task/my-tasks`, {
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

  const handleStatusUpdate = async (taskId, newStatus, formData = null) => {
      try {
          const token = localStorage.getItem("employeeToken");
          let data;
          let config = { headers: { Authorization: `Bearer ${token}` } };

          if (formData) {
              data = formData;
              // Content-Type is auto-set by axios for FormData
          } else {
              data = { status: newStatus };
          }

          const res = await axios.patch(
            `${import.meta.env.VITE_API_BASE_URL}/api/task/submit/${taskId}`,
            data,
            config
          );

          if (res.data.success) {
              toast.success("Task updated");
              setShowModal(false);
              setSubmissionData({ summary: '', link: '', attachments: [] });
              fetchMyTasks();
          }
      } catch (error) {
          console.error(error);
          toast.error("Failed to update task");
      }
  };

  const handleFileChange = (e) => {
      if (e.target.files) {
          setSubmissionData(prev => ({
              ...prev,
              attachments: [...prev.attachments, ...Array.from(e.target.files)]
          }));
      }
  };

  const removeFile = (index) => {
      setSubmissionData(prev => ({
          ...prev,
          attachments: prev.attachments.filter((_, i) => i !== index)
      }));
  };

  const handleSubmit = (e) => {
      e.preventDefault();
      if (!submissionData.summary) return toast.error("Please provide a summary");
      
      const formData = new FormData();
      formData.append('status', 'Submitted');
      formData.append('summary', submissionData.summary);
      
      // Handle links
      const links = submissionData.link ? [submissionData.link] : [];
      formData.append('links', JSON.stringify(links));

      // Handle files
      if (submissionData.attachments && submissionData.attachments.length > 0) {
          submissionData.attachments.forEach(file => {
              formData.append('attachments', file);
          });
      }

      handleStatusUpdate(selectedTask._id, 'Submitted', formData);
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

  return (
    <div className="task-management">
      <h2 className="section-title">My Tasks</h2>
      
      {loading ? (
           <div className="text-center" style={{ color: '#888', padding: '20px' }}>Loading tasks...</div>
      ) : (
          <div className="task-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {tasks.length === 0 ? (
                  <p style={{ color: '#666', gridColumn: '1/-1', textAlign: 'center' }}>No tasks assigned yet.</p>
              ) : (
                  tasks.map(task => (
                      <div 
                        key={task._id} 
                        className="task-card" 
                        onClick={() => { 
                            setSelectedTask(task); 
                            setShowModal(true); 
                            setSubmissionData({ summary: '', link: '', attachments: [] }); 
                        }}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s'
                      }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>{task.title}</h3>
                              <span style={{ 
                                  fontSize: '10px', 
                                  padding: '2px 8px', 
                                  borderRadius: '10px', 
                                  border: `1px solid ${getPriorityColor(task.priority)}`, 
                                  color: getPriorityColor(task.priority) 
                              }}>
                                  {task.priority}
                              </span>
                          </div>
                          
                          <p style={{ fontSize: '14px', color: '#aaa', flex: 1 }}>{task.description}</p>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              <span style={{ color: getStatusColor(task.status), fontWeight: 600 }}>{task.status}</span>
                          </div>

                          {/* Actions */}
                          <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                              {task.status === 'Pending' && (
                                  <button 
                                    className="btn-primary" 
                                    style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleStatusUpdate(task._id, 'In Progress'); 
                                    }}
                                  >
                                      Start Working
                                  </button>
                              )}
                              
                              {task.status === 'In Progress' && (
                                  <button 
                                      className="btn-primary" 
                                      style={{ width: '100%', padding: '8px', fontSize: '13px', background: '#8b5cf6' }}
                                      onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setSelectedTask(task); 
                                          setShowModal(true); 
                                          setSubmissionData({ summary: '', link: '', attachments: [] }); 
                                      }}
                                  >
                                      Submit Work
                                  </button>
                              )}

                              {(task.status === 'Submitted' || task.status === 'Completed' || task.status === 'Rejected') && (
                                  <button 
                                      className="btn-secondary" 
                                      style={{ width: '100%', padding: '8px', fontSize: '13px' }}
                                      onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setSelectedTask(task); 
                                          setShowModal(true); 
                                      }}
                                  >
                                      View Details
                                  </button>
                              )}
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}

      {/* Submission/View Modal */}
      {showModal && selectedTask && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                      <h2>{selectedTask.title}</h2>
                      <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                  </div>
                  <div className="modal-body">
                      {/* Read Only Details */}
                          <div style={{ marginBottom: '20px' }}>
                              <h4 style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>Description</h4>
                              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>{selectedTask.description}</p>
                          </div>

                          {/* Admin Attachments */}
                          {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                              <div style={{ marginBottom: '20px' }}>
                                  <h4 style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>Task Attachments</h4>
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
                                                background: '#222', 
                                                padding: '8px 12px', 
                                                borderRadius: '6px', 
                                                color: '#00c8ff', 
                                                fontSize: '13px',
                                                textDecoration: 'none',
                                                border: '1px solid #333'
                                            }}
                                            title="Click to download/view"
                                          >
                                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                              {att.filename}
                                          </a>
                                      ))}
                                  </div>
                              </div>
                          )}

                      {/* If Submitting */}
                      {selectedTask.status === 'In Progress' && (
                          <form onSubmit={handleSubmit} className="form-layout">
                              <div className="form-group">
                                  <label>Work Summary</label>
                                  <textarea 
                                      rows="4" 
                                      required
                                      value={submissionData.summary}
                                      onChange={e => setSubmissionData({...submissionData, summary: e.target.value})}
                                      placeholder="Describe what you did..."
                                      className="form-input"
                                  ></textarea>
                              </div>
                              <div className="form-group">
                                  <label>Link (Github/Drive etc.)</label>
                                  <input 
                                      type="url" 
                                      value={submissionData.link}
                                      onChange={e => setSubmissionData({...submissionData, link: e.target.value})}
                                      placeholder="https://..."
                                      className="form-input"
                                  />
                              </div>

                              <div className="form-group">
                                  <label>Attachments (Optional)</label>
                                  <div style={{ border: '2px dashed #444', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                                      <input 
                                        type="file" 
                                        id="file-upload" 
                                        multiple 
                                        onChange={handleFileChange} 
                                        style={{ display: 'none' }} 
                                      />
                                      <label htmlFor="file-upload" style={{ cursor: 'pointer', color: '#00c8ff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                          <span>Click to upload files</span>
                                      </label>
                                  </div>
                                  
                                  {submissionData.attachments.length > 0 && (
                                     <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px' }}>
                                         {submissionData.attachments.map((file, idx) => (
                                             <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }}>
                                                 <span style={{ color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{file.name}</span>
                                                 <button type="button" onClick={() => removeFile(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                                             </li>
                                         ))}
                                     </ul>
                                  )}
                              </div>

                              <button type="submit" className="btn-primary w-full">Submit Task</button>
                          </form>
                      )}

                      {/* If Viewing Submitted/Completed */}
                      {['Submitted', 'Completed', 'Rejected'].includes(selectedTask.status) && (
                          <div>
                              <div style={{ background: '#222', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                                  <h4 style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>Your Submission</h4>
                                  <p style={{ color: '#ccc', marginBottom: '10px' }}>{selectedTask.submission?.summary}</p>
                                  
                                  {selectedTask.submission?.links?.length > 0 && (
                                      <div style={{ marginBottom: '10px' }}>
                                          <h5 style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Links:</h5>
                                          {selectedTask.submission.links.map((l, i) => (
                                              <a key={i} href={l} target="_blank" rel="noreferrer" style={{ display: 'block', color: '#00c8ff', fontSize: '13px', marginBottom: '2px' }}>{l}</a>
                                          ))}
                                      </div>
                                  )}

                                  {selectedTask.submission?.attachments?.length > 0 && (
                                      <div>
                                          <h5 style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Attachments:</h5>
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
                                                        color: '#fff', 
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
                              
                              {selectedTask.remarks && (
                                  <div style={{ background: selectedTask.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', border: `1px solid ${selectedTask.status === 'Completed' ? '#10b981' : '#ef4444'}` }}>
                                      <h4 style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>Admin Feedback</h4>
                                      <p style={{ color: '#eee' }}>{selectedTask.remarks}</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default EmployeeTaskManagement;
