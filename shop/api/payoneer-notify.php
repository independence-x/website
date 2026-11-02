<?php
require dirname(__DIR__) . '/lib/app.php';
require dirname(__DIR__) . '/lib/payoneer.php';

try {
    api_boot();
    if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) !== 'POST') {
        json_out(['error' => 'Use POST.'], 405);
    }
    ensure_order_payment_columns();
    $raw = file_get_contents('php://input');
    $data = is_string($raw) ? json_decode($raw, true) : null;
    $number = '';
    if (is_array($data)) {
        $number = (string) ((isset($data['identification']['transactionId']) ? $data['identification']['transactionId'] : (isset($data['transactionId']) ? $data['transactionId'] : '')));
    }
    if ($number !== '' && preg_match('/^[A-Za-z0-9-]{4,32}$/', $number)) {
        try {
            payoneer_sync($number);
        } catch (Exception $e) {
            // Payoneer retries notifications. The next return-url check can confirm the payment.
        }
    }
    json_out(['ok' => true]);
} catch (Exception $e) {
    json_out(['ok' => true]);
}
