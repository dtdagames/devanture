<?php
render_component('hero', [
    'title' => 'Honoraires',
    'subtitle' => 'Des honoraires expliqués dès le premier rendez-vous et fixés par écrit avant toute mission.',
    'align' => 'left',
]);

render_component('features', [
    'title' => 'Nos principes',
    'columns' => 3,
    'items' => [
        ['icon' => 'gift', 'title' => 'Première consultation offerte', 'text' => '30 minutes pour faire le point sur votre situation, sans engagement.'],
        ['icon' => 'check', 'title' => 'Forfait ou temps passé', 'text' => "Nous choisissons avec vous le mode de rémunération le plus adapté à votre dossier."],
        ['icon' => 'shield', 'title' => "Convention d'honoraires", 'text' => 'Établie systématiquement et signée avant le début de la mission.'],
    ],
]);

render_component('richtext', [
    'title' => 'Comment sont fixés les honoraires',
    'text' => "Les honoraires tiennent compte de la complexité du dossier, du temps à y consacrer, de l'urgence et de votre situation financière. Aucun montant n'est facturé sans que vous en ayez été informé.\n\nAu forfait : un prix global est fixé pour une mission définie (rédaction d'un acte, divorce par consentement mutuel, procédure précise). Vous connaissez le coût dès le départ.\n\nAu temps passé : un taux horaire est convenu, et le temps réellement passé vous est détaillé dans nos notes d'honoraires. Une estimation du volume d'heures vous est communiquée.\n\nLes frais et débours (huissier, greffe, déplacements) sont présentés séparément. Selon vos ressources, vous pouvez bénéficier de l'aide juridictionnelle ou de la prise en charge par une assurance de protection juridique : parlez-nous-en dès le premier rendez-vous.",
]);

render_component('faq', [
    'title' => 'Vos questions sur les honoraires',
    'items' => [
        ['q' => 'Que se passe-t-il pendant la consultation offerte ?', 'a' => "Vous nous présentez votre situation, nous vous indiquons les démarches envisageables et le mode de rémunération proposé. Vous décidez ensuite librement de nous confier ou non votre dossier."],
        ['q' => "Qu'est-ce qu'une convention d'honoraires ?", 'a' => "C'est un document écrit qui précise la mission confiée, le mode de calcul des honoraires (forfait ou temps passé), les frais éventuels et les modalités de paiement. Nous en établissons une pour chaque dossier."],
        ['q' => 'Puis-je connaître le coût total à l\'avance ?', 'a' => "Avec un forfait, oui. Au temps passé, nous vous communiquons une estimation et vous prévenons si elle devait évoluer."],
        ['q' => "Acceptez-vous l'aide juridictionnelle ?", 'a' => "Renseignez-vous auprès de nous lors du premier rendez-vous : nous vous indiquerons si vous remplissez les conditions et comment procéder."],
    ],
]);

render_component('cta', [
    'title' => 'Obtenir une estimation',
    'text' => 'Décrivez votre dossier : nous vous indiquons le mode de rémunération envisagé.',
    'button' => ['label' => 'Nous écrire', 'to' => '/contact'],
]);
