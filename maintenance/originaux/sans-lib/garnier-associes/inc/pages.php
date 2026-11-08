<?php
declare(strict_types=1);

/** Contenu des pages : route => [title, description, blocks[]] */
function site_pages(): array
{
    $consult = ['Prendre rendez-vous', '/contact'];

    return [
        '/' => [
            'Garnier & Associés — Avocats à Bordeaux, Libourne et Arcachon',
            'Cabinet d\'avocats à Bordeaux depuis 2011 : droit du travail, droit des affaires, droit de la famille. Première consultation de 30 minutes offerte.',
            [
                ['type' => 'hero', 'image' => '/assets/hero.svg',
                    'title' => 'Des avocats à vos côtés, à Bordeaux et en Gironde',
                    'subtitle' => 'Droit du travail, droit des affaires, droit de la famille. Première consultation de 30 minutes offerte.',
                    'buttons' => [$consult, ['Nos domaines', '/domaines', true]]],
                ['type' => 'stats', 'items' => [['2011', 'Année de fondation'], ['3', 'Avocats associés'], ['2', 'Collaboratrices'], ['3', 'Villes d\'intervention']]],
                ['type' => 'features', 'title' => 'Une approche claire et transparente', 'cols' => 3, 'items' => [
                    ['§', 'Première consultation offerte', '30 minutes pour exposer votre situation, comprendre vos options et évaluer les suites possibles, sans engagement.'],
                    ['€', 'Honoraires annoncés d\'avance', 'Forfait ou temps passé, selon le dossier. Une convention d\'honoraires est systématiquement signée avant toute intervention.'],
                    ['◎', 'Proximité', 'Rendez-vous à Bordeaux, Libourne et Arcachon, ainsi que par téléphone ou visioconférence si vous le préférez.'],
                ]],
                ['type' => 'richtext', 'side' => 'right', 'title' => 'Un cabinet à taille humaine', 'image' => '/assets/cabinet.svg', 'alt' => 'Le cabinet, cours de l\'Intendance à Bordeaux',
                    'paragraphs' => [
                        'Fondé en 2011 par Me Hélène Garnier, le cabinet réunit aujourd\'hui trois associés, deux collaboratrices et une assistante. Chaque dossier est suivi par un avocat identifié, qui reste votre interlocuteur du début à la fin.',
                        'Nous plaidons devant les juridictions de Bordeaux, Libourne et Arcachon, et conseillons particuliers, dirigeants et salariés en amont des litiges autant que dans leur résolution.',
                    ],
                    'button' => ['Découvrir le cabinet', '/cabinet']],
                ['type' => 'faq', 'title' => 'Questions fréquentes', 'items' => [
                    ['La première consultation est-elle vraiment gratuite ?', 'Oui. Les 30 premières minutes sont offertes et sans engagement. Si vous souhaitez nous confier votre dossier, nous établissons ensuite une convention d\'honoraires.'],
                    ['Où se déroulent les rendez-vous ?', 'Au cabinet, 25 cours de l\'Intendance à Bordeaux, ainsi qu\'à Libourne et Arcachon sur rendez-vous. Un échange par téléphone ou visioconférence est possible.'],
                    ['Comment sont calculés vos honoraires ?', 'Au forfait lorsque la mission est bien délimitée, ou au temps passé lorsque son ampleur est incertaine. Le mode de calcul est toujours écrit dans la convention.'],
                ]],
                ['type' => 'cta', 'title' => 'Parlons de votre situation', 'text' => 'Décrivez-nous votre dossier : nous revenons vers vous sous un jour ouvré pour fixer un rendez-vous.', 'button' => $consult],
            ],
        ],

        '/domaines' => [
            'Domaines d\'intervention — Garnier & Associés',
            'Droit du travail, droit des affaires et droit de la famille : les domaines dans lesquels le cabinet Garnier & Associés intervient à Bordeaux.',
            [
                ['type' => 'hero', 'title' => 'Nos domaines d\'intervention', 'subtitle' => 'Trois spécialités, trois associés référents, une même exigence de clarté.'],
                ['type' => 'richtext', 'side' => 'left', 'title' => 'Droit du travail — Me Hélène Garnier', 'image' => '/assets/bureau.svg', 'alt' => 'Bureau de Me Garnier',
                    'paragraphs' => [
                        'Nous conseillons et défendons les salariés comme les employeurs : contrats de travail, durée et organisation du temps de travail, harcèlement, discrimination, accidents du travail.',
                        'En cas de rupture, nous intervenons sur les licenciements, les ruptures conventionnelles et les contentieux prud\'homaux.',
                    ],
                    'list' => ['Licenciement et rupture conventionnelle', 'Prud\'hommes et négociation transactionnelle', 'Conseil aux employeurs et aux salariés']],
                ['type' => 'richtext', 'side' => 'right', 'alt_bg' => true, 'title' => 'Droit des affaires — Me Thomas Ruiz', 'image' => '/assets/bibliotheque.svg', 'alt' => 'Bibliothèque juridique',
                    'paragraphs' => [
                        'Nous accompagnons les créateurs et dirigeants de TPE et PME : choix de la structure, pactes d\'associés, cession d\'entreprise, baux commerciaux et recouvrement de créances.',
                        'Notre rôle est de sécuriser vos décisions en amont et de défendre vos intérêts devant les tribunaux de commerce en cas de différend.',
                    ],
                    'list' => ['Création et structuration de sociétés', 'Baux commerciaux et contrats', 'Litiges entre associés et recouvrement']],
                ['type' => 'richtext', 'side' => 'left', 'title' => 'Droit de la famille — Me Inès Kaddour', 'image' => '/assets/salle.svg', 'alt' => 'Salle de réunion du cabinet',
                    'paragraphs' => [
                        'Divorce, séparation, garde des enfants, pensions alimentaires, partage des biens : nous vous accompagnons dans des moments délicats avec écoute et discrétion.',
                        'Nous privilégions, lorsque c\'est possible, les solutions amiables, et plaidons avec détermination lorsque le dialogue n\'est plus envisageable.',
                    ],
                    'list' => ['Divorce par consentement mutuel ou contentieux', 'Autorité parentale et résidence des enfants', 'Régimes matrimoniaux et successions familiales']],
                ['type' => 'cta', 'title' => 'Un doute sur le domaine concerné ?', 'text' => 'Contactez-nous : nous vous orienterons vers l\'avocat du cabinet le plus à même de traiter votre dossier.', 'button' => ['Nous contacter', '/contact']],
            ],
        ],

        '/cabinet' => [
            'Le cabinet et son équipe — Garnier & Associés',
            'Présentation du cabinet Garnier & Associés, fondé en 2011 à Bordeaux : trois associés, deux collaboratrices et une assistante.',
            [
                ['type' => 'hero', 'title' => 'Le cabinet', 'subtitle' => 'Depuis 2011, une équipe d\'avocats bordelais au service des particuliers et des entreprises.'],
                ['type' => 'team', 'title' => 'Les associés', 'members' => [
                    ['Me Hélène Garnier', 'Associée fondatrice — Droit du travail', 'Fonde le cabinet en 2011. Elle intervient en conseil et en contentieux auprès de salariés et d\'employeurs.'],
                    ['Me Thomas Ruiz', 'Associé — Droit des affaires', 'Accompagne les dirigeants de TPE et PME dans la création, la vie et la transmission de leur entreprise.'],
                    ['Me Inès Kaddour', 'Associée — Droit de la famille', 'Accompagne les familles dans les procédures de divorce, de séparation et de protection des enfants.'],
                ]],
                ['type' => 'richtext', 'side' => 'right', 'alt_bg' => true, 'title' => 'Une équipe complète', 'image' => '/assets/accueil.svg', 'alt' => 'Accueil du cabinet',
                    'paragraphs' => [
                        'Les trois associés sont épaulés par deux avocates collaboratrices, qui interviennent sur les dossiers sous leur supervision, et par une assistante qui assure l\'accueil, l\'organisation des rendez-vous et le suivi administratif.',
                        'Cette organisation nous permet de répondre rapidement et de répartir le travail selon la nature et l\'urgence de chaque dossier.',
                    ]],
                ['type' => 'features', 'title' => 'Nos engagements', 'cols' => 2, 'items' => [
                    ['✓', 'Transparence', 'Une convention d\'honoraires écrite pour chaque dossier, des points d\'étape réguliers et des réponses claires.'],
                    ['✓', 'Confidentialité', 'Le secret professionnel est la base de notre relation : ce que vous nous confiez reste entre nous.'],
                    ['✓', 'Disponibilité', 'Un avocat référent identifié et un délai de réponse annoncé dès le premier rendez-vous.'],
                    ['✓', 'Recherche de solutions', 'Négociation et médiation d\'abord quand elles servent vos intérêts, plaidoirie lorsque c\'est nécessaire.'],
                ]],
                ['type' => 'gallery', 'title' => 'Le cabinet en images', 'items' => [
                    ['/assets/cabinet.svg', 'Le cabinet, cours de l\'Intendance'],
                    ['/assets/accueil.svg', 'Accueil du cabinet'],
                    ['/assets/salle.svg', 'Salle de réunion'],
                    ['/assets/bibliotheque.svg', 'Bibliothèque juridique'],
                ]],
                ['type' => 'stats', 'items' => [['2011', 'Année de fondation'], ['3', 'Associés'], ['6', 'Personnes au cabinet'], ['3', 'Villes d\'intervention']]],
            ],
        ],

        '/honoraires' => [
            'Honoraires — Garnier & Associés',
            'Honoraires au forfait ou au temps passé, convention d\'honoraires systématique et première consultation de 30 minutes offerte.',
            [
                ['type' => 'hero', 'title' => 'Honoraires', 'subtitle' => 'Des honoraires expliqués avant le début de la mission, jamais découverts après.',
                    'buttons' => [['Demander un rendez-vous', '/contact']]],
                ['type' => 'features', 'title' => 'Deux modes de rémunération', 'cols' => 3, 'items' => [
                    ['1', 'Première consultation offerte', '30 minutes pour faire le point sur votre situation. Aucun engagement de votre part.'],
                    ['2', 'Honoraires au forfait', 'Un prix fixé à l\'avance pour une mission définie (rédaction d\'un acte, divorce par consentement mutuel, procédure précise).'],
                    ['3', 'Honoraires au temps passé', 'Un taux horaire convenu à l\'avance, avec un décompte détaillé, lorsque l\'ampleur du dossier ne peut être connue d\'emblée.'],
                ]],
                ['type' => 'richtext', 'side' => 'right', 'alt_bg' => true, 'title' => 'La convention d\'honoraires', 'image' => '/assets/bureau.svg', 'alt' => 'Signature d\'une convention',
                    'paragraphs' => [
                        'Avant toute intervention, nous établissons systématiquement une convention d\'honoraires écrite. Elle précise la mission confiée, le mode de calcul des honoraires, les frais éventuels (greffe, huissier, déplacements) et les modalités de paiement.',
                        'Le montant précis dépend de la nature et de la complexité du dossier ; il vous est communiqué à l\'issue de la première consultation. Selon vos ressources, vous pouvez par ailleurs prétendre à l\'aide juridictionnelle ou à la prise en charge par votre assurance de protection juridique.',
                    ]],
                ['type' => 'faq', 'title' => 'Vos questions sur les honoraires', 'items' => [
                    ['Que comprend la première consultation offerte ?', 'Un entretien de 30 minutes pour analyser votre situation et vous présenter les démarches possibles. Elle ne comprend ni rédaction d\'actes, ni démarches pour votre compte.'],
                    ['Puis-je connaître le coût total avant de m\'engager ?', 'Au forfait, le prix est ferme. Au temps passé, nous vous indiquons une estimation et vous tenons informé en cas d\'évolution significative.'],
                    ['Les frais de procédure sont-ils inclus ?', 'Non, les frais annexes (huissier, greffe, expertise) sont distincts des honoraires et détaillés dans la convention.'],
                    ['Mon assurance peut-elle prendre en charge mes frais ?', 'Si vous bénéficiez d\'une assurance de protection juridique, elle peut couvrir tout ou partie des honoraires. Vous avez le libre choix de votre avocat.'],
                ]],
                ['type' => 'cta', 'title' => 'Obtenir une estimation', 'text' => 'Exposez-nous votre dossier lors d\'une première consultation offerte.', 'button' => ['Prendre rendez-vous', '/contact']],
            ],
        ],

        '/contact' => [
            'Contact — Garnier & Associés',
            'Contactez le cabinet Garnier & Associés à Bordeaux : 25 cours de l\'Intendance, 05 56 00 00 00, contact@garnier-associes.fr.',
            [
                ['type' => 'hero', 'title' => 'Nous contacter', 'subtitle' => 'Première consultation de 30 minutes offerte. Réponse sous un jour ouvré.'],
                ['type' => 'features', 'cols' => 3, 'items' => [
                    ['☎', 'Téléphone', SITE['phone']],
                    ['✉', 'E-mail', SITE['email']],
                    ['⌂', 'Adresse', SITE['address']],
                ]],
                ['type' => 'contact_form', 'title' => 'Écrivez-nous', 'intro' => 'Décrivez brièvement votre situation. Nous vous recontactons pour fixer un rendez-vous à Bordeaux, Libourne ou Arcachon.'],
            ],
        ],

        '/mentions-legales' => [
            'Mentions légales — Garnier & Associés',
            'Mentions légales du site du cabinet d\'avocats Garnier & Associés, Bordeaux.',
            [
                ['type' => 'hero', 'title' => 'Mentions légales'],
                ['type' => 'richtext', 'title' => 'Éditeur du site', 'paragraphs' => [
                    'Le site est édité par la société d\'avocats Garnier & Associés, dont le siège est situé 25 cours de l\'Intendance, 33000 Bordeaux. Téléphone : 05 56 00 00 00. E-mail : contact@garnier-associes.fr.',
                    'Les avocats du cabinet sont inscrits au barreau de Bordeaux et exercent sous le titre d\'avocat délivré en France. Ils sont soumis au règlement intérieur national de la profession d\'avocat et aux règles déontologiques consultables sur le site du Conseil national des barreaux. Numéro SIRET et numéro de TVA intracommunautaire : à renseigner avant mise en ligne.',
                    'Directrice de la publication : Me Hélène Garnier.',
                ]],
                ['type' => 'richtext', 'alt_bg' => true, 'title' => 'Hébergement et données personnelles', 'paragraphs' => [
                    'Hébergeur : à renseigner avant mise en ligne (nom, adresse et téléphone de l\'hébergeur).',
                    'Les informations saisies dans le formulaire de contact sont utilisées uniquement pour répondre à votre demande et sont conservées pour la durée nécessaire à son traitement. Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d\'un droit d\'accès, de rectification et de suppression, que vous pouvez exercer en écrivant à contact@garnier-associes.fr.',
                    'Ce site n\'utilise pas de cookie de suivi publicitaire. Un cookie de session technique est utilisé pour la sécurité du formulaire de contact.',
                ]],
                ['type' => 'richtext', 'title' => 'Propriété intellectuelle et responsabilité', 'paragraphs' => [
                    'L\'ensemble des contenus du site (textes, visuels, logo) est protégé par le droit de la propriété intellectuelle. Toute reproduction sans autorisation écrite est interdite.',
                    'Les informations publiées ont un caractère général et ne sauraient remplacer une consultation juridique personnalisée. L\'envoi d\'un message via le site ne crée pas de relation avocat-client.',
                ]],
            ],
        ],
    ];
}
