<?php
$DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
$byDay = [];
foreach ($p['days'] as $d) $byDay[$d['day']] = (!empty($d['closed']) || empty($d['slots'])) ? [] : $d['slots'];
$tz = new DateTimeZone($p['timezone'] ?? 'Europe/Paris');
$now = new DateTime('now', $tz);
$todayIdx = (int)$now->format('N') - 1;
$today = $DAYS[$todayIdx];
$nowMin = (int)$now->format('G') * 60 + (int)$now->format('i');
$toMin = fn(string $hm) => (int)substr($hm, 0, 2) * 60 + (int)substr($hm, 3, 2);
$fmt = fn(string $hm) => ltrim(substr($hm, 0, 2), '0') . ' h' . (substr($hm, 3, 2) === '00' ? '' : ' ' . substr($hm, 3, 2));
$fmtSlot = fn(string $s) => $fmt(substr($s, 0, 5)) . ' – ' . $fmt(substr($s, 6, 5));

// État courant : ouvert si une plage du jour contient l'heure ; sinon prochaine ouverture.
$status = null;
if ($p['show_status'] ?? true) {
    $open = false; $closesAt = null;
    foreach ($byDay[$today] ?? [] as $s) {
        if ($nowMin >= $toMin(substr($s, 0, 5)) && $nowMin < $toMin(substr($s, 6, 5))) { $open = true; $closesAt = substr($s, 6, 5); break; }
    }
    if ($open) $status = ['open' => true, 'text' => 'Ouvert actuellement · ferme à ' . $fmt($closesAt)];
    else {
        $next = null;
        for ($i = 0; $i < 8 && $next === null; $i++) {
            $d = $DAYS[($todayIdx + $i) % 7];
            foreach ($byDay[$d] ?? [] as $s) {
                $start = $toMin(substr($s, 0, 5));
                if ($i > 0 || $start > $nowMin) { $next = ($i === 0 ? 'aujourd\'hui' : ($i === 1 ? 'demain' : $d)) . ' à ' . $fmt(substr($s, 0, 5)); break; }
            }
        }
        $status = ['open' => false, 'text' => 'Fermé actuellement' . ($next ? ' · ouvre ' . $next : '')];
    }
}
?>
<section class="section hours">
  <div class="container hours-inner">
    <div class="section-head">
      <h2><?= e($p['title'] ?? 'Horaires d\'ouverture') ?></h2>
      <?php if (!empty($p['intro'])): ?><p><?= e($p['intro']) ?></p><?php endif; ?>
    </div>
    <?php if ($status): ?><div class="hours-status <?= $status['open'] ? 'is-open' : 'is-closed' ?>" role="status"><?= e($status['text']) ?></div><?php endif; ?>
    <table class="hours-table">
      <tbody>
      <?php foreach ($p['days'] as $d): $slots = $byDay[$d['day']]; ?>
        <tr<?= $d['day'] === $today ? ' class="is-today"' : '' ?>>
          <th scope="row"><?= e(ucfirst($d['day'])) ?></th>
          <td><?= $slots ? e(implode(' et ', array_map($fmtSlot, $slots))) : '<span class="muted">Fermé</span>' ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    <?php if (!empty($p['note'])): ?><p class="muted hours-note"><?= e($p['note']) ?></p><?php endif; ?>
  </div>
</section>
