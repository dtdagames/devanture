<?php $cols = (int)($p['columns'] ?? 3); ?>
<section class="section gallery">
  <div class="container">
    <?php if (!empty($p['title']) || !empty($p['intro'])): ?>
    <div class="section-head">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <div class="grid grid-<?= $cols ?> gallery-grid">
      <?php foreach ($p['images'] as $img): ?>
      <figure class="gallery-item">
        <a href="<?= e(asset($img['src'])) ?>" data-lightbox><img src="<?= e(asset($img['src'])) ?>" alt="<?= e($img['alt'] ?? $img['caption'] ?? '') ?>" loading="lazy"></a>
        <?php if (!empty($img['caption'])): ?><figcaption><?= e($img['caption']) ?></figcaption><?php endif; ?>
      </figure>
      <?php endforeach; ?>
    </div>
  </div>
</section>
