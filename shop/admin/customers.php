<?php
require dirname(__DIR__) . '/lib/app.php';
require __DIR__ . '/layout.php';

admin_start('Customers', 'customers');
$rows = db()->query(
    'SELECT email,
            MAX(customer_name) AS customer_name,
            MAX(company) AS company,
            MAX(phone) AS phone,
            COUNT(*) AS orders,
            SUM(CASE WHEN status IN ("paid", "fulfilled") THEN total_cents ELSE 0 END) AS paid_cents,
            MAX(currency) AS currency,
            MAX(created_at) AS last_order
     FROM orders
     GROUP BY email
     ORDER BY last_order DESC'
)->fetchAll();
?>
<section class="panel scroll">
  <?php if (!$rows): ?>
    <p class="muted">Customers are created from orders. There are none yet.</p>
  <?php else: ?>
    <table>
      <thead><tr><th>Customer</th><th>Company</th><th>Orders</th><th>Paid</th><th>Last order</th></tr></thead>
      <tbody>
        <?php foreach ($rows as $row): ?>
          <tr>
            <td><?= e($row['customer_name']) ?><div class="muted"><?= e($row['email']) ?> · <?= e($row['phone']) ?></div></td>
            <td><?= e($row['company']) ?></td>
            <td><a href="orders.php?q=<?= e(rawurlencode($row['email'])) ?>"><?= (int) $row['orders'] ?></a></td>
            <td><?= e(money((int) $row['paid_cents'], (string) $row['currency'])) ?></td>
            <td><?= e(format_when($row['last_order'])) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
</section>
<?php admin_end(); ?>
