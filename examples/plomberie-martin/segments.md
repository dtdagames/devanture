# Segments

Priorité : devis_abandonne, prix_annonce, fan_services, recurrent, nouveau, mobile
Segments :
- nouveau | visites = 1
- recurrent | visites >= 2
- devis_abandonne | tout
  - form_start depuis 7d
  - pas form_submit depuis 7d
- fan_services | section_view où section = services, au moins 2 fois
- mobile | sur mobile
Objectifs :
- appel | click_cta | to = tel:0472001122
- devis | form_sent | form = contact
Expériences :
- accroche | appel | prix_annonce
- relance | devis | segment : devis_abandonne | témoin : 20
