<?php
require 'config.php';

$id = (int)($_GET['id'] ?? 0);

$stmt = $pdo->prepare("SELECT * FROM files WHERE id = ?");
$stmt->execute([$id]);
$item = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$item) {
    die("<h2>❌ Product Not Found</h2><a href='index.php'>← Back to Shop</a>");
}

$price = (float)$item['price'];
?>
<!DOCTYPE html>
<html>
<head>
    <title><?= htmlspecialchars($item['title']) ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; max-width: 450px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        h2 { color: #222; margin-bottom: 10px; }
        .desc { color: #666; margin-bottom: 15px; line-height: 1.5; }
        .price { font-size: 32px; color: #d81b60; font-weight: bold; margin-bottom: 25px; }
        label { display: block; margin: 15px 0 5px; color: #444; font-weight: 500; }
        input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; }
        .pay-btn { background: #009cde; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 17px; font-weight: bold; width: 100%; margin-top: 20px; cursor: pointer; }
        .pay-btn:hover { background: #0088c2; }
        .back-link { display: inline-block; margin-top: 20px; color: #666; text-decoration: none; }
        .preview-img { width: 100%; border-radius: 8px; margin-bottom: 20px; }
        .min-note { font-size: 13px; color: #888; margin-top: 10px; }
        .error-box { background: #fff2f2; border: 1px solid #ffcccc; padding: 12px; border-radius: 6px; color: #cc0000; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="card">
        <?php if (!empty($item['preview_image'])): ?>
            <img src="<?= htmlspecialchars($item['preview_image']) ?>" class="preview-img" alt="<?= htmlspecialchars($item['title']) ?>">
        <?php endif; ?>
        
        <h2><?= htmlspecialchars($item['title']) ?></h2>
        <p class="desc"><?= htmlspecialchars($item['description']) ?></p>
        <p class="price">₱<?= number_format($price, 2) ?></p>
        
        <?php if ($price < 100): ?>
            <div class="error-box">⚠️ This item is below the minimum payment amount of ₱100.00. Please contact the seller.</div>
        <?php else: ?>
            <form action="create-payment.php" method="POST">
                <input type="hidden" name="file_id" value="<?= $item['id'] ?>">
                
                <label>Your Name:</label>
                <input type="text" name="customer_name" required>
                
                <label>Your Email:</label>
                <input type="email" name="customer_email" required>
                
                <button type="submit" class="pay-btn">💳 Proceed to Payment</button>
            </form>
        <?php endif; ?>
        
        <a href="index.php" class="back-link">← Back to Products</a>
    </div>
</body>
</html>
