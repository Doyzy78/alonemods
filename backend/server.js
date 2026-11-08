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

// ✅ Log config status on startup
console.log("=====================================");
console.log("🚀 Alonemods PayMongo Backend");
console.log("🔑 Secret Key:", PAYMONGO_SECRET_KEY ? "LOADED ✅" : "❌ MISSING");
console.log("🔑 Webhook Secret:", PAYMONGO_WEBHOOK_SECRET ? "LOADED ✅" : "❌ MISSING");
console.log("🌐 Frontend URL:", FRONTEND_URL);
console.log("=====================================");

// ============= CREATE PAYMENT LINK =============
app.post('/create-payment', async (req, res) => {
    try {
        const { order_id, amount, currency, description, customer, success_url, cancel_url } = req.body;

        console.log("💳 Creating Payment Link...");
        console.log("📋 Order ID:", order_id);
        console.log("💰 Amount:", amount, "centavos (₱" + (amount / 100).toFixed(2) + ")");
        console.log("📝 Description:", description);

        // Validate Secret Key
        if (!PAYMONGO_SECRET_KEY) {
            return res.json({
                success: false,
                error: "PAYMONGO_SECRET_KEY is not set on the server"
            });
        }

        // Validate amount (minimum ₱1.00 = 100 centavos)
        if (!amount || amount < 100) {
            return res.json({
                success: false,
                error: "Amount must be at least ₱1.00"
            });
        }

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
        console.log("📤 PayMongo Response:", JSON.stringify(result, null, 2));

        if (result.errors) {
            const errorMsg = result.errors.map(e => e.detail).join(', ');
            console.error("❌ PayMongo Error:", errorMsg);
            return res.json({
                success: false,
                error: errorMsg
            });
        }

        const paymentUrl = result.data.attributes.url;
        const paymentId = result.data.attributes.id;

        console.log("✅ Payment Link Created!");
        console.log("🔗 URL:", paymentUrl);
        console.log("🆔 Payment ID:", paymentId);

        res.json({
            success: true,
            payment_url: paymentUrl,
            payment_id: paymentId
        });

    } catch (err) {
        console.error("❌ Server Error:", err.message);
        res.json({
            success: false,
            error: "Server error: " + err.message
        });
    }
});

// ============= PAYMONGO WEBHOOK ENDPOINT =============
app.post('/webhook/paymongo', async (req, res) => {
    try {
        const signature = req.headers['paymongo-signature'];
        const payload = JSON.stringify(req.body);

        console.log("📥 Webhook Received");
        console.log("📨 Event Type:", req.body.data?.type);

        // Verify webhook signature if secret is set
        if (PAYMONGO_WEBHOOK_SECRET) {
            const hmac = crypto.createHmac('sha256', PAYMONGO_WEBHOOK_SECRET);
            const digest = hmac.update(payload).digest('hex');

            if (signature !== digest) {
                console.log("⚠️ Invalid webhook signature — request ignored");
                return res.status(401).send('Invalid signature');
            }
            console.log("✅ Signature verified");
        } else {
            console.log("⚠️ Webhook secret not set — skipping verification");
        }

        const event = req.body.data;

        // ✅ Payment Successful
        if (event.type === 'payment.paid') {
            const paymentData = event.data.attributes;
            console.log("=====================================");
            console.log("✅ PAYMENT SUCCESSFUL! 🎉");
            console.log("💰 Amount:", paymentData.amount / 100, "PHP");
            console.log("🆔 Payment ID:", paymentData.id);
            console.log("📝 Description:", paymentData.description || 'N/A');
            console.log("👤 Customer:", paymentData.billing?.name || 'Unknown');
            console.log("=====================================");
            
            // ✅ HERE — Your code when payment is confirmed:
            // - Mark order as PAID in database
            // - Send download link to customer
            // - Send notification to yourself
        }

        // ❌ Payment Failed
        if (event.type === 'payment.failed') {
            const paymentData = event.data.attributes;
            console.log("=====================================");
            console.log("❌ PAYMENT FAILED");
            console.log("🆔 Payment ID:", paymentData.id);
            console.log("📌 Reason:", paymentData.failed_at ? "User cancelled or declined" : 'Unknown');
            console.log("=====================================");
        }

        res.status(200).send('OK');

    } catch (err) {
        console.error("❌ Webhook Error:", err.message);
        res.status(500).send('Error');
    }
});

// ============= HEALTH CHECK =============
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body style="font-family:system-ui;padding:2rem;max-width:600px;margin:0 auto;text-align:center;">
                <h1>✅ Alonemods PayMongo Backend</h1>
                <p>Status: <strong style="color:green">Online & Running</strong></p>
                <p>Secret Key: ${PAYMONGO_SECRET_KEY ? '✅ Loaded' : '❌ Missing'}</p>
                <p>Webhook Secret: ${PAYMONGO_WEBHOOK_SECRET ? '✅ Loaded' : '❌ Missing'}</p>
                <p>Webhook Events: payment.paid, payment.failed</p>
                <hr style="margin:2rem 0;">
                <p>Ready to process payments!</p>
            </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`📡 Create Payment: POST /create-payment`);
    console.log(`📡 Webhook: POST /webhook/paymongo`);
    console.log("=====================================");
});
