<?php $hasImg = !empty($p['image']); $align = $p['align'] ?? 'center'; ?>
<section class="hero<?= $hasImg ? ' hero-img' : '' ?> hero-<?= e($align) ?>"<?= $hasImg ? ' style="--hero-bg:url(' . e(asset($p['image'])) . ')"' : '' ?>>
  <div class="container hero-inner">
    <h1><?= e($p['title']) ?></h1>
    <?php if (!empty($p['subtitle'])): ?><p class="hero-sub"><?= e($p['subtitle']) ?></p><?php endif; ?>
    <?php if (!empty($p['cta']) || !empty($p['secondary'])): ?>
    <div class="hero-actions">
      <?php if (!empty($p['cta'])) echo render_link($p['cta'], 'btn'); ?>
      <?php if (!empty($p['secondary'])) echo render_link($p['secondary'], 'btn btn-outline'); ?>
    </div>
    <?php endif; ?>
  </div>
</section>
