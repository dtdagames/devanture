<?php
declare(strict_types=1);

return [
    'accueil' => [
        'route' => '/',
        'title' => 'Avocats à Bordeaux',
        'description' => "Cabinet d'avocats à Bordeaux : droit du travail, droit des affaires et droit de la famille. Première consultation de 30 minutes offerte.",
        'blocks' => [
            [
                'type' => 'hero',
                'eyebrow' => 'Cabinet Garnier & Associés',
                'title' => 'Un conseil juridique clair, à Bordeaux et dans toute la Gironde',
                'subtitle' => "Depuis 2011, nos trois associés accompagnent particuliers et entreprises en droit du travail, en droit des affaires et en droit de la famille. Vous êtes reçu par l'avocat qui traite votre dossier.",
                'image' => '/assets/hero-accueil.svg',
                'buttons' => [
                    ['label' => 'Prendre rendez-vous', 'to' => '/contact', 'style' => 'primary'],
                    ['label' => 'Nos domaines', 'to' => '/domaines', 'style' => 'ghost'],
                ],
            ],
            [
                'type' => 'features',
                'title' => 'Ce qui change avec nous',
                'intro' => 'Une organisation simple, des honoraires annoncés avant toute mission.',
                'columns' => 4,
                'items' => [
                    ['icon' => 'clock', 'title' => 'Première consultation offerte', 'text' => "Un premier échange de 30 minutes, sans frais, pour faire le point sur votre situation."],
                    ['icon' => 'file', 'title' => "Convention d'honoraires", 'text' => "Chaque mission fait l'objet d'une convention écrite, au forfait ou au temps passé."],
                    ['icon' => 'users', 'title' => 'Trois associés, une équipe', 'text' => "Deux collaboratrices et une assistante travaillent avec les associés sur chaque dossier."],
                    ['icon' => 'pin', 'title' => 'Bordeaux, Libourne, Arcachon', 'text' => "Nous intervenons au cabinet de Bordeaux, à Libourne et à Arcachon, et pouvons nous déplacer."],
                ],
            ],
            [
                'type' => 'text_image',
                'image' => '/assets/bloc-cabinet.svg',
                'alt' => 'Portrait du cabinet',
                'side' => 'right',
                'title' => 'Un cabinet à taille humaine',
                'paragraphs' => [
                    "Fondé en 2011 au cours de l'Intendance, le cabinet a grandi autour d'une même idée : expliquer le droit simplement et répondre vite.",
                    "Chaque dossier est suivi par un associé identifié dès le premier rendez-vous. Vous savez qui fait quoi, et à quel rythme vous pouvez attendre des nouvelles.",
                ],
            ],
            [
                'type' => 'figures',
                'items' => [
                    ['value' => '2011', 'label' => 'Année de fondation'],
                    ['value' => '3', 'label' => 'Associés avocats'],
                    ['value' => '30 min', 'label' => 'Première consultation offerte'],
                    ['value' => '3', 'label' => "Villes d'intervention"],
                ],
            ],
            [
                'type' => 'cta',
                'title' => 'Une question sur votre situation ?',
                'text' => "Décrivez-nous votre affaire en quelques lignes. Nous revenons vers vous pour fixer un rendez-vous.",
                'button' => ['label' => 'Nous écrire', 'to' => '/contact'],
            ],
        ],
    ],

    'domaines' => [
        'route' => '/domaines',
        'title' => "Domaines d'intervention",
        'description' => "Droit du travail, droit des affaires et droit de la famille : les domaines d'intervention du cabinet Garnier & Associés à Bordeaux.",
        'blocks' => [
            [
                'type' => 'hero',
                'eyebrow' => 'Nos domaines',
                'title' => 'Trois domaines, trois associés',
                'subtitle' => "Chaque associé traite en direct les dossiers de son domaine. Les questions qui touchent plusieurs domaines sont travaillées ensemble.",
                'image' => '/assets/hero-domaines.svg',
                'buttons' => [
                    ['label' => 'Prendre rendez-vous', 'to' => '/contact', 'style' => 'primary'],
                ],
            ],
            [
                'type' => 'features',
                'title' => 'Droit du travail',
                'intro' => "Me Hélène Garnier conseille salariés et employeurs.",
                'columns' => 3,
                'items' => [
                    ['icon' => 'scale', 'title' => 'Licenciement', 'text' => "Contestation d'un licenciement, rupture conventionnelle, préparation d'une procédure disciplinaire."],
                    ['icon' => 'shield', 'title' => 'Conflits au travail', 'text' => "Harcèlement, discrimination, modification du contrat : analyse de la situation et des preuves."],
                    ['icon' => 'users', 'title' => 'Conseil aux employeurs', 'text' => "Rédaction de contrats, de règlements intérieurs et accompagnement lors des représentations du personnel."],
                ],
            ],
            [
                'type' => 'features',
                'title' => 'Droit des affaires',
                'intro' => "Me Thomas Ruiz accompagne dirigeants et sociétés dans leurs décisions courantes et leurs opérations.",
                'columns' => 3,
                'items' => [
                    ['icon' => 'file', 'title' => 'Création et vie sociale', 'text' => "Choix de la forme juridique, statuts, pactes d'associés, assemblées générales."],
                    ['icon' => 'euro', 'title' => 'Contrats commerciaux', 'text' => "Relecture et négociation de contrats de vente, de prestation et de distribution."],
                    ['icon' => 'pin', 'title' => 'Recouvrement et litiges', 'text' => "Mise en demeure, recouvrement amiable puis judiciaire, assistance en cas de litige."],
                ],
            ],
            [
                'type' => 'features',
                'title' => 'Droit de la famille',
                'intro' => "Me Inès Kaddour intervient avec discrétion et méthode dans les affaires familiales.",
                'columns' => 3,
                'items' => [
                    ['icon' => 'heart', 'title' => 'Séparation et divorce', 'text' => "Divorce à l'amiable ou contentieux, liquidation du régime matrimonial."],
                    ['icon' => 'users', 'title' => 'Enfants et autorité parentale', 'text' => "Résidence, droit de visite, pension alimentaire : des solutions adaptées à l'intérêt de l'enfant."],
                    ['icon' => 'file', 'title' => 'Pacs et succession', 'text' => "Conseil sur le pacte civil de solidarité, la dissolution et les questions successorales."],
                ],
            ],
            [
                'type' => 'faq',
                'title' => 'Questions fréquentes',
                'items' => [
                    ['q' => 'Puis-je venir sans rendez-vous ?', 'a' => "Il est préférable de prendre rendez-vous, afin qu'un associé puisse vous recevoir dans de bonnes conditions."],
                    ['q' => 'Intervenez-vous en dehors de Bordeaux ?', 'a' => "Oui, le cabinet intervient à Libourne et à Arcachon, ainsi que devant les juridictions de la Gironde."],
                    ['q' => 'La première consultation est-elle payante ?', 'a' => "Non. La première consultation de 30 minutes est offerte. Les missions suivantes font l'objet d'une convention d'honoraires."],
                ],
            ],
        ],
    ],

    'cabinet' => [
        'route' => '/cabinet',
        'title' => 'Le cabinet et son équipe',
        'description' => "Le cabinet Garnier & Associés, fondé en 2011 à Bordeaux, et ses trois associés : Me Hélène Garnier, Me Thomas Ruiz et Me Inès Kaddour.",
        'blocks' => [
            [
                'type' => 'hero',
                'eyebrow' => 'Le cabinet',
                'title' => 'Un cabinet bordelais fondé en 2011',
                'subtitle' => "Trois associés, deux collaboratrices et une assistante, installés cours de l'Intendance.",
                'image' => '/assets/hero-cabinet.svg',
                'buttons' => [
                    ['label' => 'Nous contacter', 'to' => '/contact', 'style' => 'primary'],
                ],
            ],
            [
                'type' => 'text_image',
                'image' => '/assets/bloc-cabinet.svg',
                'alt' => 'Portrait du cabinet',
                'side' => 'left',
                'title' => 'Notre façon de travailler',
                'paragraphs' => [
                    "Le cabinet a été créé pour offrir un accompagnement juridique suivi, sans intermédiaire. Le client sait à qui il parle et qui suit son dossier.",
                    "Nous privilégions la négociation lorsqu'elle est possible, et la préparation sérieuse lorsqu'il faut aller devant un tribunal.",
                ],
            ],
            [
                'type' => 'team',
                'title' => 'Les associés',
                'intro' => "Chacun intervient dans son domaine, avec le soutien de l'équipe.",
                'members' => [
                    [
                        'initial' => 'HG',
                        'name' => 'Me Hélène Garnier',
                        'role' => 'Associée fondatrice, droit du travail',
                        'bio' => "Conseille salariés et employeurs sur les ruptures du contrat, les conflits collectifs et la prévention des contentieux.",
                    ],
                    [
                        'initial' => 'TR',
                        'name' => 'Me Thomas Ruiz',
                        'role' => 'Associé, droit des affaires',
                        'bio' => "Accompagne sociétés et dirigeants dans la vie des sociétés, la rédaction des contrats et le recouvrement.",
                    ],
                    [
                        'initial' => 'IK',
                        'name' => 'Me Inès Kaddour',
                        'role' => 'Associée, droit de la famille',
                        'bio' => "Traite les séparations, les questions liées aux enfants et les successions, dans un cadre amiable lorsque c'est possible.",
                    ],
                ],
            ],
            [
                'type' => 'gallery',
                'title' => 'Le cabinet en images',
                'items' => [
                    ['src' => '/assets/galerie-hall.svg', 'alt' => "Hall d'accueil du cabinet", 'caption' => "Hall d'accueil"],
                    ['src' => '/assets/galerie-salle.svg', 'alt' => 'Salle de réunion du cabinet', 'caption' => 'Salle de réunion'],
                    ['src' => '/assets/galerie-cours.svg', 'alt' => "Cours de l'Intendance à Bordeaux", 'caption' => "Cours de l'Intendance"],
                ],
            ],
        ],
    ],

    'honoraires' => [
        'route' => '/honoraires',
        'title' => 'Honoraires',
        'description' => "Honoraires du cabinet Garnier & Associés : première consultation offerte, convention d'honoraires écrite, forfait ou temps passé.",
        'blocks' => [
            [
                'type' => 'hero',
                'eyebrow' => 'Honoraires',
                'title' => 'Des honoraires annoncés avant la mission',
                'subtitle' => "Aucune prestation n'est engagée sans convention d'honoraires signée par le client.",
                'buttons' => [
                    ['label' => 'Prendre rendez-vous', 'to' => '/contact', 'style' => 'primary'],
                ],
            ],
            [
                'type' => 'features',
                'title' => 'Deux modes de facturation',
                'intro' => "Le mode retenu est indiqué dans la convention, avant le début de la mission.",
                'columns' => 2,
                'items' => [
                    ['icon' => 'file', 'title' => 'Au forfait', 'text' => "Un montant global fixé pour une mission définie : consultation, rédaction d'un acte, procédure amiable. Le périmètre et les étapes sont précisés dans la convention."],
                    ['icon' => 'clock', 'title' => 'Au temps passé', 'text' => "Les honoraires correspondent au temps effectivement consacré au dossier, selon un taux horaire indiqué dans la convention. Un point d'étape est fait régulièrement."],
                ],
            ],
            [
                'type' => 'text_image',
                'image' => '/assets/galerie-salle.svg',
                'alt' => 'Salle de réunion du cabinet',
                'side' => 'right',
                'title' => 'Ce que contient la convention',
                'paragraphs' => [
                    "La convention d'honoraires décrit la mission, le mode de calcul des honoraires, les frais et débours éventuels, et les modalités de règlement.",
                    "Elle est remise en deux exemplaires et signée avant le début de la mission. Vous pouvez poser toutes vos questions avant de vous engager.",
                ],
            ],
            [
                'type' => 'features',
                'title' => 'Et pour commencer',
                'intro' => "Une première étape sans engagement.",
                'columns' => 3,
                'items' => [
                    ['icon' => 'clock', 'title' => 'Consultation de 30 minutes', 'text' => "Gratuite. Elle permet de faire le point sur votre situation et d'évaluer vos options."],
                    ['icon' => 'file', 'title' => 'Proposition chiffrée', 'text' => "Après la consultation, nous vous proposons un mode de facturation adapté à votre dossier."],
                    ['icon' => 'shield', 'title' => 'Aucune surprise', 'text' => "Vous validez la convention avant toute prestation. Les modifications de périmètre font l'objet d'un avenant."],
                ],
            ],
            [
                'type' => 'faq',
                'title' => 'Questions sur les honoraires',
                'items' => [
                    ['q' => 'Faut-il payer pour la première consultation ?', 'a' => "Non, elle est offerte et dure 30 minutes."],
                    ['q' => 'Une convention est-elle obligatoire ?', 'a' => "Oui, elle est systématique pour chaque mission confiée au cabinet."],
                    ['q' => "Puis-je obtenir l'aide juridictionnelle ?", 'a' => "Selon vos ressources, vous pouvez y être éligible. Le cabinet vous informe des démarches à effectuer lors du premier rendez-vous."],
                ],
            ],
        ],
    ],

    'contact' => [
        'route' => '/contact',
        'title' => 'Contact',
        'description' => "Contactez le cabinet Garnier & Associés à Bordeaux : formulaire, téléphone 05 56 00 00 00, adresse cours de l'Intendance.",
        'blocks' => [
            [
                'type' => 'hero',
                'eyebrow' => 'Contact',
                'title' => 'Prendre rendez-vous',
                'subtitle' => "Décrivez votre demande. Nous revenons vers vous rapidement pour fixer la première consultation de 30 minutes.",
                'image' => '/assets/hero-contact.svg',
                'buttons' => [
                    ['label' => 'Appeler le cabinet', 'to' => 'tel:+33556000000', 'style' => 'ghost'],
                ],
            ],
            [
                'type' => 'form',
                'title' => 'Votre demande',
                'intro' => "Les champs marqués d'un astérisque sont obligatoires. Vos informations servent uniquement à répondre à votre demande.",
                'submit' => 'Envoyer ma demande',
                'success' => "Merci, votre demande a bien été envoyée. Un membre du cabinet vous répondra dans les meilleurs délais.",
                'fields' => [
                    ['name' => 'name', 'label' => 'Nom et prénom', 'type' => 'text', 'required' => true],
                    ['name' => 'email', 'label' => 'Adresse e-mail', 'type' => 'email', 'required' => true],
                    ['name' => 'phone', 'label' => 'Téléphone', 'type' => 'tel', 'required' => false],
                    ['name' => 'subject', 'label' => 'Domaine concerné', 'type' => 'select', 'required' => true, 'options' => ['Droit du travail', 'Droit des affaires', 'Droit de la famille', 'Autre demande']],
                    ['name' => 'message', 'label' => 'Votre message', 'type' => 'textarea', 'required' => true],
                ],
            ],
            [
                'type' => 'prose',
                'sections' => [
                    [
                        'title' => 'Nous trouver',
                        'paragraphs' => [
                            "25 cours de l'Intendance, 33000 Bordeaux.",
                            "Téléphone : 05 56 00 00 00. E-mail : contact@garnier-associes.fr.",
                            "Le cabinet intervient également à Libourne et à Arcachon sur rendez-vous.",
                        ],
                    ],
                ],
            ],
        ],
    ],

    'mentions-legales' => [
        'route' => '/mentions-legales',
        'title' => 'Mentions légales',
        'description' => 'Mentions légales du site du cabinet Garnier & Associés, avocats à Bordeaux.',
        'blocks' => [
            [
                'type' => 'prose',
                'title' => 'Mentions légales',
                'sections' => [
                    [
                        'title' => 'Éditeur du site',
                        'paragraphs' => [
                            "Cabinet Garnier & Associés, société d'avocats, 25 cours de l'Intendance, 33000 Bordeaux.",
                            "Téléphone : 05 56 00 00 00. E-mail : contact@garnier-associes.fr.",
                            "Numéro d'inscription au barreau de Bordeaux : à compléter.",
                        ],
                    ],
                    [
                        'title' => 'Hébergement',
                        'paragraphs' => [
                            "Le site est hébergé par le prestataire technique choisi par le cabinet. Les coordonnées de l'hébergeur sont à compléter.",
                        ],
                    ],
                    [
                        'title' => 'Propriété intellectuelle',
                        'paragraphs' => [
                            "Les textes, images et logos présents sur ce site sont la propriété du cabinet ou de leurs auteurs. Toute reproduction sans autorisation est interdite.",
                        ],
                    ],
                    [
                        'title' => 'Données personnelles',
                        'paragraphs' => [
                            "Les informations transmises par le formulaire de contact servent uniquement à répondre à votre demande. Vous pouvez exercer vos droits d'accès et de rectification en écrivant au cabinet.",
                        ],
                    ],
                ],
            ],
        ],
    ],
];
