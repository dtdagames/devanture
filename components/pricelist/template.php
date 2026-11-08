<?php
$cols = (int)($p['columns'] ?? (count($p['groups']) > 1 ? 2 : 1));
$fmtPrice = fn($v) => is_numeric($v) ? number_format((float)$v, (floor((float)$v) == (float)$v) ? 0 : 2, ',', ' ') . ' €' : (string)$v;
?>
<section class="section pricelist">
  <div class="container">
    <?php if (!empty($p['title']) || !empty($p['intro'])): ?>
    <div class="section-head">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <div class="pricelist-groups pricelist-cols-<?= $cols ?>">
      <?php foreach ($p['groups'] as $g): ?>
      <div class="pricelist-group">
        <?php if (!empty($g['title'])): ?><h3><?= e($g['title']) ?></h3><?php endif; ?>
        <?php if (!empty($g['text'])): ?><p class="muted"><?= e($g['text']) ?></p><?php endif; ?>
        <ul class="pricelist-items">
          <?php foreach ($g['items'] as $it): ?>
          <li class="pricelist-item">
            <div class="pricelist-main">
              <span class="pricelist-name"><?= e($it['name']) ?><?php if (!empty($it['badge'])): ?> <span class="badge"><?= e($it['badge']) ?></span><?php endif; ?></span>
              <?php if (!empty($it['description'])): ?><span class="pricelist-desc muted"><?= e($it['description']) ?></span><?php endif; ?>
            </div>
            <span class="pricelist-price"><?= e($fmtPrice($it['price'])) ?><?php if (!empty($it['unit'])): ?> <span class="muted pricelist-unit"><?= e($it['unit']) ?></span><?php endif; ?></span>
          </li>
          <?php endforeach; ?>
        </ul>
      </div>
      <?php endforeach; ?>
    </div>
    <?php if (!empty($p['note'])): ?><p class="muted pricelist-note"><?= e($p['note']) ?></p><?php endif; ?>
    <?php if (!empty($p['cta'])): ?><p class="pricelist-cta"><?= render_link($p['cta'], 'btn') ?></p><?php endif; ?>
  </div>
</section>
