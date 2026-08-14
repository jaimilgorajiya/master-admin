
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const getRazorpayInstance = () => {
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

// ✅ Create Order
export const createOrder = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes("YOUR")) {
        return res.status(500).json({ success: false, message: "Server Payment Config Error (Keys Missing)" });
    }

    const { amount, currency = "INR" } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount is required and must be a valid number" });
    }

    const instance = getRazorpayInstance();

    const options = {
      amount: Math.round(parsedAmount * 100), // Ensure integer (paise)
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await instance.orders.create(options);

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    // Return detailed error if available
    const errorMsg = error.error ? error.error.description : error.message;
    return res.status(500).json({ success: false, message: errorMsg || "Server error creating order" });
  }
};

// ✅ Verify Payment
// This is used if you want to verify purely without renewing immediately, 
// but typically you'd do verification inside the renewal logic. 
// For separation of concerns, I'll export a helper validation function 
// that can be used inside `processRenewal` or called here.
export const verifyPaymentSignature = (orderId, paymentId, signature) => {
    const text = orderId + "|" + paymentId;
    const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "YOUR_TEST_KEY_SECRET")
        .update(text.toString())
        .digest("hex");
    
    return generated_signature === signature;
};

// ✅ Fetch Razorpay Payment Details
export const getRazorpayPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId || paymentId.startsWith("MANUAL")) {
      return res.status(400).json({ success: false, message: "Invalid payment ID" });
    }

    const instance = getRazorpayInstance();
    // Sanitize payment ID by removing any whitespace
    const sanitizedPaymentId = paymentId.replace(/\s+/g, "").trim();
    console.log(`[Razorpay] Fetching details for payment: "${sanitizedPaymentId}"`);
    const payment = await instance.payments.fetch(sanitizedPaymentId);

    return res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        entity: payment.entity,
        amount: payment.amount / 100, // Convert paise to rupees
        currency: payment.currency,
        status: payment.status,
        order_id: payment.order_id,
        method: payment.method,
        description: payment.description,
        email: payment.email,
        contact: payment.contact,
        created_at: payment.created_at
      }
    });
  } catch (error) {
    console.error("Fetch Razorpay Payment Error:", error);
    const errorMsg = error.error ? error.error.description : error.message;
    return res.status(500).json({ success: false, message: errorMsg || "Error fetching payment details from Razorpay" });
  }
};
