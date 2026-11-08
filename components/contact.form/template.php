<?php
// $p['fields'] est normalisé par le compilateur : liste d'objets { name, label, type, required, options, placeholder }.
global $formResult, $site;
$fields = $p['fields'];
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
        <div class="hp"><label>Site web <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <?php if ($r['status'] === 'error'): ?><div class="form-error" role="alert"><?= e($r['message']) ?></div><?php endif; ?>
        <?php foreach ($fields as $f): $n = $f['name']; $isReq = !empty($f['required']); $val = $old[$n] ?? '';
          $w = $f['when'] ?? null;
          $shown = !$w || in_array((string)($old[$w['field']] ?? ''), array_map('strval', $w['values']), true);
          $whenAttr = $w ? ' data-when-field="' . e($w['field']) . '" data-when-values="' . e(json_encode(array_map('strval', $w['values']), JSON_UNESCAPED_UNICODE)) . '"' . ($shown ? '' : ' hidden') : ''; ?>
        <div class="field<?= isset($errs[$n]) ? ' has-error' : '' ?>"<?= $whenAttr ?>>
          <label for="f-<?= e($n) ?>"><?= e($f['label']) ?><?= $isReq ? ' *' : '' ?></label>
          <?php if ($f['type'] === 'textarea'): ?>
          <textarea id="f-<?= e($n) ?>" name="<?= e($n) ?>" rows="6"<?= $isReq ? ' required' : '' ?><?= !empty($f['placeholder']) ? ' placeholder="' . e($f['placeholder']) . '"' : '' ?>><?= e($val) ?></textarea>
          <?php elseif ($f['type'] === 'select'): ?>
          <select id="f-<?= e($n) ?>" name="<?= e($n) ?>"<?= $isReq ? ' required' : '' ?>>
            <option value=""><?= e($f['placeholder'] ?? 'Choisir…') ?></option>
            <?php foreach ($f['options'] as $opt): ?><option value="<?= e($opt) ?>"<?= (string)$val === (string)$opt ? ' selected' : '' ?>><?= e($opt) ?></option><?php endforeach; ?>
          </select>
          <?php else: ?>
          <input id="f-<?= e($n) ?>" type="<?= e($f['type']) ?>" name="<?= e($n) ?>" value="<?= e($val) ?>"<?= $isReq ? ' required' : '' ?><?= !empty($f['placeholder']) ? ' placeholder="' . e($f['placeholder']) . '"' : '' ?><?= $f['type'] === 'number' ? ' inputmode="numeric"' : '' ?>>
          <?php endif; ?>
          <?php if (isset($errs[$n])): ?><div class="field-error"><?= e($errs[$n]) ?></div><?php endif; ?>
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
