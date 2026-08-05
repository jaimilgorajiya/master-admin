
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
