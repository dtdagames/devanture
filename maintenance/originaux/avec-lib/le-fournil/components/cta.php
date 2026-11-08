<section class="section cta cta-<?= e($p['style'] ?? 'primary') ?>">
  <div class="container cta-inner">
    <div>
      <h2><?= e($p['title']) ?></h2>
      <?php if (!empty($p['text'])): ?><p><?= e($p['text']) ?></p><?php endif; ?>
    </div>
    <?= render_link($p['button'], 'btn') ?>
  </div>
</section>
