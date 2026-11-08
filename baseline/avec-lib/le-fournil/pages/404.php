<?php
$meta = [
    'title'       => 'Page introuvable | Boulangerie Le Fournil, Nantes',
    'description' => 'La page demandée n’existe pas ou plus sur le site de la boulangerie Le Fournil.',
];
?>
<section class="page-404">
  <div class="container">
    <h1>Page introuvable</h1>
    <p class="muted">Cette page n’existe pas, ou plus. Comme une baguette à 19 h 25, elle est peut-être déjà partie.</p>
    <p><a class="btn" href="<?= e(url('/')) ?>">Retour à l’accueil</a> <a class="btn btn-outline" href="<?= e(url('/nos-produits')) ?>">Voir nos produits</a></p>
  </div>
</section>
