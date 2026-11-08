<section class="section faq">
  <div class="container faq-inner">
    <?php if (!empty($p['title']) || !empty($p['intro'])): ?>
    <div class="section-head">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <?php foreach ($p['items'] as $i => $it): ?>
    <details class="faq-item" id="<?= e(($p['id'] ?? 'faq') . '-q' . ($i + 1)) ?>"<?= $i === 0 ? ' open' : '' ?>>
      <summary><?= e($it['q']) ?></summary>
      <div class="faq-answer"><?= paragraphs($it['a']) ?></div>
    </details>
    <?php endforeach; ?>
  </div>
</section>
