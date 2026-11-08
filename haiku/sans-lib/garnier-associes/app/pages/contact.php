<?php
declare(strict_types=1);

$state = contact_form_state();

echo block_hero([
    'title' => 'Prendre contact',
    'lead' => 'Décrivez brièvement votre situation. Une première consultation de 30 minutes est offerte, sur rendez-vous.',
]);
?>
<section class="section">
  <div class="container contact-grid">
    <div class="contact-info">
      <h2>Nos coordonnées</h2>
      <p><strong>Adresse</strong><br><?= e(SITE['address']) ?></p>
      <p><strong>Téléphone</strong><br><a href="tel:<?= e(SITE['phone_link']) ?>"><?= e(SITE['phone']) ?></a></p>
      <p><strong>E-mail</strong><br><a href="mailto:<?= e(SITE['email']) ?>"><?= e(SITE['email']) ?></a></p>
      <p><strong>Interventions</strong><br>Bordeaux, Libourne et Arcachon, sur rendez-vous.</p>
    </div>
    <div class="contact-form">
      <h2>Envoyer un message</h2>
      <?= render_contact_form($state) ?>
    </div>
  </div>
</section>
