<?php global $SHOP; $lines = shop_cart_lines(); $totals = shop_totals($lines); ?>
<section class="section cart">
  <div class="container cart-inner">
    <h1><?= e($p['title'] ?? 'Votre panier') ?></h1>
    <?php if (!$lines): ?>
      <p class="muted"><?= e($p['empty_text'] ?? 'Votre panier est vide.') ?></p>
      <?php if (!empty($p['continue'])) echo render_link($p['continue'], 'btn'); ?>
    <?php else: ?>
    <table class="cart-table">
      <thead><tr><th>Article</th><th>Prix</th><th>Quantité</th><th>Total</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($lines as $l): ?>
        <tr>
          <td class="cart-item"><?php if (!empty($l['image'])): ?><?= img($l['image'], '', ['sizes' => '64px']) ?><?php endif; ?><?php $u = shop_product_url($l['id']); ?><?= $u ? '<a href="' . e($u) . '">' . e($l['name']) . '</a>' : e($l['name']) ?></td>
          <td><?= e(shop_money($l['price'])) ?></td>
          <td>
            <form method="post" action="/_cart" class="cart-qty"><input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="set"><input type="hidden" name="id" value="<?= e($l['id']) ?>">
              <input type="number" name="qty" value="<?= (int)$l['qty'] ?>" min="0" max="<?= $l['stock'] !== null ? (int)$l['stock'] : 99 ?>" aria-label="Quantité"><button class="btn btn-outline" type="submit">OK</button></form>
            <?php if ($l['stock'] !== null && $l['stock'] <= 3): ?><div class="muted" style="font-size:.85rem">Plus que <?= (int)$l['stock'] ?> disponible<?= $l['stock'] > 1 ? 's' : '' ?></div><?php endif; ?>
          </td>
          <td><strong><?= e(shop_money($l['total'])) ?></strong></td>
          <td><form method="post" action="/_cart"><input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="remove"><input type="hidden" name="id" value="<?= e($l['id']) ?>"><button class="cart-remove" type="submit" aria-label="Retirer">×</button></form></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    <div class="cart-totals">
      <div><span>Sous-total</span><span><?= e(shop_money($totals['subtotal'])) ?></span></div>
      <div><span>Livraison</span><span><?= $totals['shipping'] > 0 ? e(shop_money($totals['shipping'])) : 'Offerte' ?></span></div>
      <?php if ($totals['free_from'] && $totals['shipping'] > 0): ?><div class="muted"><span>Offerte dès <?= e(shop_money($totals['free_from'])) ?></span><span></span></div><?php endif; ?>
      <div class="cart-total"><span>Total</span><span><?= e(shop_money($totals['total'])) ?></span></div>
    </div>
    <div class="cart-actions">
      <?php if (!empty($p['continue'])) echo render_link($p['continue'], 'btn btn-outline'); ?>
      <?php if (!empty($SHOP['checkout_route'])): ?><a class="btn" href="<?= e($SHOP['checkout_route']) ?>">Commander</a><?php endif; ?>
    </div>
    <?php endif; ?>
  </div>
</section>
