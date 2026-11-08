<?php
$meta = [
    'title'       => 'Mentions légales | Boulangerie Le Fournil, Nantes',
    'description' => 'Mentions légales du site de la boulangerie Le Fournil à Nantes : éditeur, hébergeur, données personnelles, cookies et crédits.',
];

render_component('hero', [
    'title'    => 'Mentions légales',
    'subtitle' => 'Informations légales relatives au site lefournil-nantes.fr.',
    'align'    => 'left',
]);

render_component('richtext', [
    'title' => 'Éditeur du site',
    'text'  => <<<'TXT'
Le site lefournil-nantes.fr est édité par la SARL Le Fournil, société à responsabilité limitée au capital de 20 000 €, immatriculée au registre du commerce et des sociétés de Nantes sous le numéro 512 846 237 (SIRET 512 846 237 00014, code APE 1071C – Boulangerie et boulangerie-pâtisserie). Numéro de TVA intracommunautaire : FR 42 512846237.

Siège social et boutique : 8 rue de la Juiverie, 44000 Nantes. Téléphone : 02 40 00 00 00. E-mail : bonjour@lefournil-nantes.fr.

Directrice de la publication : Anne Lefèvre, cogérante.
TXT,
]);

render_component('richtext', [
    'title' => 'Hébergement',
    'text'  => <<<'TXT'
Le site est hébergé par OVH SAS, 2 rue Kellermann, 59100 Roubaix, France – téléphone 1007 – www.ovhcloud.com.
TXT,
]);

render_component('richtext', [
    'title' => 'Données personnelles',
    'text'  => <<<'TXT'
Les informations saisies dans le formulaire de contact (nom, adresse e-mail, téléphone, sujet et message) sont utilisées uniquement pour répondre à votre demande et, le cas échéant, établir un devis. Elles sont destinées à la SARL Le Fournil et ne sont transmises à aucun tiers. Elles sont conservées 12 mois à compter du dernier échange, puis supprimées.

Conformément au règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés, vous disposez d’un droit d’accès, de rectification, d’effacement et d’opposition sur les données vous concernant. Pour l’exercer, écrivez-nous à bonjour@lefournil-nantes.fr ou par courrier à l’adresse de la boutique. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).
TXT,
]);

render_component('richtext', [
    'title' => 'Cookies',
    'text'  => <<<'TXT'
Ce site n’utilise aucun cookie de mesure d’audience ni de publicité. Un seul cookie technique de session est déposé lors de l’utilisation du formulaire de contact, pour sécuriser l’envoi ; il est supprimé à la fermeture du navigateur.
TXT,
]);

render_component('richtext', [
    'title' => 'Propriété intellectuelle et crédits',
    'text'  => <<<'TXT'
L’ensemble des textes, visuels et éléments graphiques de ce site est la propriété de la SARL Le Fournil, sauf mention contraire. Toute reproduction, même partielle, est soumise à autorisation écrite préalable.

Conception et réalisation du site : SARL Le Fournil. Illustrations : images de substitution, en attente des photographies de la boulangerie.
TXT,
]);
