<?php
require dirname(__DIR__) . '/lib/app.php';
require __DIR__ . '/layout.php';

admin_boot();
require_admin();
$pdo = db();

if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) === 'POST') {
    csrf_check();
    $id = (int) ((isset($_POST['id']) ? $_POST['id'] : 0));
    $stmt = $pdo->prepare('SELECT image_path FROM products WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row) {
        $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
        delete_uploaded_image($row['image_path']);
        flash('ok', 'Product removed. Past orders keep the product name and price.');
    }
    redirect_to('products.php');
}

admin_start('Products', 'products');

$q = trim((string) ((isset($_GET['q']) ? $_GET['q'] : '')));
$page = max(1, (int) ((isset($_GET['page']) ? $_GET['page'] : 1)));
$per = 25;
$where = '';
$params = [];
if ($q !== '') {
    $term = like_term($q);
    $where = 'WHERE name LIKE ? OR sku LIKE ? OR category LIKE ?';
    $params = [$term, $term, $term];
}
$count = $pdo->prepare("SELECT COUNT(*) FROM products $where");
$count->execute($params);
$total = (int) $count->fetchColumn();
$pages = max(1, (int) ceil($total / $per));
if ($page > $pages) {
    $page = $pages;
}
$offset = ($page - 1) * $per;
$list = $pdo->prepare("SELECT * FROM products $where ORDER BY updated_at DESC LIMIT $per OFFSET $offset");
$list->execute($params);
$rows = $list->fetchAll();
?>
<div class="top">
  <form class="filters" method="get">
    <input name="q" value="<?= e($q) ?>" placeholder="Search name, SKU, category">
    <button class="btn small" type="submit">Search</button>
  </form>
  <a class="btn primary" href="product.php">Add product</a>
</div>
<section class="panel scroll">
  <?php if (!$rows): ?>
    <p class="muted">No products yet. Add one and it will show on the public store while it is marked live.</p>
  <?php else: ?>
    <table>
      <thead>
        <tr><th></th><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        <?php foreach ($rows as $product): ?>
          <tr>
            <td>
              <?php if ($url = product_image_url($product['image_path'])): ?>
                <img class="thumb" src="<?= e($url) ?>" alt="">
              <?php else: ?>
                <div class="placeholder">No photo</div>
              <?php endif; ?>
            </td>
            <td>
              <a href="product.php?id=<?= (int) $product['id'] ?>"><?= e($product['name']) ?></a>
              <?php if ($product['category'] !== ''): ?><div class="muted"><?= e($product['category']) ?></div><?php endif; ?>
            </td>
            <td><?= e($product['sku']) ?></td>
            <td><?= e(money((int) $product['price_cents'], $product['currency'])) ?></td>
            <td><?= (int) $product['stock'] ?></td>
            <td><?= (int) $product['active'] === 1 ? '<span class="badge paid">Live</span>' : '<span class="badge off">Hidden</span>' ?></td>
            <td>
              <div class="actions">
                <a class="btn small" href="product.php?id=<?= (int) $product['id'] ?>">Edit</a>
                <form method="post" onsubmit="return confirm('Remove this product?');">
                  <?= csrf_field() ?>
                  <input type="hidden" name="id" value="<?= (int) $product['id'] ?>">
                  <button class="btn small danger" type="submit">Remove</button>
                </form>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
    <?php if ($pages > 1): ?>
      <p class="pager">
        <?php if ($page > 1): ?><a href="?<?= e(http_build_query(['q' => $q, 'page' => $page - 1])) ?>">Previous</a><?php endif; ?>
        <span class="muted">Page <?= $page ?> of <?= $pages ?></span>
        <?php if ($page < $pages): ?><a href="?<?= e(http_build_query(['q' => $q, 'page' => $page + 1])) ?>">Next</a><?php endif; ?>
      </p>
    <?php endif; ?>
  <?php endif; ?>
</section>
<?php admin_end(); ?>
