<?php global $site; $addr = $p['address'] ?? ($site['contact']['address'] ?? ''); $has = isset($p['lat'], $p['lon']); $z = (int)($p['zoom'] ?? 16);
$q = rawurlencode($addr);
$osm = $has ? 'https://www.openstreetmap.org/?mlat=' . $p['lat'] . '&mlon=' . $p['lon'] . '#map=' . $z . '/' . $p['lat'] . '/' . $p['lon'] : 'https://www.openstreetmap.org/search?query=' . $q;
$gm = 'https://www.google.com/maps/dir/?api=1&destination=' . ($has ? $p['lat'] . ',' . $p['lon'] : $q);
$embed = '';
if ($has) { $d = 0.004; $bbox = ($p['lon'] - $d) . ',' . ($p['lat'] - $d * 0.6) . ',' . ($p['lon'] + $d) . ',' . ($p['lat'] + $d * 0.6); $embed = 'https://www.openstreetmap.org/export/embed.html?bbox=' . $bbox . '&layer=mapnik&marker=' . $p['lat'] . ',' . $p['lon']; } ?>
<section class="section map">
  <div class="container map-inner">
    <div class="map-info">
      <h2><?= e($p['title'] ?? 'Nous trouver') ?></h2>
      <?php if ($addr): ?><p class="map-address"><?= nl2br(e($addr)) ?></p><?php endif; ?>
      <?php if (!empty($p['access'])): ?><div class="muted"><?= paragraphs($p['access']) ?></div><?php endif; ?>
      <p class="map-links"><a class="btn" href="<?= e($gm) ?>" rel="noopener" target="_blank">Itinéraire</a> <a class="btn btn-outline" href="<?= e($osm) ?>" rel="noopener" target="_blank">Voir sur OpenStreetMap</a></p>
    </div>
    <?php if ($has): ?>
    <div class="map-frame" data-embed="<?= e($embed) ?>">
      <button type="button" class="map-load">Afficher la carte<span class="muted">OpenStreetMap, chargée à votre demande</span></button>
    </div>
    <?php endif; ?>
  </div>
</section>
