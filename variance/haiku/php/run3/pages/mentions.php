<?php
declare(strict_types=1);

return function (array $ctx): array {
    $body = b_hero('Mentions légales', 'Informations légales relatives au site du cabinet.', null, [])
        . '<section class="block legal"><div class="container legal__inner">'
        . '<h2>Éditeur du site</h2>'
        . '<p>Cabinet Garnier &amp; Associés, société d\'exercice libéral d\'avocats, 25 cours de l\'Intendance, 33000 Bordeaux. Téléphone : 05 56 00 00 00. E-mail : contact@garnier-associes.fr.</p>'
        . '<p>Directrice de la publication : Me Hélène Garnier, avocate associée.</p>'
        . '<h2>Hébergement</h2>'
        . '<p>Le site est hébergé par un prestataire technique dont les coordonnées sont communiquées sur demande écrite au cabinet.</p>'
        . '<h2>Déontologie</h2>'
        . '<p>Les avocats du cabinet sont inscrits au Barreau de Bordeaux et soumis au Règlement intérieur national de la profession d\'avocat.</p>'
        . '<h2>Propriété intellectuelle</h2>'
        . '<p>Les textes, images et éléments graphiques du site sont protégés. Toute reproduction sans autorisation écrite est interdite.</p>'
        . '<h2>Données personnelles</h2>'
        . '<p>Les données saisies dans le formulaire de contact servent uniquement à répondre à votre demande. Vous pouvez demander leur rectification ou leur suppression en écrivant au cabinet.</p>'
        . '<h2>Responsabilité</h2>'
        . '<p>Les informations du site sont à caractère général et ne constituent pas un conseil juridique. Pour votre situation, prenez contact avec le cabinet.</p>'
        . '</div></section>';

    return [
        'title' => 'Mentions légales | Cabinet Garnier & Associés',
        'description' => 'Mentions légales du site du cabinet Garnier & Associés, avocats à Bordeaux : éditeur, hébergement, déontologie et données personnelles.',
        'body' => $body,
    ];
};
