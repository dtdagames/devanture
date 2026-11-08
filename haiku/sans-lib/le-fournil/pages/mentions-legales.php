<?php
declare(strict_types=1);

require_once __DIR__ . '/../inc/blocks.php';

return [
    'title' => 'Mentions légales | Boulangerie Le Fournil',
    'description' => 'Mentions légales du site de la boulangerie Le Fournil, à Nantes : éditeur, contact et traitement des messages du formulaire.',
    'body' => static function (): void {
        block_hero([
            'title' => 'Mentions légales',
        ]);

        block_prose('Éditeur du site', [
            'Boulangerie Le Fournil, exploitée par Anne et Marc Lefèvre.',
            'Adresse : 8 rue de la Juiverie, 44000 Nantes.',
            'Téléphone : 02 40 00 00 00. E-mail : bonjour@lefournil-nantes.fr.',
            'Immatriculation : à compléter avant la mise en ligne.',
        ]);

        block_prose('Hébergement', [
            'Le site est hébergé par un prestataire dont les coordonnées sont tenues à disposition sur simple demande.',
        ]);

        block_prose('Données personnelles', [
            'Les informations saisies dans le formulaire de contact servent uniquement à répondre à votre demande.',
            'Elles sont conservées le temps nécessaire à ce traitement. Vous pouvez demander leur suppression en écrivant à bonjour@lefournil-nantes.fr.',
        ]);

        block_prose('Propriété intellectuelle', [
            'Les textes, images et logos du site sont la propriété de la boulangerie. Toute reproduction sans accord écrit est interdite.',
        ]);
    },
];
