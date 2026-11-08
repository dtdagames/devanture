<?php
declare(strict_types=1);

require_once __DIR__ . '/../inc/blocks.php';
require_once __DIR__ . '/../inc/contact.php';

$formConfig = contact_config(site_config()['contact_recipient']);
$etat = contact_process($formConfig);
$site = site_config();

return [
    'title' => 'Contact | Boulangerie Le Fournil, Nantes',
    'description' => 'Écrivez à la boulangerie Le Fournil, 8 rue de la Juiverie à Nantes : questions, commandes et demandes de devis pour vos événements.',
    'body' => static function () use ($formConfig, $etat, $site): void {
        block_hero([
            'title' => 'Nous contacter',
            'subtitle' => 'Une question, une commande ou un devis pour un événement ? Écrivez-nous ou appelez-nous.',
        ]);

        echo '<section class="section"><div class="container split-grid">';

        echo '<div><h2>Envoyer un message</h2>';
        render_contact_form($formConfig, $etat);
        echo '</div>';

        echo '<div><h2>Nous trouver</h2>';
        echo '<p>' . e($site['address']) . '</p>';
        echo '<p>Téléphone : <a href="' . e($site['phone_link']) . '">' . e($site['phone']) . '</a></p>';
        echo '<p>E-mail : <a href="mailto:' . e($site['email']) . '">' . e($site['email']) . '</a></p>';
        echo '<p>' . e($site['hours']) . '</p>';
        echo '<p>Le Fournil se trouve dans le quartier Bouffay, à quelques minutes à pied du centre-ville.</p>';
        echo '</div>';

        echo '</div></section>';
    },
];
