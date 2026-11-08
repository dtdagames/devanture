<?php
declare(strict_types=1);

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$path = $path === '/' ? '/' : rtrim($path, '/');

// Fichiers statiques existants (jamais les sources PHP ni data/)
if ($path !== '/' && !preg_match('#\.php$|^/data(/|$)#', $path)) {
    $file = realpath(__DIR__ . $path);
    if ($file !== false && is_file($file) && str_starts_with($file, realpath(__DIR__) . DIRECTORY_SEPARATOR)) {
        return false;
    }
}

require __DIR__ . '/lib.php';
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

$A = SITE['address'];

$pages = [
    '/' => ['Cabinet Garnier & Associés, avocats à Bordeaux', 'Cabinet d\'avocats à Bordeaux depuis 2011 : droit du travail, des affaires et de la famille. Première consultation de 30 minutes offerte.', 'home'],
    '/domaines-d-intervention' => ['Domaines d\'intervention | Garnier & Associés', 'Droit du travail, droit des affaires et droit de la famille : les domaines d\'intervention du cabinet Garnier & Associés à Bordeaux.', 'domaines'],
    '/le-cabinet' => ['Le cabinet et l\'équipe | Garnier & Associés', 'Trois associés, deux collaboratrices et une assistante au service des particuliers et des entreprises de Bordeaux, Libourne et Arcachon.', 'cabinet'],
    '/honoraires' => ['Honoraires | Garnier & Associés', 'Honoraires au forfait ou au temps passé, convention d\'honoraires systématique et première consultation de 30 minutes offerte.', 'honoraires'],
    '/contact' => ['Contact | Garnier & Associés', 'Contactez le cabinet Garnier & Associés, 25 cours de l\'Intendance à Bordeaux : téléphone, e-mail ou formulaire.', 'contact'],
    '/mentions-legales' => ['Mentions légales | Garnier & Associés', 'Mentions légales du cabinet Garnier & Associés, avocats au Barreau de Bordeaux.', 'mentions'],
];

if (!isset($pages[$path])) {
    layout('Page introuvable | Garnier & Associés', 'La page demandée n\'existe pas.', '',
        b_hero('Page introuvable', 'Cette adresse ne correspond à aucune page du site.', null, [['Retour à l\'accueil', '/'], ['Nous contacter', '/contact']]), 404);
    return true;
}

[$title, $desc, $key] = $pages[$path];
$body = '';

switch ($key) {
    case 'home':
        $body .= b_hero('Des avocats à vos côtés à Bordeaux', 'Droit du travail, droit des affaires, droit de la famille : un conseil clair et une défense engagée, depuis 2011.', '/assets/hero.svg',
            [['Prendre rendez-vous', '/contact'], ['Nos domaines', '/domaines-d-intervention']]);
        $body .= b_stats([['2011', 'Année de fondation'], ['3', 'Avocats associés'], ['6', 'Personnes au cabinet'], ['30 min', 'Première consultation offerte']]);
        $body .= b_features('Pourquoi nous confier votre dossier', [
            ['§', 'Première consultation offerte', 'Trente minutes pour exposer votre situation et connaître vos options, sans engagement.'],
            ['€', 'Honoraires transparents', 'Forfait ou temps passé, toujours encadrés par une convention d\'honoraires écrite.'],
            ['★', 'Un interlocuteur identifié', 'Chaque dossier est suivi par un associé, assisté d\'une collaboratrice.'],
        ]);
        $body .= b_textimg('Un cabinet à taille humaine', [
            'Fondé en 2011 par Me Hélène Garnier, le cabinet réunit aujourd\'hui trois associés, deux collaboratrices et une assistante. Nous accompagnons particuliers, salariés, dirigeants et entreprises.',
            'Nous intervenons à Bordeaux, Libourne et Arcachon, et nous nous déplaçons chaque fois que votre dossier l\'exige.',
        ], '/assets/cabinet.svg', 'Le cabinet, cours de l\'Intendance', 'right', ['Découvrir l\'équipe', '/le-cabinet']);
        $body .= b_gallery('Le cabinet en images', [['/assets/hero.svg', 'Bordeaux, place de la Bourse'], ['/assets/cabinet.svg', 'Le cabinet cours de l\'Intendance'], ['/assets/salle.svg', 'Salle de réunion']]);
        $body .= b_cta('Votre première consultation est offerte', 'Appelez-nous au ' . SITE['phone'] . ' ou écrivez-nous : nous vous répondons sous un jour ouvré.', ['Nous contacter', '/contact']);
        break;

    case 'domaines':
        $body .= b_hero('Domaines d\'intervention', 'Trois spécialités, trois associés : le bon expert dès le premier rendez-vous.', null, [['Poser une question', '/contact']]);
        $body .= b_textimg('Droit du travail, avec Me Hélène Garnier', [
            'Licenciement, rupture conventionnelle, harcèlement, heures supplémentaires, contentieux prud\'homal : nous défendons les salariés comme les employeurs, avec la même exigence de rigueur.',
            'Nous intervenons aussi en amont : rédaction de contrats, audit de pratiques RH, négociation de départ.',
        ], '/assets/cabinet.svg', 'Illustration du cabinet', 'right');
        $body .= b_textimg('Droit des affaires, avec Me Thomas Ruiz', [
            'Création et structuration de société, pactes d\'associés, baux commerciaux, cession de fonds, recouvrement de créances et litiges entre professionnels.',
            'Nous conseillons les dirigeants de TPE et de PME de la métropole bordelaise, du Libournais et du bassin d\'Arcachon.',
        ], '/assets/salle.svg', 'Salle de réunion du cabinet', 'left');
        $body .= b_textimg('Droit de la famille, avec Me Inès Kaddour', [
            'Divorce, séparation, garde des enfants, pension alimentaire, succession et liquidation de régime matrimonial : un accompagnement attentif dans des moments souvent difficiles.',
            'Nous privilégions les solutions amiables lorsque c\'est possible, et plaidons avec détermination lorsque c\'est nécessaire.',
        ], '/assets/hero.svg', 'Bordeaux, place de la Bourse', 'right');
        $body .= b_faq('Questions fréquentes', [
            ['Dans quelles villes intervenez-vous ?', 'Nous intervenons à Bordeaux, Libourne et Arcachon, ainsi que devant les juridictions de la région.'],
            ['Comment se déroule la première consultation ?', 'Elle dure 30 minutes et est offerte. Vous exposez votre situation, nous vous indiquons les démarches possibles et une estimation de leur coût.'],
            ['Puis-je vous confier un dossier à distance ?', 'Oui, les échanges peuvent se faire par téléphone, visioconférence ou e-mail, selon votre préférence.'],
        ]);
        $body .= b_cta('Un doute sur le domaine concerné ?', 'Décrivez-nous votre situation : nous vous orienterons vers l\'associé compétent.', ['Nous écrire', '/contact']);
        break;

    case 'cabinet':
        $body .= b_hero('Le cabinet', 'Une équipe de six personnes, réunie autour de valeurs simples : écoute, rigueur et franchise.', null, [['Rencontrer l\'équipe', '#equipe']]);
        $body .= b_textimg('Notre histoire', [
            'Le cabinet Garnier & Associés a été fondé à Bordeaux en 2011. Il s\'est construit autour d\'une conviction : un client bien informé prend de meilleures décisions.',
            'Aujourd\'hui, trois associés et deux collaboratrices travaillent au quotidien avec une assistante qui accueille et oriente nos clients.',
        ], '/assets/cabinet.svg', 'Le cabinet cours de l\'Intendance', 'left');
        $body .= '<div id="equipe"></div>' . b_team('Les associés', [
            ['Me Hélène Garnier', 'Associée fondatrice, droit du travail', 'Avocate depuis plus de quinze ans, elle plaide devant les conseils de prud\'hommes et les cours d\'appel.', 'H'],
            ['Me Thomas Ruiz', 'Associé, droit des affaires', 'Il accompagne les dirigeants dans la création, le financement et la transmission de leur entreprise.', 'T'],
            ['Me Inès Kaddour', 'Associée, droit de la famille', 'Elle intervient en divorce, en droit des enfants et en succession, avec une préférence pour les accords amiables.', 'I'],
        ]);
        $body .= b_features('Le reste de l\'équipe', [
            ['2', 'Deux collaboratrices', 'Avocates collaboratrices, elles instruisent les dossiers aux côtés des associés.'],
            ['1', 'Une assistante', 'Premier contact du cabinet, elle gère les rendez-vous et l\'organisation des dossiers.'],
            ['3', 'Trois villes', 'Bordeaux, Libourne et Arcachon : nous nous déplaçons près de chez vous.'],
        ]);
        $body .= b_cta('Faisons connaissance', 'Première consultation de 30 minutes offerte.', ['Prendre rendez-vous', '/contact']);
        break;

    case 'honoraires':
        $body .= b_hero('Honoraires', 'Un coût connu à l\'avance, une convention écrite pour chaque dossier.', null, [['Demander un devis', '/contact']]);
        $body .= b_features('Deux modes de facturation', [
            ['F', 'Au forfait', 'Pour les missions dont le périmètre est connu : rédaction d\'acte, création de société, divorce par consentement mutuel.'],
            ['T', 'Au temps passé', 'Pour les dossiers dont la durée est incertaine, sur la base d\'un taux horaire annoncé et d\'un suivi régulier.'],
        ], 2);
        $body .= b_prose('Notre engagement de transparence', [
            'Une convention d\'honoraires est systématiquement établie avant le début de la mission. Elle précise le périmètre de l\'intervention, le mode de calcul et les frais éventuels (greffe, huissier, déplacement).',
            'La première consultation de 30 minutes est offerte. Elle permet de définir ensemble la stratégie et de vous présenter une estimation.',
            'Selon vos ressources, vous pouvez bénéficier de l\'aide juridictionnelle : nous vous aidons à constituer le dossier.',
        ]);
        $body .= b_faq('Questions sur les honoraires', [
            ['La première consultation est-elle vraiment gratuite ?', 'Oui, les 30 premières minutes sont offertes et sans engagement.'],
            ['Puis-je connaître le coût total à l\'avance ?', 'Au forfait, le montant est fixé dès la convention. Au temps passé, nous vous donnons une fourchette et vous informons en cas d\'évolution.'],
            ['Peut-on régler en plusieurs fois ?', 'Un échelonnement peut être prévu dans la convention, à discuter lors du premier rendez-vous.'],
        ]);
        $body .= b_cta('Parlons de votre dossier', 'Une consultation offerte pour y voir clair.', ['Nous contacter', '/contact']);
        break;

    case 'contact':
        $fields = [
            'name' => ['Nom', 'text', true],
            'email' => ['E-mail', 'email', true],
            'phone' => ['Téléphone', 'tel', false],
            'subject' => ['Sujet', 'text', false],
            'message' => ['Message', 'textarea', true],
        ];
        $form = handle_contact($fields, SITE['email']);
        $body .= b_hero('Contact', 'Appelez-nous, écrivez-nous ou passez au cabinet.', null, []);
        $body .= b_features('Nos coordonnées', [
            ['@', 'Adresse', $A . '. Interventions à Bordeaux, Libourne et Arcachon.'],
            ['☎', 'Téléphone', SITE['phone']],
            ['✉', 'E-mail', SITE['email']],
        ]);
        $body .= b_contact_form($form);
        break;

    case 'mentions':
        $body .= b_hero('Mentions légales', 'Informations légales relatives au site du cabinet.', null, []);
        $body .= b_prose('Éditeur du site', [
            'Cabinet Garnier & Associés, société d\'avocats fondée en 2011, ' . $A . '. Téléphone : ' . SITE['phone'] . '. E-mail : ' . SITE['email'] . '.',
            'Directrice de la publication : Me Hélène Garnier. Les avocats du cabinet sont inscrits au Barreau de Bordeaux et soumis au règlement intérieur national de la profession d\'avocat.',
        ]);
        $body .= b_prose('Hébergement', ['Le site est hébergé par un prestataire dont les coordonnées sont communiquées sur simple demande à l\'adresse du cabinet.']);
        $body .= b_prose('Propriété intellectuelle', ['L\'ensemble des contenus de ce site est protégé. Toute reproduction sans autorisation écrite du cabinet est interdite.']);
        $body .= b_prose('Données personnelles', [
            'Les informations saisies dans le formulaire de contact sont utilisées uniquement pour répondre à votre demande et sont couvertes par le secret professionnel. Vous pouvez exercer vos droits d\'accès, de rectification et de suppression en écrivant à ' . SITE['email'] . '.',
            'Ce site n\'utilise pas de cookie de suivi ; seul un cookie de session technique protège le formulaire.',
        ]);
        break;
}

layout($title, $desc, $path, $body);
return true;
