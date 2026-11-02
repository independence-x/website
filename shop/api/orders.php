<?php
require dirname(__DIR__) . '/lib/app.php';
require dirname(__DIR__) . '/lib/payoneer.php';

try {
    api_boot();
    if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) !== 'POST') {
        json_out(['error' => 'Use POST.'], 405);
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 100000) {
        json_out(['error' => 'Request is too large.'], 413);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_out(['error' => 'Send the order as JSON.'], 400);
    }
    if (trim((string) ((isset($data['website']) ? $data['website'] : ''))) !== '') {
        json_out([
            'order_number' => 'IDX-RECEIVED',
            'total_cents' => 0,
            'currency' => (string) ((($_idx = app_config()['currency']) !== null ? $_idx : 'MYR')),
            'payment_note' => '',
        ]);
    }

    $customer = [
        'customer_name' => clean_line((string) ((isset($data['customer_name']) ? $data['customer_name'] : '')), 190),
        'email' => clean_line((string) ((isset($data['email']) ? $data['email'] : '')), 190),
        'phone' => clean_line((string) ((isset($data['phone']) ? $data['phone'] : '')), 40),
        'company' => clean_line((string) ((isset($data['company']) ? $data['company'] : '')), 190),
        'address' => clean_block((string) ((isset($data['address']) ? $data['address'] : '')), 2000),
        'city' => clean_line((string) ((isset($data['city']) ? $data['city'] : '')), 50),
        'postcode' => clean_line((string) ((isset($data['postcode']) ? $data['postcode'] : '')), 20),
        'country' => strtoupper(clean_line((string) ((isset($data['country']) ? $data['country'] : '')), 2)),
        'notes' => clean_block((string) ((isset($data['notes']) ? $data['notes'] : '')), 2000),
    ];
    $paymentMethod = (((isset($data['payment_method']) ? $data['payment_method'] : '')) === 'payoneer') ? 'payoneer' : 'invoice';
    if ($customer['customer_name'] === '' || $customer['address'] === '' || $customer['city'] === '' || $customer['postcode'] === '') {
        json_out(['error' => 'Name, address, city, and postcode are required.'], 422);
    }
    if (!preg_match('/^[A-Z]{2}$/', $customer['country'])) {
        json_out(['error' => 'Choose a country.'], 422);
    }
    if ($paymentMethod === 'payoneer' && !payoneer_ready()) {
        json_out(['error' => 'Payoneer Checkout is not connected yet. Independence-X still needs to add the merchant code and token.'], 503);
    }
    if (!filter_var($customer['email'], FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $customer['email'])) {
        json_out(['error' => 'Enter a valid email address.'], 422);
    }
    if (!preg_match('/^[0-9+().\-\s]{6,40}$/', $customer['phone'])) {
        json_out(['error' => 'Enter a phone number.'], 422);
    }

    $incoming =(isset($data['items']) ? $data['items'] : null);
    if (!is_array($incoming) || $incoming === []) {
        json_out(['error' => 'Add at least one product.'], 422);
    }
    $merged = [];
    foreach ($incoming as $item) {
        if (!is_array($item)) {
            json_out(['error' => 'A cart line is invalid.'], 422);
        }
        $pid = (int) ((isset($item['product_id']) ? $item['product_id'] : 0));
        $qty = (int) ((isset($item['qty']) ? $item['qty'] : 0));
        if ($pid <= 0 || $qty <= 0 || $qty > 99) {
            json_out(['error' => 'Check the quantity of each product.'], 422);
        }
        $merged[$pid] = ((isset($merged[$pid]) ? $merged[$pid] : 0)) + $qty;
        if ($merged[$pid] > 99) {
            json_out(['error' => 'Quantity cannot be more than 99 of one product.'], 422);
        }
    }
    if (count($merged) > 30) {
        json_out(['error' => 'Too many different products in one order.'], 422);
    }

    $pdo = db();
    $ip = (string) ((isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0'));
    if (!preg_match('/^[0-9a-fA-F:.]{3,45}$/', $ip)) {
        $ip = '0.0.0.0';
    }
    $pdo->prepare(
        'INSERT INTO order_throttle (ip, hits, window_start) VALUES (?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           hits = IF(window_start < (NOW() - INTERVAL 1 HOUR), 1, hits + 1),
           window_start = IF(window_start < (NOW() - INTERVAL 1 HOUR), NOW(), window_start)'
    )->execute([$ip]);
    $hits = $pdo->prepare('SELECT hits FROM order_throttle WHERE ip = ?');
    $hits->execute([$ip]);
    if ((int) $hits->fetchColumn() > 8) {
        json_out(['error' => 'Too many orders from this network. Try again later.'], 429);
    }

    ensure_order_payment_columns();
    $currency = (string) ((($_idx = app_config()['currency']) !== null ? $_idx : 'MYR'));
    $pdo->beginTransaction();
    try {
        $lines = [];
        $total = 0;
        $lock = $pdo->prepare('SELECT id, name, sku, price_cents, currency, stock FROM products WHERE id = ? AND active = 1 FOR UPDATE');
        $decrement = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
        foreach ($merged as $pid => $qty) {
            $lock->execute([$pid]);
            $product = $lock->fetch();
            if (!$product) {
                throw new InvalidArgumentException('A product in the cart is no longer available.');
            }
            if ((int) $product['stock'] < $qty) {
                throw new InvalidArgumentException($product['name'] . ' has ' . (int) $product['stock'] . ' in stock.');
            }
            $decrement->execute([$qty, $pid]);
            $unit = (int) $product['price_cents'];
            $total += $unit * $qty;
            $currency = (string) $product['currency'];
            $lines[] = [
                'product_id' => (int) $product['id'],
                'product_name' => $product['name'],
                'sku' => $product['sku'],
                'qty' => $qty,
                'unit_price_cents' => $unit,
            ];
        }

        $number = order_number();
        $insert = $pdo->prepare(
            'INSERT INTO orders
              (order_number, status, customer_name, email, phone, company, address, city, postcode, country, notes, internal_notes, total_cents, currency, payment_method)
             VALUES (?, "pending", ?, ?, ?, ?, ?, ?, ?, ?, ?, "", ?, ?, ?)'
        );
        $insert->execute([
            $number,
            $customer['customer_name'],
            $customer['email'],
            $customer['phone'],
            $customer['company'],
            $customer['address'],
            $customer['city'],
            $customer['postcode'],
            $customer['country'],
            $customer['notes'],
            $total,
            $currency,
            $paymentMethod,
        ]);
        $orderId = (int) $pdo->lastInsertId();
        $itemInsert = $pdo->prepare(
            'INSERT INTO order_items (order_id, product_id, product_name, sku, qty, unit_price_cents)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        foreach ($lines as $line) {
            $itemInsert->execute([
                $orderId,
                $line['product_id'],
                $line['product_name'],
                $line['sku'],
                $line['qty'],
                $line['unit_price_cents'],
            ]);
        }
        $pdo->commit();
    } catch (InvalidArgumentException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_out(['error' => $e->getMessage()], 422);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_out(['error' => 'The order could not be saved. Try again.'], 500);
    }

    $saved = $customer;
    $saved['total_cents'] = $total;
    $saved['currency'] = $currency;
    notify_order($number, $saved, $lines);

    if ($paymentMethod === 'payoneer') {
        try {
            $redirect = payoneer_start([
                'order_number' => $number,
                'customer_name' => $customer['customer_name'],
                'email' => $customer['email'],
                'address' => $customer['address'],
                'city' => $customer['city'],
                'postcode' => $customer['postcode'],
                'country' => $customer['country'],
                'total_cents' => $total,
                'currency' => $currency,
            ]);
        } catch (Exception $e) {
            payoneer_cancel_order($number);
            json_out(['error' => 'Payoneer could not start the payment. Nothing was charged.'], 502);
        }
        json_out([
            'order_number' => $number,
            'total_cents' => $total,
            'currency' => $currency,
            'payment_method' => 'payoneer',
            'payment_note' => 'Complete payment on Payoneer\'s secure page. The order stays unpaid until Payoneer confirms it.',
            'redirect_url' => $redirect['url'],
            'redirect_method' => $redirect['method'],
            'redirect_parameters' => $redirect['parameters'],
        ]);
    }

    json_out([
        'order_number' => $number,
        'total_cents' => $total,
        'currency' => $currency,
        'payment_method' => 'invoice',
        'payment_note' => (string) ((($_idx = app_config()['payment_note']) !== null ? $_idx : '')),
    ]);
} catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 422);
} catch (Exception $e) {
    json_out(['error' => 'The store is unavailable.'], 500);
}
