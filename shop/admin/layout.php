<?php
function admin_head($title)
{
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<meta name="robots" content="noindex, nofollow">';
    echo '<title>' . e($title) . ' — Store admin</title>';
    echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
    echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Outfit:wght@400;500;600&display=swap">';
    echo '<link rel="stylesheet" href="admin.css"></head>';
}

function admin_start($title, $active)
{
    admin_boot();
    $admin = require_admin();
    $store = trim((string) ((($_idx = app_config()['storefront_url']) !== null ? $_idx : '')));
    $items = [
        'dashboard' => ['Dashboard', 'index.php'],
        'products' => ['Products', 'products.php'],
        'orders' => ['Orders', 'orders.php'],
        'customers' => ['Customers', 'customers.php'],
    ];
    admin_head($title);
    echo '<body><div class="shell"><aside class="side">';
    echo '<a class="brand" href="index.php"><strong>Store admin</strong><span>Independence-X</span></a>';
    echo '<nav class="nav">';
    foreach ($items as $key => $item) {
        $label = $item[0];
        $href = $item[1];
        $class = $key === $active ? ' class="active"' : '';
        echo '<a' . $class . ' href="' . e($href) . '">' . e($label) . '</a>';
    }
    if ($store !== '') {
        echo '<a href="' . e($store) . '" target="_blank" rel="noreferrer">View store</a>';
    }
    echo '<form method="post" action="logout.php">' . csrf_field();
    echo '<button type="submit">Sign out</button></form>';
    echo '</nav>';
    echo '<p class="who">' . e($admin['name']) . '<br>' . e($admin['email']) . '</p>';
    echo '</aside><div class="main">';
    echo '<div class="top"><h1>' . e($title) . '</h1></div>';
    $flash = take_flash();
    if ($flash) {
        $class = ((isset($flash['type']) ? $flash['type'] : '')) === 'err' ? 'flash err' : 'flash ok';
        echo '<p class="' . $class . '">' . e((string) ((isset($flash['message']) ? $flash['message'] : ''))) . '</p>';
    }
    return $admin;
}

function admin_end()
{
    echo '</div></div></body></html>';
}
