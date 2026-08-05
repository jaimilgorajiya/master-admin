import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_BASE_URL;

const ClientPayment = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState(null); // 'online' | 'cheque'
  const [cheque, setCheque] = useState({ number: "", bank: "", date: "", photo: null });
  const [submitting, setSubmitting] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount }
  const [done, setDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => { fetchClient(); }, [id]);

  const handleCouponApply = async () => {
    if (!coupon) return;
    try {
      const baseAmount = (client.packagePrice || 0) + (client.selectedServices || []).reduce((a, b) => a + (b.price || 0), 0);
      const res = await axios.post(`${API}/api/coupon/validate`, {
        code: coupon,
        softwareId: client.softwareId,
        serviceIds: (client.selectedServices || []).map(s => s.serviceId),
        amount: baseAmount
      });

      if (res.data.success) {
        setAppliedCoupon({ code: coupon.toUpperCase(), discount: res.data.discount });
        toast.success("Coupon applied!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid coupon");
      setAppliedCoupon(null);
    }
  };

  const fetchClient = async () => {
    try {
      const res = await axios.get(`${API}/api/software-clients/pay/${id}`);
      if (res.data.success) {
        setClient(res.data.client);
      } else {
        setClient(null);
      }
    } catch (err) {
      console.error("[ClientPayment] fetchClient error:", err.response?.data || err.message);
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Online payment ─────────────────────────────────────────────────────────
  const handleOnlinePayment = async () => {
    setSubmitting(true);
    try {
      const orderRes = await axios.post(`${API}/api/software-clients/${id}/pay-online`, {
        couponCode: appliedCoupon?.code
      });
      if (!orderRes.data.success) return toast.error(orderRes.data.message);

      // Handle Free Checkout (100% Discount)
      if (orderRes.data.isFree) {
        console.log("Free checkout detected, bypassing Razorpay...");
        const response = { razorpay_order_id: 'FREE', razorpay_payment_id: 'FREE', razorpay_signature: 'FREE' };
        const verifyRes = await axios.post(`${API}/api/software-clients/${id}/verify-online`, response);
        if (verifyRes.data.success) {
          setDoneMsg("Coupon applied! Your account is now active.");
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
        name: client.softwareName || "Software Subscription",
        description: client.packageName || "Package Payment",
        order_id: order.id,
        prefill: { name: client.ownerName, email: client.email, contact: client.phone },
        theme: { color: "#007bff" },
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(`${API}/api/software-clients/${id}/verify-online`, response);
            if (verifyRes.data.success) {
              setDoneMsg("Payment successful! Your account is now active.");
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

  // ── Cheque payment ─────────────────────────────────────────────────────────
  const handleChequeSubmit = async (e) => {
    e.preventDefault();
    if (!cheque.number || !cheque.bank || !cheque.date) return toast.error("Please fill all cheque details");

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("chequeNumber", cheque.number);
      form.append("chequeBank", cheque.bank);
      form.append("chequeDate", cheque.date);
      if (cheque.photo) form.append("chequePhoto", cheque.photo);

      const res = await axios.post(`${API}/api/software-clients/${id}/pay-cheque`, form, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        setDoneMsg("Cheque details submitted. Your account will be activated once the cheque clears.");
        setDone(true);
      } else {
        toast.error(res.data.message);
      }
    } catch { toast.error("Failed to submit cheque details"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <PageShell><p style={{ textAlign: 'center', color: '#aaa' }}>Loading...</p></PageShell>;
  if (!client) return <PageShell><p style={{ textAlign: 'center', color: '#ff3b30' }}>Invalid or expired payment link.</p></PageShell>;

  if (client.paymentStatus === 'completed') {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ color: '#34c759', marginTop: 12 }}>Payment Already Completed</h2>
          <p style={{ color: '#aaa' }}>Your account is active. You can log in to {client.softwareName}.</p>
        </div>
      </PageShell>
    );
  }

  if (done) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ marginTop: 12 }}>{doneMsg}</h2>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h2 style={{ marginBottom: 4 }}>Complete Your Payment</h2>
      <p style={{ color: '#aaa', marginBottom: 24 }}>Review your details and choose a payment method.</p>

      {/* Client & Package Details */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '20px', marginBottom: 24 }}>
        {/* Show signup field values if available, else fall back to base fields */}
        {client.signupFieldValues && Object.keys(client.signupFieldValues).length > 0
          ? Object.entries(client.signupFieldValues).map(([key, val]) => (
              <Row key={key} label={key} value={val} />
            ))
          : <>
              <Row label="Name" value={client.ownerName} />
              <Row label="Business" value={client.businessName} />
              <Row label="Email" value={client.email} />
              <Row label="Phone" value={client.phone} />
            </>
        }
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0' }} />
        <Row label="Software" value={client.softwareName} />
        <Row label="Package" value={client.packageName || '—'} />
        {client.packagePrice != null && <Row label="Package Price" value={`₹${client.packagePrice}`} />}
        
        {client.selectedServices?.length > 0 && (
          <div style={{ marginTop: 12, padding: '12px', background: 'rgba(40,167,69,0.05)', borderRadius: 8, border: '1px solid rgba(40,167,69,0.1)' }}>
            <p style={{ fontSize: 12, color: '#aaa', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Add-on Services</p>
            {client.selectedServices.map(s => (
              <Row key={s._id} label={s.name} value={`₹${s.price}`} />
            ))}
          </div>
        )}

        {/* Coupon Input */}
        <div style={{ marginTop: 16, display: 'flex', gap: '8px' }}>
          <input type="text" placeholder="Promo Code" value={coupon} 
            onChange={e => setCoupon(e.target.value.toUpperCase())}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
          <button onClick={handleCouponApply} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent-primary, #00c8ff)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Apply</button>
        </div>
        
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '2px solid rgba(255,255,255,0.1)' }}>
          {client.discountAmount > 0 && (
            <Row label={`Pre-applied Discount ${client.appliedCoupon ? `(${client.appliedCoupon})` : ''}`} value={`- ₹${client.discountAmount}`} highlightStyle={{ color: '#ff3b30' }} />
          )}
          {appliedCoupon && (
            <Row label={`Additional Discount (${appliedCoupon.code})`} value={`- ₹${appliedCoupon.discount}`} highlightStyle={{ color: '#ff3b30' }} />
          )}
          <Row label="Total Amount" value={`₹${Math.max(0, (client.packagePrice || 0) + (client.selectedServices || []).reduce((a, b) => a + (b.price || 0), 0) - (client.discountAmount || 0) - (appliedCoupon?.discount || 0))}`} highlight />
        </div>
      </div>

      {/* Terms & Conditions */}
      {!paymentMode && (
        <div style={{ marginBottom: 20, padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: '#00c8ff', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
              I have read and agree to the{' '}
              <span
                style={{ color: '#00c8ff', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={e => { e.preventDefault(); document.getElementById('tc-modal').style.display = 'flex'; }}
              >Terms & Conditions</span>
              {' '}and{' '}
              <span
                style={{ color: '#00c8ff', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={e => { e.preventDefault(); document.getElementById('pp-modal').style.display = 'flex'; }}
              >Privacy Policy</span>
              {' '}of Iflora Info Pvt. Ltd.
            </span>
          </label>
        </div>
      )}

      {/* Payment mode selection */}
      {!paymentMode && (
        <>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>Select Payment Method</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, opacity: termsAccepted ? 1 : 0.4, pointerEvents: termsAccepted ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
            <ModeCard icon="💳" label="Online Payment" sub="Pay instantly via Razorpay" onClick={() => setPaymentMode('online')} />
            <ModeCard icon="🏦" label="Cheque" sub="Submit cheque details for manual clearance" onClick={() => setPaymentMode('cheque')} />
          </div>
          {!termsAccepted && (
            <p style={{ textAlign: 'center', color: '#ff9500', fontSize: 12, marginTop: 10 }}>
              Please accept the Terms & Conditions to proceed.
            </p>
          )}
        </>
      )}

      {/* Terms & Conditions Modal */}
      <div id="tc-modal" style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 32, maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
          <button onClick={() => document.getElementById('tc-modal').style.display = 'none'} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#aaa', fontSize: 22, cursor: 'pointer' }}>×</button>
          <h3 style={{ color: '#fff', marginBottom: 16, fontSize: 18 }}>Terms & Conditions</h3>
          <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.8 }}>
            <p><strong style={{ color: '#fff' }}>1. Acceptance of Terms</strong><br />By completing this payment, you agree to be bound by these Terms and Conditions. If you do not agree, please do not proceed.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>2. Services</strong><br />Iflora Info Pvt. Ltd. provides software subscription services. The service will be activated upon successful payment verification.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>3. Payment</strong><br />All payments are processed securely. Prices are inclusive of applicable taxes unless stated otherwise. Payments are non-refundable once the service is activated.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>4. Subscription & Renewal</strong><br />Subscriptions are valid for the period specified in your package. You will be notified before expiry for renewal. Failure to renew may result in service suspension.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>5. Cheque Payments</strong><br />Cheque payments are subject to clearance. Services will be activated only after the cheque is cleared. Dishonoured cheques may attract additional charges.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>6. Limitation of Liability</strong><br />Iflora Info Pvt. Ltd. shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>7. Governing Law</strong><br />These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Gujarat, India.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>8. Contact</strong><br />For any queries, contact us at iflorainfopvtltd@gmail.com.</p>
          </div>
          <button onClick={() => document.getElementById('tc-modal').style.display = 'none'} style={{ marginTop: 20, width: '100%', padding: '10px', background: '#00c8ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Close</button>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      <div id="pp-modal" style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 32, maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
          <button onClick={() => document.getElementById('pp-modal').style.display = 'none'} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#aaa', fontSize: 22, cursor: 'pointer' }}>×</button>
          <h3 style={{ color: '#fff', marginBottom: 16, fontSize: 18 }}>Privacy Policy</h3>
          <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.8 }}>
            <p><strong style={{ color: '#fff' }}>1. Information We Collect</strong><br />We collect personal information such as your name, business name, email address, and phone number when you register for our services.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>2. How We Use Your Information</strong><br />Your information is used to provide and manage your subscription, send payment confirmations, renewal reminders, and important service updates.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>3. Data Security</strong><br />We implement industry-standard security measures to protect your personal data. Payment transactions are processed through secure, encrypted channels (Razorpay).</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>4. Data Sharing</strong><br />We do not sell or rent your personal information to third parties. Data may be shared with payment processors solely for transaction purposes.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>5. Cookies</strong><br />Our platform may use cookies to enhance your experience. You can disable cookies in your browser settings, though this may affect functionality.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>6. Data Retention</strong><br />We retain your data for as long as your account is active or as required by law. You may request deletion of your data by contacting us.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>7. Your Rights</strong><br />You have the right to access, correct, or delete your personal data. Contact us at iflorainfopvtltd@gmail.com to exercise these rights.</p>
            <p style={{ marginTop: 12 }}><strong style={{ color: '#fff' }}>8. Updates</strong><br />We may update this policy periodically. Continued use of our services after changes constitutes acceptance of the updated policy.</p>
          </div>
          <button onClick={() => document.getElementById('pp-modal').style.display = 'none'} style={{ marginTop: 20, width: '100%', padding: '10px', background: '#00c8ff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Close</button>
        </div>
      </div>

      {/* Online */}
      {paymentMode === 'online' && (
        <div style={{ textAlign: 'center', paddingTop: 16 }}>
          <p style={{ color: '#aaa', marginBottom: 20 }}>
            You will be redirected to Razorpay to complete the payment of <strong>₹{Math.max(0, (client.packagePrice || 0) + (client.selectedServices || []).reduce((a, b) => a + (b.price || 0), 0) - (client.discountAmount || 0) - (appliedCoupon?.discount || 0))}</strong>.
          </p>
          <button onClick={handleOnlinePayment} disabled={submitting}
            style={{ background: '#007bff', color: '#fff', border: 'none', padding: '14px 40px', borderRadius: 50, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
            {submitting ? "Opening Razorpay..." : "Pay Now"}
          </button>
          <br />
          <button onClick={() => setPaymentMode(null)} style={{ marginTop: 12, background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>← Back</button>
        </div>
      )}

      {/* Cheque */}
      {paymentMode === 'cheque' && (
        <form onSubmit={handleChequeSubmit} style={{ paddingTop: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 16 }}>Cheque Details</p>
          <Field label="Cheque Number *" value={cheque.number} onChange={v => setCheque(p => ({ ...p, number: v }))} placeholder="e.g. 001234" />
          <Field label="Bank Name *" value={cheque.bank} onChange={v => setCheque(p => ({ ...p, bank: v }))} placeholder="e.g. HDFC Bank" />
          <Field label="Cheque Date *" type="date" value={cheque.date} onChange={v => setCheque(p => ({ ...p, date: v }))} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: '#aaa', fontSize: 13 }}>Cheque Photo (optional)</label>
            <input type="file" accept="image/*,application/pdf"
              onChange={e => setCheque(p => ({ ...p, photo: e.target.files[0] }))}
              style={{ color: '#fff' }} />
          </div>
          <div style={{ background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#ff9500' }}>
            Your account will remain inactive until the cheque is cleared and verified by the admin.
          </div>
          <button type="submit" disabled={submitting}
            style={{ background: '#ff9500', color: '#fff', border: 'none', padding: '14px 40px', borderRadius: 50, fontWeight: 700, fontSize: 16, cursor: 'pointer', width: '100%' }}>
            {submitting ? "Submitting..." : "Submit Cheque Details"}
          </button>
          <br />
          <button type="button" onClick={() => setPaymentMode(null)} style={{ marginTop: 12, background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>← Back</button>
        </form>
      )}
    </PageShell>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const PageShell = ({ children }) => (
  <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
    <div style={{ width: '100%', maxWidth: 520, background: '#1a1a2e', borderRadius: 16, padding: '32px', color: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      {children}
    </div>
  </div>
);

const Row = ({ label, value, highlight, highlightStyle }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
    <span style={{ color: '#aaa', fontSize: 14 }}>{label}</span>
    <span style={{ 
      fontWeight: highlight ? 700 : 500, 
      color: highlight ? '#00c8ff' : '#fff', 
      fontSize: highlight ? 18 : 14,
      ...highlightStyle 
    }}>{value}</span>
  </div>
);

const ModeCard = ({ icon, label, sub, onClick }) => (
  <div onClick={onClick} style={{
    padding: '20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
    background: 'rgba(255,255,255,0.03)'
  }}
    onMouseEnter={e => e.currentTarget.style.borderColor = '#007bff'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
    <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 12, color: '#aaa' }}>{sub}</div>
  </div>
);

const Field = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', marginBottom: 6, color: '#aaa', fontSize: 13 }}>{label}</label>
    <input type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
  </div>
);

export default ClientPayment;
