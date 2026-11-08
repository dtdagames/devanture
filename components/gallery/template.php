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
        <a href="<?= e(img_src($img['src'], 1600)) ?>" data-lightbox><?= img($img['src'], $img['alt'] ?? $img['caption'] ?? '', ['sizes' => '(max-width: 700px) 100vw, ' . (int)round(100 / max(1, $cols)) . 'vw']) ?></a>
        <?php if (!empty($img['caption'])): ?><figcaption><?= e($img['caption']) ?></figcaption><?php endif; ?>
      </figure>
      <?php endforeach; ?>
    </div>
  </div>
</section>
