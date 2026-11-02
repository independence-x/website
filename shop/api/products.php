<?php
require dirname(__DIR__) . '/lib/app.php';
require dirname(__DIR__) . '/lib/payoneer.php';

try {
    api_boot();
    if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) !== 'GET') {
        json_out(['error' => 'Use GET.'], 405);
    }
    $config = app_config();
    $stmt = db()->query(
        'SELECT id, name, slug, sku, description, category, price_cents, currency, stock, image_path
         FROM products WHERE active = 1 ORDER BY name'
    );
    $products = [];
    foreach ($stmt as $row) {
        $products[] = [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'slug' => $row['slug'],
            'sku' => $row['sku'],
            'description' => $row['description'],
            'category' => $row['category'],
            'price_cents' => (int) $row['price_cents'],
            'currency' => $row['currency'],
            'stock' => (int) $row['stock'],
            'image_url' => product_image_url($row['image_path']),
        ];
    }
    json_out([
        'currency' => (string) ((isset($config['currency']) ? $config['currency'] : 'MYR')),
        'payment_note' => (string) ((isset($config['payment_note']) ? $config['payment_note'] : '')),
        'payoneer_ready' => payoneer_ready(),
        'products' => $products,
    ]);
} catch (Exception $e) {
    json_out(['error' => 'The store is unavailable.'], 500);
}
