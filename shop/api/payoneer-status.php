<?php
require dirname(__DIR__) . '/lib/app.php';
require dirname(__DIR__) . '/lib/payoneer.php';

try {
    api_boot();
    if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) !== 'GET') {
        json_out(['error' => 'Use GET.'], 405);
    }
    ensure_order_payment_columns();
    $number = clean_line((string) ((isset($_GET['order']) ? $_GET['order'] : '')), 32);
    $stmt = db()->prepare('SELECT * FROM orders WHERE order_number = ?');
    $stmt->execute([$number]);
    $order = $stmt->fetch();
    if (!$order) {
        json_out(['error' => 'Order not found.'], 404);
    }
    if (((isset($order['payment_method']) ? $order['payment_method'] : '')) === 'payoneer' && $order['status'] === 'pending' && !empty($order['payoneer_list_id'])) {
        try {
            payoneer_sync($number);
        } catch (Exception $e) {
            // The customer can refresh. A Payoneer outage must not hide the order.
        }
        $stmt->execute([$number]);
        $order = $stmt->fetch() ?: $order;
    }
    $note = ((isset($order['payment_method']) ? $order['payment_method'] : '')) === 'payoneer'
        ? 'Complete payment on Payoneer\'s secure page. The order stays unpaid until Payoneer confirms it.'
        : (string) ((($_idx = app_config()['payment_note']) !== null ? $_idx : ''));
    json_out([
        'order_number' => $order['order_number'],
        'status' => $order['status'],
        'payment_method' =>(isset($order['payment_method']) ? $order['payment_method'] : 'invoice'),
        'total_cents' => (int) $order['total_cents'],
        'currency' => $order['currency'],
        'payment_note' => $note,
    ]);
} catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 422);
} catch (Exception $e) {
    json_out(['error' => 'The store is unavailable.'], 500);
}
