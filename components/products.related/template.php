<?php global $product; if (!$product) return;
$list = array_values(array_filter(shop_products(), fn($x) => $x['id'] !== $product['id'] && ($x['category'] ?? null) === ($product['category'] ?? null)));
$list = array_slice($list, 0, (int)($p['limit'] ?? 3));
if (!$list) return; ?>
<section class="section products related">
  <div class="container">
    <div class="section-head"><h2><?= e($p['title'] ?? 'Vous aimerez aussi') ?></h2></div>
    <div class="grid grid-3 products-grid">
      <?php foreach ($list as $pr): $url = shop_product_url($pr['id']); ?>
      <article class="card product-card">
        <?php if (!empty($pr['image'])): ?><a href="<?= e($url) ?>" class="product-img"><img src="<?= e(asset($pr['image'])) ?>" alt="<?= e($pr['name']) ?>" loading="lazy"></a><?php endif; ?>
        <h3><a href="<?= e($url) ?>"><?= e($pr['name']) ?></a></h3>
        <div class="product-foot"><span class="product-price"><?= e(shop_money($pr['price'])) ?></span><a class="btn btn-outline" href="<?= e($url) ?>">Voir</a></div>
      </article>
      <?php endforeach; ?>
    </div>
  </div>
</section>
