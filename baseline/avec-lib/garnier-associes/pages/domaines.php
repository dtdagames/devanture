<?php
render_component('hero', [
    'title' => "Domaines d'intervention",
    'subtitle' => 'Trois matières, trois associés : chaque dossier est suivi par l\'avocat qui la pratique tous les jours.',
    'align' => 'left',
]);
?>
<div id="travail">
<?php
render_component('richtext', [
    'title' => 'Droit du travail, avec Me Hélène Garnier',
    'text' => "Salariés, cadres, dirigeants ou employeurs : nous intervenons en conseil comme en contentieux.\n\nContrat de travail, avenants et clauses sensibles (non-concurrence, mobilité) ; licenciement pour motif personnel ou économique ; rupture conventionnelle ; harcèlement et discrimination ; heures supplémentaires et rappels de salaire ; procédures devant le conseil de prud'hommes.\n\nLes délais sont courts en droit du travail : n'attendez pas pour nous consulter.",
    'image' => 'travail.svg',
    'image_position' => 'right',
]);
?>
</div>
<div id="affaires">
<?php
render_component('richtext', [
    'title' => 'Droit des affaires, avec Me Thomas Ruiz',
    'text' => "Nous accompagnons les créateurs d'entreprise, les dirigeants de PME et les professions libérales.\n\nChoix de la structure, rédaction des statuts et pactes d'associés ; baux commerciaux ; contrats commerciaux et conditions générales ; recouvrement de créances ; litiges entre associés ; difficultés des entreprises et procédures collectives.\n\nL'objectif est de sécuriser vos décisions avant qu'un litige n'apparaisse, et de vous défendre efficacement s'il survient.",
    'image' => 'affaires.svg',
    'image_position' => 'left',
]);
?>
</div>
<div id="famille">
<?php
render_component('richtext', [
    'title' => 'Droit de la famille, avec Me Inès Kaddour',
    'text' => "Les situations familiales difficiles demandent de l'écoute autant que de la technique juridique.\n\nDivorce par consentement mutuel ou contentieux ; résidence des enfants, droit de visite et pension alimentaire ; prestation compensatoire et liquidation du régime matrimonial ; séparation de concubins ou de partenaires pacsés ; succession et partage.\n\nQuand un accord est possible, nous le recherchons ; quand il ne l'est pas, nous plaidons.",
    'image' => 'famille.svg',
    'image_position' => 'right',
]);
?>
</div>
<?php
render_component('features', [
    'title' => 'Comment nous travaillons',
    'columns' => 3,
    'items' => [
        ['icon' => 'phone', 'title' => 'Première consultation offerte', 'text' => "30 minutes pour exposer votre situation et connaître vos options."],
        ['icon' => 'check', 'title' => "Convention d'honoraires", 'text' => 'Systématique, écrite et signée avant toute mission.'],
        ['icon' => 'home', 'title' => 'Bordeaux, Libourne, Arcachon', 'text' => 'Rendez-vous au cabinet et interventions dans ces trois villes.'],
    ],
]);

render_component('cta', [
    'title' => 'Une question sur votre dossier ?',
    'text' => 'Décrivez-nous votre situation, nous vous répondons rapidement.',
    'button' => ['label' => 'Prendre rendez-vous', 'to' => '/contact'],
    'style' => 'surface',
]);
