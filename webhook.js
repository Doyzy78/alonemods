require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Credentials
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_WEBHOOK_SECRET = "whsk_UBsRp5cfVBz88TmviENyKLXJ";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://alonemods.vercel.app";

app.use(cors({ origin: true }));
app.use(express.json());

// ============= CREATE PAYMENT LINK =============
app.post('/create-payment', async (req, res) => {
    try {
        const { amount, description, success_url, cancel_url } = req.body;

        console.log("💳 Creating payment link... Amount:", amount);

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
                        currency: 'PHP',
                        redirect: {
                            success: success_url || `${FRONTEND_URL}/success.html`,
                            failed: cancel_url || `${FRONTEND_URL}/index.html`
                        }
                    }
                }
            })
        });

        const result = await response.json();
        
        if (result.errors) {
            console.error("❌ PayMongo Error:", result.errors);
            return res.json({ success: false, error: result.errors[0].detail });
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

// ============= PAYMONGO WEBHOOK ENDPOINT =============
app.post('/webhook/paymongo', async (req, res) => {
    try {
        const signature = req.headers['paymongo-signature'];
        const payload = JSON.stringify(req.body);

        // Verify webhook signature
        const hmac = crypto.createHmac('sha256', PAYMONGO_WEBHOOK_SECRET);
        const digest = hmac.update(payload).digest('hex');
        
        if (signature !== digest) {
            console.log("⚠️ Invalid webhook signature");
            return res.status(401).send('Invalid signature');
        }

        const event = req.body.data;
        console.log("📥 Webhook Event:", event.type);

        // ✅ Payment Successful!
        if (event.type === 'link.payment.paid' || event.type === 'checkout_session.payment.paid') {
            console.log("✅ PAYMENT RECEIVED!");
            console.log("Amount:", event.data.attributes.amount / 100, "PHP");
            console.log("Reference:", event.data.attributes.id);
            
            // Here: Mark order as paid in your database
        }

        res.status(200).send('OK');

    } catch (err) {
        console.error("Webhook Error:", err);
        res.status(500).send('Error');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Webhook: ${FRONTEND_URL}/webhook/paymongo`);
});
