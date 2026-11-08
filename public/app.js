// ==========================================
// 🔑 UPDATE THIS WITH YOUR RENDER BACKEND URL
// ==========================================
// ✅ REPLACE the old API_BASE line with THIS:
const API_BASE = '/api';  // ✅ Works automatically on Vercel!

// All your fetch calls will now look like this:
// fetch(`${API_BASE}/create-payment`, ...)
// fetch(`${API_BASE}/create-qr-payment`, ...)

// ==================== PRODUCTS ====================
const products = [
    { id: 1, name: 'Coca Cola', desc: 'Ice Cold Cola', price: 2.50 },
    { id: 2, name: 'Pepsi', desc: 'Refreshing Pepsi', price: 2.50 },
    { id: 3, name: 'Alcohol', desc: '70% Isopropyl Alcohol', price: 25.00 }
];

// ==================== CART — Auto Save ====================
let cart = JSON.parse(localStorage.getItem('shopCart') || '[]');

function saveCart() {
    localStorage.setItem('shopCart', JSON.stringify(cart));
    updateCartUI();
}

function addToProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const existing = cart.find(c => c.id === id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart();
}

function removeFromCart(id) {
    cart = cart.filter(c => c.id !== id);
    saveCart();
}

function updateCartUI() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const cartFooter = document.getElementById('cartFooter');
    if (cartFooter) {
        cartFooter.style.display = cart.length > 0 ? 'block' : 'none';
        const totalEl = document.getElementById('cartTotal');
        if (totalEl) totalEl.textContent = '₱' + total.toFixed(2);
    }
}

function goToCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    localStorage.setItem('checkoutCart', JSON.stringify(cart));
    window.location.href = 'checkout.html';
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = products.map(p => `
        <div class="product-card" data-id="${p.id}">
            <div class="product-name">${p.name}</div>
            <div class="product-desc">${p.desc}</div>
            <div class="product-price">₱${p.price.toFixed(2)}</div>
            <button class="add-cart-btn" onclick="addToProduct(${p.id})">Add to Cart</button>
        </div>
    `).join('');
    updateCartUI();
}

// ==================== CHECKOUT ====================
function loadCheckout() {
    const orderItems = document.getElementById('orderItems');
    const totalAmount = document.getElementById('totalAmount');
    if (!orderItems) return;
    const checkoutCart = JSON.parse(localStorage.getItem('checkoutCart') || '[]');
    let total = 0;
    orderItems.innerHTML = checkoutCart.map(item => {
        total += item.price * item.qty;
        return `
            <div class="order-item">
                <span>${item.name} × ${item.qty}</span>
                <span>₱${(item.price * item.qty).toFixed(2)}</span>
            </div>
        `;
    }).join('');
    if (totalAmount) totalAmount.textContent = '₱' + total.toFixed(2);
}

async function continueToPayment() {
    const method = document.querySelector('input[name="payment"]:checked')?.value;
    const fullName = document.getElementById('fullName')?.value;
    const email = document.getElementById('email')?.value;
    const phone = document.getElementById('phone')?.value;
    
    if (!fullName || !email || !phone) {
        alert('Please fill in all billing details');
        return;
    }
    const checkoutCart = JSON.parse(localStorage.getItem('checkoutCart') || '[]');
    const total = checkoutCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const orderId = 'ORD-' + Date.now();

    if (method === 'qrph') {
        window.location.href = `qr-payment.html?order_id=${orderId}&amount=${Math.round(total * 100)}&name=${encodeURIComponent(fullName)}&phone=${encodeURIComponent(phone)}`;
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/create-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderId,
                amount: Math.round(total * 100),
                description: checkoutCart.map(i => `${i.name} × ${i.qty}`).join(', '),
                customer: { name: fullName, email, phone },
                success_url: `${window.location.origin}/success.html?order_id=${orderId}`,
                cancel_url: `${window.location.origin}/index.html`
            })
        });

        const result = await res.json();
        if (result.success && result.payment_url) {
            localStorage.removeItem('shopCart');
            window.location.href = result.payment_url;
        } else {
            alert('Error: ' + (result.error || 'Failed to create payment'));
        }
    } catch (err) {
        alert('Server error: Make sure backend is running');
        console.error(err);
    }
}

// ==================== QR PAYMENT PAGE ====================
async function loadQRPayment() {
    const params = new URLSearchParams(window.location.search);
    const amount = parseInt(params.get('amount') || '0') / 100;
    const orderId = params.get('order_id');
    const phone = params.get('phone') || '';

    const amountEl = document.getElementById('payAmount');
    const refIdEl = document.getElementById('refId');
    const qrImageEl = document.getElementById('qrImage');
    const loadingEl = document.getElementById('qrLoading');

    if (amountEl) amountEl.textContent = amount.toFixed(2);

    try {
        const res = await fetch(`${API_BASE}/create-qr-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: Math.round(amount * 100),
                description: `Order ${orderId}`,
                mobile_number: phone
            })
        });

        const result = await res.json();
        if (result.success && result.qr_image) {
            if (loadingEl) loadingEl.style.display = 'none';
            if (qrImageEl) {
                qrImageEl.src = result.qr_image;
                qrImageEl.style.display = 'block';
            }
            if (refIdEl && result.reference_id) {
                refIdEl.textContent = result.reference_id;
            }
        } else {
            alert('QR Error: ' + (result.error || 'Could not generate QR'));
        }
    } catch (err) {
        alert('Server connection error');
        console.error(err);
    }
}

// ==================== PAGE INIT ====================
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('productsGrid')) renderProducts();
    if (document.getElementById('orderItems')) loadCheckout();
    if (document.getElementById('qrImage')) loadQRPayment();
});
