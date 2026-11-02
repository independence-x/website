<?php
require dirname(__DIR__) . '/lib/app.php';
require __DIR__ . '/layout.php';

admin_boot();
require_admin();
$pdo = db();
$id = (int) ((isset($_GET['id']) ? $_GET['id'] : (isset($_POST['id']) ? $_POST['id'] : 0)));
$existing = null;
if ($id > 0) {
    $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch() ?: null;
    if (!$existing) {
        http_response_code(404);
        exit('Product not found.');
    }
}

$error = '';
$values = [
    'name' =>(isset($existing['name']) ? $existing['name'] : ''),
    'sku' =>(isset($existing['sku']) ? $existing['sku'] : ''),
    'category' =>(isset($existing['category']) ? $existing['category'] : ''),
    'price' => isset($existing) ? cents_to_input((int) $existing['price_cents']) : '',
    'stock' => (string) ((isset($existing['stock']) ? $existing['stock'] : '0')),
    'description' =>(isset($existing['description']) ? $existing['description'] : ''),
    'image_url' => (isset($existing['image_path']) && idx_starts((string) $existing['image_path'], 'http')) ? $existing['image_path'] : '',
    'active' => isset($existing) ? (string) $existing['active'] : '1',
];

if (((isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '')) === 'POST') {
    csrf_check();
    $values['name'] = trim((string) ((isset($_POST['name']) ? $_POST['name'] : '')));
    $values['sku'] = trim((string) ((isset($_POST['sku']) ? $_POST['sku'] : '')));
    $values['category'] = trim((string) ((isset($_POST['category']) ? $_POST['category'] : '')));
    $values['price'] = trim((string) ((isset($_POST['price']) ? $_POST['price'] : '')));
    $values['stock'] = trim((string) ((isset($_POST['stock']) ? $_POST['stock'] : '0')));
    $values['description'] = (string) ((isset($_POST['description']) ? $_POST['description'] : ''));
    $values['image_url'] = trim((string) ((isset($_POST['image_url']) ? $_POST['image_url'] : '')));
    $values['active'] = isset($_POST['active']) ? '1' : '0';
    $uploaded = null;
    try {
        $name = clean_line($values['name'], 190);
        $sku = clean_line($values['sku'], 64);
        $category = clean_line($values['category'], 80);
        $description = clean_block($values['description'], 8000);
        if ($name === '' || $sku === '') {
            throw new InvalidArgumentException('Name and SKU are required.');
        }
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/', $sku)) {
            throw new InvalidArgumentException('SKU can use letters, numbers, dots, hyphens, and underscores.');
        }
        if (!preg_match('/^\d+$/', $values['stock'])) {
            throw new InvalidArgumentException('Stock must be a whole number.');
        }
        $stock = (int) $values['stock'];
        $cents = price_to_cents($values['price']);
        $currency = (string) ((($_idx = app_config()['currency']) !== null ? $_idx : 'MYR'));
        $image =(isset($existing['image_path']) ? $existing['image_path'] : null);
        $uploaded = save_product_image((isset($_FILES['image']) ? $_FILES['image'] : []));
        if ($uploaded !== null) {
            $image = $uploaded;
        } elseif ($values['image_url'] !== '') {
            if (!preg_match('#^https://#i', $values['image_url'])) {
                throw new InvalidArgumentException('An image link must start with https://');
            }
            $image = $values['image_url'];
        } elseif (isset($_POST['remove_image'])) {
            $image = null;
        }
        $slug = unique_slug($pdo, $name, $existing ? (int) $existing['id'] : null);
        if ($existing) {
            $pdo->prepare(
                'UPDATE products
                 SET name=?, slug=?, sku=?, description=?, category=?, price_cents=?, currency=?, stock=?, image_path=?, active=?, updated_at=NOW()
                 WHERE id=?'
            )->execute([$name, $slug, $sku, $description, $category, $cents, $currency, $stock, $image, (int) $values['active'], (int) $existing['id']]);
            flash('ok', 'Product saved.');
        } else {
            $pdo->prepare(
                'INSERT INTO products (name, slug, sku, description, category, price_cents, currency, stock, image_path, active, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
            )->execute([$name, $slug, $sku, $description, $category, $cents, $currency, $stock, $image, (int) $values['active']]);
            flash('ok', 'Product added.');
        }
        if (((isset($existing['image_path']) ? $existing['image_path'] : null)) !== $image) {
            delete_uploaded_image((isset($existing['image_path']) ? $existing['image_path'] : null));
        }
        redirect_to('products.php');
    } catch (Exception $e) {
        if (!empty($uploaded)) {
            delete_uploaded_image($uploaded);
        }
        if ($e instanceof PDOException) {
            $error = idx_contains($e->getMessage(), 'Duplicate')
                ? 'That SKU is already used by another product.'
                : 'The product could not be saved.';
        } else {
            $error = $e->getMessage();
        }
    }
}

admin_start($existing ? 'Edit product' : 'Add product', 'products');
if ($error !== '') {
    echo '<p class="flash err">' . e($error) . '</p>';
}
?>
<form class="panel" method="post" enctype="multipart/form-data">
  <?= csrf_field() ?>
  <?php if ($existing): ?><input type="hidden" name="id" value="<?= (int) $existing['id'] ?>"><?php endif; ?>
  <div class="grid-2">
    <label>Name<input name="name" required value="<?= e($values['name']) ?>"></label>
    <label>SKU<input name="sku" required value="<?= e($values['sku']) ?>"></label>
    <label>Category<input name="category" value="<?= e($values['category']) ?>" placeholder="Optional"></label>
    <label>Price (<?= e((string) ((($_idx = app_config()['currency']) !== null ? $_idx : 'MYR'))) ?>)<input name="price" required inputmode="decimal" value="<?= e($values['price']) ?>" placeholder="1500.00"></label>
    <label>Stock<input name="stock" required inputmode="numeric" value="<?= e($values['stock']) ?>"></label>
    <label class="check" style="margin-top: 38px;">
      <input type="checkbox" name="active" <?= $values['active'] === '1' ? 'checked' : '' ?>>
      Show on the public store
    </label>
  </div>
  <label>Description<textarea name="description"><?= e($values['description']) ?></textarea></label>
  <label>Photo<input type="file" name="image" accept="image/jpeg,image/png,image/webp"></label>
  <label>Or an https image link<input name="image_url" value="<?= e($values['image_url']) ?>" placeholder="https://"></label>
  <?php if (!empty($existing['image_path'])): ?>
    <p style="margin-top:14px"><img class="thumb" src="<?= e((string) product_image_url($existing['image_path'])) ?>" alt=""></p>
    <label class="check"><input type="checkbox" name="remove_image"> Remove the current photo</label>
  <?php endif; ?>
  <p style="margin-top:18px"><button class="btn primary" type="submit"><?= $existing ? 'Save product' : 'Add product' ?></button></p>
</form>
<?php admin_end(); ?>
