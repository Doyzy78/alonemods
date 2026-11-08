require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// ============= CONFIGURATION =============
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://alonemods.vercel.app";

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// ============= CREATE PAYMENT LINK =============
app.post('/create-payment', async (req, res) => {
    try {
        const { order_id, amount, currency, description, customer, success_url, cancel_url } = req.body;

        console.log("💳 Creating payment — Order:", order_id, "Amount:", amount);

        const auth = Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64');

        const response = await fetch('https://api.paymongo.com/v1/links', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount: amount,
                        description: description || 'Payment',
                        currency: currency || 'PHP',
                        redirect: {
                            success: success_url || `${FRONTEND_URL}/success.html?order_id=${order_id}`,
                            failed: cancel_url || `${FRONTEND_URL}/index.html`
                        }
                    }
                }
            })
        });

        const result = await response.json();

        if (result.errors) {
            console.error("❌ PayMongo Error:", result.errors);
            return res.json({
                success: false,
                error: result.errors[0].detail
            });
        }

        res.json({
            success: true,
            payment_url: result.data.attributes.url,
            payment_id: result.data.attributes.id
        });

    } catch (err) {
        console.error("❌ Server Error:", err);
        res.json({ success: false, error: "Server error. Please try again." });
    }
});

// ============= PAYMONGO WEBHOOK — RECEIVE PAYMENT STATUS =============
app.post('/webhook/paymongo', async (req, res) => {
    try {
        const signature = req.headers['paymongo-signature'];
        const payload = JSON.stringify(req.body);

        // Verify webhook signature
        const hmac = crypto.createHmac('sha256', PAYMONGO_WEBHOOK_SECRET);
        const digest = hmac.update(payload).digest('hex');

        if (signature !== digest) {
            console.log("⚠️ Invalid webhook signature — ignoring");
            return res.status(401).send('Invalid signature');
        }

        const event = req.body.data;
        console.log("📥 Webhook Event Received:", event.type);

        // ✅ Payment was successful!
        if (event.type === 'link.payment.paid' || event.type === 'checkout_session.payment.paid') {
            const paymentData = event.data.attributes;
            console.log("=====================================");
            console.log("✅ PAYMENT SUCCESSFUL!");
            console.log("Amount:", paymentData.amount / 100, "PHP");
            console.log("Reference ID:", paymentData.id);
            console.log("Description:", paymentData.description || 'N/A');
            console.log("=====================================");
            
            // ✅ HERE — Your action when payment is confirmed:
            // - Update database: mark order as PAID
            // - Send email/download link to customer
            // - Notify yourself via Telegram/Discord
        }

        // Payment failed or expired
        if (event.type === 'link.payment.failed') {
            console.log("❌ Payment failed");
        }

        res.status(200).send('OK');

    } catch (err) {
        console.error("❌ Webhook Error:", err.message);
        res.status(500).send('Error');
    }
});

// Health check
app.get('/', (req, res) => {
    res.send('✅ Alonemods PayMongo Backend Running — Webhook Ready');
});

app.listen(PORT, () => {
    console.log("=====================================");
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Webhook URL: ${FRONTEND_URL}/webhook/paymongo`);
    console.log(`💳 Create Payment: ${FRONTEND_URL}/create-payment`);
    console.log("=====================================");
});

