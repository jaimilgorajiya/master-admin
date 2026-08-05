import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("resellerToken") || sessionStorage.getItem("resellerToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const STEPS = ["Business Details", "Package & Details"];

const ResellerAddNewClient = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [softwareList, setSoftwareList] = useState([]);
  const [selectedSoftware, setSelectedSoftware] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneClient, setDoneClient] = useState(null);

  const [step1, setStep1] = useState({
    businessName: "", ownerName: "", email: "", phone: ""
  });
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]); // array of service objects
  const [extraFields, setExtraFields] = useState({});

  useEffect(() => { 
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/api/reseller-actions/my-permissions`, { headers: authHeaders() });
      if (res.data.success) {
        setSoftwareList(res.data.data.allowedSoftware || []);
        setAvailableServices(res.data.data.allowedServices || []);
      }
    } catch (err) {
      console.error("Error fetching inventory:", err);
      toast.error("Failed to load your assigned inventory");
    }
  };

  const fetchPackages = async (software) => {
    if (!software?.packageGetApi) return;
    setLoadingPackages(true);
    try {
      const res = await axios.post(`${API}/api/proxy/external`, {
        targetUrl: software.packageGetApi, method: "GET"
      }, { headers: authHeaders() });
      const data = res.data;
      const list = Array.isArray(data) ? data : (data.packages || data.data || []);
      setPackages(list);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load packages");
      setPackages([]);
    } finally { setLoadingPackages(false); }
  };

  const handleSoftwareSelect = (sw) => {
    if (selectedSoftware?._id === sw._id) {
        setSelectedSoftware(null);
        setPackages([]);
        return;
    }
    setSelectedSoftware(sw);
    setExtraFields({});
    setSelectedPackage(null);
    fetchPackages(sw);
  };

  const validateStep1 = () => {
    const { businessName, ownerName, email, phone } = step1;
    if (!businessName.trim()) return "Business Name is required";
    if (!ownerName.trim()) return "Owner Name is required";
    if (!email.trim()) return "Email is required";
    if (!phone.trim()) return "Phone is required";
    // Software is now optional to allow service-only clients
    return null;
  };

  const validateStep2 = () => {
    // If software is selected, package becomes required
    if (selectedSoftware && !selectedPackage) return "Please select a package for the software";
    // If NO software is selected, at least one service MUST be selected
    if (!selectedSoftware && selectedServices.length === 0) return "Please select at least one service for this client";

    for (const field of (selectedSoftware?.clientSignupFields || [])) {
      if (field.required && !extraFields[field.fieldName]?.toString().trim()) {
        return `${field.label} is required`;
      }
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) return toast.error(err);
    setStep(2);
  };

  const handleRegister = async () => {
    const err = validateStep2();
    if (err) return toast.error(err);

    setSubmitting(true);
    try {
      // Handle optional package ID
      const pkgId = selectedPackage ? (selectedPackage._id || selectedPackage.id || selectedPackage.packageId) : null;
      
      const formattedServices = selectedServices.map(s => ({
        serviceId: s._id,
        name: s.name,
        price: Number(s.price)
      }));

      const res = await axios.post(`${API}/api/reseller-actions/clients`, {
        businessName: step1.businessName,
        ownerName: step1.ownerName,
        email: step1.email,
        phone: step1.phone,
        softwareId: selectedSoftware?._id || null, // Can be null
        packageId: pkgId,
        packageName: selectedPackage?.name || null,
        packagePrice: selectedPackage?.price || null,
        selectedServices: formattedServices,
        signupFieldValues: extraFields
      }, { headers: authHeaders() });

      if (!res.data.success) return toast.error(res.data.message || "Registration failed");

      setDoneClient(res.data.data);
      setDone(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done && doneClient) {
    return (
      <div className={`drawer-overlay active`} onClick={onClose}>
        <div className={`side-drawer active`} onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
          <div className="drawer-header">
            <h2 className="drawer-title">Success</h2>
            <button className="close-drawer" onClick={onClose}>&times;</button>
          </div>
          <div className="drawer-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 style={{ marginBottom: 12, fontSize: '24px' }}>Client Registered!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
              A payment link has been sent to <strong>{doneClient.email}</strong>.<br/>
              The client will be activated once payment is completed.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '24px', textAlign: 'left', marginBottom: 32, border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-tertiary)' }}>BUSINESS:</strong> {doneClient.businessName || doneClient.companyName}</p>
              <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-tertiary)' }}>OWNER:</strong> {doneClient.ownerName || doneClient.clientName}</p>
              <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-tertiary)' }}>TYPE:</strong> {doneClient.softwareName ? `Software (${doneClient.softwareName})` : 'Service Only'}</p>
              <p style={{ marginTop: 16 }}>
                <span style={{ background: 'rgba(255,149,0,0.15)', color: '#ff9500', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                  Pending Payment
                </span>
              </p>
            </div>
            <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={onClose}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`drawer-overlay active`} onClick={onClose}>
      <div className={`side-drawer active`} onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h2 className="drawer-title">Onboard New Client</h2>
          <button className="close-drawer" onClick={onClose}>&times;</button>
        </div>

        <div className="stepper-wrapper" style={{ padding: '40px 32px 10px 32px' }}>
          <div className="stepper" style={{ position: 'relative', marginTop: 0 }}>
            {STEPS.map((label, i) => {
              const n = i + 1;
              const isActive = step === n;
              const isDone = step > n;
              return (
                <div key={n} className={`step-indicator ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`} 
                  onClick={() => isDone && setStep(n)}
                  style={{ cursor: isDone ? 'pointer' : 'default' }}>
                  <div className="step-label" style={{ 
                    top: '-24px', 
                    color: isActive ? 'var(--accent-primary)' : isDone ? '#34c759' : 'var(--text-tertiary)',
                    fontWeight: isActive || isDone ? 800 : 500
                  }}>
                    {n}. {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="drawer-body">
          {step === 1 && (
            <Step1 data={step1} onChange={setStep1}
              softwareList={softwareList} selectedSoftware={selectedSoftware}
              onSelectSoftware={handleSoftwareSelect} />
          )}
          {step === 2 && (
            <Step2
              software={selectedSoftware}
              availableServices={availableServices}
              selectedServices={selectedServices}
              onToggleService={(service) => {
                setSelectedServices(prev => 
                  prev.some(s => s._id === service._id)
                    ? prev.filter(s => s._id !== service._id)
                    : [...prev, service]
                );
              }}
              packages={packages} loadingPackages={loadingPackages}
              selectedPackage={selectedPackage} onSelectPackage={(pkg) => {
                  setSelectedPackage(pkg);
              }}
              extraFields={extraFields} onChange={setExtraFields} />
          )}
        </div>

        <div className="drawer-actions">
          <button className="btn-secondary"
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            disabled={submitting}>
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step === 1 ? (
            <button className="btn-primary" onClick={handleNext}>Next Step →</button>
          ) : (
            <button className="btn-primary" onClick={handleRegister} disabled={submitting}>
              {submitting ? "Processing..." : "Onboard & Send Link"}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          justify-content: flex-end;
          transition: all 0.3s ease;
        }
        .side-drawer {
          width: 100%;
          max-width: 550px;
          height: 100vh;
          background: #0f0a28;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: -20px 0 50px rgba(0,0,0,0.5);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .drawer-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          color: white;
        }
        .close-drawer {
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 32px;
          cursor: pointer;
          line-height: 1;
        }
        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 10px 24px 32px 24px;
        }
        .drawer-actions {
          padding: 24px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          gap: 16px;
          background: rgba(255,255,255,0.01);
        }
        .drawer-actions button {
          flex: 1;
          padding: 14px;
          font-weight: 600;
        }
        .form-grid.single-column {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        .form-group { width: 100%; }
        .required { color: #ff3b30; margin-left: 4px; }
      `}</style>
    </div>
  );
};

// ── Step 1 ────────────────────────────────────────────────────────────────────
const Step1 = ({ data, onChange, softwareList, selectedSoftware, onSelectSoftware }) => {
  const set = (key, val) => onChange(prev => ({ ...prev, [key]: val }));
  return (
    <div>
      <div className="form-grid single-column" style={{ gap: '20px' }}>
        <div className="form-group">
          <label>Business Name <span className="required">*</span></label>
          <input type="text" placeholder="Acme Corp" value={data.businessName} onChange={e => set('businessName', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Owner Name <span className="required">*</span></label>
          <input type="text" placeholder="John Doe" value={data.ownerName} onChange={e => set('ownerName', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Email <span className="required">*</span></label>
          <input type="email" placeholder="owner@example.com" value={data.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Phone <span className="required">*</span></label>
          <input type="tel" placeholder="+91 9876543210" value={data.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Select Software Access <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'none' }}>(Optional)</span>
            </label>
            {selectedSoftware && (
                <button onClick={() => onSelectSoftware(null)} style={{ background: 'none', border: 'none', color: '#ff3b30', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>Clear Selection</button>
            )}
        </div>
        
        {softwareList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No assigned software found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {softwareList.map(sw => {
              const isSelected = selectedSoftware?._id === sw._id;
              return (
                <div key={sw._id} onClick={() => onSelectSoftware(sw)} style={{
                  padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                  position: 'relative',
                  border: isSelected ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                  background: isSelected ? 'rgba(0,200,255,0.1)' : 'rgba(255,255,255,0.02)',
                  boxShadow: isSelected ? '0 0 15px rgba(0, 200, 255, 0.2)' : 'none',
                  transition: 'all 0.3s ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}>
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '-8px', right: '-8px',
                      background: 'var(--accent-primary)', color: 'white',
                      width: '24px', height: '24px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 'bold', boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                    }}>
                      ✓
                    </div>
                  )}
                  <div style={{ fontWeight: 700, marginBottom: 6, color: isSelected ? 'var(--accent-primary)' : 'white' }}>{sw.name}</div>
                  {sw.description && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {sw.description.slice(0, 45)}...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Step 2 ────────────────────────────────────────────────────────────────────
const safeVal = (v) => {
  if (v == null) return null;
  if (typeof v === 'object') return `${v.value ?? ''}${v.unit ? ' ' + v.unit : ''}`.trim();
  return String(v);
};

const Step2 = ({ 
  software, 
  packages, 
  loadingPackages, 
  selectedPackage, 
  onSelectPackage, 
  availableServices, 
  selectedServices, 
  onToggleService, 
  extraFields, 
  onChange
}) => {
  const set = (key, val) => onChange(prev => ({ ...prev, [key]: val }));
  const fields = software?.clientSignupFields || [];

  const totalServicesPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalAmount = (selectedPackage?.price || 0) + totalServicesPrice;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* 1. Package Selection Section (IF SOFTWARE SELECTED) */}
      {software ? (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '4px', height: '20px', background: 'var(--accent-primary)', borderRadius: '4px' }}></div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Select Package <span className="required">*</span>
            </h3>
          </div>
          
          {loadingPackages ? (
            <div className="skeleton-loader" style={{ height: '80px', borderRadius: '12px' }}></div>
          ) : packages.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No packages available for {software.name}.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {packages.map((pkg, i) => {
                const pkgId = pkg._id || pkg.id;
                const selId = selectedPackage?._id || selectedPackage?.id;
                const isSelected = pkgId === selId;
                return (
                  <div key={pkgId || i} onClick={() => onSelectPackage(pkg)} style={{
                    padding: '20px', borderRadius: '16px', cursor: 'pointer',
                    position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: isSelected ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                    background: isSelected ? 'rgba(0,200,255,0.1)' : 'rgba(255,255,255,0.02)',
                    boxShadow: isSelected ? '0 10px 25px rgba(0, 200, 255, 0.15)' : 'none',
                    transition: 'all 0.3s ease',
                    transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px', color: isSelected ? 'var(--accent-primary)' : 'white' }}>
                        {safeVal(pkg.name)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Validity: {safeVal(pkg.durationDays || pkg.duration)} Days
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: isSelected ? 'white' : 'var(--accent-primary)' }}>
                        ₹{safeVal(pkg.price)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
          <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '13px' }}>No software selected. Please choose services below.</p>
          </div>
      )}

      {/* 2. Additional Services Section */}
      {availableServices.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '4px', height: '20px', background: '#28a745', borderRadius: '4px' }}></div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Available Services {!software && <span className="required">*</span>}
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            {availableServices.map(service => {
              const isSelected = selectedServices.some(s => s._id === service._id);
              return (
                <div key={service._id} onClick={() => onToggleService(service)} style={{
                  padding: '14px 18px', borderRadius: '12px', cursor: 'pointer',
                  border: isSelected ? '1px solid #28a745' : '1px solid rgba(255,255,255,0.05)',
                  background: isSelected ? 'rgba(40,167,69,0.08)' : 'rgba(255,255,255,0.01)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '18px', height: '18px', borderRadius: '4px', 
                      border: isSelected ? '2px solid #28a745' : '2px solid rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isSelected ? '#28a745' : 'transparent'
                    }}>
                      {isSelected && <span style={{ color: 'white', fontSize: '12px', fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: isSelected ? 600 : 400 }}>{service.name}</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? '#28a745' : 'var(--text-secondary)' }}>+₹{service.price}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Software Specific Fields (ONLY IF SOFTWARE SELECTED) */}
      {fields.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '4px', height: '20px', background: 'var(--text-tertiary)', borderRadius: '4px' }}></div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Registration Details
            </h3>
          </div>
          <div className="form-grid single-column" style={{ gap: '18px' }}>
            {fields.map((field) => (
              <div className="form-group" key={field.fieldName}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{field.label}{field.required && <span className="required"> *</span>}</label>
                {field.type === 'textarea' ? (
                  <textarea placeholder={field.placeholder} rows="3"
                    value={extraFields[field.fieldName] || ""}
                    onChange={e => set(field.fieldName, e.target.value)} />
                ) : field.type === 'select' ? (
                  <select value={extraFields[field.fieldName] || ""} onChange={e => set(field.fieldName, e.target.value)}>
                    <option value="">Select Option...</option>
                    {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={field.type} placeholder={field.placeholder}
                    value={extraFields[field.fieldName] || ""}
                    onChange={e => set(field.fieldName, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Order Summary Section */}
      <section style={{ 
        marginTop: '10px', padding: '24px', background: 'rgba(255,255,255,0.02)', 
        borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '2px' }}>Order Summary</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{software ? 'Package Base' : 'Service Client'}</span>
            <span style={{ fontWeight: 600 }}>₹{selectedPackage?.price || 0}</span>
          </div>
          {selectedServices.map(s => (
            <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#28a745' }}>
              <span>+ {s.name}</span>
              <span>₹{s.price}</span>
            </div>
          ))}
          <div style={{ 
            marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Due</span>
            <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--accent-primary)' }}>₹{totalAmount}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResellerAddNewClient;
