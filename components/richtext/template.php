<?php $hasImg = !empty($p['image']); $pos = $p['image_position'] ?? 'right'; ?>
<section class="section richtext">
  <div class="container<?= $hasImg ? ' richtext-split richtext-img-' . e($pos) : ' richtext-narrow' ?>">
    <div class="richtext-body">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?= paragraphs($p['text']) ?>
      <?php if (!empty($p['cta'])) echo render_link($p['cta'], 'btn'); ?>
    </div>
    <?php if ($hasImg): ?><div class="richtext-media"><?= img($p['image'], $p['title'] ?? '', ['sizes' => '(max-width: 700px) 100vw, 50vw']) ?></div><?php endif; ?>
  </div>
</section>
