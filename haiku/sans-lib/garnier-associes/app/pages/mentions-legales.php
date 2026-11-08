<?php
declare(strict_types=1);
?>
<section class="section">
  <div class="container narrow prose">
    <h1>Mentions légales</h1>

    <h2>Éditeur du site</h2>
    <p>Garnier &amp; Associés, cabinet d'avocats, <?= e(SITE['address']) ?>.</p>
    <p>Téléphone : <?= e(SITE['phone']) ?> — E-mail : <?= e(SITE['email']) ?></p>
    <p>Forme juridique : [à compléter]. Numéro SIRET : [à compléter].</p>
    <p>Inscription au barreau de Bordeaux. Les avocats sont soumis au Règlement intérieur national de la profession et au Règlement intérieur du barreau de Bordeaux.</p>
    <p>Directrice de la publication : Me Hélène Garnier.</p>

    <h2>Hébergement</h2>
    <p>[Nom et adresse de l'hébergeur à compléter].</p>

    <h2>Propriété intellectuelle</h2>
    <p>Les textes, images et éléments graphiques de ce site sont protégés. Toute reproduction, même partielle, sans autorisation écrite du cabinet est interdite.</p>

    <h2>Données personnelles</h2>
    <p>Les informations transmises par le formulaire de contact (nom, e-mail, téléphone facultatif, domaine, message) servent uniquement à répondre à votre demande. Elles ne sont ni revendues ni cédées à des tiers.</p>
    <p>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour l'exercer, écrivez-nous à <a href="mailto:<?= e(SITE['email']) ?>"><?= e(SITE['email']) ?></a>.</p>

    <h2>Cookies</h2>
    <p>Le site n'utilise aucun cookie de suivi ni de mesure d'audience. Seul un cookie de session technique est déposé lorsque vous utilisez le formulaire de contact, pour protéger l'envoi contre les soumissions frauduleuses.</p>
  </div>
</section>
