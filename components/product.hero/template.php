<?php global $product; $pr = $product; if (!$pr) { echo '<!-- product.hero : aucun produit -->'; return; } ?>
<section class="section product-hero">
  <span hidden data-sl-event="product_view" data-sl-data="<?= e(json_encode(['product' => $pr['id'], 'category' => $pr['category'] ?? ''])) ?>"></span>
  <div class="container product-hero-inner">
    <?php if (!empty($pr['image'])): ?><div class="product-hero-media"><?= img($pr['image'], $pr['name'], ['sizes' => '(max-width: 700px) 100vw, 50vw', 'eager' => true]) ?></div><?php endif; ?>
    <div class="product-hero-body">
      <?php if (!empty($p['back'])) echo render_link($p['back'], 'product-back'); ?>
      <h1><?= e($pr['name']) ?><?php if (!empty($pr['badge'])): ?> <span class="badge"><?= e($pr['badge']) ?></span><?php endif; ?></h1>
      <?php if (!empty($pr['category'])): ?><div class="muted product-cat"><?= e(ucfirst($pr['category'])) ?></div><?php endif; ?>
      <div class="product-hero-price"><?= e(shop_money($pr['price'])) ?><?php if (!empty($pr['unit'])): ?> <span class="muted">/ <?= e($pr['unit']) ?></span><?php endif; ?></div>
      <?php if (!empty($pr['description'])): ?><div class="product-hero-desc"><?= paragraphs($pr['description']) ?></div><?php endif; ?>
      <?php if (shop_in_stock($pr)): ?>
      <form method="post" action="/_cart" class="add-to-cart product-add" data-category="<?= e($pr['category'] ?? '') ?>">
        <input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="add"><input type="hidden" name="id" value="<?= e($pr['id']) ?>">
        <label>Quantité <input type="number" name="qty" value="1" min="1" max="<?= $pr['stock'] !== null ? (int)$pr['stock'] : 99 ?>"></label>
        <button class="btn" type="submit">Ajouter au panier</button>
      </form>
      <?php if (($p['show_stock'] ?? true) && $pr['stock'] !== null): ?><p class="product-stock<?= (int)$pr['stock'] <= 3 ? ' product-stock-low' : ' muted' ?>"><?= (int)$pr['stock'] <= 3 ? 'Plus que ' . (int)$pr['stock'] . ' en stock' : (int)$pr['stock'] . ' en stock' ?></p><?php endif; ?>
      <?php else: ?><p class="product-stock"><strong>Épuisé</strong> · revenez bientôt ou contactez-nous.</p><?php endif; ?>
    </div>
  </div>
</section>
