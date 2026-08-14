import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const decodeJwtPayload = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT Decode error:", e);
    return null;
  }
};

const PayInvite = () => {
  const [token, setToken] = useState("");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    // 1. Inject Razorpay Script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    // 2. Parse token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token") || "";
    setToken(urlToken);

    if (urlToken) {
      const decoded = decodeJwtPayload(urlToken);
      if (decoded) {
        setPayload(decoded);
      } else {
        toast.error("Invalid or corrupted invitation link.");
      }
    } else {
      toast.error("Missing invitation token.");
    }
    setLoading(false);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!termsAccepted) {
      return toast.error("Please accept the Terms and Conditions to proceed.");
    }

    if (!payload || !payload.orderId) {
      return toast.error("Invalid order details. Please contact the administrator.");
    }

    setSubmitting(true);

    try {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_j4mU81CM2TzOFU", // Default to live key if env missing
        amount: payload.amount ? payload.amount * 100 : 0, // amount in paise
        currency: payload.currency || "INR",
        name: "Sendzyy Software",
        description: payload.planName || `${payload.planId || "Plan"} Access`,
        order_id: payload.orderId,
        prefill: {
          name: payload.name || "",
          email: payload.email || ""
        },
        theme: {
          color: "#00c8ff"
        },
        handler: async (response) => {
          setSubmitting(true);
          const verifyToastId = toast.loading("Verifying payment and creating account...");
          try {
            // Directly hit the Sendzyy backend verify-payment-invite endpoint
            const verifyRes = await axios.post(
              "https://appapi.sendzyy.com/api/superadmin/tenants/verify-payment-invite",
              {
                inviteToken: token,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }
            );

            if (verifyRes.data?.success) {
              toast.success("Payment verified! Account created.", { id: verifyToastId });
              setDoneMsg("Thank you! Your payment is complete. Login credentials have been sent to your email address.");
              setDone(true);
            } else {
              toast.error(verifyRes.data?.message || "Verification failed", { id: verifyToastId });
            }
          } catch (err) {
            console.error("Verification error:", err);
            toast.error(err.response?.data?.message || "Failed to verify payment with Sendzyy server.", { id: verifyToastId });
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            toast.error("Payment checkout closed.");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (err) => {
        console.error("Payment failed details:", err.error);
        toast.error(`Payment failed: ${err.error.description || "Unknown error"}`);
        setSubmitting(false);
      });
      rzp.open();

    } catch (err) {
      console.error("Razorpay initiation error:", err);
      toast.error("Could not initiate payment interface. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ color: '#fff', fontSize: '15px' }}>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!token || !payload) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: '20px' }}>Invalid Invitation Link</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.5 }}>
            This invitation link is invalid, corrupted, or has expired. Please request a new payment link from the administrator.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: '50px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ color: '#10b981', margin: '0 0 12px 0', fontSize: '22px' }}>Payment Successful!</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            {doneMsg}
          </p>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            You can close this window now.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={styles.logoBadge}>S</div>
          <h2 style={styles.title}>Sendzyy Workspace Activation</h2>
          <p style={styles.subtitle}>Complete your online subscription setup</p>
        </div>

        <div style={styles.detailsBox}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Business Name</span>
            <span style={styles.detailValue}>{payload.name || "N/A"}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Registered Email</span>
            <span style={styles.detailValue}>{payload.email || "N/A"}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Subscription Plan</span>
            <span style={styles.detailValue}>{payload.planName || payload.planId || "Sendzyy Package"}</span>
          </div>
          <div style={{ ...styles.detailRow, borderBottom: 'none', paddingBottom: 0 }}>
            <span style={styles.detailLabel}>Order reference</span>
            <span style={{ ...styles.detailValue, fontFamily: 'monospace', fontSize: '12px' }}>{payload.orderId || "N/A"}</span>
          </div>
        </div>

        <div style={styles.priceContainer}>
          <span style={styles.priceLabel}>Amount Due</span>
          <span style={styles.priceValue}>₹{payload.amount || 0}</span>
        </div>

        {/* Terms and Conditions checkbox */}
        <div style={styles.termsBox}>
          <label style={styles.checkboxLabel}>
            <input 
              type="checkbox" 
              checked={termsAccepted} 
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.termsText}>
              I accept the subscription terms, service policies, and authorize payment checkout.
            </span>
          </label>
        </div>

        <button 
          onClick={handlePayment} 
          disabled={submitting} 
          style={{
            ...styles.payButton,
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting ? "Processing checkout..." : `Pay ₹${payload.amount || 0} Now`}
        </button>

        <p style={styles.footerNote}>
          🔒 Secure payment processed via Razorpay. Your details are fully encrypted.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#04060e',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '450px',
    background: '#0b0f19',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '32px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    textAlign: 'left'
  },
  logoBadge: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #00c8ff, #0072ff)',
    color: '#fff',
    fontSize: '24px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
    boxShadow: '0 0 20px rgba(0, 200, 255, 0.4)'
  },
  title: {
    margin: '0 0 4px 0',
    color: '#fff',
    fontSize: '20px',
    fontWeight: '700',
    textAlign: 'center'
  },
  subtitle: {
    margin: 0,
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    textAlign: 'center'
  },
  detailsBox: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '20px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    marginBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px'
  },
  detailValue: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600'
  },
  priceContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '0 4px'
  },
  priceLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  priceValue: {
    color: '#00c8ff',
    fontSize: '28px',
    fontWeight: '900',
    textShadow: '0 0 15px rgba(0, 200, 255, 0.3)'
  },
  termsBox: {
    marginBottom: '24px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer'
  },
  checkbox: {
    marginTop: '3px',
    cursor: 'pointer'
  },
  termsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '12px',
    lineHeight: 1.4
  },
  payButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #00c8ff, #0072ff)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '15px',
    boxShadow: '0 4px 15px rgba(0, 200, 255, 0.3)',
    transition: 'all 0.2s'
  },
  footerNote: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '11px',
    textAlign: 'center',
    marginTop: '16px',
    marginStyle: '0'
  }
};

export default PayInvite;
