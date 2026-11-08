// ============= CONFIG =============
const BACKEND_URL = "https://alonemods.vercel.app";
const CURRENCY = "PHP";
const SUCCESS_URL = window.location.origin + "/success.html";
const CANCEL_URL = window.location.origin + "/index.html";
// ===================================

let cart = [];

const productsGrid = document.getElementById('productsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartModal = document.getElementById('cartModal');
const closeModal = document.getElementById('closeModal');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const payBtn = document.getElementById('payBtn');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');

renderProducts();

function renderProducts() {
    productsGrid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-image">${p.image}</div>
            <div class="product-info">
                <h3 class="product-title">${p.title}</h3>
                <p class="product-desc">${p.description}</p>
                <p class="product-price">₱${p.price.toFixed(2)}</p>
                <button class="add-to-cart" data-id="${p.id}">Add to Cart</button>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', e => addToCart(parseInt(e.target.dataset.id)));
    });
}

function addToCart(id) {
    const p = products.find(x => x.id === id);
    const existing = cart.find(x => x.id === id);
    existing ? existing.quantity++ : cart.push({...p, quantity: 1});
    updateCartUI();
    showToast(`${p.title} added! ✅`, 'success');
}

function updateQty(id, action) {
    const item = cart.find(x => x.id === id);
    action === 'plus' ? item.quantity++ : item.quantity--;
    if (item.quantity <= 0) cart = cart.filter(x => x.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const totalItems = cart.reduce((s,i)=>s+i.quantity,0);
    const totalPrice = cart.reduce((s,i)=>s+(i.price*i.quantity),0);
    cartCount.textContent = totalItems;
    cartTotal.textContent = totalPrice.toFixed(2);
    
    if (!cart.length) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        payBtn.disabled = true;
        return;
    }
    payBtn.disabled = false;
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div><strong>${item.title}</strong><br>₱${item.price.toFixed(2)} × ${item.quantity}</div>
            <div class="cart-item-qty">
                <button class="qty-btn" data-id="${item.id}" data-action="minus">−</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" data-id="${item.id}" data-action="plus">+</button>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', e => updateQty(parseInt(e.target.dataset.id), e.target.dataset.action));
    });
}

cartBtn.addEventListener('click', () => { cartModal.classList.add('active'); updateCartUI(); });
closeModal.addEventListener('click', () => cartModal.classList.remove('active'));
window.addEventListener('click', e => e.target === cartModal && cartModal.classList.remove('active'));

payBtn.addEventListener('click', async () => {
    if (!cart.length) return;
    
    const fullName = document.getElementById('fullName').value || 'Guest';
    const email = document.getElementById('email').value || '';
    const phone = document.getElementById('phone').value || '';
    const address = document.getElementById('address').value || '';
    const totalAmount = cart.reduce((s,i)=>s+(i.price*i.quantity),0);
    const orderId = 'ORD-' + Date.now();

    loading.classList.add('active');
    payBtn.disabled = true;

    try {
        const res = await fetch(`${BACKEND_URL}/create-payment`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                order_id: orderId,
                amount: Math.round(totalAmount * 100),
                currency: CURRENCY,
                description: cart.map(i => `${i.title} ×${i.quantity}`).join(', '),
                customer: { name: fullName, email, phone, address },
                success_url: `${SUCCESS_URL}?order_id=${orderId}`,
                cancel_url: CANCEL_URL
            })
        });

        const result = await res.json();
        if (result.success && result.payment_url) {
            showToast('✅ Redirecting to payment...', 'success');
            cart = []; updateCartUI(); cartModal.classList.remove('active');
            setTimeout(() => window.location.href = result.payment_url, 800);
        } else {
            showToast('⚠️ ' + (result.error || 'Failed'), 'error');
        }
    } catch (err) {
        showToast('⚠️ Connection error. Try again.', 'error');
    } finally {
        loading.classList.remove('active');
        payBtn.disabled = false;
    }
});

function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.style.display = 'none', 4000);
}
