import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ResellerMarginConfig = ({ initialConfig, onChange, allowedSoftwareIds = [], allowedServiceIds = [] }) => {
  const [mode, setMode] = useState(initialConfig?.mode || 'overall');
  const [overall, setOverall] = useState(initialConfig?.overall || { type: 'percentage', value: '' });
  const [productSpecific, setProductSpecific] = useState(initialConfig?.productSpecific || []);
  const [serviceSpecific, setServiceSpecific] = useState(initialConfig?.serviceSpecific || []);
  const [slabs, setSlabs] = useState(initialConfig?.slabs || []);
  const [softwares, setSoftwares] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const filteredSoftwares = (allowedSoftwareIds?.length > 0 && softwares)
    ? softwares.filter(s => allowedSoftwareIds.some(id => String(id) === String(s?._id)))
    : (softwares || []);
  const filteredServices = (allowedServiceIds?.length > 0 && services)
    ? services.filter(s => allowedServiceIds.some(id => String(id) === String(s?._id)))
    : (services || []);

  useEffect(() => {
    fetchSoftwares();
    fetchServices();
  }, []);

  useEffect(() => {
    onChange({ mode, overall, productSpecific, serviceSpecific, slabs });
  }, [mode, overall, productSpecific, serviceSpecific, slabs]);

  const fetchSoftwares = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/software/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSoftwares(res.data.softwares || []);
    } catch (err) {
      console.error("Failed to fetch softwares", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/service/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setServices(res.data.services || []);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  };

  const addProductRow = () => {
    setProductSpecific([...productSpecific, { softwareId: '', type: 'percentage', value: '' }]);
  };

  const removeProductRow = (index) => {
    setProductSpecific(productSpecific.filter((_, i) => i !== index));
  };

  const updateProductRow = (index, updates) => {
    const newList = [...productSpecific];
    newList[index] = { ...newList[index], ...updates };
    setProductSpecific(newList);
  };

  const addServiceRow = () => {
    setServiceSpecific([...serviceSpecific, { serviceId: '', mode: 'fixed', type: 'percentage', value: '', slabs: [] }]);
  };

  const removeServiceRow = (index) => {
    setServiceSpecific(serviceSpecific.filter((_, i) => i !== index));
  };

  const updateServiceRow = (index, updates) => {
    const newList = [...serviceSpecific];
    newList[index] = { ...newList[index], ...updates };
    setServiceSpecific(newList);
  };

  const addSlabRow = () => {
    setSlabs([...slabs, { minRevenue: 0, maxRevenue: 0, type: 'percentage', margin: 0 }]);
  };

  const removeSlabRow = (index) => {
    setSlabs(slabs.filter((_, i) => i !== index));
  };

  const updateSlabRow = (index, field, value) => {
    const updated = [...slabs];
    updated[index] = { ...updated[index], [field]: value };
    setSlabs(updated);
  };

  return (
    <div className="margin-config-wrapper">
      <div className="mode-tabs-container">
        {[
          { 
            id: 'overall', 
            label: 'Overall', 
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            )
          },
          { 
            id: 'product_specific', 
            label: 'Product Specific', 
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            )
          },
          { 
            id: 'service_specific', 
            label: 'Service Specific', 
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            )
          },
          { 
            id: 'slab_wise', 
            label: 'Slab Wise', 
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            )
          }
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mode-tab-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            <span className="tab-icon">{m.icon}</span>
            <span className="tab-label">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="config-card-premium">
        {mode === 'overall' && (
          <div className="config-section animate-slide-up">
            <div className="section-header">
              <div className="header-info">
                <h4 className="section-title">Standard Margin</h4>
                <p className="section-subtitle">Set a default commission for all products</p>
              </div>
              <div className="status-badge blue">Standard</div>
            </div>

            <div className="input-grid-2">
              <div className="premium-input-group">
                <label>Commission Type</label>
                <div className="select-wrapper">
                  <select 
                    value={overall.type} 
                    onChange={(e) => setOverall({ ...overall, type: e.target.value })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>
              <div className="premium-input-group">
                <label>Commission Value</label>
                <div className="input-with-suffix">
                  <input 
                    type="number" 
                    min="0"
                    onWheel={(e) => e.target.blur()}
                    value={overall.value === 0 && overall.value !== '' ? '' : overall.value} 
                    onChange={(e) => setOverall({ ...overall, value: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)) })}
                    placeholder="Enter value"
                  />
                  <span className="input-suffix">{overall.type === 'percentage' ? '%' : '₹'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'product_specific' && (
          <div className="config-section animate-slide-up">
            <div className="section-header">
              <div className="header-info">
                <h4 className="section-title">Product Specific Margins</h4>
                <p className="section-subtitle">Override default commission for specific softwares</p>
              </div>
              <button type="button" className="action-btn-add" onClick={addProductRow}>
                <span>+</span> Add Custom
              </button>
            </div>

            <div className="dynamic-cards-grid">
              {productSpecific.map((row, idx) => (
                <div key={idx} className="vertical-config-card">
                  <div className="card-header">
                    <span className="card-number">#{idx + 1}</span>
                    <button type="button" className="btn-remove-card" onClick={() => removeProductRow(idx)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  
                    <div className="card-body">
                      <div className="input-grid-2 compact">
                        <div className="premium-input-group">
                          <label>Software Package</label>
                          <div className="select-wrapper">
                            <select 
                              value={row.softwareId}
                              onChange={(e) => updateProductRow(idx, { softwareId: e.target.value })}
                            >
                              <option value="">Select Software</option>
                              {filteredSoftwares.map(sw => <option key={sw._id} value={sw._id}>{sw.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="premium-input-group">
                          <label>Commission Type</label>
                          <div className="select-wrapper">
                            <select 
                              value={row.type || 'percentage'} 
                              onChange={(e) => updateProductRow(idx, { type: e.target.value })}
                            >
                              <option value="percentage">Percentage (%)</option>
                              <option value="flat">Flat (₹)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="premium-input-group mt-10">
                        <label>Margin Value</label>
                        <div className="input-with-suffix">
                          <input 
                            type="number" 
                            min="0"
                            onWheel={(e) => e.target.blur()}
                            value={row.value === 0 ? '' : row.value} 
                            onChange={(e) => updateProductRow(idx, { value: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)) })}
                            placeholder="Enter value"
                          />
                          <span className="input-suffix small">{row.type === 'flat' ? '₹' : '%'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
              {productSpecific.length === 0 && (
                <div className="empty-state-container">
                  <div className="empty-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                  </div>
                  <p>No specific product margins configured.</p>
                  <button type="button" className="btn-text-only" onClick={addProductRow}>Add your first override</button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'service_specific' && (
          <div className="config-section animate-slide-up">
            <div className="section-header">
              <div className="header-info">
                <h4 className="section-title">Service Specific Margins</h4>
                <p className="section-subtitle">Set custom margins for assigned services</p>
              </div>
              <button type="button" className="action-btn-add" onClick={addServiceRow}>
                <span>+</span> Add Custom
              </button>
            </div>

            <div className="dynamic-cards-grid">
              {serviceSpecific.length === 0 ? (
                <div className="empty-state-card glass-card">
                  <p>No service overrides set. Partner will receive the overall margin for all services.</p>
                </div>
              ) : serviceSpecific.map((item, idx) => (
                <div key={idx} className="vertical-config-card">
                  <div className="card-header">
                    <span className="card-number">#{idx + 1}</span>
                    <button type="button" className="btn-remove-card" onClick={() => removeServiceRow(idx)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>

                  <div className="card-body">
                    <div className="input-grid-2 compact">
                      <div className="premium-input-group">
                        <label>Select Service</label>
                        <div className="select-wrapper">
                          <select 
                            value={item.serviceId} 
                            onChange={(e) => updateServiceRow(idx, { serviceId: e.target.value })}
                          >
                            <option value="">Select Service</option>
                            {filteredServices.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="premium-input-group">
                        <label>Commission Type</label>
                        <div className="select-wrapper">
                          <select 
                            value={item.type || 'percentage'} 
                            onChange={(e) => updateServiceRow(idx, { type: e.target.value })}
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="flat">Flat (₹)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="premium-input-group mt-10">
                      <label>Margin Value</label>
                      <div className="input-with-suffix">
                        <input 
                          type="number" 
                          min="0"
                          onWheel={(e) => e.target.blur()}
                          value={item.value === 0 ? '' : item.value} 
                          onChange={(e) => updateServiceRow(idx, { value: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)) })}
                          placeholder="Enter value"
                        />
                        <span className="input-suffix small">{item.type === 'flat' ? '₹' : '%'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'slab_wise' && (
          <div className="config-section animate-slide-up">
             <div className="section-header">
              <div className="header-info">
                <h4 className="section-title">Performance-Based Slabs</h4>
                <p className="section-subtitle">Define commission rates based on monthly revenue</p>
              </div>
              <button type="button" className="action-btn-add purple" onClick={addSlabRow}>
                <span>+</span> Add Slab
              </button>
            </div>



            {slabs.length === 0 ? (
              <div className="empty-state-card glass-card animate-slide-up">
                 <div className="empty-icon" style={{ opacity: 0.2, marginBottom: '15px' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                 </div>
                 <p>Setup revenue slabs to incentivize performance.</p>
                 <button type="button" className="btn-text-only purple mt-10" onClick={addSlabRow}>+ Create First Slab</button>
              </div>
            ) : (
              <div className="dynamic-cards-grid">
                {slabs.map((slab, idx) => (
                  <div key={idx} className="vertical-config-card slab">
                    <div className="card-header">
                      <span className="card-number">Tier #{idx + 1}</span>
                      <button type="button" className="btn-remove-card" onClick={() => removeSlabRow(idx)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>

                    <div className="card-body">
                      <div className="input-grid-4 compact">
                        <div className="premium-input-group">
                          <label>Min Revenue</label>
                          <div className="input-with-suffix">
                            <input 
                              type="number" 
                              value={slab.minRevenue} 
                              onChange={(e) => updateSlabRow(idx, 'minRevenue', Number(e.target.value))}
                            />
                            <span className="input-suffix small">₹</span>
                          </div>
                        </div>
                        <div className="premium-input-group">
                          <label>Max Revenue</label>
                          <div className="input-with-suffix">
                            <input 
                              type="number" 
                              value={slab.maxRevenue} 
                              onChange={(e) => updateSlabRow(idx, 'maxRevenue', Number(e.target.value))}
                            />
                            <span className="input-suffix small">₹</span>
                          </div>
                        </div>
                        <div className="premium-input-group">
                          <label>Type</label>
                          <div className="select-wrapper">
                            <select 
                              value={slab.type || 'percentage'} 
                              onChange={(e) => updateSlabRow(idx, 'type', e.target.value)}
                            >
                              <option value="percentage">Percentage (%)</option>
                              <option value="flat">Flat (₹)</option>
                            </select>
                          </div>
                        </div>
                        <div className="premium-input-group">
                          <label>Commission</label>
                          <div className="input-with-suffix">
                            <input 
                              type="number" 
                              value={slab.margin} 
                              onChange={(e) => updateSlabRow(idx, 'margin', Number(e.target.value))}
                            />
                            <span className="input-suffix small">{slab.type === 'flat' ? '₹' : '%'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .margin-config-wrapper { 
          margin-top: 5px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .mode-tabs-container { 
          display: flex; 
          gap: 8px; 
          background: rgba(15, 23, 42, 0.6); 
          padding: 6px; 
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
        }

        .mode-tab-btn { 
          flex: 1; 
          padding: 10px 8px; 
          border-radius: 12px; 
          border: 1px solid transparent; 
          background: transparent; 
          color: rgba(255, 255, 255, 0.5); 
          font-size: 11px; 
          font-weight: 600; 
          cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .mode-tab-btn .tab-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
          transition: transform 0.3s ease;
        }

        .mode-tab-btn.active { 
          background: rgba(59, 130, 246, 0.15); 
          color: #60a5fa; 
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .mode-tab-btn.active .tab-icon {
          opacity: 1;
          transform: translateY(-2px);
        }

        .config-card-premium { 
          background: rgba(255, 255, 255, 0.02); 
          border: 1px solid rgba(255, 255, 255, 0.06); 
          border-radius: 24px; 
          padding: 20px;
          min-height: 200px;
          position: relative;
          overflow: hidden;
        }

        .config-card-premium::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 4px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981);
          opacity: 0.5;
        }

        .section-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          margin-bottom: 24px; 
        }

        .section-title { 
          font-size: 16px; 
          font-weight: 700; 
          color: white;
          margin-bottom: 4px;
        }

        .section-subtitle {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-badge.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }

        .input-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        .premium-input-group { display: flex; flex-direction: column; gap: 8px; }
        .premium-input-group label { font-size: 11px; color: rgba(255, 255, 255, 0.5); font-weight: 600; }

        .select-wrapper, .input-with-suffix {
          position: relative;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          transition: all 0.3s ease;
          height: 42px;
          display: flex;
          align-items: center;
        }

        .select-wrapper:focus-within, .input-with-suffix:focus-within {
          border-color: #3b82f6;
          background: rgba(15, 23, 42, 0.6);
        }

        .config-card-premium input, .config-card-premium select {
          background: transparent;
          border: none;
          padding: 12px 14px;
          color: white;
          width: 100%;
          outline: none;
          font-size: 13px;
          cursor: pointer;
        }

        .config-card-premium select {
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }

        /* Fixed: Styling options background (works in some browsers like Chrome/Edge) */
        .config-card-premium select option {
          background-color: #150a38;
          color: white;
        }

        /* Fixed: Hide spin buttons */
        .config-card-premium input::-webkit-outer-spin-button,
        .config-card-premium input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .config-card-premium input[type=number] {
          -moz-appearance: textfield;
        }

        .input-with-suffix { display: flex; align-items: center; }
        .input-suffix { padding-right: 14px; color: #3b82f6; font-weight: 700; font-size: 14px; }

        .action-btn-add {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
        }

        .action-btn-add:hover { background: #10b981; color: white; transform: translateY(-2px); }
        .action-btn-add.purple { background: rgba(161, 93, 253, 0.15); color: #a15dfd; border-color: rgba(161, 93, 253, 0.3); }
        .action-btn-add.purple:hover { background: #a15dfd; color: white; }

        .dynamic-cards-grid { 
          display: flex; 
          flex-direction: column; 
          gap: 16px; 
        }

        .vertical-config-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 16px;
          position: relative;
          transition: all 0.3s ease;
        }

        .vertical-config-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        }

        .vertical-config-card.slab {
          border-left: 3px solid #a15dfd;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .card-number {
          font-size: 10px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.3);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .btn-remove-card {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
          border: none;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-remove-card:hover {
          background: #ef4444;
          color: white;
          transform: rotate(90deg);
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .input-grid-2.compact {
          gap: 12px;
        }

        .input-grid-2.compact label {
          font-size: 10px;
        }

        .premium-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .premium-input-group label {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .select-wrapper select {
          width: 100%;
          appearance: none;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 10px 32px 10px 12px;
          color: white;
          font-size: 13px;
          cursor: pointer;
          height: 40px;
          transition: all 0.2s;
        }

        .select-wrapper::after {
          content: '▼';
          font-size: 10px;
          color: rgba(255, 255, 255, 0.3);
          position: absolute;
          right: 12px;
          pointer-events: none;
        }

        .select-wrapper select:focus {
          border-color: #3b82f6;
          background: rgba(15, 23, 42, 0.6);
          outline: none;
        }

        .mt-10 { margin-top: 10px; }

        .input-with-suffix {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-suffix input {
          width: 100%;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 10px 32px 10px 12px;
          color: white;
          font-size: 13px;
          height: 40px;
          outline: none;
        }

        .input-with-suffix input:focus {
          border-color: #3b82f6;
        }

        .input-suffix.small {
          position: absolute;
          right: 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.3);
          font-weight: 700;
        }

        .empty-state-card {
          padding: 24px;
          text-align: center;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 16px;
        }

        .empty-state-card p {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.3);
          margin: 0;
        }

        .nested-slabs-container { 
          background: rgba(0,0,0,0.2); 
          padding: 16px; 
          border-radius: 12px; 
          border: 1px solid rgba(255,255,255,0.05); 
        }

        .nested-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 12px; 
        }

        .nested-header label { 
          font-size: 10px; 
          color: #a15dfd; 
          font-weight: 700; 
          text-transform: uppercase; 
        }

        .btn-add-mini { 
          background: none; 
          border: 1px dashed rgba(161, 93, 253, 0.4); 
          color: #a15dfd; 
          font-size: 10px; 
          font-weight: 700; 
          padding: 4px 10px; 
          border-radius: 6px; 
          cursor: pointer; 
          transition: 0.2s; 
        }

        .btn-add-mini:hover { 
          background: rgba(161, 93, 253, 0.1); 
          border-style: solid; 
        }
        
        .nested-slabs-list { 
          display: flex; 
          flex-direction: column; 
          gap: 8px; 
        }

        .mini-slab-row { 
          display: grid; 
          grid-template-columns: 1fr 1fr 1fr 30px; 
          gap: 8px; 
          align-items: center; 
        }

        .mini-slab-row input { 
          background: rgba(255,255,255,0.03) !important; 
          border: 1px solid rgba(255,255,255,0.08) !important; 
          padding: 6px 8px !important; 
          font-size: 11px !important; 
          height: 32px !important; 
          border-radius: 6px !important; 
          color: white;
        }

        .mini-slab-row input:focus { 
          border-color: #a15dfd !important; 
          background: rgba(255,255,255,0.06) !important; 
        }

        .btn-del-slab { 
          background: none; 
          border: none; 
          color: #ef4444; 
          font-size: 18px; 
          cursor: pointer; 
          opacity: 0.5; 
          transition: 0.2s; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }

        .btn-del-slab:hover { 
          opacity: 1; 
          transform: scale(1.2); 
        }

        .input-grid-2.compact {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .input-grid-3.compact {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .input-grid-4.compact {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 12px;
        }

        .btn-text-only {
          background: none;
          border: none;
          color: #3b82f6;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .btn-text-only:hover { background: rgba(59, 130, 246, 0.1); }
        .btn-text-only.purple { color: #a15dfd; }
        .btn-text-only.purple:hover { background: rgba(161, 93, 253, 0.1); }

        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ResellerMarginConfig;
