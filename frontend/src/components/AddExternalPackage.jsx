import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AddExternalPackage = ({ software, onBack, onSuccess, packageData = null }) => {
  const isSendzyy = software?.key === "sendzyy";
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    planId: packageData?.planId || "",
    name: packageData?.name || "",
    description: packageData?.description || "",
    price: packageData?.price || packageData?.basePrice || "",
    gstPercent: packageData?.gstPercent ?? 18,
    durationValue: packageData?.panelDays || packageData?.duration?.value || packageData?.durationValue || "",
    durationUnit: packageData?.duration?.unit || packageData?.durationUnit || "day",
    services: packageData?.services || [""],
    isActive: packageData?.isActive ?? true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleServiceChange = (index, value) => {
    const newServices = [...formData.services];
    newServices[index] = value;
    setFormData(prev => ({ ...prev, services: newServices }));
  };

  const addServiceField = () => {
    setFormData(prev => ({ ...prev, services: [...prev.services, ""] }));
  };

  const removeServiceField = (index) => {
    if (formData.services.length <= 1) return;
    const newServices = formData.services.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, services: newServices }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.durationValue) {
      return toast.error("Please fill all required fields");
    }

    if (isSendzyy && !packageData && !formData.planId) {
      return toast.error("Plan ID is required for Sendzyy (e.g. panel_6m)");
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      
      let dataToSend;
      if (isSendzyy) {
        let days = Number(formData.durationValue);
        if (formData.durationUnit === "month") days = days * 30;
        if (formData.durationUnit === "year") days = days * 365;

        dataToSend = {
          name: formData.name,
          description: formData.description,
          basePrice: Number(formData.price),
          gstPercent: Number(formData.gstPercent || 18),
          panelDays: days,
          isActive: formData.isActive
        };

        if (!packageData) {
          dataToSend.planId = formData.planId.trim() || `panel_${formData.name.toLowerCase().replace(/\s+/g, '_')}`;
        }
      } else {
        const finalServices = formData.services.filter(s => s.trim() !== "");
        dataToSend = { 
          name: formData.name,
          price: Number(formData.price),
          description: formData.description,
          services: finalServices,
          duration: {
            value: Number(formData.durationValue),
            unit: formData.durationUnit
          }
        };
      }

      const isEditing = !!packageData;
      const pkgId = packageData?._id || packageData?.id;
      const targetUrl = isEditing 
        ? software.packagePutApi.replace(":id", pkgId) 
        : software.packagePostApi;
      
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/proxy/external`, {
        targetUrl: targetUrl,
        method: isEditing ? "PUT" : "POST",
        data: dataToSend
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 201 || response.status === 200 || response.data.success) {
        toast.success(`Package ${isEditing ? 'updated' : 'added'} successfully!`);
        onSuccess();
      } else {
        toast.error(response.data?.error || response.data?.message || "Failed to save package");
      }
    } catch (err) {
      console.error("Error saving external package:", err);
      if (err.response?.status === 404) {
        toast.error(`${software.name} does not allow remote plan creation.`);
      } else {
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Operation failed";
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="management-content">
      <div className="page-header">
        <div className="title-group">
            <h1 className="page-title">{packageData ? 'Edit' : 'Add'} Package to {software.name}</h1>
            <p className="page-description">{packageData ? 'Modify existing' : 'Create a new'} subscription plan</p>
        </div>
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </div>

      <div className="form-center">
        <div className="form-card" style={{ maxWidth: '800px' }}>
          <form onSubmit={handleSubmit} className="form-layout">
            
            {isSendzyy && !packageData && (
              <div className="form-group full-width">
                <label>Plan ID (Unique identifier) <span className="required">*</span></label>
                <input
                  type="text"
                  name="planId"
                  value={formData.planId}
                  onChange={handleChange}
                  placeholder="e.g. panel_custom_6m"
                  required
                />
              </div>
            )}

            <div className="form-grid two-columns">
              <div className="form-group">
                <label>Package Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. 6 Month Pro Pass"
                  required
                />
              </div>
              <div className="form-group">
                <label>{isSendzyy ? "Base Price (₹)" : "Price (₹)"} <span className="required">*</span></label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g. 6355"
                  required
                />
              </div>
            </div>

            {isSendzyy && (
              <div className="form-grid two-columns">
                <div className="form-group">
                  <label>GST Percent (%)</label>
                  <input
                    type="number"
                    name="gstPercent"
                    value={formData.gstPercent}
                    onChange={handleChange}
                    placeholder="18"
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Calculated Total Price</label>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: '4px' }}>
                    ₹{Math.round(Number(formData.price || 0) * (1 + Number(formData.gstPercent || 0) / 100))} (incl. GST)
                  </div>
                </div>
              </div>
            )}

            <div className="form-grid two-columns">
              <div className="form-group">
                <label>{isSendzyy ? "Panel Days" : "Duration Value"} <span className="required">*</span></label>
                <input
                  type="number"
                  name="durationValue"
                  value={formData.durationValue}
                  onChange={handleChange}
                  placeholder={isSendzyy ? "e.g. 180" : "e.g. 1, 6, 12"}
                  required
                />
              </div>
              <div className="form-group">
                <label>Duration Unit <span className="required">*</span></label>
                <select 
                  name="durationUnit" 
                  value={formData.durationUnit} 
                  onChange={handleChange}
                  className="filter-select"
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  <option value="day">Day(s)</option>
                  <option value="month">Month(s)</option>
                  <option value="year">Year(s)</option>
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What is this package about?"
                rows="2"
              ></textarea>
            </div>

            {!isSendzyy && (
              <div className="form-group full-width">
                <label>Services / Features (What this package offers)</label>
                <div className="dynamic-inputs-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  {formData.services.map((service, index) => (
                    <div key={index} style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={service}
                        onChange={(e) => handleServiceChange(index, e.target.value)}
                        placeholder={`Service #${index + 1} (e.g. 24/7 Support)`}
                        style={{ flex: 1 }}
                      />
                      {formData.services.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeServiceField(index)}
                          className="btn-icon delete"
                          style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', width: '45px' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={addServiceField} 
                    className="btn-secondary"
                    style={{ alignSelf: 'flex-start', fontSize: '12px', padding: '8px 16px' }}
                  >
                    + Add More Service
                  </button>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Saving..." : (packageData ? "Update Package" : "Save Package")}
              </button>
              <button type="button" className="btn-secondary" onClick={onBack}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExternalPackage;
