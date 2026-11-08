<?php $cols = (int)($p['columns'] ?? 3); ?>
<section class="section features">
  <div class="container">
    <?php if (!empty($p['title']) || !empty($p['intro'])): ?>
    <div class="section-head">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <div class="grid grid-<?= $cols ?>">
      <?php foreach ($p['items'] as $it): ?>
      <div class="card feature">
        <?php if (!empty($it['icon'])): ?><div class="feature-icon"><?= sl_icon($it['icon']) ?></div><?php endif; ?>
        <h3><?= e($it['title']) ?></h3>
        <?php if (!empty($it['text'])): ?><p class="muted"><?= e($it['text']) ?></p><?php endif; ?>
        <?php if (!empty($it['link'])) echo render_link($it['link'], 'feature-link'); ?>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
