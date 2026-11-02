<?php
require __DIR__ . '/lib/app.php';
boot();

$lock = __DIR__ . '/installed.lock';
if (is_file($lock)) {
    http_response_code(403);
    exit('The store is already installed. Delete install.php from the server.');
}

$error = '';
if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) === 'POST') {
    try {
        $config = app_config();
        $pass = (string) ((isset($config['db']['pass']) ? $config['db']['pass'] : ''));
        if ($pass === '' || $pass === 'replace-with-the-directadmin-password') {
            throw new RuntimeException('Set the MySQL password in config.php before installing.');
        }
        $name = clean_line((string) ((isset($_POST['name']) ? $_POST['name'] : '')), 120);
        $email = clean_line((string) ((isset($_POST['email']) ? $_POST['email'] : '')), 190);
        $password = (string) ((isset($_POST['password']) ? $_POST['password'] : ''));
        $confirm = (string) ((isset($_POST['confirm']) ? $_POST['confirm'] : ''));
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Enter the admin name and a valid email.');
        }
        if (strlen($password) < 10) {
            throw new InvalidArgumentException('Use a password of at least 10 characters.');
        }
        if (!hash_equals($password, $confirm)) {
            throw new InvalidArgumentException('The passwords do not match.');
        }

        $sql = file_get_contents(__DIR__ . '/schema.sql');
        if ($sql === false) {
            throw new RuntimeException('schema.sql is missing.');
        }
        $sql =(($_idx = preg_replace('/--.*$/m', '', $sql)) !== null ? $_idx : $sql);
        $pdo = db();
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
            $pdo->exec($statement);
        }
        $pdo->prepare('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)')
            ->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        file_put_contents($lock, gmdate('c') . "\n");
        header('Location: admin/login.php?installed=1');
        exit;
    } catch (Exception $e) {
        if ($e instanceof PDOException) {
            $message = $e->getMessage();
            if (idx_contains($message, 'Duplicate')) {
                $error = 'An admin with that email already exists. Sign in at admin/login.php, or choose a different email.';
            } elseif (idx_contains($message, 'Access denied') || idx_contains($message, 'Unknown database')) {
                $error = 'MySQL refused the connection. Check the database name, user, and password in config.php.';
            } else {
                $error = 'The database could not be prepared. In phpMyAdmin, confirm the user has All Privileges on this database.';
            }
        } else {
            $error = $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Install store — Independence-X</title>
  <link rel="stylesheet" href="admin/admin.css">
</head>
<body class="login-body">
  <main class="login-card">
    <p class="kicker">Independence-X</p>
    <h1>Install the store</h1>
    <p class="lede">This creates the tables in your DirectAdmin MySQL database and the first admin sign-in. Delete this file after it finishes.</p>
    <?php if ($error !== ''): ?><p class="flash err"><?= e($error) ?></p><?php endif; ?>
    <form method="post">
      <label>Your name<input name="name" required value="<?= e(isset($_POST['name']) ? $_POST['name'] : '') ?>"></label>
      <label>Email<input type="email" name="email" required autocomplete="username" value="<?= e(isset($_POST['email']) ? $_POST['email'] : '') ?>"></label>
      <label>Password<input type="password" name="password" required minlength="10" autocomplete="new-password"></label>
      <label>Confirm password<input type="password" name="confirm" required minlength="10" autocomplete="new-password"></label>
      <button class="btn primary" type="submit">Create admin and tables</button>
    </form>
  </main>
</body>
</html>
