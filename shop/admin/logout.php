<?php
require dirname(__DIR__) . '/lib/app.php';
admin_boot();

if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) === 'POST') {
    csrf_check();
}

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'],(isset($params['domain']) ? $params['domain'] : ''), (bool) $params['secure'], (bool) $params['httponly']);
}
session_destroy();
header('Location: login.php');
exit;
