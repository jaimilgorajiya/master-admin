import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_BASE_URL;

const ServiceClientPayment = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState(null); // 'online' | 'cheque'
  const [cheque, setCheque] = useState({ number: "", bank: "", date: "", photo: null });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => { fetchClient(); }, [id]);

  const fetchClient = async () => {
    try {
      const res = await axios.get(`${API}/api/client/pay-data/${id}`);
      if (res.data.success) {
        setClient(res.data.client);
        // If client already has a coupon applied (e.g. from a previous attempt)
        if (res.data.client.discountAmount > 0) {
          setDiscountInfo({
            code: res.data.client.couponCode,
            discount: res.data.client.discountAmount,
            finalAmount: res.data.client.paymentAmount - res.data.client.discountAmount
          });
        }
      }
      else { toast.error("Invalid payment link"); setClient(null); }
    } catch (err) {
      console.error("[ServiceClientPayment] fetchClient error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Could not load payment details");
    } finally { setLoading(false); }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return toast.error("Please enter a coupon code");
    setApplyingCoupon(true);
    try {
      const res = await axios.post(`${API}/api/coupon/validate`, {
        code: couponCode,
        serviceIds: client.serviceIds.map(s => s._id),
        amount: client.paymentAmount
      });
      if (res.data.success) {
        setDiscountInfo({
          code: couponCode,
          discount: res.data.discount,
          finalAmount: res.data.finalAmount
        });
        toast.success("Coupon applied!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid coupon");
      setDiscountInfo(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleOnlinePayment = async () => {
    setSubmitting(true);
    try {
      const orderRes = await axios.post(`${API}/api/client/${id}/pay-online`, {
        couponCode: discountInfo?.code
      });
      if (!orderRes.data.success) return toast.error(orderRes.data.message);

      if (orderRes.data.isFree) {
        const response = { razorpay_order_id: 'FREE', razorpay_payment_id: 'FREE', razorpay_signature: 'FREE' };
        const verifyRes = await axios.post(`${API}/api/client/${id}/verify-online`, response);
        if (verifyRes.data.success) {
          setDoneMsg("Verification complete! Your account is now active.");
          setDone(true);
        } else {
          toast.error(verifyRes.data.message || "Activation failed");
        }
        return;
      }

      const { order, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Master Admin",
        description: `Service Payment: ${client.validityPeriod}`,
        order_id: order.id,
        prefill: { name: client.clientName, email: client.clientEmail, contact: client.clientPhone },
        theme: { color: "#00c8ff" },
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(`${API}/api/client/${id}/verify-online`, response);
            if (verifyRes.data.success) {
              setDoneMsg("Payment successful! Your services are now active.");
              setDone(true);
            } else {
              toast.error(verifyRes.data.message || "Verification failed");
            }
          } catch { toast.error("Payment verification failed"); }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r) => toast.error(`Payment failed: ${r.error.description}`));
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not initiate payment");
    } finally { setSubmitting(false); }
  };

  const handleChequeSubmit = async (e) => {
    e.preventDefault();
    if (!cheque.number || !cheque.bank || !cheque.date) return toast.error("Please fill all cheque details");

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("chequeNumber", cheque.number);
      form.append("chequeBank", cheque.bank);
      form.append("chequeDate", cheque.date);
      if (discountInfo?.code) form.append("couponCode", discountInfo.code);
      if (cheque.photo) form.append("chequePhoto", cheque.photo);

      const res = await axios.post(`${API}/api/client/${id}/pay-cheque`, form, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        setDoneMsg("Cheque details submitted. Your services will be activated once verified.");
        setDone(true);
      } else {
        toast.error(res.data.message);
      }
    } catch { toast.error("Failed to submit cheque details"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <PageShell><p style={{ textAlign: 'center', color: '#aaa' }}>Loading...</p></PageShell>;
  if (!client) return <PageShell><p style={{ textAlign: 'center', color: '#ff3b30' }}>Invalid payment link.</p></PageShell>;

  if (client.paymentStatus === 'completed') {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ color: '#00c8ff', marginTop: 12 }}>Payment Completed</h2>
          <p style={{ color: '#aaa' }}>Your service account is active.</p>
        </div>
      </PageShell>
    );
  }

  if (done) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ marginTop: 12, fontSize: '22px' }}>{doneMsg}</h2>
          <button className="btn-primary" style={{ marginTop: 24, padding: '12px 24px' }} onClick={() => window.close()}>Close Page</button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h2 style={{ marginBottom: 4, fontWeight: 800 }}>Complete Your Payment</h2>
      <p style={{ color: '#aaa', marginBottom: 24, fontSize: '14px' }}>Securely activate your service package.</p>

      {/* Summary Card */}
      <div style={{ 
        background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '24px', 
        marginBottom: 24, border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <Row label="Client" value={client.clientName} />
        <Row label="Email" value={client.clientEmail} />
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '16px 0' }} />
        <Row label="Package" value={client.validityPeriod || 'Selected Services'} />
        
        {client.serviceIds?.length > 0 && (
          <div style={{ marginTop: 12, padding: '12px', background: 'rgba(0,200,255,0.05)', borderRadius: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 800, textTransform: 'uppercase' }}>Services Included</p>
            {client.serviceIds.map(s => (
              <Row key={s._id} label={s.name} value={`₹${s.price}`} />
            ))}
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px dashed rgba(255,255,255,0.1)', margin: '20px 0' }} />

        {/* Coupon Input */}
        <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Have a Coupon?</label>
            <div style={{ display: 'flex', gap: 8 }}>
                <input 
                    type="text" 
                    placeholder="ENTER CODE" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    style={{ 
                        flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: '13px', outline: 'none'
                    }}
                />
                <button 
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCode}
                    style={{ 
                        padding: '0 16px', background: 'var(--accent-primary)', color: 'black', 
                        border: 'none', borderRadius: 8, fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        opacity: (applyingCoupon || !couponCode) ? 0.5 : 1
                    }}
                >
                    {applyingCoupon ? "..." : "APPLY"}
                </button>
            </div>
            {discountInfo && (
                <div style={{ marginTop: 10, color: '#34c759', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Coupon Applied: <strong>{discountInfo.code}</strong></span>
                    <span style={{ cursor: 'pointer', color: '#ff3b30' }} onClick={() => { setDiscountInfo(null); setCouponCode(""); }}>Remove</span>
                </div>
            )}
        </div>
        
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Subtotal</span>
                <span style={{ fontSize: '13px', color: 'white' }}>₹{client.paymentAmount}</span>
            </div>
            {discountInfo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '13px', color: '#34c759' }}>Discount</span>
                    <span style={{ fontSize: '13px', color: '#34c759' }}>- ₹{discountInfo.discount}</span>
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: 600 }}>Total Payable</span>
                <span style={{ fontSize: '24px', color: 'var(--accent-primary)', fontWeight: 800 }}>₹{discountInfo ? discountInfo.finalAmount : client.paymentAmount}</span>
            </div>
        </div>
      </div>

      {!paymentMode ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ModeCard icon="💳" label="Razorpay" sub="UPI, Card, NetBanking" onClick={() => setPaymentMode('online')} />
          <ModeCard icon="🏦" label="Cheque" sub="Manual Verification" onClick={() => setPaymentMode('cheque')} />
        </div>
      ) : (
        <div>
          {paymentMode === 'online' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ color: '#aaa', marginBottom: 20, fontSize: '14px' }}>Instant activation after payment.</p>
              <button onClick={handleOnlinePayment} disabled={submitting} className="btn-primary"
                style={{ width: '100%', padding: '16px', borderRadius: 12, fontSize: '16px', fontWeight: 700 }}>
                {submitting ? "Processing..." : "Pay with Razorpay"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleChequeSubmit}>
              <Field label="Cheque Number *" value={cheque.number} onChange={v => setCheque(p => ({ ...p, number: v }))} placeholder="001234" />
              <Field label="Bank Name *" value={cheque.bank} onChange={v => setCheque(p => ({ ...p, bank: v }))} placeholder="e.g. ICICI Bank" />
              <Field label="Cheque Date *" type="date" value={cheque.date} onChange={v => setCheque(p => ({ ...p, date: v }))} />
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, color: '#aaa', fontSize: 13 }}>Upload Cheque Photo</label>
                <input type="file" onChange={e => setCheque(p => ({ ...p, photo: e.target.files[0] }))} style={{ color: '#fff', fontSize: '12px' }} />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary"
                style={{ width: '100%', padding: '16px', borderRadius: 12, fontSize: '16px', fontWeight: 700, background: '#ff9500' }}>
                {submitting ? "Submitting..." : "Submit Cheque"}
              </button>
            </form>
          )}
          <button onClick={() => setPaymentMode(null)} style={{ marginTop: 16, background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', width: '100%', fontSize: '13px' }}>← Choose different method</button>
        </div>
      )}
    </PageShell>
  );
};

const PageShell = ({ children }) => (
  <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
    <div style={{ 
        width: '100%', maxWidth: 480, background: '#11111d', borderRadius: 24, padding: '40px', 
        color: '#fff', boxShadow: '0 30px 100px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.05)' 
    }}>
      {children}
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>{label}</span>
    <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{value}</span>
  </div>
);

const ModeCard = ({ icon, label, sub, onClick }) => (
  <div onClick={onClick} style={{
    padding: '24px 16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s ease',
    background: 'rgba(255,255,255,0.02)'
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#00c8ff'; e.currentTarget.style.background = 'rgba(0,200,255,0.03)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
    <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
    <div style={{ fontWeight: 800, fontSize: '15px', color: 'white' }}>{label}</div>
    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>
  </div>
);

const Field = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
    <input type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ 
          width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', 
          background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '14px', outline: 'none' 
      }} />
  </div>
);

export default ServiceClientPayment;
