<?php
require dirname(__DIR__) . '/lib/app.php';
require __DIR__ . '/layout.php';

admin_boot();
require_admin();
$pdo = db();
$number = trim((string) ((isset($_GET['number']) ? $_GET['number'] : (isset($_POST['number']) ? $_POST['number'] : ''))));
$stmt = $pdo->prepare('SELECT * FROM orders WHERE order_number = ?');
$stmt->execute([$number]);
$order = $stmt->fetch();
if (!$order) {
    http_response_code(404);
    exit('Order not found.');
}

if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) === 'POST') {
    csrf_check();
    $statuses = ['pending', 'paid', 'fulfilled', 'cancelled'];
    $next = (string) ((isset($_POST['status']) ? $_POST['status'] : ''));
    try {
        $notes = clean_block((string) ((isset($_POST['internal_notes']) ? $_POST['internal_notes'] : '')), 4000);
    } catch (InvalidArgumentException $e) {
        flash('err', $e->getMessage());
        redirect_to('order.php?number=' . rawurlencode($number));
    }
    if (!in_array($next, $statuses, true)) {
        flash('err', 'Choose a valid status.');
        redirect_to('order.php?number=' . rawurlencode($number));
    }
    $old = (string) $order['status'];
    try {
        $pdo->beginTransaction();
        $items = $pdo->prepare('SELECT product_id, qty, product_name FROM order_items WHERE order_id = ?');
        $items->execute([(int) $order['id']]);
        $lines = $items->fetchAll();
        if ($old !== 'cancelled' && $next === 'cancelled') {
            $restock = $pdo->prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
            foreach ($lines as $line) {
                if ($line['product_id']) {
                    $restock->execute([(int) $line['qty'], (int) $line['product_id']]);
                }
            }
        }
        if ($old === 'cancelled' && $next !== 'cancelled') {
            $lock = $pdo->prepare('SELECT name, stock FROM products WHERE id = ? FOR UPDATE');
            $take = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
            foreach ($lines as $line) {
                if (!$line['product_id']) {
                    continue;
                }
                $lock->execute([(int) $line['product_id']]);
                $product = $lock->fetch();
                if (!$product || (int) $product['stock'] < (int) $line['qty']) {
                    $label =(isset($product['name']) ? $product['name'] : $line['product_name']);
                    throw new InvalidArgumentException('Not enough stock to reopen ' . $label . '.');
                }
                $take->execute([(int) $line['qty'], (int) $line['product_id']]);
            }
        }
        $pdo->prepare('UPDATE orders SET status = ?, internal_notes = ? WHERE id = ?')
            ->execute([$next, $notes, (int) $order['id']]);
        $pdo->commit();
        flash('ok', 'Order updated.');
    } catch (InvalidArgumentException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        flash('err', $e->getMessage());
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        flash('err', 'The order could not be updated.');
    }
    redirect_to('order.php?number=' . rawurlencode($number));
}

$items = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ?');
$items->execute([(int) $order['id']]);
$lines = $items->fetchAll();
$statuses = ['pending', 'paid', 'fulfilled', 'cancelled'];

admin_start($order['order_number'], 'orders');
?>
<div class="grid-2">
  <section class="panel">
    <h2>Customer</h2>
    <p><?= e($order['customer_name']) ?><br>
      <a href="mailto:<?= e($order['email']) ?>"><?= e($order['email']) ?></a><br>
      <?= e($order['phone']) ?></p>
    <?php if ($order['company'] !== ''): ?><p><?= e($order['company']) ?></p><?php endif; ?>
    <p><?= nl2br(e($order['address'])) ?></p>
    <?php if ($order['notes'] !== ''): ?><p class="muted">Customer note<br><?= nl2br(e($order['notes'])) ?></p><?php endif; ?>
    <p class="muted">Placed <?= e(format_when($order['created_at'])) ?></p>
  </section>
  <section class="panel">
    <h2>Status</h2>
    <form method="post">
      <?= csrf_field() ?>
      <input type="hidden" name="number" value="<?= e($order['order_number']) ?>">
      <label>Order status
        <select name="status">
          <?php foreach ($statuses as $status): ?>
            <option value="<?= e($status) ?>" <?= $order['status'] === $status ? 'selected' : '' ?>><?= e(status_label($status)) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Internal note<textarea name="internal_notes"><?= e($order['internal_notes']) ?></textarea></label>
      <p class="muted">Cancelling returns the items to stock. Moving a cancelled order back to another status takes the stock again.</p>
      <button class="btn primary" type="submit">Save order</button>
    </form>
  </section>
</div>
<section class="panel scroll" style="margin-top:16px">
  <table>
    <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Price</th><th>Line</th></tr></thead>
    <tbody>
      <?php foreach ($lines as $line): ?>
        <tr>
          <td><?= e($line['product_name']) ?></td>
          <td><?= e($line['sku']) ?></td>
          <td><?= (int) $line['qty'] ?></td>
          <td><?= e(money((int) $line['unit_price_cents'], $order['currency'])) ?></td>
          <td><?= e(money((int) $line['unit_price_cents'] * (int) $line['qty'], $order['currency'])) ?></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  <p><strong>Total <?= e(money((int) $order['total_cents'], $order['currency'])) ?></strong></p>
</section>
<?php admin_end(); ?>
