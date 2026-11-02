<?php
require dirname(__DIR__) . '/lib/app.php';
require __DIR__ . '/layout.php';

$admin = admin_start('Dashboard', 'dashboard');
$pdo = db();
$productCount = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
$liveCount = (int) $pdo->query('SELECT COUNT(*) FROM products WHERE active = 1')->fetchColumn();
$lowStock = (int) $pdo->query('SELECT COUNT(*) FROM products WHERE active = 1 AND stock <= 5')->fetchColumn();
$pending = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn();
$revenue = (int) $pdo->query("SELECT COALESCE(SUM(total_cents), 0) FROM orders WHERE status IN ('paid', 'fulfilled')")->fetchColumn();
$currency = (string) ((($_idx = app_config()['currency']) !== null ? $_idx : 'MYR'));
$recent = $pdo->query('SELECT order_number, customer_name, status, total_cents, currency, created_at FROM orders ORDER BY created_at DESC LIMIT 8')->fetchAll();
?>
<section class="cards">
  <article class="card"><span class="muted">Live products</span><b><?= $liveCount ?></b><span class="muted"><?= $productCount ?> total</span></article>
  <article class="card"><span class="muted">Low stock</span><b><?= $lowStock ?></b><span class="muted">5 or fewer, still listed</span></article>
  <article class="card"><span class="muted">Awaiting payment</span><b><?= $pending ?></b></article>
  <article class="card"><span class="muted">Paid and fulfilled</span><b><?= e(money($revenue, $currency)) ?></b></article>
</section>
<section class="panel">
  <div class="top"><h2>Recent orders</h2><a class="btn small" href="orders.php">All orders</a></div>
  <?php if (!$recent): ?>
    <p class="muted">No orders yet. They appear here when someone checks out on the store page.</p>
  <?php else: ?>
    <div class="scroll">
      <table>
        <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead>
        <tbody>
          <?php foreach ($recent as $order): ?>
            <tr>
              <td><a href="order.php?number=<?= e(urlencode($order['order_number'])) ?>"><?= e($order['order_number']) ?></a></td>
              <td><?= e($order['customer_name']) ?></td>
              <td><span class="badge <?= e($order['status']) ?>"><?= e(status_label($order['status'])) ?></span></td>
              <td><?= e(money((int) $order['total_cents'], $order['currency'])) ?></td>
              <td><?= e(format_when($order['created_at'])) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>
</section>
<?php
unset($admin);
admin_end();
