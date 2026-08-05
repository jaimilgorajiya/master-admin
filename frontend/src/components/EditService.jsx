import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const DURATION_OPTIONS = [
  { label: "1 Month", value: 1, unit: "months" },
  { label: "3 Months", value: 3, unit: "months" },
  { label: "6 Months", value: 6, unit: "months" },
  { label: "12 Months", value: 12, unit: "months" },
  { label: "One-Time", value: 1, unit: "one-time" },
  { label: "Lifetime", value: 1, unit: "lifetime" },
];

const EditService = ({ service, onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    duration: 1,
    durationUnit: "months",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || "",
        price: service.price || 0,
        description: service.description || "",
        duration: service.duration || 1,
        durationUnit: service.durationUnit || "months",
      });
    }
  }, [service]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
      const res = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/service/update/${service._id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        onSuccess("Service updated successfully!");
      }
    } catch (err) {
      console.error("Update service error:", err);
      setError(err.response?.data?.message || "Failed to update service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Edit Service</h1>
        <button className="btn-secondary" onClick={onBack}>
          ← Back to List
        </button>
      </div>

      <div className="form-center">
        <div className="form-card">
          <form onSubmit={handleSubmit} className="form-layout">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="name">
                Service Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Installation"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">
                Price (₹) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g., 5000"
                required
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Duration <span className="required">*</span></label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {DURATION_OPTIONS.map(opt => {
                  const isSelected = formData.duration === opt.value && formData.durationUnit === opt.unit;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, duration: opt.value, durationUnit: opt.unit }))}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(0,200,255,0.12)' : 'var(--input-bg)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 700 : 400,
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description of the service..."
                rows="4"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Updating..." : "Update Service"}
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

export default EditService;
