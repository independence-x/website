<?php
require dirname(__DIR__) . '/lib/app.php';
require __DIR__ . '/layout.php';
admin_boot();

$error = '';
$installed = isset($_GET['installed']);
$ready = true;
try {
    if (current_admin()) {
        redirect_to('index.php');
    }
} catch (Exception $e) {
    $ready = false;
    $error = 'The store database is not ready. Finish config.php, then open install.php once.';
}

if ($ready && ((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) === 'POST') {
    $fails =(isset($_SESSION['login_fails']) ? $_SESSION['login_fails'] : ['count' => 0, 'at' => 0]);
    if (!is_array($fails)) {
        $fails = ['count' => 0, 'at' => 0];
    }
    if ((int) $fails['count'] >= 5 && time() - (int) $fails['at'] < 600) {
        $error = 'Too many attempts. Wait a few minutes and try again.';
    } else {
        $email = trim((string) ((isset($_POST['email']) ? $_POST['email'] : '')));
        $password = (string) ((isset($_POST['password']) ? $_POST['password'] : ''));
        try {
            $stmt = db()->prepare('SELECT id, password_hash FROM admins WHERE email = ?');
            $stmt->execute([$email]);
            $admin = $stmt->fetch();
        } catch (Exception $e) {
            $error = 'The store database is not ready. Finish config.php, then open install.php once.';
            $admin = false;
        }
        if ($error === '' && $admin && password_verify($password, (string) $admin['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int) $admin['id'];
            unset($_SESSION['login_fails']);
            redirect_to('index.php');
        }
        if ($error === '') {
            $_SESSION['login_fails'] = ['count' => (int) $fails['count'] + 1, 'at' => time()];
            $error = 'Email or password is not correct.';
        }
    }
}

admin_head('Sign in');
?>
<body class="login-body">
  <main class="login-card">
    <p class="kicker">Store admin</p>
    <h1>Sign in</h1>
    <?php if ($installed): ?><p class="flash ok">The store database is ready. Sign in with the admin you just created, then delete install.php from the server.</p><?php endif; ?>
    <?php if ($error !== ''): ?><p class="flash err"><?= e($error) ?></p><?php endif; ?>
    <form method="post">
      <label>Email<input type="email" name="email" required autocomplete="username" value="<?= e(isset($_POST['email']) ? $_POST['email'] : '') ?>"></label>
      <label>Password<input type="password" name="password" required autocomplete="current-password"></label>
      <button class="btn primary" type="submit">Sign in</button>
    </form>
  </main>
</body>
</html>
