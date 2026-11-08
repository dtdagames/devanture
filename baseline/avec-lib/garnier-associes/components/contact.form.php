<?php
global $formResult, $site;
$fields = $p['fields'] ?? ['name', 'email', 'message'];
$required = $p['required'] ?? array_values(array_intersect(['name', 'email', 'message'], $fields));
$labels = ['name' => 'Nom', 'email' => 'E-mail', 'phone' => 'Téléphone', 'subject' => 'Sujet', 'message' => 'Message'];
$types = ['name' => 'text', 'email' => 'email', 'phone' => 'tel', 'subject' => 'text'];
$r = $formResult ?? ['status' => null];
$old = $r['data'] ?? [];
$errs = $r['errors'] ?? [];
$showContact = ($p['show_contact'] ?? true) && !empty($site['contact']);
?>
<section class="section contact" id="contact">
  <div class="container">
    <?php if (!empty($p['title']) || !empty($p['intro'])): ?>
    <div class="section-head">
      <?php if (!empty($p['title'])): ?><h2><?= e($p['title']) ?></h2><?php endif; ?>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php endif; ?>
    <div class="contact-grid<?= $showContact ? '' : ' contact-solo' ?>">
      <?php if ($r['status'] === 'ok'): ?>
        <div class="card contact-success" role="status"><strong>✔ Message envoyé.</strong> <?= e($p['success'] ?? 'Nous vous répondons rapidement.') ?></div>
      <?php else: ?>
      <form class="card contact-form" method="post" action="" novalidate>
        <input type="hidden" name="_form" value="contact">
        <input type="hidden" name="_csrf" value="<?= e($r['csrf'] ?? '') ?>">
        <input type="hidden" name="_to" value="<?= e($p['to']) ?>">
        <input type="hidden" name="_required" value="<?= e(implode(',', $required)) ?>">
        <div class="hp"><label>Site web <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <?php if ($r['status'] === 'error'): ?><div class="form-error" role="alert"><?= e($r['message']) ?></div><?php endif; ?>
        <?php foreach ($fields as $f): $isReq = in_array($f, $required, true); ?>
        <div class="field<?= isset($errs[$f]) ? ' has-error' : '' ?>">
          <label for="f-<?= e($f) ?>"><?= e($labels[$f]) ?><?= $isReq ? ' *' : '' ?></label>
          <?php if ($f === 'message'): ?>
          <textarea id="f-<?= e($f) ?>" name="<?= e($f) ?>" rows="6"<?= $isReq ? ' required' : '' ?>><?= e($old[$f] ?? '') ?></textarea>
          <?php else: ?>
          <input id="f-<?= e($f) ?>" type="<?= e($types[$f]) ?>" name="<?= e($f) ?>" value="<?= e($old[$f] ?? '') ?>"<?= $isReq ? ' required' : '' ?>>
          <?php endif; ?>
          <?php if (isset($errs[$f])): ?><div class="field-error"><?= e($errs[$f]) ?></div><?php endif; ?>
        </div>
        <?php endforeach; ?>
        <button class="btn" type="submit">Envoyer</button>
      </form>
      <?php endif; ?>
      <?php if ($showContact): $c = $site['contact']; ?>
      <aside class="contact-info">
        <?php if (!empty($c['address'])): ?><p><strong>Adresse</strong><br><?= nl2br(e($c['address'])) ?></p><?php endif; ?>
        <?php if (!empty($c['phone'])): ?><p><strong>Téléphone</strong><br><a href="tel:<?= e(preg_replace('/\s+/', '', $c['phone'])) ?>"><?= e($c['phone']) ?></a></p><?php endif; ?>
        <?php if (!empty($c['email'])): ?><p><strong>E-mail</strong><br><a href="mailto:<?= e($c['email']) ?>"><?= e($c['email']) ?></a></p><?php endif; ?>
      </aside>
      <?php endif; ?>
    </div>
  </div>
</section>
