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
    const { order_id, amount, description, success_url, cancel_url } = req.body;
    
    if (!PAYMONGO_SECRET_KEY) {
      return res.status(500).json({ success: false, error: "Missing API key" });
    }
    if (!amount || amount < 100) {
      return res.json({ success: false, error: "Amount must be at least ₱1.00" });
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
              success: success_url || `${req.headers.origin}/success.html?order_id=${order_id}`,
              failed: cancel_url || `${req.headers.origin}/index.html`
            }
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
      payment_url: result.data.attributes.url,
      payment_id: result.data.id
    });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
};
