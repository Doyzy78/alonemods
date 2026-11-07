<?php
require 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die('❌ Invalid request. Go back and use the form. <a href="index.php">← Back to Shop</a>');
}

// Get form data
$file_id = (int)($_POST['file_id'] ?? 0);
$customer_name = trim($_POST['customer_name'] ?? '');
$customer_email = trim($_POST['customer_email'] ?? '');

// Fetch item from database
$stmt = $pdo->prepare("SELECT * FROM files WHERE id = ?");
$stmt->execute([$file_id]);
$item = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$item) {
    die('❌ Item not found.');
}

$amount = (float)$item['price'];
$item_name = $item['title'];

// Validate minimum amount
if ($amount < 100) {
    die('❌ Minimum payment amount is ₱100.00. This item cannot be paid via PayMongo.');
}
if (empty($customer_name) || empty($customer_email)) {
    die('❌ Please fill in all fields.');
}

// Convert to centavos
$amount_in_cents = (int)($amount * 100);

// Save order to database
$insert = $pdo->prepare("INSERT INTO orders (file_id, customer_name, customer_email, amount, payment_status) VALUES (?, ?, ?, ?, 'pending')");
$insert->execute([$file_id, $customer_name, $customer_email, $amount]);
$order_id = $pdo->lastInsertId();

// Create PayMongo Checkout Session
$postData = json_encode([
    'data' => [
        'attributes' => [
            'amount' => $amount_in_cents,
            'currency' => 'PHP',
            'description' => "Order #$order_id — " . $item_name . " — Buyer: $customer_name",
            'statement_descriptor' => 'My Shop Payment',
            'redirect' => [
                'success' => SITE_URL . '/success.html?order_id=' . $order_id . '&item_id=' . $file_id,
                'failed' => SITE_URL . '/failed.html?order_id=' . $order_id
            ]
        ]
    ]
]);

$ch = curl_init('https://api.paymongo.com/v1/checkout_sessions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Basic ' . base64_encode(PAYMONGO_SECRET_KEY . ':')
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// === DETAILED ERROR HANDLING ===
if ($curlError) {
    die("<h3>❌ Connection Error</h3><p>" . htmlspecialchars($curlError) . "</p><p>Check if your hosting allows connections to external APIs.</p>");
}

$result = json_decode($response, true);

if ($httpCode !== 200) {
    echo "<h3>❌ Failed to create payment link</h3>";
    echo "<p><strong>HTTP Code:</strong> $httpCode</p>";
    echo "<p><strong>Response from PayMongo:</strong></p>";
    echo "<pre style='background:#f8f8f8;padding:10px;border:1px solid #ddd;overflow-x:auto;'>" . htmlspecialchars($response) . "</pre>";
    
    // Common error hints
    if ($httpCode === 401) {
        echo "<p><strong>💡 Hint:</strong> Invalid API Key! Double-check your PAYMONGO_SECRET_KEY in config.php</p>";
    } elseif ($httpCode === 422) {
        echo "<p><strong>💡 Hint:</strong> Invalid data sent. Check amount — must be at least 10000 centavos (₱100.00)</p>";
    }
    die();
}

$checkoutUrl = $result['data']['attributes']['checkout_url'] ?? '';

if ($checkoutUrl) {
    header('Location: ' . $checkoutUrl);
    exit;
} else {
    die('❌ Could not get payment link URL. Response: ' . htmlspecialchars($response));
}
?>
