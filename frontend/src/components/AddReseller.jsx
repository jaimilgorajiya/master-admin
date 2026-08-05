import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ResellerMarginConfig from "./ResellerMarginConfig";

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const AddReseller = ({ onClose, onSuccess }) => {
    const [submitting, setSubmitting] = useState(false);
    const [softwareList, setSoftwareList] = useState([]);
    const [serviceList, setServiceList] = useState([]);
    const [step, setStep] = useState(1);
    
    const [formData, setFormData] = useState({
        name: "", email: "", phone: "+91", companyName: "", address: "",
        allowedSoftware: [], allowedServices: [],
        marginConfig: { mode: 'overall', overall: { type: 'percentage', value: 0 } }
    });

    const [errors, setErrors] = useState({});

    const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? "" : "Enter a valid email address";

    const validatePhone = (val) => {
        const digits = val.replace(/^\+91/, "").replace(/\D/g, "");
        return digits.length === 10 ? "" : "Phone must be 10 digits after +91";
    };

    const handlePhoneChange = (val) => {
        // Always keep +91 prefix, only allow digits after it
        let digits = val.replace(/^\+91/, "").replace(/\D/g, "").slice(0, 10);
        const newVal = "+91" + digits;
        setFormData(prev => ({ ...prev, phone: newVal }));
        setErrors(prev => ({ ...prev, phone: validatePhone(newVal) }));
    };

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const [swRes, svRes] = await Promise.all([
                axios.get(`${API}/api/software/all`, { headers: authHeaders() }),
                axios.get(`${API}/api/service/all`, { headers: authHeaders() })
            ]);
            setSoftwareList(swRes.data.softwares || []);
            setServiceList(svRes.data.services || []);
        } catch (err) {
            toast.error("Error loading options");
        }
    };

    const toggleItem = (listName, id) => {
        setFormData(prev => {
            const list = prev[listName].includes(id) 
                ? prev[listName].filter(item => item !== id)
                : [...prev[listName], id];
            return { ...prev, [listName]: list };
        });
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.name || !formData.companyName || !formData.email || !formData.phone) {
                return toast.error("Please fill all required fields");
            }
            const emailErr = validateEmail(formData.email);
            const phoneErr = validatePhone(formData.phone);
            if (emailErr || phoneErr) {
                setErrors({ email: emailErr, phone: phoneErr });
                return toast.error("Please fix validation errors");
            }
            setStep(2);
        } else if (step === 2) {
            if (formData.allowedSoftware.length === 0 && formData.allowedServices.length === 0) {
                return toast.error("Assign at least one software or service");
            }
            setStep(3);
        }
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (step < 3) return nextStep();

        setSubmitting(true);
        try {
            const res = await axios.post(`${API}/api/reseller/create`, formData, { headers: authHeaders() });
            if (res.data.success) {
                toast.success("Partner successfully onboarded!");
                onSuccess();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Internal server error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="right-sidebar-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="right-sidebar-container">
                <button className="sidebar-close-btn" onClick={onClose}>&times;</button>
                
                <div className="right-sidebar-header">
                    <h2 className="right-sidebar-title">Onboard Partner</h2>
                    
                    <div className="stepper">
                        <div className={`step-indicator ${step === 1 ? 'active' : 'completed'}`}>
                            <span className="step-label">Partner Profile</span>
                        </div>
                        <div className={`step-indicator ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
                            <span className="step-label">Permissions</span>
                        </div>
                        <div className={`step-indicator ${step === 3 ? 'active' : ''}`}>
                            <span className="step-label">Commission</span>
                        </div>
                    </div>
                </div>

                <div className="right-sidebar-body">
                    {step === 1 ? (
                        <div className="sidebar-form-section">
                            <h3 className="sidebar-section-title">Identity Details</h3>
                            
                            <div className="form-group-premium">
                                <label>Owner Name *</label>
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    placeholder="Enter full name"
                                    required 
                                />
                            </div>

                            <div className="form-group-premium">
                                <label>Company Name *</label>
                                <input 
                                    type="text" 
                                    value={formData.companyName} 
                                    onChange={e => setFormData({...formData, companyName: e.target.value})} 
                                    placeholder="Business entity name"
                                    required 
                                />
                            </div>

                            <div className="form-group-premium">
                                <label>Email Address *</label>
                                <input 
                                    type="email" 
                                    value={formData.email} 
                                    onChange={e => {
                                        setFormData({...formData, email: e.target.value});
                                        setErrors(prev => ({ ...prev, email: validateEmail(e.target.value) }));
                                    }}
                                    placeholder="corporate@example.com"
                                    required 
                                    style={errors.email ? { borderColor: '#ff3b30' } : {}}
                                />
                                {errors.email && <span style={{ color: '#ff3b30', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
                            </div>

                            <div className="form-group-premium">
                                <label>Phone Number *</label>
                                <input 
                                    type="text" 
                                    value={formData.phone} 
                                    onChange={e => handlePhoneChange(e.target.value)}
                                    placeholder="+91 XXXXXXXXXX"
                                    required 
                                    style={errors.phone ? { borderColor: '#ff3b30' } : {}}
                                />
                                {errors.phone && <span style={{ color: '#ff3b30', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.phone}</span>}
                            </div>

                            <div className="form-group-premium">
                                <label>Office Address</label>
                                <textarea 
                                    rows="3" 
                                    value={formData.address} 
                                    onChange={e => setFormData({...formData, address: e.target.value})} 
                                    placeholder="Registered business address..."
                                />
                            </div>
                        </div>
                    ) : step === 2 ? (
                        <div className="sidebar-form-section">
                            <div>
                                <h3 className="sidebar-section-title" style={{ marginBottom: '16px' }}>Available Softwares</h3>
                                <div className="selection-grid">
                                    {softwareList.length > 0 ? softwareList.map(sw => (
                                        <div 
                                            key={sw._id} 
                                            className={`selection-card ${formData.allowedSoftware.includes(sw._id) ? 'selected' : ''}`}
                                            onClick={() => toggleItem('allowedSoftware', sw._id)}
                                        >
                                            <div className="selection-check">
                                                {formData.allowedSoftware.includes(sw._id) && <span>✓</span>}
                                            </div>
                                            <div className="selection-info">
                                                <span className="selection-name">{sw.name}</span>
                                            </div>
                                        </div>
                                    )) : <div className="text-muted" style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--glass-border)', borderRadius: '12px' }}>No software available</div>}
                                </div>
                            </div>

                            <div style={{ marginTop: '20px' }}>
                                <h3 className="sidebar-section-title" style={{ marginBottom: '16px' }}>Available Services</h3>
                                <div className="selection-grid">
                                    {serviceList.length > 0 ? serviceList.map(sv => (
                                        <div 
                                            key={sv._id} 
                                            className={`selection-card ${formData.allowedServices.includes(sv._id) ? 'selected' : ''}`}
                                            onClick={() => toggleItem('allowedServices', sv._id)}
                                        >
                                            <div className="selection-check">
                                                {formData.allowedServices.includes(sv._id) && <span>✓</span>}
                                            </div>
                                            <div className="selection-info">
                                                <span className="selection-name">{sv.name}</span>
                                            </div>
                                        </div>
                                    )) : <div className="text-muted" style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--glass-border)', borderRadius: '12px' }}>No services available</div>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="sidebar-form-section animate-fade-in">
                            <h3 className="sidebar-section-title">Margin Configuration</h3>
                            <ResellerMarginConfig 
                                initialConfig={formData.marginConfig} 
                                allowedSoftwareIds={formData.allowedSoftware}
                                onChange={(config) => setFormData({...formData, marginConfig: config})} 
                            />
                        </div>
                    )}
                </div>

                <div className="right-sidebar-footer">
                    {step < 3 ? (
                        <button className="btn-primary" onClick={nextStep} style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '16px' }}>
                            Next: {step === 1 ? 'Assign Permissions' : 'Configure Commission'}
                        </button>
                    ) : (
                        <>
                            <button className="btn-secondary" onClick={prevStep} style={{ flex: 1, padding: '16px', borderRadius: '12px' }}>
                                Back
                            </button>
                            <button className="btn-primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '16px', borderRadius: '12px', background: 'var(--accent-primary)', fontSize: '16px' }}>
                                {submitting ? "Onboarding..." : "Onboard Partner"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddReseller;
