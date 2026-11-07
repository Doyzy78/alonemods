<?php
// Database Settings
define('DB_HOST', 'fdb1032.awardspace.net');
define('DB_NAME', '4717554_onlinescriptlua');
define('DB_USER', '4717554_onlinescriptlua');
define('DB_PASS', '123123@e');

// PayMongo API Keys — FULL KEY including prefix!
define('PAYMONGO_PUBLIC_KEY', 'pk_test_egkVxZLGdyypng3PkA62ueRp');
define('PAYMONGO_SECRET_KEY', 'sk_test_1WYGzCS9CKwNLbZsETvpiz1o');

// URLs
define('SITE_URL', 'http://alone.mypressonline.com/shop');
define('WEBHOOK_URL', 'http://alone.mypressonline.com/shop/webhook.php');

// Connect to Database
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // Create orders table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS orders (
            id INT PRIMARY KEY AUTO_INCREMENT,
            file_id INT NOT NULL,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            payment_status VARCHAR(50) DEFAULT 'pending',
            paymongo_payment_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
} catch (PDOException $e) {
    die("❌ Database Error: " . $e->getMessage());
}
?>
