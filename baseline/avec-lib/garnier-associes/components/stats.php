<section class="section stats">
  <div class="container">
    <?php if (!empty($p['title'])): ?><div class="section-head"><h2><?= e($p['title']) ?></h2></div><?php endif; ?>
    <div class="stats-row">
      <?php foreach ($p['items'] as $s): ?>
      <div class="stat"><div class="stat-value"><?= e((string)$s['value']) ?></div><div class="stat-label"><?= e($s['label']) ?></div></div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
