import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";

const ClientRenewal = () => {
    const { encryptedId } = useParams();
    const [client, setClient] = useState(null);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successData, setSuccessData] = useState(null);

    // Use email from URL param or ID. For simplicity in this demo, let's assume the "encryptedId" is actually the email encoded
    // In production, use real encryption
    const email = decodeURIComponent(encryptedId || "");

    useEffect(() => {
        fetchClientInfo();
    }, [email]);

    const fetchClientInfo = async () => {
        try {
            const isEmail = email.includes('@');
            const param = isEmail ? `email=${email}` : `id=${email}`;
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/public/client-info?${param}`);

            if (res.data.success) {
                setClient(res.data.client);
                setPackages(res.data.packages);
            }
        } catch (error) {
            console.error("Error fetching client info", error);
            toast.error("Invalid Renewal Link");
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (pkg) => {
        const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!keyId || keyId === 'YOUR_TEST_KEY_ID_HERE') {
            toast.error("Payment Gateway not configured (Key ID missing)");
            return;
        }

        toast.loading(`Initializing Payment for ${pkg.name}...`);

        try {
            // 1. Create Order
            const orderRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/payment/create-order`, {
                amount: pkg.price,
                currency: "INR"
            });

            if (!orderRes.data.success) {
                toast.dismiss();
                toast.error("Failed to create order");
                return;
            }

            const { order } = orderRes.data;

            // 2. Open Razorpay
            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: "Master Admin Renewal",
                description: `Renewal for ${pkg.name}`,
                order_id: order.id,
                handler: async function (response) {
                    toast.loading("Verifying Payment...");

                    try {
                        // 3. Process Renewal on Backend
                        const renewRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/public/process-renewal`, {
                            clientId: client._id,
                            packageId: pkg._id,
                            clientType: client.clientType,
                            paymentDetails: {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            }
                        });

                        toast.dismiss();
                        if (renewRes.data.success) {
                            setSuccessData(renewRes.data);
                            toast.success("Payment Successful!");
                        } else {
                            toast.error("Renewal failed after payment. Contact Support.");
                        }
                    } catch (err) {
                        toast.dismiss();
                        console.error("Renewal Error:", err);
                        toast.error("Server error during renewal.");
                    }
                },
                prefill: {
                    name: client.name,
                    email: client.email,
                    contact: client.clientPhone || ""
                },
                theme: {
                    color: "#00c8ff"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                toast.dismiss();
                toast.error(`Payment Failed: ${response.error.description}`);
            });

            toast.dismiss();
            rzp1.open();

        } catch (error) {
            toast.dismiss();
            console.error("Payment Init Error:", error);
            const errorMessage = error.response?.data?.message || error.message || "Could not initiate payment.";
            toast.error(`Payment Error: ${errorMessage}`);
        }
    };

    if (successData) return (
        <div className="renewal-container" style={{ padding: '20px' }}>
            <div className="glass-card" style={{ maxWidth: '600px', margin: '60px auto', padding: '40px', textAlign: 'center' }}>
                <div className="success-icon" style={{
                    width: '80px', height: '80px', borderRadius: '50%', background: '#34c759',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>

                <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Renewal Successful!</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Your subscription has been extended successfully.</p>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '24px', textAlign: 'left', border: '1px solid var(--glass-border)', marginBottom: '32px' }}>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-tertiary)' }}>Package</span>
                            <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{successData.packageName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-tertiary)' }}>Amount Paid</span>
                            <span style={{ fontWeight: '600' }}>₹{successData.amount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-tertiary)' }}>Transaction ID</span>
                            <span style={{ fontWeight: '600', fontSize: '13px' }}>{successData.paymentId}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: '4px' }}>
                            <span style={{ color: 'var(--text-tertiary)' }}>New Expiry Date</span>
                            <span style={{ fontWeight: '800', color: '#34c759' }}>{new Date(successData.newExpiry).toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={() => {
                        const redirectUrl = client.frontendUrl || (client.softwareName?.toLowerCase().includes("quotation") ? "http://192.168.29.43:5174/login" : null);
                        if (redirectUrl) window.location.href = redirectUrl;
                        else window.location.reload();
                    }}>
                        Return to Dashboard
                    </button>
                    <button className="btn-secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => setSuccessData(null)}>
                        Back to Portal
                    </button>
                </div>
            </div>
        </div>
    );

    if (!client) return (
        <div className="renewal-container">
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                <h1 style={{ color: '#ff3b30' }}>Invalid or Expired Link</h1>
                <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>Please contact the support team for a fresh renewal link.</p>
            </div>
        </div>
    );

    return (
        <div className="renewal-container" style={{ padding: '20px' }}>
            <div className="glass-card" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div className="login-logo" style={{ marginBottom: '20px' }}>
                        <img src="/logo.png" alt="Logo" style={{ height: '60px' }} />
                    </div>
                    <h1 style={{
                        background: client.isActive ? 'linear-gradient(90deg, #34c759, #00ff88)' : 'linear-gradient(90deg, #ff3b30, #ff9500)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '32px',
                        fontWeight: '800'
                    }}>
                        {client.isActive ? "Subscription Active" : "Renew Your Subscription"}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                        {client.isActive
                            ? (client.expiryDate
                                ? `Your plan is valid until ${new Date(client.expiryDate).toLocaleDateString('en-GB')}`
                                : "Subscription Active")
                            : "Your access code or subscription has expired."}
                    </p>
                    {client.isActive && (
                        <button
                            className="btn-primary"
                            onClick={() => {
                                if (client.frontendUrl) window.location.href = client.frontendUrl;
                                else if (client.softwareName?.toLowerCase().includes("quotation")) window.location.href = "http://192.168.29.43:5174/login";
                            }}
                            style={{ marginTop: '24px' }}
                        >
                            Go to Software Login
                        </button>
                    )}
                </div>

                <div className="form-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '40px', border: '1px solid var(--glass-border)' }}>
                    <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-primary)', marginBottom: '16px' }}>Account Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Client Name</div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>{client.name}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Email Address</div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>{client.email}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Software Product</div>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent-primary)' }}>{client.softwareName}</div>
                        </div>
                    </div>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', textAlign: 'center' }}>Select a Renewal Plan</h3>
                <div className="packages-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    {packages.map(pkg => (
                        <div key={pkg._id} className="package-card glass-card" style={{ padding: '32px', textAlign: 'center', transition: 'all 0.3s ease' }}>
                            <h3 style={{ color: 'var(--accent-primary)', fontSize: '20px', fontWeight: '700' }}>{pkg.name}</h3>
                            <div style={{ fontSize: '40px', fontWeight: '800', margin: '20px 0', color: '#fff' }}>₹{pkg.price}</div>
                            {pkg.description && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>{pkg.description}</p>}

                            {/* Features Section */}
                            {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                                    {pkg.features.map((feature, idx) => (
                                        <span key={idx} style={{
                                            padding: '4px 10px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {feature.name || feature}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: '600', display: 'inline-block', textTransform: 'capitalize' }}>
                                {pkg.durationDays} {pkg.unit} Access
                            </div>
                            <button
                                className="btn-primary"
                                onClick={() => handlePayment(pkg)}
                                style={{
                                    marginTop: '24px',
                                    width: '100%'
                                }}
                            >
                                Pay & {client.isActive ? "Extend" : "Renew"}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ClientRenewal;
