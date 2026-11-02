<?php
/**
 * Copy this file to config.php on the server and fill in the MySQL user
 * created in DirectAdmin. Do not commit config.php.
 *
 * DirectAdmin → Account Manager → MySQL Management:
 * 1. Create a database. The name will look like accountname_idxa.
 * 2. Create a user, set a password, and grant that user All Privileges on the database.
 * 3. The host is localhost. Do not enable remote MySQL.
 */
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'accountname_idxa',
        'user' => 'accountname_idxa',
        'pass' => 'replace-with-the-directadmin-password',
        'charset' => 'utf8mb4',
    ],

    // Exact site origins allowed to call this API. No trailing slash, no path.
    'cors_origins' => [
        'http://localhost:3000',
        'https://independence-x.github.io',
        'https://independence-x.com',
        'https://www.independence-x.com',
    ],

    'currency' => 'MYR',
    'payment_note' => 'This order is a request. Independence-X will email payment instructions. Nothing is charged automatically.',
    'notify_email' => 'izmir.yamin@independence-x.com',

    // Payoneer Checkout. Leave the code and token empty until Payoneer issues them.
    // environment is "sandbox" or "live". notification_url must be the public HTTPS
    // address of /shop/api/payoneer-notify.php. Do not commit config.php.
    'payoneer' => [
        'merchant_code' => '',
        'token' => '',
        'environment' => 'sandbox',
        'division' => '',
        'notification_url' => '',
    ],

    // Public store URL, shown as a link in the admin sidebar.
    'storefront_url' => 'https://independence-x.com/store/',

    // Leave blank unless product images use the wrong host.
    'public_base' => '',
];
