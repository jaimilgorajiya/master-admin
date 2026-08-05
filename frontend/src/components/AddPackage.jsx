import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";


const AddPackage = ({ onBack, onSuccess, initialPackageType = 'service' }) => {
    const [formData, setFormData] = useState({
        name: "",
        packageType: initialPackageType, // Defaults to 'service' now
        softwareId: "",
        serviceIds: [],
        durationDays: 30,
        unit: 'days',
        price: 0,
        description: "",
    });
    const [softwareList, setSoftwareList] = useState([]);
    const [serviceList, setServiceList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const token = localStorage.getItem("adminToken");
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/service/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if(res.data.success) {
                setServiceList(res.data.services);
            }
        } catch (error) {
            console.error("Fetch services error", error);
        }
    };


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleServiceChange = (e) => {
        const { value, checked } = e.target;
        const id = String(value);
        let updatedServices = [...formData.serviceIds];
        if (checked) {
            if (!updatedServices.includes(id)) updatedServices.push(id);
        } else {
            updatedServices = updatedServices.filter(sid => String(sid) !== id);
        }
        setFormData({ ...formData, serviceIds: updatedServices });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            const token = localStorage.getItem("adminToken");
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/package/create`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if(res.data.success) {
                toast.success("Package created successfully");
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error("Create package error", error);
            setError(error.response?.data?.message || "Failed to create package");
            toast.error("Failed to create package");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Create New Service Package</h1>
                <button className="btn-secondary" onClick={onBack}>
                    ← Back to List
                </button>
            </div>

            <div className="form-center">
                <div className="form-card">
                    <form onSubmit={handleSubmit} className="form-layout">
                        {error && <div className="error-message">{error}</div>}
                        

                        <div className="form-group">
                            <label>Package Name <span className="required">*</span></label>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                required 
                                placeholder="e.g. Gold Plan" 
                            />
                        </div>

                        <div className="form-group" style={{ position: 'relative' }}>
                            <label>Select Services <span className="required">*</span></label>
                            <div 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="search-input"
                                style={{
                                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '45px', paddingLeft: '16px',
                                    borderColor: isDropdownOpen ? 'var(--accent-primary)' : 'var(--glass-border)',
                                    boxShadow: isDropdownOpen ? '0 0 15px var(--accent-glow)' : 'none'
                                }}
                            >
                                <span style={{ color: formData.serviceIds.length > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                    {formData.serviceIds.length > 0 
                                        ? serviceList.filter(s => formData.serviceIds.includes(String(s._id))).map(s => s.name).join(', ')
                                        : "Select Services"}
                                </span>
                                <span style={{ 
                                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontSize: '12px', opacity: 0.7
                                }}>▼</span>
                            </div>

                            {isDropdownOpen && (
                                <div className="premium-dropdown-list" style={{
                                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 100, 
                                    background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px', padding: '8px', maxHeight: '250px', overflowY: 'auto', 
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}>
                                    {serviceList.length === 0 ? (
                                        <div style={{ padding: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No services available</div>
                                    ) : (
                                        serviceList.map(s => (
                                            <div 
                                                key={s._id} 
                                                onClick={() => {
                                                    const isSelected = formData.serviceIds.includes(String(s._id));
                                                    handleServiceChange({ target: { value: String(s._id), checked: !isSelected } });
                                                }}
                                                style={{ 
                                                    display: 'flex', alignItems: 'center', padding: '10px', cursor: 'pointer', 
                                                    borderRadius: '6px', background: formData.serviceIds.includes(String(s._id)) ? 'rgba(255,255,255,0.08)' : 'transparent', 
                                                    transition: 'all 0.2s', marginBottom: '2px'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = formData.serviceIds.includes(String(s._id)) ? 'rgba(255,255,255,0.08)' : 'transparent'}
                                            >
                                                <input type="checkbox" checked={formData.serviceIds.includes(String(s._id))} readOnly style={{ marginRight: '12px', width: '18px', height: '18px', pointerEvents: 'none' }} />
                                                <span style={{ color: '#fff', fontSize: '14px' }}>{s.name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            <small className="input-hint">Select at least one service</small>
                        </div>
                        

                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Duration Value <span className="required">*</span></label>
                                <input 
                                    type="number" 
                                    name="durationDays" 
                                    value={formData.unit === 'one-time' ? 1 : formData.durationDays} 
                                    onChange={handleChange} 
                                    required 
                                    disabled={formData.unit === 'one-time'}
                                    style={{ 
                                        opacity: formData.unit === 'one-time' ? 0.5 : 1,
                                        cursor: formData.unit === 'one-time' ? 'not-allowed' : 'text',
                                        background: formData.unit === 'one-time' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)'
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Unit <span className="required">*</span></label>
                                <select name="unit" value={formData.unit} onChange={handleChange} required>
                                    <option value="days">Days</option>
                                    <option value="minutes">Minutes</option>
                                    <option value="months">Months</option>
                                    <option value="years">Years</option>
                                    <option value="one-time">One Time</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Price (₹) <span className="required">*</span></label>
                            <input 
                                type="number" 
                                name="price" 
                                value={formData.price} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                rows="3"
                                placeholder="Package description..."
                            ></textarea>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? "Creating..." : "Create Package"}
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

export default AddPackage;
