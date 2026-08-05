import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AddExternalPackage = ({ software, onBack, onSuccess, packageData = null }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: packageData?.name || "",
    description: packageData?.description || "",
    price: packageData?.price || "",
    durationValue: packageData?.duration?.value || packageData?.durationValue || "",
    durationUnit: packageData?.duration?.unit || packageData?.durationUnit || "month",
    services: packageData?.services || [""]
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (formData.services.length <= 1) return; // Keep at least one
    const newServices = formData.services.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, services: newServices }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filter out empty service strings
    const finalServices = formData.services.filter(s => s.trim() !== "");
    
    if (!formData.name || !formData.price || !formData.durationValue) {
      return toast.error("Please fill all required fields");
    }

    if (finalServices.length === 0) {
      return toast.error("Please add at least one service/feature for this package");
    }

    setLoading(true);
    try {
      // Calling the EXTERNAL software API VIA PROXY to bypass CORS
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      
      const dataToSend = { 
        name: formData.name,
        price: Number(formData.price),
        description: formData.description,
        services: finalServices,
        duration: {
          value: Number(formData.durationValue),
          unit: formData.durationUnit
        }
      };

      const isEditing = !!packageData;
      const targetUrl = isEditing 
        ? software.packagePutApi.replace(":id", packageData._id) 
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
      }
    } catch (err) {
      console.error("Error saving external package:", err);
      const errorMsg = err.response?.data?.message || err.message || "Operation failed";
      toast.error(errorMsg);
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
            <div className="form-grid two-columns">
              <div className="form-group">
                <label>Package Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Premium Plan"
                  required
                />
              </div>
              <div className="form-group">
                <label>Price (₹) <span className="required">*</span></label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g. 9999"
                  required
                />
              </div>
            </div>

            <div className="form-grid two-columns">
              <div className="form-group">
                <label>Duration Value <span className="required">*</span></label>
                <input
                  type="number"
                  name="durationValue"
                  value={formData.durationValue}
                  onChange={handleChange}
                  placeholder="e.g. 1, 6, 12"
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
                  <option value="week">Week(s)</option>
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
