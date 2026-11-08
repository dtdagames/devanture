<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rawurldecode($path);
if (PHP_SAPI === 'cli-server') {
    $file = __DIR__ . $path;
    if ($path !== '/' && is_file($file) && basename($file) !== 'index.php' && !preg_match('/\.php$/', $file)) {
        return false;
    }
}
if ($path !== '/') {
    $path = rtrim($path, '/');
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require __DIR__ . '/lib.php';

$routes = [
    '/' => 'page_accueil',
    '/domaines' => 'page_domaines',
    '/cabinet' => 'page_cabinet',
    '/honoraires' => 'page_honoraires',
    '/contact' => 'page_contact',
    '/mentions-legales' => 'page_mentions',
];

function page_accueil(): array
{
    $c = b_hero(
        'Des avocats à vos côtés à Bordeaux',
        'Droit du travail, droit des affaires, droit de la famille : un cabinet indépendant, fondé en 2011, qui vous écoute et vous défend.',
        'hero.svg',
        [['Réserver ma consultation offerte', '/contact'], ['Nos domaines', '/domaines']]
    );
    $c .= b_stats([['2011', 'année de fondation'], ['3', 'avocats associés'], ['3', 'villes d\'intervention'], ['30 min', 'de première consultation offerte']]);
    $c .= b_features('Pourquoi nous confier votre dossier', [
        ['01', 'Première consultation offerte', 'Trente minutes pour exposer votre situation, comprendre vos options et connaître nos honoraires avant de vous engager.'],
        ['02', 'Honoraires transparents', 'Forfait ou temps passé : une convention d\'honoraires est systématiquement signée avant toute intervention.'],
        ['03', 'Proximité', 'Nous intervenons à Bordeaux, Libourne et Arcachon, au plus près de vos juridictions.'],
    ]);
    $c .= b_split(
        'Un cabinet à taille humaine',
        "Trois associés, deux collaboratrices et une assistante : une équipe réduite où chaque dossier est suivi par un avocat identifié, joignable et impliqué.\n\nNous privilégions le dialogue et la recherche d'une solution amiable lorsqu'elle sert vos intérêts, et nous plaidons avec détermination lorsque c'est nécessaire.",
        'cabinet.svg',
        'Le cabinet, cours de l\'Intendance',
        'right'
    );
    $c .= b_faq('Questions fréquentes', [
        ['La première consultation est-elle vraiment gratuite ?', 'Oui. Les trente premières minutes sont offertes, sans engagement, au cabinet ou par téléphone.'],
        ['Où intervenez-vous ?', 'Principalement à Bordeaux, Libourne et Arcachon, ainsi que devant les juridictions de la Gironde.'],
        ['Comment sont calculés vos honoraires ?', 'Au forfait ou au temps passé, selon la nature du dossier. Une convention écrite vous est remise dès le départ.'],
    ]);
    $c .= b_cta('Parlons de votre situation', 'Contactez-nous pour réserver votre première consultation de 30 minutes.', ['Nous contacter', '/contact']);
    return ['Cabinet Garnier & Associés, avocats à Bordeaux', 'Cabinet d\'avocats à Bordeaux, Libourne et Arcachon : droit du travail, des affaires et de la famille. Première consultation offerte.', $c];
}

function page_domaines(): array
{
    $c = b_hero('Domaines d\'intervention', 'Trois spécialités, trois associés référents.', null, [['Prendre rendez-vous', '/contact']]);
    $c .= b_split('Droit du travail', "Me Hélène Garnier accompagne salariés et employeurs : licenciement, rupture conventionnelle, harcèlement, heures supplémentaires, négociation de départ et contentieux prud'homal.\n\nElle intervient en conseil comme en défense devant le conseil de prud'hommes et la cour d'appel de Bordeaux.", 'helene.svg', 'Me Hélène Garnier', 'left', 'travail');
    $c .= b_split('Droit des affaires', "Me Thomas Ruiz conseille dirigeants, indépendants et sociétés : création et structuration, pactes d'associés, baux commerciaux, contrats, recouvrement et litiges entre professionnels.\n\nIl sécurise vos décisions en amont pour éviter les contentieux coûteux.", 'thomas.svg', 'Me Thomas Ruiz', 'right', 'affaires');
    $c .= b_split('Droit de la famille', "Me Inès Kaddour vous assiste dans les moments sensibles : divorce, séparation, garde des enfants, pensions, liquidation de régime matrimonial, successions.\n\nElle favorise chaque fois que possible les accords, avec écoute et discrétion.", 'ines.svg', 'Me Inès Kaddour', 'left', 'famille');
    $c .= b_gallery('Nos zones d\'intervention', [['bordeaux.svg', 'Bordeaux'], ['libourne.svg', 'Libourne'], ['arcachon.svg', 'Arcachon']]);
    $c .= b_cta('Un doute sur le domaine concerné ?', 'Décrivez-nous votre situation : nous vous orienterons vers le bon interlocuteur.', ['Nous écrire', '/contact']);
    return ['Domaines d\'intervention | Cabinet Garnier & Associés', 'Droit du travail, droit des affaires et droit de la famille à Bordeaux, Libourne et Arcachon.', $c];
}

function page_cabinet(): array
{
    $c = b_hero('Le cabinet', 'Une équipe de six personnes, un engagement commun : vous défendre avec rigueur.', null, [['Rencontrer l\'équipe', '#equipe']]);
    $c .= b_split('Notre histoire', "Le cabinet Garnier & Associés a été fondé en 2011 à Bordeaux, cours de l'Intendance. Il s'est construit autour d'une idée simple : un justiciable informé et accompagné fait de meilleurs choix.\n\nAu fil des années, deux autres associés ont rejoint Me Garnier pour couvrir le droit des affaires et le droit de la famille.", 'cabinet.svg', 'Les locaux du cabinet', 'right');
    $c .= '<span id="equipe"></span>' . b_team('Les associés', [
        ['Me Hélène Garnier', 'Associée fondatrice, droit du travail', 'Avocate depuis 2008, elle défend salariés et employeurs devant les juridictions du travail.', 'helene.svg'],
        ['Me Thomas Ruiz', 'Associé, droit des affaires', 'Il conseille entrepreneurs et sociétés dans leurs projets, contrats et différends.', 'thomas.svg'],
        ['Me Inès Kaddour', 'Associée, droit de la famille', 'Elle accompagne les familles dans les séparations, la garde des enfants et les successions.', 'ines.svg'],
    ]);
    $c .= b_team('Toute l\'équipe', [
        ['Deux collaboratrices', 'Avocates collaboratrices', 'Elles travaillent aux côtés des associés sur l\'ensemble des dossiers du cabinet.', null],
        ['Une assistante', 'Assistante juridique', 'Premier contact du cabinet, elle gère votre agenda et la bonne circulation de vos pièces.', null],
    ]);
    $c .= b_stats([['2011', 'création'], ['6', 'personnes'], ['3', 'domaines'], ['3', 'villes']]);
    return ['Le cabinet | Cabinet Garnier & Associés', 'Découvrez l\'équipe du cabinet Garnier & Associés : trois associés, deux collaboratrices et une assistante.', $c];
}

function page_honoraires(): array
{
    $c = b_hero('Honoraires', 'Des tarifs expliqués avant d\'agir, par écrit.', null, [['Consultation offerte', '/contact']]);
    $c .= b_features('Nos principes', [
        ['01', 'Première consultation offerte', '30 minutes pour faire le point, sans frais ni engagement.'],
        ['02', 'Convention systématique', 'Chaque mission fait l\'objet d\'une convention d\'honoraires signée avant le début des travaux.'],
        ['03', 'Deux modes de facturation', 'Forfait lorsque la mission est bien délimitée, temps passé lorsque son ampleur est incertaine.'],
    ]);
    $c .= b_table('Les deux formules', ['', 'Forfait', 'Temps passé'], [
        ['Principe', 'Prix fixé à l\'avance pour une mission définie', 'Facturation selon le temps réellement consacré au dossier'],
        ['Adapté à', 'Rédaction d\'actes, divorce par consentement mutuel, procédure simple', 'Contentieux long, dossier évolutif'],
        ['Visibilité', 'Montant connu dès la signature', 'Estimation initiale et suivi du temps communiqué'],
    ]);
    $c .= b_faq('À savoir sur les honoraires', [
        ['Que comprend la convention d\'honoraires ?', 'Le périmètre de la mission, le mode de calcul, les frais éventuels et les modalités de paiement.'],
        ['Puis-je bénéficier de l\'aide juridictionnelle ?', 'Si vos ressources le permettent, l\'aide juridictionnelle peut prendre en charge tout ou partie des frais. Nous vous aidons à constituer le dossier.'],
        ['Les montants sont-ils indiqués ici ?', 'Non : ils dépendent de chaque situation. Ils vous sont communiqués lors de la première consultation.'],
    ]);
    $c .= b_cta('Obtenir une estimation', 'Exposez-nous votre dossier lors d\'une première consultation offerte.', ['Prendre rendez-vous', '/contact']);
    return ['Honoraires | Cabinet Garnier & Associés', 'Honoraires au forfait ou au temps passé, convention systématique et première consultation de 30 minutes offerte.', $c];
}

function page_contact(): array
{
    $c = b_hero('Contact', 'Première consultation de 30 minutes offerte.');
    $c .= '<section class="band"><div class="wrap split"><div class="split-text"><h2>Nos coordonnées</h2><address>' . e(SITE_ADDR) . '<br>Tél. <a href="tel:+33556000000">' . e(SITE_PHONE) . '</a><br><a href="mailto:' . e(SITE_MAIL) . '">' . e(SITE_MAIL) . '</a></address>'
        . '<p>Nous recevons sur rendez-vous à Bordeaux et intervenons à Libourne et Arcachon.</p></div>'
        . '<div id="formulaire"><h2>Écrivez-nous</h2>' . contact_form(['name' => true, 'email' => true, 'phone' => false, 'subject' => false, 'message' => true]) . '</div></div></section>';
    return ['Contact | Cabinet Garnier & Associés', 'Contactez le cabinet Garnier & Associés à Bordeaux : téléphone, e-mail et formulaire.', $c];
}

function page_mentions(): array
{
    $c = '<section class="band"><div class="wrap narrow legal"><h1>Mentions légales</h1>'
        . '<h2>Éditeur du site</h2>' . paras("Cabinet Garnier & Associés, cabinet d'avocats fondé en 2011.\n\n" . SITE_ADDR . ". Téléphone : " . SITE_PHONE . ". E-mail : " . SITE_MAIL . ".")
        . '<h2>Profession réglementée</h2>' . paras("Les avocats du cabinet exercent au Barreau de Bordeaux et sont soumis au règlement intérieur national de la profession d'avocat et aux règles déontologiques en vigueur, consultables sur le site du Conseil national des barreaux.")
        . '<h2>Données personnelles</h2>' . paras("Les informations saisies dans le formulaire de contact sont utilisées uniquement pour répondre à votre demande et ne sont pas transmises à des tiers. Vous disposez d'un droit d'accès, de rectification et de suppression en écrivant à " . SITE_MAIL . ".")
        . '<h2>Hébergement</h2>' . paras("Hébergeur : à compléter avec les coordonnées de l'hébergeur retenu.")
        . '<h2>Propriété intellectuelle</h2>' . paras("Les textes et visuels de ce site sont la propriété du cabinet. Toute reproduction sans autorisation est interdite.")
        . '</div></section>';
    return ['Mentions légales | Cabinet Garnier & Associés', 'Mentions légales du cabinet Garnier & Associés, avocats à Bordeaux.', $c];
}

if (isset($routes[$path])) {
    [$t, $d, $c] = ($routes[$path])();
    layout($t, $d, $path, $c);
} else {
    $c = b_hero('Page introuvable', 'La page demandée n\'existe pas ou a été déplacée.', null, [['Retour à l\'accueil', '/']]);
    layout('Page introuvable | Cabinet Garnier & Associés', 'Cette page n\'existe pas.', '', $c, 404);
}
