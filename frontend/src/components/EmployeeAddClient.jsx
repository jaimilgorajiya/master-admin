import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem("employeeToken") || sessionStorage.getItem("employeeToken");
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const STEPS = ["Client Details", "Services & Billing"];

const EmployeeAddClient = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneClient, setDoneClient] = useState(null);

  const [formData, setFormData] = useState({
    clientName: "", clientEmail: "", clientPhone: "",
    clientType: "service", serviceIds: [], packageIds: [],
  });

  const [serviceList, setServiceList] = useState([]);
  const [packages, setPackages] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPackageDropdownOpen, setIsPackageDropdownOpen] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${API}/api/package/all`, { headers: authHeaders() });
      if (res.data.success)
        setPackages(res.data.packages.filter(p => p.serviceIds && p.serviceIds.length > 0));
    } catch (err) { console.error("Error fetching packages:", err); }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get(`${API}/api/service/all`, { headers: authHeaders() });
      if (res.data.success) setServiceList(res.data.services);
    } catch (err) { console.error("Fetch services error", err); }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return toast.error("Please enter a coupon code");
    const { originalTotal } = calculateTotal();
    if (originalTotal === 0) return toast.error("Select services or packages first");
    setApplyingCoupon(true);
    try {
      const res = await axios.post(`${API}/api/coupon/validate`, {
        code: couponCode, serviceIds: formData.serviceIds, amount: originalTotal
      }, { headers: authHeaders() });
      if (res.data.success) {
        setDiscountInfo({ code: couponCode, discount: res.data.discount, finalAmount: res.data.finalAmount });
        toast.success("Coupon applied!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid coupon");
      setDiscountInfo(null);
    } finally { setApplyingCoupon(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "clientPhone") {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, "").slice(0, 10) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (e) => {
    const { value } = e.target;
    // Single select only for employees
    setFormData(prev => ({ ...prev, serviceIds: [value] }));
    setDiscountInfo(null);
  };

  const handlePackageChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({ ...prev, packageIds: checked ? [...prev.packageIds, value] : prev.packageIds.filter(id => id !== value) }));
    setDiscountInfo(null);
  };

  const validateStep1 = () => {
    if (!formData.clientName.trim()) return "Client Name is required";
    if (!formData.clientEmail.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) return "Invalid email format";
    if (formData.clientPhone.length !== 10) return "Phone number must be 10 digits";
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) return toast.error(err);
    setStep(2);
  };

  const calculateTotal = () => {
    let serviceTotal = 0, pkgTotal = 0;
    formData.serviceIds.forEach(id => { const s = serviceList.find(x => x._id === id); if (s) serviceTotal += (s.price || 0); });
    formData.packageIds.forEach(id => { const p = packages.find(x => x._id === id); if (p) pkgTotal += (p.price || 0); });
    const originalTotal = serviceTotal + pkgTotal;
    return { total: discountInfo ? (originalTotal - discountInfo.discount) : originalTotal, serviceTotal, pkgTotal, originalTotal };
  };

  const handleSubmit = async () => {
    if (formData.serviceIds.length === 0 && formData.packageIds.length === 0)
      return toast.error("Please select at least one Service or Package");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/client/employee-create`, {
        ...formData,
        clientPhone: `+91${formData.clientPhone}`,
        couponCode: discountInfo?.code,
        discountAmount: discountInfo?.discount || 0
      }, { headers: authHeaders() });

      if (res.data.success) {
        setDoneClient({
          ...res.data.client,
          selectedServices: formData.serviceIds.map(id => serviceList.find(s => s._id === id)?.name).filter(Boolean),
          selectedPackages: formData.packageIds.map(id => packages.find(p => p._id === id)?.name).filter(Boolean),
        });
        setDone(true);
        if (onSuccess) onSuccess("Client created successfully!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create client");
    } finally { setLoading(false); }
  };

  const currentTotal = calculateTotal();

  return (
    <div className="drawer-overlay active" onClick={onBack}>
      <div className="side-drawer active" onClick={e => e.stopPropagation()}>
        {done && doneClient ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="drawer-header">
              <h2 className="drawer-title">Success</h2>
              <button className="close-drawer" onClick={onBack}>&times;</button>
            </div>
            <div className="drawer-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>✅</div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '12px', color: 'white' }}>Client Onboarded!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6', fontSize: '15px' }}>
                Registration complete. A payment link has been sent to <br/>
                <strong style={{ color: 'var(--accent-primary)' }}>{doneClient.email}</strong>
              </p>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '24px', textAlign: 'left', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>Client Name</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{doneClient.name}</span>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>Selected Items</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[...(doneClient.selectedPackages || []), ...(doneClient.selectedServices || [])].map((item, i) => (
                      <span key={i} style={{ fontSize: '12px', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>{item}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Status</span>
                  <span style={{ background: 'rgba(255,149,0,0.1)', color: '#ff9500', padding: '6px 14px', borderRadius: '50px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', border: '1px solid rgba(255,149,0,0.2)' }}>Pending Payment</span>
                </div>
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700 }} onClick={onBack}>Return to Dashboard</button>
            </div>
          </div>
        ) : (
          <>
            <div className="drawer-header">
              <h2 className="drawer-title">Add Service Client</h2>
              <button className="close-drawer" onClick={onBack}>&times;</button>
            </div>

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
              {step === 1 ? (
                <div className="form-grid single-column">
                  <div className="form-group">
                    <label>Client Name <span className="required">*</span></label>
                    <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} placeholder="e.g. John Doe" />
                  </div>
                  <div className="form-group">
                    <label>Email Address <span className="required">*</span></label>
                    <input type="email" name="clientEmail" value={formData.clientEmail} onChange={handleChange} placeholder="owner@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Phone Number <span className="required">*</span></label>
                    <div className="phone-input">
                      <span className="prefix">+91</span>
                      <input type="tel" name="clientPhone" value={formData.clientPhone} onChange={handleChange} placeholder="10-digit number" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="billing-step">
                  <div className="premium-group relative">
                    <label>Additional Services</label>
                    <div className={`custom-select-trigger ${isDropdownOpen ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); setIsPackageDropdownOpen(false); }}>
                      <span>{formData.serviceIds.length === 0 ? "Select a Service" : serviceList.find(s => s._id === formData.serviceIds[0])?.name || "1 Selected"}</span>
                      <span className="chevron">▼</span>
                    </div>
                    {isDropdownOpen && (
                      <div className="premium-dropdown" onClick={e => e.stopPropagation()}>
                        {serviceList.length === 0 ? <div className="dropdown-empty">No services found</div> : serviceList.map(s => (
                          <label key={s._id} className="dropdown-item">
                            <input type="radio" name="serviceSelect" value={s._id} checked={formData.serviceIds.includes(s._id)} onChange={handleServiceChange} />
                            <div className="item-details"><span className="name">{s.name}</span><span className="price">₹{s.price}</span></div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="premium-group relative mt-6">
                    <label>Service Packages</label>
                    <div className={`custom-select-trigger ${isPackageDropdownOpen ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setIsPackageDropdownOpen(!isPackageDropdownOpen); setIsDropdownOpen(false); }}>
                      <span>{formData.packageIds.length === 0 ? "Select Packages" : `${formData.packageIds.length} Selected`}</span>
                      <span className="chevron">▼</span>
                    </div>
                    {isPackageDropdownOpen && (
                      <div className="premium-dropdown" onClick={e => e.stopPropagation()}>
                        {packages.length === 0 ? <div className="dropdown-empty">No packages found</div> : packages.map(p => (
                          <label key={p._id} className="dropdown-item">
                            <input type="checkbox" value={p._id} checked={formData.packageIds.includes(p._id)} onChange={handlePackageChange} />
                            <div className="item-details"><span className="name">{p.name}</span><span className="price">₹{p.price}</span></div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="order-summary-box">
                    <h4>Order Summary</h4>
                    <div className="summary-row"><span>Services Total</span><span>₹{currentTotal.serviceTotal}</span></div>
                    <div className="summary-row"><span>Packages Total</span><span>₹{currentTotal.pkgTotal}</span></div>
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Apply Discount Coupon</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" placeholder="ENTER CODE" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', outline: 'none' }} />
                        <button onClick={handleApplyCoupon} disabled={applyingCoupon || !couponCode} style={{ padding: '0 24px', background: discountInfo ? '#34c759' : 'var(--accent-primary)', color: 'black', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: (applyingCoupon || !couponCode) ? 0.5 : 1 }}>
                          {applyingCoupon ? "..." : discountInfo ? "APPLIED" : "APPLY"}
                        </button>
                      </div>
                      {discountInfo && (
                        <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(52,199,89,0.05)', border: '1px dashed rgba(52,199,89,0.3)', fontSize: '12px', color: '#34c759', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>🎟 Coupon Applied (<strong>{discountInfo.code}</strong>)</span>
                          <span style={{ cursor: 'pointer', color: '#ff3b30', fontSize: '11px', fontWeight: 700 }} onClick={() => { setDiscountInfo(null); setCouponCode(""); }}>REMOVE</span>
                        </div>
                      )}
                    </div>
                    {discountInfo && <div className="summary-row" style={{ color: '#34c759', marginTop: '12px', fontWeight: 600 }}><span>Discount</span><span>- ₹{discountInfo.discount}</span></div>}
                    <div className="total-row"><span>Total Due</span><span className="grand-total">₹{currentTotal.total}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="drawer-actions">
              <button className="btn-secondary" onClick={() => step > 1 ? setStep(1) : onBack()}>{step === 1 ? "Cancel" : "Back"}</button>
              {step === 1
                ? <button className="btn-primary" onClick={handleNext}>Next: Services & Billing →</button>
                : <button className="btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? "Processing..." : "Create Client & Send Link"}</button>
              }
            </div>
          </>
        )}
      </div>

      <style>{`
        :root { --accent-primary: #00c8ff; }
        .drawer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); z-index: 2000; display: flex; justify-content: flex-end; }
        .side-drawer { width: 100%; max-width: 500px; height: 100vh; background: #0f0a28; border-left: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .drawer-header { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
        .relative { position: relative; } .mt-6 { margin-top: 24px; }
        .drawer-title { font-size: 1.2rem; font-weight: 700; color: #fff; margin: 0; }
        .close-drawer { background: none; border: none; color: #777; font-size: 24px; cursor: pointer; }
        .stepper-wrapper { padding: 24px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .stepper { display: flex; justify-content: space-between; position: relative; }
        .step-item { flex: 1; display: flex; flex-direction: column; align-items: center; z-index: 2; cursor: pointer; }
        .step-number { width: 32px; height: 32px; border-radius: 50%; background: #222; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: 8px; border: 2px solid rgba(255,255,255,0.1); transition: 0.3s; }
        .step-number.active { background: var(--accent-primary); border-color: var(--accent-primary); color: #fff; }
        .step-number.done { background: #34c759; border-color: #34c759; color: #fff; }
        .step-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
        .step-label.active { color: #fff; }
        .step-line { position: absolute; top: 16px; left: 25%; right: 25%; height: 2px; background: #222; z-index: 1; }
        .step-line.active { background: #34c759; }
        .drawer-body { flex: 1; overflow-y: auto; padding: 32px 24px; }
        .form-group { margin-bottom: 24px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; color: #aaa; margin-bottom: 8px; }
        .form-group input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 12px; color: #fff; outline: none; transition: 0.3s; }
        .form-group input:focus { border-color: var(--accent-primary); background: rgba(255,255,255,0.06); }
        .phone-input { display: flex; align-items: center; }
        .phone-input .prefix { padding: 12px 16px; background: #222; border: 1px solid rgba(255,255,255,0.1); border-right: none; border-radius: 12px 0 0 12px; font-weight: 700; color: #555; }
        .phone-input input { border-radius: 0 12px 12px 0 !important; }
        .custom-select-trigger { padding: 14px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; display: flex; justify-content: space-between; cursor: pointer; transition: 0.3s; }
        .custom-select-trigger:hover, .custom-select-trigger.active { border-color: var(--accent-primary); }
        .premium-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #1a1535; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-top: 8px; max-height: 200px; overflow-y: auto; z-index: 100; padding: 8px; }
        .dropdown-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; cursor: pointer; }
        .dropdown-item:hover { background: rgba(255,255,255,0.05); }
        .dropdown-item input { width: 18px; height: 18px; cursor: pointer; }
        .dropdown-empty { padding: 12px; color: #555; text-align: center; font-size: 13px; }
        .item-details { flex: 1; display: flex; justify-content: space-between; align-items: center; }
        .item-details .name { font-size: 14px; }
        .item-details .price { font-weight: 700; color: #34c759; }
        .order-summary-box { margin-top: 32px; padding: 24px; background: rgba(0,200,255,0.03); border: 1px solid rgba(0,200,255,0.1); border-radius: 20px; }
        .order-summary-box h4 { margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: #00c8ff; }
        .summary-row { display: flex; justify-content: space-between; font-size: 13px; color: #777; margin-bottom: 8px; }
        .total-row { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
        .grand-total { font-size: 24px; font-weight: 900; color: #fff; }
        .drawer-actions { padding: 24px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 16px; }
        .drawer-actions button { flex: 1; padding: 14px; font-weight: 700; border-radius: 12px; cursor: pointer; }
        .btn-primary { background: var(--accent-primary); color: #fff; border: none; box-shadow: 0 10px 20px rgba(0,200,255,0.2); }
        .btn-secondary { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #777; }
      `}</style>
    </div>
  );
};

export default EmployeeAddClient;
