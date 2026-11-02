<?php
require dirname(__DIR__) . '/lib/app.php';
require __DIR__ . '/layout.php';

admin_start('Orders', 'orders');
$pdo = db();
$q = trim((string) ((isset($_GET['q']) ? $_GET['q'] : '')));
$status = (string) ((isset($_GET['status']) ? $_GET['status'] : 'all'));
$allowed = ['all', 'pending', 'paid', 'fulfilled', 'cancelled'];
if (!in_array($status, $allowed, true)) {
    $status = 'all';
}
$page = max(1, (int) ((isset($_GET['page']) ? $_GET['page'] : 1)));
$per = 25;
$clauses = [];
$params = [];
if ($status !== 'all') {
    $clauses[] = 'status = ?';
    $params[] = $status;
}
if ($q !== '') {
    $term = like_term($q);
    $clauses[] = '(order_number LIKE ? OR customer_name LIKE ? OR email LIKE ? OR company LIKE ?)';
    array_push($params, $term, $term, $term, $term);
}
$where = $clauses ? 'WHERE ' . implode(' AND ', $clauses) : '';
$count = $pdo->prepare("SELECT COUNT(*) FROM orders $where");
$count->execute($params);
$total = (int) $count->fetchColumn();
$pages = max(1, (int) ceil($total / $per));
if ($page > $pages) {
    $page = $pages;
}
$offset = ($page - 1) * $per;
$list = $pdo->prepare("SELECT * FROM orders $where ORDER BY created_at DESC LIMIT $per OFFSET $offset");
$list->execute($params);
$rows = $list->fetchAll();
$filters = ['q' => $q, 'status' => $status];
?>
<form class="filters" method="get">
  <input name="q" value="<?= e($q) ?>" placeholder="Search order, name, email, company">
  <select name="status" style="max-width: 220px;">
    <?php foreach ($allowed as $option): ?>
      <option value="<?= e($option) ?>" <?= $option === $status ? 'selected' : '' ?>><?= e($option === 'all' ? 'All statuses' : status_label($option)) ?></option>
    <?php endforeach; ?>
  </select>
  <button class="btn small" type="submit">Filter</button>
</form>
<section class="panel scroll">
  <?php if (!$rows): ?>
    <p class="muted">No orders match this view.</p>
  <?php else: ?>
    <table>
      <thead>
        <tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Placed</th></tr>
      </thead>
      <tbody>
        <?php foreach ($rows as $order): ?>
          <tr>
            <td><a href="order.php?number=<?= e(rawurlencode($order['order_number'])) ?>"><?= e($order['order_number']) ?></a></td>
            <td><?= e($order['customer_name']) ?><div class="muted"><?= e($order['email']) ?></div></td>
            <td><span class="badge <?= e($order['status']) ?>"><?= e(status_label($order['status'])) ?></span></td>
            <td><?= e(money((int) $order['total_cents'], $order['currency'])) ?></td>
            <td><?= e(format_when($order['created_at'])) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <?php if ($pages > 1): ?>
      <p class="pager">
        <?php if ($page > 1): ?><a href="?<?= e(http_build_query($filters + ['page' => $page - 1])) ?>">Previous</a><?php endif; ?>
        <span class="muted">Page <?= $page ?> of <?= $pages ?></span>
        <?php if ($page < $pages): ?><a href="?<?= e(http_build_query($filters + ['page' => $page + 1])) ?>">Next</a><?php endif; ?>
      </p>
    <?php endif; ?>
  <?php endif; ?>
</section>
<?php admin_end(); ?>
