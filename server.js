require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============= CONFIGURATION =============
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;
const BASE_URL = process.env.BASE_URL || `https://alonemods.vercel.app`;

console.log("=====================================");
console.log("🚀 Shop Server Starting...");
console.log("📍 Local URL:", BASE_URL);
console.log("🔑 PayMongo Key:", PAYMONGO_SECRET_KEY ? "LOADED ✅" : "❌ MISSING");
console.log("=====================================");

// ============= MIDDLEWARE =============
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============= HELPER FUNCTIONS =============
function getAuthHeader() {
    return 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64');
}

// ============= 1. CREATE PAYMENT LINK (GCash) =============
app.post('/create-payment', async (req, res) => {
    try {
        const { order_id, amount, description, customer, success_url, cancel_url } = req.body;
        
        console.log("💳 Creating Payment — Order:", order_id, "Amount:", amount);
        
        if (!PAYMONGO_SECRET_KEY) {
            return res.json({ success: false, error: "PAYMONGO_SECRET_KEY not set in .env" });
        }
        if (!amount || amount < 100) {
            return res.json({ success: false, error: "Amount must be at least ₱1.00 (100 centavos)" });
        }
        
        const response = await fetch('https://api.paymongo.com/v1/links', {
            method: 'POST',
            headers: {
                'Authorization': getAuthHeader(),
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount: amount,
                        description: description || `Payment ${order_id}`,
                        currency: 'PHP',
                        redirect: {
                            success: success_url || `${BASE_URL}/success.html?order_id=${order_id}`,
                            failed: cancel_url || `${BASE_URL}/index.html`
                        }
                    }
                }
            })
        });
        
        const result = await response.json();
        if (result.errors) {
            const msg = result.errors.map(e => e.detail).join(', ');
            console.error("❌ PayMongo Error:", msg);
            return res.json({ success: false, error: msg });
        }
        
        console.log("✅ Payment Link Created:", result.data.attributes.url);
        res.json({
            success: true,
            payment_url: result.data.attributes.url,
            payment_id: result.data.id
        });
        
    } catch (err) {
        console.error("❌ Server Error:", err.message);
        res.json({ success: false, error: err.message });
    }
});

// ============= 2. CREATE QR PH PAYMENT =============
app.post('/create-qr-payment', async (req, res) => {
    try {
        const { amount, description, mobile_number } = req.body;
        
        console.log("📱 Creating QR Payment — Amount:", amount);
        
        if (!PAYMONGO_SECRET_KEY) {
            return res.json({ success: false, error: "PAYMONGO_SECRET_KEY not set in .env" });
        }
        if (!amount || amount < 100) {
            return res.json({ success: false, error: "Amount must be at least ₱1.00" });
        }
        
        const response = await fetch('https://api.paymongo.com/v1/qrph/generate', {
            method: 'POST',
            headers: {
                'Authorization': getAuthHeader(),
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount: amount,
                        type: "instore",
                        currency: "PHP",
                        description: description || "QR Payment",
                        mobile_number: mobile_number || null
                    }
                }
            })
        });
        
        const result = await response.json();
        if (result.errors) {
            const msg = result.errors.map(e => e.detail).join(', ');
            console.error("❌ QR Error:", msg);
            return res.json({ success: false, error: msg });
        }
        
        console.log("✅ QR Code Created — Ref:", result.data.attributes.reference_id);
        res.json({
            success: true,
            qr_image: result.data.attributes.qr_image,
            reference_id: result.data.attributes.reference_id,
            amount: result.data.attributes.amount
        });
        
    } catch (err) {
        console.error("❌ Server Error:", err.message);
        res.json({ success: false, error: err.message });
    }
});

// ============= 3. WEBHOOK — Payment Status Updates =============
app.post('/webhook/paymongo', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['paymongo-signature'] || '';
        const payload = req.body.toString();
        const event = JSON.parse(payload).data;
        
        console.log("📥 Webhook Event:", event.type);
        
        // Verify signature if webhook secret is set
        if (PAYMONGO_WEBHOOK_SECRET) {
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', PAYMONGO_WEBHOOK_SECRET);
            const digest = hmac.update(payload).digest('hex');
            if (signature !== digest) {
                console.log("⚠️ Invalid webhook signature");
                return res.status(401).send('Invalid signature');
            }
        }
        
        // Handle payment events
        switch (event.type) {
            case 'payment.paid':
                console.log("✅ PAYMENT SUCCESS — Amount:", event.data.attributes.amount / 100, "PHP");
                break;
            case 'payment.failed':
                console.log("❌ PAYMENT FAILED");
                break;
        }
        
        res.status(200).send('OK');
    } catch (err) {
        console.error("Webhook Error:", err.message);
        res.status(500).send('Error');
    }
});

// ============= 4. HEALTH CHECK =============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============= START SERVER =============
app.listen(PORT, () => {
    console.log(`🌐 Server running at: ${BASE_URL}`);
    console.log(`🛒 Shop: ${BASE_URL}/index.html`);
    console.log(`🔗 Press Ctrl+C to stop`);
});
