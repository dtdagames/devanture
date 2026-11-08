<section class="section timeline">
  <div class="container timeline-inner">
    <?php if (!empty($p['title']) || !empty($p['intro'])): ?>
    <div class="section-head">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <ol class="timeline-list">
      <?php foreach ($p['items'] as $it): ?>
      <li class="tl-item"><time class="tl-date"><?= e((string)$it['date']) ?></time><div class="tl-body"><h3><?= e($it['title']) ?></h3><?php if (!empty($it['text'])): ?><p class="muted"><?= e($it['text']) ?></p><?php endif; ?></div></li>
      <?php endforeach; ?>
    </ol>
  </div>
</section>
