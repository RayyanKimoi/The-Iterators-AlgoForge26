const express = require("express");
const Razorpay = require("razorpay");

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// ─── Razorpay instance ──────────────────────────────────────────────────────
// Using test keys — replace with live keys for production
const razorpay = new Razorpay({
  key_id: "rzp_test_Ywd9gWBWFV1zVA",
  key_secret: "Q108tvxBEIGYMLHP7wJVy11x",
});

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "SPORS Payment Server" });
});

// ─── Create Order ───────────────────────────────────────────────────────────
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const options = {
      amount: amount * 100, // Convert ₹ to paise
      currency: "INR",
      receipt: `spors_sub_${Date.now()}`,
      notes: {
        service: "SPORS",
        type: "subscription",
      },
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Verify Payment (optional, for future use) ─────────────────────────────
app.post("/verify-payment", (req, res) => {
  // In production, verify the payment signature here using:
  // razorpay_order_id + razorpay_payment_id + razorpay_signature
  // For now, we just acknowledge it
  const { razorpay_payment_id, razorpay_order_id } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id) {
    return res.status(400).json({ error: "Missing payment details" });
  }

  res.status(200).json({
    verified: true,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`🚀 SPORS Payment Server running on port ${PORT}`)
);
