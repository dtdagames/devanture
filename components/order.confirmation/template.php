<?php global $order, $SHOP, $site; $o = $order; if (!$o) { echo '<!-- order.confirmation : aucune commande -->'; return; } ?>
<section class="section order">
  <div class="container">
    <span hidden data-sl-event="purchase" data-sl-data="<?= e(json_encode(['total' => $o['total']])) ?>"></span>
    <h1><?= e($p['title'] ?? 'Merci pour votre commande') ?></h1>
    <?php if (!empty($p['text'])): ?><p><?= e($p['text']) ?></p><?php endif; ?>
    <div class="order-box">
      <p>Commande <strong>n° <?= e($o['id']) ?></strong> du <?= e(date('d/m/Y à H:i', strtotime($o['at']))) ?> · <span class="order-status"><?= e(shop_status_label($o['status'])) ?></span></p>
      <ul class="order-lines"><?php foreach ($o['lines'] as $l): ?><li><span><?= (int)$l['qty'] ?> × <?= e($l['name']) ?></span><span><?= e(shop_money($l['price'] * $l['qty'])) ?></span></li><?php endforeach; ?></ul>
      <div>Sous-total : <?= e(shop_money($o['subtotal'])) ?> · Livraison : <?= $o['shipping'] > 0 ? e(shop_money($o['shipping'])) : 'offerte' ?></div>
      <p><strong>Total : <?= e(shop_money($o['total'])) ?></strong></p>
      <?php if ($o['status'] === 'cancelled'): ?><p class="muted">Cette commande a été annulée (paiement non finalisé). Les articles sont de nouveau disponibles.</p>
      <?php elseif ($o['status'] === 'paid'): ?><p class="muted">Paiement confirmé<?= !empty($o['paid_at']) ? ' le ' . e(date('d/m/Y à H:i', strtotime($o['paid_at']))) : '' ?>. Préparation en cours.</p>
      <?php elseif ($o['payment'] === 'manual'): ?><p class="muted"><?= e($SHOP['manual_instructions'] ?? 'Paiement à la livraison ou par virement : nos coordonnées bancaires vous sont envoyées par e-mail.') ?></p>
      <?php elseif ($o['status'] === 'pending'): ?><p class="muted">Paiement en cours de confirmation par Stripe. Cette page se mettra à jour, et vous recevrez un e-mail dès validation.</p><?php endif; ?>
      <p class="muted">Livraison à : <?= nl2br(e($o['customer']['address'])) ?><br>Confirmation envoyée à <?= e($o['customer']['email']) ?>.</p>
    </div>
    <?php if (!empty($p['cta'])): ?><p style="margin-top:20px"><?= render_link($p['cta'], 'btn') ?></p><?php endif; ?>
  </div>
</section>
