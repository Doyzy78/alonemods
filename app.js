// ============== CONFIGURATION ==============
const BACKEND_URL = "https://alonemods.vercel.app";  // Your Vercel backend

const CURRENCY = "PHP";
const SUCCESS_URL = window.location.origin + "/success.html";
const CANCEL_URL = window.location.href;
// ============================================

let cart = [];

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartModal = document.getElementById('cartModal');
const closeModal = document.getElementById('closeModal');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');

// ✅ SHOW PRODUCTS FIRST — Load immediately
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

// ✅ ADD TO CART
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existing = cart.find(i => i.id === productId);
    
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCartUI();
    showToast(`${product.title} added to cart! ✅`, 'success');
}

function updateQuantity(productId, action) {
    const item = cart.find(i => i.id === productId);
    if (action === 'plus') {
        item.quantity++;
    } else {
        item.quantity--;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== productId);
        }
    }
    updateCartUI();
}

function updateCartUI() {
    const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
    const totalPrice = cart.reduce((s, i) => s + (i.price * i.quantity), 0);

    cartCount.textContent = totalItems;
    cartTotal.textContent = totalPrice.toFixed(2);

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        checkoutBtn.disabled = true;
        return;
    }

    checkoutBtn.disabled = false;
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${item.title}</strong><br>
                ₱${item.price.toFixed(2)} × ${item.quantity}
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" data-id="${item.id}" data-action="minus">−</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" data-id="${item.id}" data-action="plus">+</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            updateQuantity(parseInt(e.target.dataset.id), e.target.dataset.action);
        });
    });
}

// Modal controls
cartBtn.addEventListener('click', () => {
    cartModal.classList.add('active');
    updateCartUI();
});

closeModal.addEventListener('click', () => {
    cartModal.classList.remove('active');
});

window.addEventListener('click', e => {
    if (e.target === cartModal) {
        cartModal.classList.remove('active');
    }
});

// ✅ CHECKOUT → SEND TO WEBHOOK
checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) return;

    // Get customer info
    const customerName = document.getElementById('customerName')?.value || 'Guest Customer';
    const customerEmail = document.getElementById('customerEmail')?.value || '';
    const customerPhone = document.getElementById('customerPhone')?.value || '';

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = 'ORD-' + Date.now();

    // ✅ Only show loading WHEN clicking checkout, not on page load
    loading.classList.add('active');
    checkoutBtn.disabled = true;

    const orderData = {
        order_id: orderId,
        amount: Math.round(totalAmount * 100), // in centavos
        currency: CURRENCY,
        description: cart.map(i => `${i.title} ×${i.quantity}`).join(', '),
        items: cart,
        customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone
        },
        success_url: SUCCESS_URL + '?order_id=' + orderId,
        cancel_url: CANCEL_URL
    };

    try {
        console.log("📤 Sending order to webhook:", BACKEND_URL);
        console.log("Order:", orderData);

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (result.success && result.payment_url) {
            showToast('✅ Opening payment...', 'success');
            cart = []; // Clear cart
            updateCartUI();
            cartModal.classList.remove('active');
            setTimeout(() => {
                window.location.href = result.payment_url;
            }, 800);
        } else {
            showToast('⚠️ ' + (result.error || 'Payment failed'), 'error');
        }

    } catch (err) {
        console.error('Error:', err);
        showToast('⚠️ Could not connect. Check your webhook URL.', 'error');
    } finally {
        loading.classList.remove('active');
        checkoutBtn.disabled = false;
    }
});

function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.style.display = 'none', 4000);
}
