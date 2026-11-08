<section class="section steps">
  <div class="container">
    <?php if (!empty($p['title']) || !empty($p['intro'])): ?>
    <div class="section-head">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <ol class="steps-list">
      <?php foreach ($p['items'] as $i => $it): ?>
      <li class="step"><span class="step-num" aria-hidden="true"><?= $i + 1 ?></span><div><h3><?= e($it['title']) ?></h3><?php if (!empty($it['text'])): ?><p class="muted"><?= e($it['text']) ?></p><?php endif; ?></div></li>
      <?php endforeach; ?>
    </ol>
  </div>
</section>
