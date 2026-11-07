<?php
require 'config.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);
$eventType = $data['data']['type'] ?? '';
$attrs = $data['data']['attributes'] ?? [];

$desc = $attrs['description'] ?? '';
$order_id = null;
if (preg_match('/Order #(\d+)/', $desc, $matches)) {
    $order_id = (int)$matches[1];
}

if ($eventType === 'payment.paid' && $order_id) {
    $update = $pdo->prepare("UPDATE orders SET payment_status = 'paid', paymongo_payment_id = ? WHERE id = ?");
    $update->execute([$attrs['id'] ?? '', $order_id]);
    http_response_code(200);
    echo "OK — Order $order_id PAID";
    
} elseif ($eventType === 'payment.failed' && $order_id) {
    $update = $pdo->prepare("UPDATE orders SET payment_status = 'failed', paymongo_payment_id = ? WHERE id = ?");
    $update->execute([$attrs['id'] ?? '', $order_id]);
    http_response_code(200);
    echo "OK — Order $order_id FAILED";
    
} else {
    http_response_code(200);
    echo "OK — Event acknowledged";
}
?>
