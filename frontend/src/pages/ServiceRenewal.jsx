import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";

const ServiceRenewal = () => {
    const { encryptedId } = useParams(); // Should be the Client ID directly
    const [client, setClient] = useState(null);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClientInfo();
    }, [encryptedId]);

    const fetchClientInfo = async () => {
        try {
            // Using service-client-info endpoint
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/public/service-client-info?id=${encryptedId}`);
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
                name: "Service Renewal",
                description: `Renewal for ${pkg.name}`,
                order_id: order.id, 
                handler: async function (response) {
                    toast.loading("Verifying Payment...");
                    
                    try {
                        // 3. Process Renewal on Backend
                        const renewRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/public/process-renewal`, {
                            clientId: client._id,
                            packageId: pkg._id,
                            paymentDetails: {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            }
                        });

                        toast.dismiss();
                        if (renewRes.data.success) {
                            toast.success("Payment Successful! Service Reactivated.");
                            fetchClientInfo(); // Refresh to show active status
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
            rzp1.on('payment.failed', function (response){
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

    if (loading) return <div className="loading-screen">Loading details...</div>;

    if (!client) return <div className="renewal-container"><h1>Invalid or Expired Link</h1></div>;

    return (
        <div className="renewal-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', background: '#1a1a1a', color: '#fff', borderRadius: '12px' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: client.isActive ? '#00ff88' : '#ff3b30' }}>
                    {client.isActive ? "Service Active" : "Renew Your Service"}
                </h1>
                <p>
                    {client.isActive 
                     ? `Your service is valid until ${new Date(client.expiryDate).toLocaleDateString()}` 
                     : "Your service subscription has expired."}
                </p>
            </div>

            <div className="client-info" style={{ background: '#333', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <h3>Account Details</h3>
                <p><strong>Name:</strong> {client.name}</p>
                <p><strong>Email:</strong> {client.email}</p>
                <p><strong>Services:</strong> {client.services || "N/A"}</p>
            </div>

            {!client.isActive && (
             <>
                <h3>Select a Renewal Plan</h3>
                {packages.length === 0 ? (
                    <p style={{ color: '#aaa' }}>No renewal packages available for your service.</p>
                ) : (
                    <div className="packages-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {packages.map(pkg => (
                            <div key={pkg._id} className="package-card" style={{ border: '1px solid #444', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                                <h3 style={{ color: '#00c8ff' }}>{pkg.name}</h3>
                                <div style={{ fontSize: '2rem', margin: '1rem 0' }}>₹{pkg.price}</div>
                                {pkg.description && <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{pkg.description}</p>}
                                <p>{pkg.durationDays} {pkg.unit || 'Days'} Access</p>
                                <button 
                                    onClick={() => handlePayment(pkg)}
                                    style={{ 
                                        background: '#00c8ff', 
                                        border: 'none', 
                                        padding: '10px 20px', 
                                        borderRadius: '6px', 
                                        color: '#fff', 
                                        cursor: 'pointer', 
                                        marginTop: '1rem', 
                                        width: '100%' 
                                    }}
                                >
                                    Pay & Renew
                                </button>
                            </div>
                        ))}
                    </div>
                )}
             </>
            )}
        </div>
    );
};

export default ServiceRenewal;
