<?php $items = sl_recent((int)($p['limit'] ?? 4), $p['kinds'] ?? ['products', 'sections']); if (!$items) return; ?>
<section class="section recent">
  <div class="container">
    <div class="section-head"><h2><?= e($p['title'] ?? 'Reprendre où vous en étiez') ?></h2></div>
    <ul class="recent-list">
      <?php foreach ($items as $it): ?>
      <li class="recent-item<?= $it['kind'] === 'product' ? ' is-product' : '' ?>">
        <a href="<?= e($it['url']) ?>">
          <?php if ($it['kind'] === 'product' && !empty($it['image'])): ?><img src="<?= e(asset($it['image'])) ?>" alt="" loading="lazy"><?php endif; ?>
          <span class="recent-title"><?= e($it['title']) ?></span>
          <span class="muted recent-meta"><?= $it['kind'] === 'product' ? e($it['price']) : e($it['page']) ?></span>
        </a>
      </li>
      <?php endforeach; ?>
    </ul>
  </div>
</section>
