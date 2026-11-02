<?php
function idx_contains($haystack, $needle)
{
    return strpos((string) $haystack, (string) $needle) !== false;
}

function idx_starts($haystack, $needle)
{
    $needle = (string) $needle;
    return $needle === '' || strpos((string) $haystack, $needle) === 0;
}

function idx_bytes($length)
{
    if (function_exists('random_bytes')) {
        return random_bytes($length);
    }
    $bytes = openssl_random_pseudo_bytes($length);
    if ($bytes === false) {
        throw new RuntimeException('Could not generate a random value.');
    }
    return $bytes;
}

function boot()
{
    date_default_timezone_set('Asia/Kuala_Lumpur');
}

function app_config()
{
    static $config;
    if ($config !== null) {
        return $config;
    }
    $path = dirname(__DIR__) . '/config.php';
    if (!is_file($path)) {
        throw new RuntimeException('Missing config.php. Copy config.example.php to config.php and add the DirectAdmin MySQL details.');
    }
    $loaded = require $path;
    if (!is_array($loaded)) {
        throw new RuntimeException('config.php must return an array.');
    }
    $config = $loaded;
    return $config;
}

function db()
{
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $c =(($_idx = app_config()['db']) !== null ? $_idx : null);
    if (!is_array($c) || empty($c['name']) || empty($c['user'])) {
        throw new RuntimeException('Database settings are incomplete.');
    }
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',(isset($c['host']) ? $c['host'] : 'localhost'),
        $c['name'],(isset($c['charset']) ? $c['charset'] : 'utf8mb4'));
    $pdo = new PDO($dsn, (string) $c['user'], (string) ((isset($c['pass']) ? $c['pass'] : '')), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '+08:00'",
    ]);
    return $pdo;
}

function start_session()
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (((isset($_SERVER['HTTP_X_FORWARDED_PROTO']) ? $_SERVER['HTTP_X_FORWARDED_PROTO'] : '')) === 'https');
    session_name('idxa_store');
    session_set_cookie_params(0, '/', '', $secure, true);
    session_start();
}

function admin_boot()
{
    boot();
    start_session();
    header('X-Robots-Tag: noindex, nofollow');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    header('Cache-Control: no-store');
}

function api_boot()
{
    boot();
    header('Cache-Control: no-store');
    send_cors();
}

function e($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function text_length($value)
{
    return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
}

function money($cents, $currency = 'MYR')
{
    $amount = number_format($cents / 100, 2);
    return $currency === 'MYR' ? 'RM ' . $amount : $currency . ' ' . $amount;
}

function price_to_cents($input)
{
    $input = str_replace([',', ' '], '', trim($input));
    if (!preg_match('/^\d+(\.\d{1,2})?$/', $input)) {
        throw new InvalidArgumentException('Enter a price like 1500.00');
    }
    list($whole, $frac) = array_pad(explode('.', $input, 2), 2, '0');
    $frac = str_pad(substr($frac, 0, 2), 2, '0');
    return ((int) $whole) * 100 + (int) $frac;
}

function cents_to_input($cents)
{
    return number_format($cents / 100, 2, '.', '');
}

function slugify($text)
{
    $text = strtolower(trim($text));
    $text =(($_idx = preg_replace('/[^a-z0-9]+/', '-', $text)) !== null ? $_idx : '');
    $text = trim($text, '-');
    return $text !== '' ? $text : 'item';
}

function unique_slug(PDO $pdo, $base, $ignoreId = null)
{
    $slug = slugify($base);
    $candidate = $slug;
    $n = 2;
    while (true) {
        $stmt = $pdo->prepare('SELECT id FROM products WHERE slug = ? AND (? IS NULL OR id <> ?)');
        $stmt->execute([$candidate, $ignoreId, $ignoreId]);
        if (!$stmt->fetch()) {
            return $candidate;
        }
        $candidate = $slug . '-' . $n;
        $n++;
    }
}

function status_label($status)
{
    if ($status === 'pending') {
        return 'Awaiting payment';
    }
    if ($status === 'paid') {
        return 'Paid';
    }
    if ($status === 'fulfilled') {
        return 'Fulfilled';
    }
    if ($status === 'cancelled') {
        return 'Cancelled';
    }
    return $status;
}

function flash($type, $message)
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function take_flash()
{
    $flash =(isset($_SESSION['flash']) ? $_SESSION['flash'] : null);
    unset($_SESSION['flash']);
    return is_array($flash) ? $flash : null;
}

function csrf_token()
{
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(idx_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field()
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check()
{
    $sent =(isset($_POST['csrf']) ? $_POST['csrf'] : '');
    $known =(isset($_SESSION['csrf']) ? $_SESSION['csrf'] : '');
    if (!is_string($sent) || !is_string($known) || $known === '' || !hash_equals($known, $sent)) {
        http_response_code(400);
        exit('This form expired. Go back and try again.');
    }
}

function current_admin()
{
    $id =(isset($_SESSION['admin_id']) ? $_SESSION['admin_id'] : null);
    if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
        return null;
    }
    $stmt = db()->prepare('SELECT id, name, email FROM admins WHERE id = ?');
    $stmt->execute([(int) $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function require_admin()
{
    $admin = current_admin();
    if (!$admin) {
        header('Location: login.php');
        exit;
    }
    return $admin;
}

function shop_root_url()
{
    $configured = trim((string) ((($_idx = app_config()['public_base']) !== null ? $_idx : '')));
    if ($configured !== '') {
        return rtrim($configured, '/');
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (((isset($_SERVER['HTTP_X_FORWARDED_PROTO']) ? $_SERVER['HTTP_X_FORWARDED_PROTO'] : '')) === 'https');
    $host =(isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost');
    $script = str_replace('\\', '/', (string) ((isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '')));
    $dir =(($_idx = preg_replace('#/(api|admin)(/.*)?$#', '', $script)) !== null ? $_idx : $script);
    return ($https ? 'https' : 'http') . '://' . $host . rtrim($dir, '/');
}

function product_image_url($path)
{
    if ($path === null || $path === '') {
        return null;
    }
    if (preg_match('#^https?://#i', $path)) {
        return $path;
    }
    return shop_root_url() . '/' . ltrim($path, '/');
}

function save_product_image(array $file)
{
    $error =(isset($file['error']) ? $file['error'] : UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($error !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Image upload failed.');
    }
    if (((isset($file['size']) ? $file['size'] : 0)) > 2000000) {
        throw new RuntimeException('Image must be 2 MB or smaller.');
    }
    $tmp = (string) ((isset($file['tmp_name']) ? $file['tmp_name'] : ''));
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp);
    if ($mime === 'image/jpeg') {
        $ext = 'jpg';
    } elseif ($mime === 'image/png') {
        $ext = 'png';
    } elseif ($mime === 'image/webp') {
        $ext = 'webp';
    } else {
        throw new RuntimeException('Use a JPG, PNG, or WebP image.');
    }
    $name = bin2hex(idx_bytes(16)) . '.' . $ext;
    $dir = dirname(__DIR__) . '/uploads';
    if (!is_dir($dir) && !@mkdir($dir, 0777, true)) {
        throw new RuntimeException('Could not create the uploads folder.');
    }
    if (!is_writable($dir)) {
        @chmod($dir, 0777);
    }
    if (!is_writable($dir) || !move_uploaded_file($tmp, $dir . '/' . $name)) {
        throw new RuntimeException('Could not save the image. In DirectAdmin File Manager, set the shop/uploads folder permission to 777.');
    }
    return 'uploads/' . $name;
}

function delete_uploaded_image($path)
{
    if ($path === null || $path === '' || idx_contains($path, '..') || !idx_starts($path, 'uploads/')) {
        return;
    }
    $full = dirname(__DIR__) . '/' . $path;
    if (is_file($full)) {
        unlink($full);
    }
}

function send_cors()
{
    $origin =(isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '');
    $allowed =(($_idx = app_config()['cors_origins']) !== null ? $_idx : []);
    if (is_string($origin) && $origin !== '' && is_array($allowed) && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
    if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function json_out(array $data, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function clean_line($value, $max)
{
    $value = trim((($_idx = preg_replace('/\s+/u', ' ', $value)) !== null ? $_idx : ''));
    if (text_length($value) > $max) {
        throw new InvalidArgumentException('One of the fields is too long.');
    }
    return $value;
}

function clean_block($value, $max)
{
    $value = str_replace("\r\n", "\n", trim($value));
    $value =(($_idx = preg_replace("/[ \t]+/u", ' ', $value)) !== null ? $_idx : $value);
    if (text_length($value) > $max) {
        throw new InvalidArgumentException('One of the fields is too long.');
    }
    return $value;
}

function order_number()
{
    return 'IDX-' . gmdate('Ymd') . '-' . strtoupper(bin2hex(idx_bytes(2)));
}

function format_when($mysql)
{
    $stamp = strtotime($mysql);
    if ($stamp === false) {
        return $mysql;
    }
    return date('j M Y, H:i', $stamp);
}

function notify_order($orderNumber, array $order, array $lines)
{
    $to = trim((string) ((($_idx = app_config()['notify_email']) !== null ? $_idx : '')));
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return;
    }
    $body = [
        'New store order ' . $orderNumber,
        '',
        'Customer: ' . $order['customer_name'],
        'Email: ' . $order['email'],
        'Phone: ' . $order['phone'],
        'Company: ' . $order['company'],
        'Address: ' . $order['address'],
        'Notes: ' . $order['notes'],
        '',
        'Items:',
    ];
    foreach ($lines as $line) {
        $body[] = $line['qty'] . ' × ' . $line['product_name'] . ' (' . $line['sku'] . ') @ ' . money((int) $line['unit_price_cents'], $order['currency']);
    }
    $body[] = '';
    $body[] = 'Total: ' . money((int) $order['total_cents'], $order['currency']);
    $subject = str_replace(["\r", "\n"], '', 'New store order ' . $orderNumber);
    $reply = filter_var($order['email'], FILTER_VALIDATE_EMAIL) ? $order['email'] : $to;
    $headers = "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nReply-To: {$reply}\r\n";
    @mail($to, $subject, implode("\n", $body), $headers);
}

function like_term($value)
{
    $value = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    return '%' . $value . '%';
}

function redirect_to($path)
{
    header('Location: ' . $path);
    exit;
}
