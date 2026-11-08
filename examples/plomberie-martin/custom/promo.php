<section class="section promo">
  <div class="container promo-inner">
    <strong>Offre du moment :</strong> <?= e($p['text'] ?? '') ?>
    <?php if (!empty($p['code'])): ?> Code <code><?= e($p['code']) ?></code><?php endif; ?>
    <?php if (!empty($p['until'])): ?> <span class="muted">jusqu'au <?= e($p['until']) ?></span><?php endif; ?>
  </div>
</section>
