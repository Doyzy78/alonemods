<?php require 'config.php'; ?>
<!DOCTYPE html>
<html>
<head>
    <title>Our Products</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
        body { background: #f5f5f5; padding: 30px 20px; }
        h1 { text-align: center; color: #333; margin-bottom: 40px; }
        .products { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; }
        .card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.2s; }
        .card:hover { transform: translateY(-5px); }
        .product-name { font-size: 20px; font-weight: bold; color: #222; margin-bottom: 10px; }
        .product-desc { color: #666; font-size: 14px; margin-bottom: 15px; line-height: 1.5; }
        .product-price { font-size: 26px; color: #d81b60; font-weight: bold; margin-bottom: 20px; }
        .buy-btn { display: block; text-align: center; background: #009cde; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold; }
        .buy-btn:hover { background: #0088c2; }
        .no-img { background: #eee; border-radius: 8px; height: 150px; display: flex; align-items: center; justify-content: center; color: #999; margin-bottom: 15px; }
        .preview-img { width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; }
    </style>
</head>
<body>

    <h1>🛍️ Our Products</h1>
    
    <div class="products">
        <?php
        $stmt = $pdo->query("SELECT * FROM files ORDER BY id DESC");
        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($files) === 0) {
            echo "<p style='text-align:center;color:#666;grid-column:1/-1;'>No products available yet.</p>";
        } else {
            foreach ($files as $item) {
                $price = number_format((float)$item['price'], 2);
                echo "
                <div class='card'>
                    " . ($item['preview_image'] 
                        ? "<img src='" . htmlspecialchars($item['preview_image']) . "' class='preview-img' alt='" . htmlspecialchars($item['title']) . "'>"
                        : "<div class='no-img'>📷 No Image</div>"
                    ) . "
                    <h2 class='product-name'>" . htmlspecialchars($item['title']) . "</h2>
                    <p class='product-desc'>" . htmlspecialchars(substr($item['description'], 0, 80)) . "...</p>
                    <p class='product-price'>₱" . $price . "</p>
                    " . ((float)$item['price'] < 100 
                        ? "<p style='color:red;font-size:13px;'>⚠️ Min ₱100 for payment</p>" 
                        : ""
                    ) . "
                    <a href='product.php?id=" . $item['id'] . "' class='buy-btn'>View & Buy →</a>
                </div>
                ";
            }
        }
        ?>
    </div>
    
</body>
</html>
