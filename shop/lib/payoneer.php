<?php
function payoneer_ready()
{
    $payoneer =(($_idx = app_config()['payoneer']) !== null ? $_idx : []);
    return is_array($payoneer)
        && trim((string) ((isset($payoneer['merchant_code']) ? $payoneer['merchant_code'] : ''))) !== ''
        && trim((string) ((isset($payoneer['token']) ? $payoneer['token'] : ''))) !== '';
}

function ensure_order_payment_columns()
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    $pdo = db();
    $existing = $pdo->query('SHOW COLUMNS FROM orders')->fetchAll(PDO::FETCH_COLUMN);
    $add = [
        'city' => "VARCHAR(80) NOT NULL DEFAULT ''",
        'postcode' => "VARCHAR(20) NOT NULL DEFAULT ''",
        'country' => "CHAR(2) NOT NULL DEFAULT ''",
        'payment_method' => "VARCHAR(32) NOT NULL DEFAULT 'invoice'",
        'payoneer_list_id' => 'VARCHAR(80) NULL',
    ];
    foreach ($add as $name => $definition) {
        if (!in_array($name, $existing, true)) {
            $pdo->exec('ALTER TABLE orders ADD COLUMN ' . $name . ' ' . $definition);
        }
    }
}

function payoneer_start(array $order)
{
    $parts = preg_split('/\s+/', trim((string) $order['customer_name'])) ?: [];
    $first =(isset($parts[0]) ? $parts[0] : 'Customer');
    $last = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : $first;
    $store = rtrim((string) ((($_idx = app_config()['storefront_url']) !== null ? $_idx : '')), '/');
    $number = rawurlencode((string) $order['order_number']);
    $payload = [
        'transactionId' => $order['order_number'],
        'integration' => 'HOSTED',
        'operationType' => 'CHARGE',
        'country' => $order['country'],
        'customer' => [
            'email' => $order['email'],
            'number' => $order['email'],
            'addresses' => [
                'billing' => [
                    'street' => mb_substr((($_idx = preg_replace('/\s+/u', ' ', (string) $order['address'])) !== null ? $_idx : ''), 0, 80),
                    'city' => $order['city'],
                    'zip' => $order['postcode'],
                    'country' => $order['country'],
                    'name' => ['firstName' => mb_substr($first, 0, 40), 'lastName' => mb_substr($last, 0, 40)],
                ],
            ],
        ],
        'payment' => [
            'amount' => ((int) $order['total_cents']) / 100,
            'currency' => $order['currency'],
            'reference' => $order['order_number'],
            'invoiceId' => $order['order_number'],
        ],
        'style' => ['language' => 'en_US', 'hostedVersion' => 'v5'],
        'callback' => [
            'returnUrl' => $store . '/thank-you/?order=' . $number,
            'cancelUrl' => $store . '/checkout/?payment=cancelled&order=' . $number,
        ],
    ];
    $division = trim((string) ((($_idx = app_config()['payoneer']['division']) !== null ? $_idx : '')));
    if ($division !== '') {
        $payload['division'] = $division;
    }
    $notification = trim((string) ((($_idx = app_config()['payoneer']['notification_url']) !== null ? $_idx : '')));
    if (idx_starts($notification, 'https://')) {
        $payload['callback']['notificationUrl'] = $notification;
    }
    $session = payoneer_request('POST', '/lists', $payload);
    $listId = (string) ((isset($session['identification']['longId']) ? $session['identification']['longId'] : ''));
    $redirect =(isset($session['redirect']) ? $session['redirect'] : null);
    if ($listId === '' || !is_array($redirect) || empty($redirect['url'])) {
        throw new RuntimeException((string) ((isset($session['resultInfo']) ? $session['resultInfo'] : 'Payoneer did not return a payment page.')));
    }
    db()->prepare('UPDATE orders SET payoneer_list_id = ? WHERE order_number = ?')->execute([$listId, $order['order_number']]);
    $parameters = [];
    foreach ((isset($redirect['parameters']) ? $redirect['parameters'] : []) as $parameter) {
        if (is_array($parameter)) {
            $parameters[] = ['name' => (string) ((isset($parameter['name']) ? $parameter['name'] : '')), 'value' => (string) ((isset($parameter['value']) ? $parameter['value'] : ''))];
        }
    }
    return [
        'url' => (string) $redirect['url'],
        'method' => (((isset($redirect['method']) ? $redirect['method'] : '')) === 'POST') ? 'POST' : 'GET',
        'parameters' => $parameters,
    ];
}

function payoneer_sync($orderNumber)
{
    $stmt = db()->prepare('SELECT * FROM orders WHERE order_number = ?');
    $stmt->execute([$orderNumber]);
    $order = $stmt->fetch();
    if (!$order || ((isset($order['payment_method']) ? $order['payment_method'] : '')) !== 'payoneer' || empty($order['payoneer_list_id'])) {
        return;
    }
    $session = payoneer_request('GET', '/lists/' . rawurlencode((string) $order['payoneer_list_id']));
    $code = (string) ((isset($session['status']['code']) ? $session['status']['code'] : ''));
    if (in_array($code, ['charged', 'paid_out'], true) && $order['status'] === 'pending') {
        db()->prepare('UPDATE orders SET status = "paid" WHERE id = ? AND status = "pending"')->execute([(int) $order['id']]);
        return;
    }
    if (in_array($code, ['failed', 'declined', 'aborted', 'canceled', 'expired'], true)) {
        payoneer_cancel_order($orderNumber);
    }
}

function payoneer_cancel_order($orderNumber)
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT id, status FROM orders WHERE order_number = ? FOR UPDATE');
        $stmt->execute([$orderNumber]);
        $order = $stmt->fetch();
        if ($order && $order['status'] === 'pending') {
            $items = $pdo->prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?');
            $items->execute([(int) $order['id']]);
            $restock = $pdo->prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
            foreach ($items as $item) {
                if ($item['product_id'] !== null) {
                    $restock->execute([(int) $item['qty'], (int) $item['product_id']]);
                }
            }
            $pdo->prepare('UPDATE orders SET status = "cancelled" WHERE id = ?')->execute([(int) $order['id']]);
        }
        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function payoneer_request($method, $path, $payload = null)
{
    $payoneer =(($_idx = app_config()['payoneer']) !== null ? $_idx : []);
    $base = (((isset($payoneer['environment']) ? $payoneer['environment'] : '')) === 'live')
        ? 'https://api.live.oscato.com/api'
        : 'https://api.sandbox.oscato.com/api';
    $media = 'application/vnd.optile.payment.enterprise-v1-extensible+json';
    $ch = curl_init($base . $path);
    if ($ch === false) {
        throw new RuntimeException('Payoneer could not be contacted.');
    }
    $headers = [
        'Accept: ' . $media,
        'Content-Type: ' . $media,
        'Authorization: Basic ' . base64_encode(trim((string) $payoneer['merchant_code']) . ':' . trim((string) $payoneer['token'])),
    ];
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_SLASHES));
    }
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($data)) {
        $data = [];
    }
    if ($status < 200 || $status >= 300) {
        throw new RuntimeException((string) ((isset($data['resultInfo']) ? $data['resultInfo'] : 'Payoneer rejected the payment session.')));
    }
    return $data;
}
