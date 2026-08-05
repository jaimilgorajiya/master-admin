import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const API = import.meta.env.VITE_API_BASE_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken")}` });

const CouponManagement = ({ initialShowAddForm = false, onFormClose }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [softwares, setSoftwares] = useState([]);
  const [services, setServices] = useState([]);
  
  const initialForm = {
    code: "", discountType: "flat", discountValue: 0, minPurchaseAmount: 0,
    maxDiscountAmount: 0, isMaster: false, applicableSoftware: [], 
    applicableServices: [], expiryDate: "", usageLimit: 0
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchCoupons();
    fetchSupportData();
  }, []);

  useEffect(() => {
    setShowAddForm(initialShowAddForm);
  }, [initialShowAddForm]);

  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${API}/api/coupon/all`, { headers: authHeaders() });
      if (res.data.success) setCoupons(res.data.coupons);
    } catch (err) {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportData = async () => {
    try {
      const [swRes, svRes] = await Promise.all([
        axios.get(`${API}/api/software/all`, { headers: authHeaders() }),
        axios.get(`${API}/api/service/all`, { headers: authHeaders() })
      ]);
      setSoftwares(swRes.data.softwares || []);
      setServices(svRes.data.services || []);
    } catch (err) {
      console.error("Error fetching support data", err);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Coupon?",
      text: "This coupon will be permanently removed. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#00c8ff",
      cancelButtonColor: "rgba(255,255,255,0.05)",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#fff",
      customClass: {
        popup: "premium-swal-popup",
        confirmButton: "premium-swal-confirm-danger",
        cancelButton: "premium-swal-cancel",
      }
    });

    if (result.isConfirmed) {
      try {
        const res = await axios.delete(`${API}/api/coupon/${id}`, { headers: authHeaders() });
        if (res.data.success) {
          toast.success("Coupon deleted");
          fetchCoupons();
        }
      } catch (err) {
        toast.error("Failed to delete coupon");
      }
    }
  };

  const handleEdit = (c) => {
    setEditingCouponId(c._id);
    setFormData({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minPurchaseAmount: c.minPurchaseAmount || 0,
      maxDiscountAmount: c.maxDiscountAmount || 0,
      isMaster: c.isMaster,
      applicableSoftware: (c.applicableSoftware || []).map(s => s._id || s),
      applicableServices: (c.applicableServices || []).map(s => s._id || s),
      expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().split('T')[0] : "",
      usageLimit: c.usageLimit || 0
    });
    setShowAddForm(true);
  };

  const handleToggle = async (id) => {
    try {
      const res = await axios.patch(`${API}/api/coupon/toggle/${id}`, {}, { headers: authHeaders() });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchCoupons();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingCouponId(null);
    setFormData(initialForm);
    if (onFormClose) onFormClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingCouponId ? `${API}/api/coupon/${editingCouponId}` : `${API}/api/coupon/create`;
      const method = editingCouponId ? 'put' : 'post';
      
      const res = await axios[method](url, formData, { headers: authHeaders() });
      if (res.data.success) {
        toast.success(editingCouponId ? "Coupon updated" : "Coupon created");
        handleFormClose();
        fetchCoupons();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save coupon");
    }
  };

  return (
    <div className="management-container">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Coupon Management</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          <span className="icon">+</span> Create New Coupon
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading coupons...</div>
      ) : (
        <div className="table-container glass-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Scope</th>
                <th>Usage</th>
                <th>Expiry</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan="8" className="no-data">No coupons found. Create one to get started!</td></tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c._id}>
                    <td><span className="code-pill">{c.code}</span></td>
                    <td>{c.discountType === 'flat' ? 'Flat Amount' : 'Percentage'}</td>
                    <td>{c.discountType === 'flat' ? `₹${c.discountValue}` : `${c.discountValue}%`}</td>
                    <td>
                      {c.isMaster ? (
                        <span className="status-badge" style={{ background: 'rgba(0, 200, 255, 0.1)', color: 'var(--accent-primary)' }}>Master</span>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                           {c.applicableSoftware?.length > 0 && <div>SW: {c.applicableSoftware.map(s=>s.name).join(', ')}</div>}
                           {c.applicableServices?.length > 0 && <div>SV: {c.applicableServices.map(s=>s.name).join(', ')}</div>}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        Used: <strong>{c.usedCount}</strong> {c.usageLimit ? `/ ${c.usageLimit}` : ''}
                      </div>
                    </td>
                    <td>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'Never'}</td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={c.isActive} onChange={() => handleToggle(c._id)} />
                        <span className="slider round"></span>
                      </label>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn-icon" onClick={() => handleEdit(c)} title="Edit">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button className="btn-icon delete" onClick={() => handleDelete(c._id)} title="Delete">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Side Drawer for Add/Edit Coupon */}
      <div className={`drawer-overlay ${showAddForm ? 'active' : ''}`} onClick={handleFormClose}>
        <div className={`side-drawer ${showAddForm ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="drawer-header">
            <h2 className="drawer-title">{editingCouponId ? "Edit Coupon" : "Create New Coupon"}</h2>
            <button className="close-drawer" onClick={handleFormClose}>&times;</button>
          </div>
          
          <div className="drawer-body">
            <form onSubmit={handleSubmit} className="vertical-form">
              <div className="form-group">
                <label>Coupon Code <span className="required">*</span></label>
                <input type="text" placeholder="e.g. SAVE50" value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} required />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>Discount Type</label>
                  <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})}>
                    <option value="flat">Flat Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div className="form-group half">
                  <label>Discount Value <span className="required">*</span></label>
                  <input type="number" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} required />
                </div>
              </div>

              <div className="form-group">
                <label>Usage Limit (Total)</label>
                <input type="number" placeholder="0 for unlimited" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Min Purchase Amount (₹)</label>
                <input type="number" value={formData.minPurchaseAmount} onChange={e => setFormData({...formData, minPurchaseAmount: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Expiry Date</label>
                <input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="checkbox-container">
                  <input type="checkbox" id="isMaster" checked={formData.isMaster} onChange={e => setFormData({...formData, isMaster: e.target.checked})} />
                  <span className="checkmark"></span>
                  <span style={{ marginLeft: '10px', fontSize: '13px' }}>Master Coupon (Works for everything)</span>
                </label>
              </div>

              {!formData.isMaster && (
                <div className="scope-selection">
                  <div className="form-group">
                    <label>Applicable Software</label>
                    <select multiple style={{ height: '120px' }} 
                      value={formData.applicableSoftware} 
                      onChange={e => setFormData({...formData, applicableSoftware: Array.from(e.target.selectedOptions, o => o.value)})}>
                      {softwares.map(sw => <option key={sw._id} value={sw._id}>{sw.name}</option>)}
                    </select>
                    <p className="field-hint">Hold Ctrl to select multiple</p>
                  </div>
                  <div className="form-group">
                    <label>Applicable Services</label>
                    <select multiple style={{ height: '120px' }}
                      value={formData.applicableServices}
                      onChange={e => setFormData({...formData, applicableServices: Array.from(e.target.selectedOptions, o => o.value)})}>
                      {services.map(sv => <option key={sv._id} value={sv._id}>{sv.name}</option>)}
                    </select>
                    <p className="field-hint">Hold Ctrl to select multiple</p>
                  </div>
                </div>
              )}

              {formData.discountType === 'percentage' && (
                <div className="form-group">
                  <label>Max Discount Amount (₹)</label>
                  <input type="number" placeholder="0 for no limit" value={formData.maxDiscountAmount} onChange={e => setFormData({...formData, maxDiscountAmount: e.target.value})} />
                </div>
              )}

              <div className="drawer-actions">
                <button type="button" className="btn-secondary" onClick={handleFormClose}>Cancel</button>
                <button type="submit" className="btn-primary">{editingCouponId ? "Update Coupon" : "Create Coupon"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        /* Side Drawer Styles */
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        .drawer-overlay.active {
          opacity: 1;
          visibility: visible;
        }
        .side-drawer {
          position: fixed;
          top: 0;
          right: -480px; /* Start off-screen (right) */
          width: 100%;
          max-width: 450px;
          height: 100vh;
          background: #0f0a28e6;
          backdrop-filter: blur(20px);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 1001;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          box-shadow: -20px 0 50px rgba(0, 0, 0, 0.5);
        }
        .side-drawer.active {
          right: 0;
        }
        .drawer-header {
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
        }
        .drawer-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .close-drawer {
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 28px;
          cursor: pointer;
          line-height: 1;
          transition: color 0.2s;
        }
        .close-drawer:hover {
          color: white;
        }
        .drawer-body {
          padding: 24px;
          flex: 1;
          overflow-y: auto;
        }
        .drawer-actions {
          padding: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
        }
        .drawer-actions button {
          flex: 1;
          padding: 12px;
        }

        /* Compact Form Styles */
        .form-row {
          display: flex;
          gap: 16px;
        }
        .form-group.half {
          flex: 1;
        }
        .vertical-form .form-group {
          margin-bottom: 20px;
        }

        .code-pill {
          font-family: 'Courier New', Courier, monospace;
          background: rgba(255,255,255,0.1);
          padding: 4px 10px;
          border-radius: 4px;
          color: var(--accent-primary);
          font-weight: 700;
          letter-spacing: 1px;
        }
        .checkbox-container {
          display: flex;
          align-items: center;
          cursor: pointer;
          user-select: none;
          position: relative;
        }
        .checkbox-container input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }
        .checkmark {
          height: 20px;
          width: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          margin-right: 10px;
          display: inline-block;
          position: relative;
          transition: all 0.3s ease;
        }
        .checkbox-container:hover input ~ .checkmark {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--accent-primary);
        }
        .checkbox-container input:checked ~ .checkmark {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        .checkmark:after {
          content: "";
          position: absolute;
          display: none;
          left: 7px;
          top: 3px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .checkbox-container input:checked ~ .checkmark:after {
          display: block;
        }
        .form-group input, .form-group select {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px 16px;
          color: white;
          font-size: 14px;
          transition: all 0.3s ease;
          width: 100%;
          color-scheme: dark;
        }
        .form-group select {
          appearance: none;
          padding-right: 40px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }
        .form-group input:focus, .form-group select:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(0, 200, 255, 0.1);
          outline: none;
          background: rgba(255, 255, 255, 0.08);
        }
        .form-group select[multiple] {
          background-image: none;
          padding-right: 16px;
          height: auto;
        }
        .form-group select option {
          background: #150a38;
          color: white;
          padding: 12px;
        }
        .field-hint {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default CouponManagement;
