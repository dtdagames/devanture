<section class="section testimonials">
  <div class="container">
    <?php if (!empty($p['title'])): ?><div class="section-head"><h2><?= e($p['title']) ?></h2></div><?php endif; ?>
    <div class="grid grid-3">
      <?php foreach ($p['items'] as $t): ?>
      <blockquote class="card testimonial">
        <?php if (!empty($t['rating'])): ?><div class="stars" aria-label="<?= (int)$t['rating'] ?> sur 5"><?= str_repeat('★', (int)$t['rating']) . str_repeat('☆', 5 - (int)$t['rating']) ?></div><?php endif; ?>
        <p>« <?= e($t['quote']) ?> »</p>
        <footer><strong><?= e($t['author']) ?></strong><?php if (!empty($t['role'])): ?> <span class="muted">· <?= e($t['role']) ?></span><?php endif; ?></footer>
      </blockquote>
      <?php endforeach; ?>
    </div>
  </div>
</section>
