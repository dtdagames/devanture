<?php global $SHOP, $checkoutResult, $site; $lines = shop_cart_lines(); $totals = shop_totals($lines); $r = $checkoutResult ?? ['status' => null]; $old = $r['data'] ?? []; $errs = $r['errors'] ?? []; ?>
<section class="section checkout">
  <div class="container">
    <span hidden data-sl-event="checkout_start"></span>
    <h1><?= e($p['title'] ?? 'Finaliser ma commande') ?></h1>
    <?php if (!empty($p['intro'])): ?><p class="muted"><?= e($p['intro']) ?></p><?php endif; ?>
    <?php if (!$lines): ?>
      <p class="muted">Votre panier est vide.</p><?php if (!empty($SHOP['cart_route'])): ?><a class="btn" href="<?= e($SHOP['cart_route']) ?>">Voir le panier</a><?php endif; ?>
    <?php else: ?>
    <div class="checkout-inner">
      <form class="card contact-form checkout-form" method="post" action="" novalidate>
        <input type="hidden" name="_form" value="checkout"><input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>">
        <div class="hp"><label>Site web <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <?php if ($r['status'] === 'error'): ?><div class="form-error" role="alert"><?= e($r['message']) ?></div><?php endif; ?>
        <?php foreach ([['name', 'Nom et prénom', 'text', true], ['email', 'E-mail', 'email', true], ['phone', 'Téléphone', 'tel', false], ['address', 'Adresse de livraison', 'textarea', true], ['notes', $p['notes_label'] ?? 'Précisions pour la livraison', 'textarea', false]] as [$n, $label, $type, $req]): ?>
        <div class="field<?= isset($errs[$n]) ? ' has-error' : '' ?>">
          <label for="c-<?= $n ?>"><?= e($label) ?><?= $req ? ' *' : '' ?></label>
          <?php if ($type === 'textarea'): ?><textarea id="c-<?= $n ?>" name="<?= $n ?>" rows="<?= $n === 'address' ? 3 : 2 ?>"<?= $req ? ' required' : '' ?>><?= e($old[$n] ?? '') ?></textarea>
          <?php else: ?><input id="c-<?= $n ?>" type="<?= $type ?>" name="<?= $n ?>" value="<?= e($old[$n] ?? '') ?>"<?= $req ? ' required' : '' ?>><?php endif; ?>
          <?php if (isset($errs[$n])): ?><div class="field-error"><?= e($errs[$n]) ?></div><?php endif; ?>
        </div>
        <?php endforeach; ?>
        <p class="muted checkout-payment"><?php if (($SHOP['payment'] ?? 'manual') === 'stripe'): ?>Paiement sécurisé par carte à l'étape suivante (Stripe).<?php else: ?><?= e($SHOP['manual_instructions'] ?? 'Paiement à la livraison ou par virement : les instructions vous sont envoyées avec la confirmation.') ?><?php endif; ?></p>
        <button class="btn" type="submit"><?= ($SHOP['payment'] ?? 'manual') === 'stripe' ? 'Payer ' . e(shop_money($totals['total'])) : 'Confirmer la commande' ?></button>
      </form>
      <aside class="checkout-summary">
        <h2>Récapitulatif</h2>
        <ul><?php foreach ($lines as $l): ?><li><span><?= (int)$l['qty'] ?> × <?= e($l['name']) ?></span><span><?= e(shop_money($l['total'])) ?></span></li><?php endforeach; ?></ul>
        <div>Sous-total : <?= e(shop_money($totals['subtotal'])) ?></div>
        <div>Livraison : <?= $totals['shipping'] > 0 ? e(shop_money($totals['shipping'])) : 'offerte' ?></div>
        <div><strong>Total : <?= e(shop_money($totals['total'])) ?></strong></div>
        <?php if (!empty($SHOP['cart_route'])): ?><p><a href="<?= e($SHOP['cart_route']) ?>">Modifier le panier</a></p><?php endif; ?>
      </aside>
    </div>
    <?php endif; ?>
  </div>
</section>
