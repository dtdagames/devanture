<section class="section team">
  <div class="container">
    <?php if (!empty($p['title']) || !empty($p['intro'])): ?>
    <div class="section-head">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <div class="grid grid-4">
      <?php foreach ($p['members'] as $m): ?>
      <div class="team-member">
        <?php if (!empty($m['photo'])): ?><?= img($m['photo'], $m['name'], ['sizes' => '120px']) ?><?php else: ?><div class="team-avatar" aria-hidden="true"><?= e(first_letter($m['name'])) ?></div><?php endif; ?>
        <h3><?= e($m['name']) ?></h3>
        <?php if (!empty($m['role'])): ?><div class="muted"><?= e($m['role']) ?></div><?php endif; ?>
        <?php if (!empty($m['bio'])): ?><p><?= e($m['bio']) ?></p><?php endif; ?>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
