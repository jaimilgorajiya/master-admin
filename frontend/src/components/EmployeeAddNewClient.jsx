import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("employeeToken") || sessionStorage.getItem("employeeToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const STEPS = ["Business Details", "Package & Details"];

const safeVal = (v) => {
  if (v == null) return null;
  if (typeof v === "object") return `${v.value ?? ""}${v.unit ? " " + v.unit : ""}`.trim();
  return String(v);
};

const EmployeeAddNewClient = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [softwareList, setSoftwareList] = useState([]);
  const [selectedSoftware, setSelectedSoftware] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneClient, setDoneClient] = useState(null);

  const [step1, setStep1] = useState({ businessName: "", ownerName: "", email: "", phone: "" });
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [extraFields, setExtraFields] = useState({});

  const [coupons, setCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    fetchSoftware();
    fetchAvailableServices();
    fetchCoupons();
  }, []);

  const fetchSoftware = async () => {
    try {
      const res = await axios.get(`${API}/api/software/all`, { headers: authHeaders() });
      if (res.data.success) setSoftwareList((res.data.softwares || res.data.softwareList || []).filter(s => s.isActive));
    } catch { toast.error("Failed to load software list"); }
  };

  const fetchAvailableServices = async () => {
    try {
      const res = await axios.get(`${API}/api/service/all`, { headers: authHeaders() });
      if (res.data.success) setAvailableServices(res.data.services.filter(s => s.isActive));
    } catch (err) { console.error("Error fetching services:", err); }
  };

  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${API}/api/coupon/all`, { headers: authHeaders() });
      if (res.data.success) setCoupons(res.data.coupons || []);
    } catch (err) { console.error("Error fetching coupons:", err); }
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
    setSelectedSoftware(sw);
    setExtraFields({});
    setSelectedPackage(null);
    fetchPackages(sw);
  };

  const handleApplyCoupon = () => {
    if (!couponCodeInput.trim()) return;
    setCouponError("");
    setIsApplying(true);
    setTimeout(() => {
      const found = coupons.find(c => c.code.toUpperCase() === couponCodeInput.toUpperCase() && c.isActive);
      if (!found) {
        setCouponError("Invalid or inactive coupon code");
        setAppliedCoupon(null);
        setDiscountAmount(0);
      } else {
        if (found.expiryDate && new Date(found.expiryDate) < new Date()) {
          setCouponError("Coupon has expired");
          return setIsApplying(false);
        }
        const baseAmount = (selectedPackage?.price || 0) + selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
        let discount = found.discountType === "flat"
          ? found.discountValue
          : (baseAmount * found.discountValue) / 100;
        if (found.maxDiscountAmount && discount > found.maxDiscountAmount) discount = found.maxDiscountAmount;
        setDiscountAmount(discount);
        setAppliedCoupon(found);
        toast.success(`Coupon applied! Saved ₹${discount}`);
      }
      setIsApplying(false);
    }, 600);
  };

  const validateStep1 = () => {
    const { businessName, ownerName, email, phone } = step1;
    if (!businessName.trim()) return "Business Name is required";
    if (!ownerName.trim()) return "Owner Name is required";
    if (!email.trim()) return "Email is required";
    if (!phone.trim()) return "Phone is required";
    if (!selectedSoftware) return "Please select a software";
    return null;
  };

  const validateStep2 = () => {
    if (!selectedPackage) return "Please select a package";
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
      const pkgId = selectedPackage._id || selectedPackage.id || selectedPackage.packageId;
      const formattedServices = selectedServices.map(s => ({ serviceId: s._id, name: s.name, price: Number(s.price) }));
      const res = await axios.post(`${API}/api/software-clients/create`, {
        businessName: step1.businessName,
        ownerName: step1.ownerName,
        email: step1.email,
        phone: step1.phone,
        softwareId: selectedSoftware._id,
        packageId: pkgId,
        packageName: selectedPackage.name,
        packagePrice: selectedPackage.price ?? selectedPackage.totalPrice ?? 0,
        selectedServices: formattedServices,
        signupFieldValues: extraFields,
        appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
        discountAmount: discountAmount
      }, { headers: authHeaders() });

      if (!res.data.success) return toast.error(res.data.message || "Registration failed");
      setDoneClient(res.data.client);
      setDone(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.externalError?.message || "Registration failed";
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <>
    <div className="drawer-overlay active" onClick={onClose}>
      <div className="side-drawer active" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
        <div className="drawer-header">
          <h2 className="drawer-title">Add New Client</h2>
          <button className="close-drawer" onClick={onClose}>&times;</button>
        </div>

        {/* Stepper */}
        <div className="stepper-wrapper">
          <div className="stepper">
            {STEPS.map((label, i) => {
              const n = i + 1; const isActive = step === n; const isDone = step > n;
              return (
                <div key={n} className="step-item" onClick={() => isDone && setStep(n)}>
                  <div className={`step-number ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>{isDone ? '✓' : n}</div>
                  <div className={`step-label ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>{label}</div>
                </div>
              );
            })}
            <div className={`step-line ${step > 1 ? 'active' : ''}`}></div>
          </div>
        </div>

        <div className="drawer-body">
          {done && doneClient ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
              <h2 style={{ marginBottom: 12, fontSize: '24px' }}>Client Registered!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
                A payment link has been sent to <strong>{doneClient.email}</strong>.<br/>
                The client will be activated once payment is completed.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '24px', textAlign: 'left', marginBottom: 32, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-tertiary)' }}>BUSINESS:</strong> {doneClient.businessName}</p>
                <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-tertiary)' }}>OWNER:</strong> {doneClient.ownerName}</p>
                <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--text-tertiary)' }}>SOFTWARE:</strong> {doneClient.softwareName}</p>
                <p style={{ marginTop: 16 }}>
                  <span style={{ background: 'rgba(255,149,0,0.15)', color: '#ff9500', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Pending Payment</span>
                </p>
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={onClose}>Back to Dashboard</button>
            </div>
          ) : step === 1 ? (
            <EmpStep1 data={step1} onChange={setStep1} softwareList={softwareList} selectedSoftware={selectedSoftware} onSelectSoftware={handleSoftwareSelect} />
          ) : (
            <EmpStep2
              software={selectedSoftware}
              availableServices={availableServices}
              selectedServices={selectedServices}
              onToggleService={(service) => setSelectedServices(prev => prev.some(s => s._id === service._id) ? prev.filter(s => s._id !== service._id) : [...prev, service])}
              packages={packages} loadingPackages={loadingPackages}
              selectedPackage={selectedPackage}
              onSelectPackage={(pkg) => { setSelectedPackage(pkg); setAppliedCoupon(null); setDiscountAmount(0); }}
              couponCodeInput={couponCodeInput}
              setCouponCodeInput={(val) => { setCouponCodeInput(val); if (appliedCoupon) { setAppliedCoupon(null); setDiscountAmount(0); } }}
              onApplyCoupon={handleApplyCoupon}
              isApplying={isApplying} couponError={couponError}
              appliedCoupon={appliedCoupon} discountAmount={discountAmount}
              extraFields={extraFields} onChange={setExtraFields}
            />
          )}
        </div>

        {!done && (
          <div className="drawer-actions">
            <button className="btn-secondary" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()} disabled={submitting}>
              {step === 1 ? "Cancel" : "Back"}
            </button>
            {step === 1
              ? <button className="btn-primary" onClick={handleNext}>Next Step →</button>
              : <button className="btn-primary" onClick={handleRegister} disabled={submitting}>{submitting ? "Processing..." : "Register & Send Link"}</button>
            }
          </div>
        )}
      </div>
    </div>

    <style>{`
      .drawer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); z-index: 2000; display: flex; justify-content: flex-end; }
      .side-drawer { width: 100%; max-width: 550px; height: 100vh; background: #0f0a28; border-left: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; animation: slideInSw 0.3s ease; overflow: hidden; }
      @keyframes slideInSw { from { transform: translateX(100%); } to { transform: translateX(0); } }
      .drawer-header { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
      .drawer-title { font-size: 1.2rem; font-weight: 700; color: #fff; margin: 0; }
      .close-drawer { background: none; border: none; color: #777; font-size: 28px; cursor: pointer; line-height: 1; padding: 0; }
      .stepper-wrapper { padding: 24px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; }
      .stepper { display: flex; justify-content: space-between; position: relative; }
      .step-item { flex: 1; display: flex; flex-direction: column; align-items: center; z-index: 2; cursor: pointer; }
      .step-number { width: 32px; height: 32px; border-radius: 50%; background: #222; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: 8px; border: 2px solid rgba(255,255,255,0.1); transition: 0.3s; color: #fff; font-size: 14px; }
      .step-number.active { background: #00c8ff; border-color: #00c8ff; }
      .step-number.done { background: #34c759; border-color: #34c759; }
      .step-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #555; font-weight: 700; }
      .step-label.active { color: #fff; }
      .step-label.done { color: #34c759; }
      .step-line { position: absolute; top: 16px; left: 25%; right: 25%; height: 2px; background: #222; z-index: 1; transition: 0.3s; }
      .step-line.active { background: #34c759; }
      .drawer-body { flex: 1; overflow-y: auto; padding: 32px 24px; }
      .drawer-actions { padding: 24px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 16px; flex-shrink: 0; background: rgba(255,255,255,0.01); }
      .drawer-actions button { flex: 1; padding: 14px; font-weight: 700; border-radius: 12px; cursor: pointer; font-size: 14px; }
      .btn-primary { background: #00c8ff; color: #000; border: none; box-shadow: 0 10px 20px rgba(0,200,255,0.2); }
      .btn-secondary { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #777; }
      .form-group { margin-bottom: 20px; }
      .form-group label { display: block; font-size: 13px; font-weight: 600; color: #aaa; margin-bottom: 8px; }
      .form-group input, .form-group select, .form-group textarea { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 12px; color: #fff; outline: none; transition: 0.3s; font-size: 14px; box-sizing: border-box; }
      .form-group input:focus, .form-group select:focus { border-color: #00c8ff; background: rgba(255,255,255,0.06); }
      .required { color: #ff3b30; }
    `}</style>
    </>
  );
};

// ── Step 1 ────────────────────────────────────────────────────────────────────
const EmpStep1 = ({ data, onChange, softwareList, selectedSoftware, onSelectSoftware }) => {
  const set = (key, val) => onChange(prev => ({ ...prev, [key]: val }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
      <div>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: 10 }}>Select Software <span className="required">*</span></label>
        {softwareList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No active software found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {softwareList.map(sw => {
              const isSelected = selectedSoftware?._id === sw._id;
              return (
                <div key={sw._id} onClick={() => onSelectSoftware(sw)} style={{ padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'center', position: 'relative', border: isSelected ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)', background: isSelected ? 'rgba(0,200,255,0.1)' : 'rgba(255,255,255,0.02)', boxShadow: isSelected ? '0 0 15px rgba(0,200,255,0.2)' : 'none', transition: 'all 0.3s', transform: isSelected ? 'scale(1.02)' : 'scale(1)' }}>
                  {isSelected && <div style={{ position: 'absolute', top: -8, right: -8, background: 'var(--accent-primary)', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold' }}>✓</div>}
                  <div style={{ fontWeight: 700, marginBottom: 6, color: isSelected ? 'var(--accent-primary)' : 'white' }}>{sw.name}</div>
                  {sw.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{sw.description.slice(0, 45)}...</div>}
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
const EmpStep2 = ({ software, packages, loadingPackages, selectedPackage, onSelectPackage, availableServices, selectedServices, onToggleService, extraFields, onChange, couponCodeInput, setCouponCodeInput, onApplyCoupon, isApplying, couponError, appliedCoupon, discountAmount }) => {
  const set = (key, val) => onChange(prev => ({ ...prev, [key]: val }));
  const fields = software?.clientSignupFields || [];
  const totalServicesPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const baseAmount = (selectedPackage?.price || 0) + totalServicesPrice;
  const totalAmount = Math.max(0, baseAmount - discountAmount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Package Selection */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 20, background: 'var(--accent-primary)', borderRadius: 4 }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Select Package <span className="required">*</span></h3>
        </div>
        {loadingPackages ? (
          <div className="skeleton-loader" style={{ height: 80, borderRadius: 12 }} />
        ) : packages.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No packages available for this software.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {packages.map((pkg, i) => {
              const pkgId = pkg._id || pkg.id;
              const isSelected = pkgId === (selectedPackage?._id || selectedPackage?.id);
              return (
                <div key={pkgId || i} onClick={() => onSelectPackage(pkg)} style={{ padding: 20, borderRadius: 16, cursor: 'pointer', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: isSelected ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)', background: isSelected ? 'rgba(0,200,255,0.1)' : 'rgba(255,255,255,0.02)', boxShadow: isSelected ? '0 10px 25px rgba(0,200,255,0.15)' : 'none', transition: 'all 0.3s', transform: isSelected ? 'scale(1.01)' : 'scale(1)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: isSelected ? 'var(--accent-primary)' : 'white' }}>{safeVal(pkg.name)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Validity: {safeVal(pkg.durationDays || pkg.duration)} Days</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: isSelected ? 'white' : 'var(--accent-primary)' }}>₹{safeVal(pkg.price)}</div>
                    {isSelected && <div style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>Selected</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add-on Services */}
      {availableServices.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 4, height: 20, background: '#28a745', borderRadius: 4 }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Add-on Services</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {availableServices.map(service => {
              const isSelected = selectedServices.some(s => s._id === service._id);
              return (
                <div key={service._id} onClick={() => onToggleService(service)} style={{ padding: '14px 18px', borderRadius: 12, cursor: 'pointer', border: isSelected ? '1px solid #28a745' : '1px solid rgba(255,255,255,0.05)', background: isSelected ? 'rgba(40,167,69,0.08)' : 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: isSelected ? '2px solid #28a745' : '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? '#28a745' : 'transparent' }}>
                      {isSelected && <span style={{ color: 'white', fontSize: 12, fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400 }}>{service.name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isSelected ? '#28a745' : 'var(--text-secondary)' }}>+₹{service.price}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Extra Fields */}
      {fields.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 4, height: 20, background: 'var(--text-tertiary)', borderRadius: 4 }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Registration Details</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {fields.map(field => (
              <div className="form-group" key={field.fieldName}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{field.label}{field.required && <span className="required"> *</span>}</label>
                {field.type === 'textarea' ? (
                  <textarea placeholder={field.placeholder} rows="3" value={extraFields[field.fieldName] || ""} onChange={e => set(field.fieldName, e.target.value)} />
                ) : field.type === 'select' ? (
                  <select value={extraFields[field.fieldName] || ""} onChange={e => set(field.fieldName, e.target.value)}>
                    <option value="">Select Option...</option>
                    {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={field.type} placeholder={field.placeholder} value={extraFields[field.fieldName] || ""} onChange={e => set(field.fieldName, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Order Summary */}
      <section style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 2 }}>Order Summary</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{selectedPackage?.name || 'Software Package'}</span>
            <span style={{ fontWeight: 600 }}>₹{selectedPackage?.price || 0}</span>
          </div>
          {selectedServices.map(s => (
            <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#28a745' }}>
              <span>+ {s.name}</span><span>₹{s.price}</span>
            </div>
          ))}
          {baseAmount > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 10, display: 'block', letterSpacing: 1, fontWeight: 600 }}>Discount Coupon</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" placeholder="ENTER CODE" value={couponCodeInput} onChange={e => setCouponCodeInput(e.target.value.toUpperCase())} style={{ flex: 1, padding: '12px 16px', fontSize: 13, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', outline: 'none' }} />
                <button type="button" onClick={onApplyCoupon} disabled={!couponCodeInput || isApplying} style={{ padding: '0 24px', fontSize: 13, fontWeight: 700, background: appliedCoupon ? 'linear-gradient(135deg,#28a745,#2ed573)' : 'linear-gradient(135deg,var(--accent-primary),#00d2ff)', color: 'white', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: (!couponCodeInput || isApplying) ? 0.6 : 1 }}>
                  {isApplying ? "..." : appliedCoupon ? "Applied" : "Apply"}
                </button>
              </div>
              {couponError && <p style={{ color: '#ff3b30', fontSize: 12, marginTop: 8 }}>⚠ {couponError}</p>}
              {appliedCoupon && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(40,167,69,0.05)', border: '1px dashed rgba(40,167,69,0.3)', fontSize: 13, color: '#2ed573', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🎟 Discount (<strong>{appliedCoupon.code}</strong>)</span>
                  <span style={{ fontWeight: 700 }}>- ₹{discountAmount}</span>
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Total Due</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent-primary)', textShadow: '0 0 20px rgba(0,200,255,0.4)', letterSpacing: -1 }}>₹{totalAmount}</span>
              {discountAmount > 0 && <span style={{ fontSize: 11, color: '#2ed573', fontWeight: 600, marginTop: 2 }}>SAVING ₹{discountAmount} WITH COUPON</span>}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, padding: 10, background: 'rgba(0,200,255,0.05)', borderRadius: 8, border: '1px solid rgba(0,200,255,0.1)' }}>
          <p style={{ fontSize: 11, color: 'var(--accent-primary)', margin: 0, textAlign: 'center', fontWeight: 500 }}>⚡ A secure payment link will be sent to the client's email.</p>
        </div>
      </section>
    </div>
  );
};

export default EmployeeAddNewClient;
