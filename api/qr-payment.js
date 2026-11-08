const fetch = require('node-fetch');

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;

function getAuthHeader() {
  return 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { amount, description, mobile_number } = req.body;
    
    if (!PAYMONGO_SECRET_KEY) {
      return res.status(500).json({ success: false, error: "Missing API key" });
    }
    if (!amount || amount < 100) {
      return res.json({ success: false, error: "Amount must be at least ₱1.00" });
    }

    const response = await fetch('https://api.paymongo.com/v1/qr_codes', {
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
      return res.json({ success: false, error: msg });
    }

    return res.json({
      success: true,
      qr_image: result.data.attributes.qr_image,
      reference_id: result.data.attributes.reference_id,
      amount: result.data.attributes.amount
    });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
};
