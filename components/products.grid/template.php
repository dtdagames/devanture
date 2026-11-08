<?php
$list = shop_products();
$f = $p['filter'] ?? [];
if (!empty($f['category'])) $list = array_values(array_filter($list, fn($x) => ($x['category'] ?? null) === $f['category']));
if (!empty($f['featured'])) $list = array_values(array_filter($list, fn($x) => !empty($x['featured'])));
$sort = $p['sort'] ?? null;
if ($sort === 'name') usort($list, fn($a, $b) => strcmp($a['name'], $b['name']));
elseif ($sort === 'price') usort($list, fn($a, $b) => $a['price'] <=> $b['price']);
elseif ($sort === 'price_desc') usort($list, fn($a, $b) => $b['price'] <=> $a['price']);
if (!empty($p['limit'])) $list = array_slice($list, 0, (int)$p['limit']);
$cols = (int)($p['columns'] ?? 3);
$showAdd = $p['show_add'] ?? true;
?>
<section class="section products">
  <div class="container">
    <?php if (!empty($p['title']) || !empty($p['intro'])): ?>
    <div class="section-head">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <?php if (!$list): ?><p class="muted">Aucun produit dans cette sélection pour le moment.</p><?php endif; ?>
    <div class="grid grid-<?= $cols ?> products-grid">
      <?php foreach ($list as $pr): $url = shop_product_url($pr['id']); ?>
      <article class="card product-card">
        <?php if (!empty($pr['image'])): ?><a href="<?= e($url ?? '#') ?>" class="product-img"><?= img($pr['image'], $pr['name'], ['sizes' => '(max-width: 700px) 50vw, 25vw']) ?></a><?php endif; ?>
        <h3><?php if ($url): ?><a href="<?= e($url) ?>"><?= e($pr['name']) ?></a><?php else: ?><?= e($pr['name']) ?><?php endif; ?><?php if (!empty($pr['badge'])): ?> <span class="badge"><?= e($pr['badge']) ?></span><?php elseif ($pr['stock'] !== null && $pr['stock'] > 0 && $pr['stock'] <= 3): ?> <span class="badge badge-low">Plus que <?= (int)$pr['stock'] ?></span><?php endif; ?></h3>
        <?php if (!empty($pr['description'])): ?><p class="muted product-desc"><?= e(str_cut($pr['description'], 110)) ?><?= strlen($pr['description']) > 110 ? '…' : '' ?></p><?php endif; ?>
        <div class="product-foot">
          <span class="product-price"><?= e(shop_money($pr['price'])) ?><?php if (!empty($pr['unit'])): ?> <span class="muted">/ <?= e($pr['unit']) ?></span><?php endif; ?></span>
          <?php if ($showAdd && shop_in_stock($pr)): ?>
          <form method="post" action="/_cart" class="add-to-cart" data-category="<?= e($pr['category'] ?? '') ?>">
            <input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="add"><input type="hidden" name="id" value="<?= e($pr['id']) ?>">
            <button class="btn" type="submit">Ajouter</button>
          </form>
          <?php elseif ($showAdd): ?><span class="muted product-soldout">Épuisé</span><?php endif; ?>
        </div>
      </article>
      <?php endforeach; ?>
    </div>
    <?php if (!empty($p['cta'])): ?><p class="products-cta"><?= render_link($p['cta'], 'btn btn-outline') ?></p><?php endif; ?>
  </div>
</section>
