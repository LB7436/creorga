# Revue des 45 anciens blocages — lot fiabilité

Référence : matrice T01–T100 du commit `f198c98`, avant ce lot : **54 PASS / 0 FAIL /
45 BLOCKED / 1 NOT RUN**. Les catégories ci-dessous ne sont pas de nouveaux résultats
de recette. Le checkpoint et la matrice courante donnent les statuts finaux.

Chaque ancien BLOCKED est classé une seule fois selon sa dépendance principale :
**14 externes, 1 historique/autorisation, 1 logiciel court, 29 structurels non
implémentés**. Une dépendance secondaire reste indiquée ; « structurel » n'est pas
un synonyme de matériel absent. Cela peut représenter un vrai prochain lot logiciel,
mais pas une fonction déjà utilisable qu'il suffirait de déclarer testée.

## Logiciel court résoluble dans le laboratoire — 1

| Cas | Ancien blocage | Traitement de ce lot et limite de validation |
|---|---|---|
| T69 — Lien documentaire expiré | Liens temporaires des documents absents | Fonction implémentée et testée en laboratoire : capacité liée au PDF original, échéance, révocation, contrôle de société/rôle et audit. Les tests unitaires, PostgreSQL et quatre parcours Chrome documentaires frais sont inclus dans la [preuve de validation](preuves/validation-fiabilite-2026-10-17.json). T69 passe à PASS ; une expiration de QR n'a pas été utilisée comme preuve de ce scénario. |

Le chemin de téléchargement ne doit mettre ni capacité dans les logs, ni jeton de
session dans l'URL. Les essais utilisent des factures et comptes fictifs, pas un
destinataire réel. La livraison n'est pas une validation juridique de signature.

## Dépendances externes — 14

| Cas | Dépendance précise | Ce que la recette locale ne remplace pas |
|---|---|---|
| T01 — Installation neuve complète | Machine Windows vierge ou VM de recette non disponible | Relancer les builds sur ce PC ne prouve pas une installation sur machine vierge. |
| T09 — Restauration chiffrée externe | Stockage externe de recette et accès autorisé non raccordés | La restauration AES-GCM locale ne valide ni transfert, ni récupération externe. |
| T41 — PayPal sandbox payé | Identifiants du sandbox officiel non fournis | Un prestataire remplacé en laboratoire n'est pas PayPal sandbox. |
| T56 — Abonnement SaaS séparé des recettes | Comptes marchands de recette et onboarding officiel | L'isolation des tables SQL ne qualifie pas l'onboarding prestataire multicommerçant. |
| T57 — Ticket physique 58 mm | Imprimante 58 mm raccordée et qualifiée | Une prévisualisation ne prouve pas le papier. |
| T58 — Ticket physique 80 mm | Imprimante 80 mm raccordée et qualifiée | Même limite, avec profil matériel propre. |
| T59 — Accents et euro imprimés | Imprimante/codepage à essayer | Le rendu PDF seul ne qualifie pas les caractères imprimés. |
| T60 — QR imprimé lisible | Couple impression/lecture à tester | Un QR numérique lisible n'est pas une épreuve du papier. |
| T61 — Fin de papier | Imprimante et retours d'état disponibles | File persistante/agent également à qualifier ; une erreur HTTP simulée n'est pas une fin de papier. |
| T62 — Imprimante reconnectée | Appareil/câble ou liaison de recette | Aucun câble d'exploitation n'a été retiré pour ce lot. |
| T63 — Accusé d'impression perdu | Matériel et protocole à retours d'état | File persistante à qualifier ; distinguer envoyé, confirmé et résultat inconnu. |
| T64 — Duplicata sans nouvelle vente | Réimpression thermique qualifiée | Une relecture HTML n'exécute pas une commande d'impression ; la file persistante reste à qualifier. |
| T65 — Tiroir fermé au duplicata | Tiroir et profil d'impulsion raccordés | Aucun tiroir actionné ni commande physique validée. |
| T66 — Cent lignes sur ticket | Épreuve physique sur largeur retenue | Le multipage A4 ne prouve pas l'absence de troncature thermique. |

Aucune clé bancaire réelle, achat de matériel, installation d'outil Windows ou
connexion cloud n'est déduite de cette classification. Les tests simulables restent
utiles mais ne changent pas ces scénarios physiques/prestataires en PASS.

## Historique ou autorisation distincte — 1

| Cas | Dépendance précise | Action sûre préparée, pas exécutée |
|---|---|---|
| T04 — Anciennes ventes navigateur | Profils historiques protégés, hors autorisation | Procédure d'export sur copie, inventaire des origines et empreintes avant tout rejeu. Aucun profil historique ouvert, modifié, déplacé ou nettoyé. |

Les copies récupérées de dumps ne constituent pas des exports de ventes uniquement
présentes dans d'anciens navigateurs. Les deux sujets ne doivent pas être confondus.

## Fonctions structurelles non implémentées — 29

| Cas | Fonction manquante ou non qualifiée | Dépendances et prochain périmètre possible |
|---|---|---|
| T06 — Isolation intersites | Modèle d'établissements/adhésions par site | Un vrai lot schéma/droits/migration ; l'isolation société actuelle ne suffit pas. |
| T18 — Annulation après envoi bar | Correction signée de préparation déjà envoyée | Le refus 409 protège l'existant, mais n'est pas la correction métier complète. |
| T24 — Variantes et suppléments | Tarification serveur des variantes/suppléments | Les notes de préparation ne sont pas des articles/suppléments tarifés. |
| T40 — Facturation électronique XML | Format structuré, validation et raccordement du canal | La partie format peut être travaillée hors ligne ; accès/canal autorisé nécessaires pour une transmission réellement qualifiée. |
| T71 — Table 3, addition ouverte | Moteur d'alerte déterministe après départ déclaré | Lot logiciel sans caméra possible ; pas de débit ni accusation automatique. |
| T72 — Client revenu | Résolution humaine du retour liée à T71 | Dépend du moteur d'alerte et de sa temporisation. |
| T73 — Personne encore à table | Source d'occupation et règle d'incertitude | Alternative humaine à étudier ; vidéo toujours désactivée. |
| T74 — Paiement au comptoir et alerte | Résolution d'alerte raccordée aux paiements | Les paiements testés séparément ne prouvent pas ce raccordement absent. |
| T75 — Table transférée et alerte | Suivi d'identité de l'alerte au transfert | Le transfert financier livré ne valide pas le moteur absent. |
| T76 — Compte entreprise autorisé | Crédit approuvé, échéance et exemption d'alerte | Une fiche client société ne vaut pas autorisation de crédit. |
| T77 — Caméra perdue | Connecteur et dégradation vidéo | Fonction vidéo fermée ; matériel/finalité autorisés nécessaires en plus du code. |
| T78 — Image ancienne | Pipeline de fraîcheur des images | Aucun flux raccordé ; ne pas fabriquer une preuve avec un ping. |
| T79 — Décalage d'horloge vidéo | Référence de temps et seuil d'incertitude | Équipement/pipeline à qualifier dans un lot distinct autorisé. |
| T80 — Caméra déplacée | Calibration et invalidation | Aucune calibration existante à considérer validée. |
| T81 — Objet compté une fois | Recherche sur scènes jouées annotées | Hors exploitation ; aucune promesse de vente ou reconnaissance de personne. |
| T82 — Porte sans table | Événement général sans association arbitraire | Pas de connecteur ; pas de table/personne déduite de la porte seule. |
| T83 — Séquence manquante | Stockage/connecteur d'extraits | Afficher une absence restera nécessaire ; aucun extrait inventé. |
| T84 — Masque de confidentialité | Occultation dans toutes les sorties | Aucun flux/clip/miniature/export vidéo qualifié. |
| T85 — Absence de son | Vérification des pistes du pipeline | Vidéo inutilisée ne signifie pas qu'un futur pipeline a été vérifié. |
| T86 — Purge des clips | Politique de conservation et purge des dérivés | Vidéo fermée ; aucun calendrier de suppression activé dans ce lot. |
| T87 — Droits vidéo | Rôles, routes et journal des consultations | Aucune route vidéo activée pour transformer un refus théorique en PASS. |
| T88 — Disque vidéo plein | Ressources séparées et priorité caisse | Pas de volume vidéo ; ne pas remplir le disque du PC pour simuler ce module absent. |
| T89 — URL caméra malveillante | Connecteur cloisonné avec destinations autorisées | Aucun scan réseau ou accès aux métadonnées cloud lancé. |
| T90 — Vidéo corrompue isolée | Décodeur et limites de ressources | Aucun décodeur vidéo de production activé. |
| T91 — Facture fournisseur doublée | Import de pièce source et déduplication | Ancien OCR non monté ; import ne doit pas incrémenter le stock seul. |
| T92 — Réception partielle | Quantités reçues et lien facture/livraison | Le refus des demandes partielles non prises en charge évite le crédit intégral, sans livrer la réception partielle. |
| T93 — Recettes et conversions | Unités et consommation d'ingrédients unifiées | Le débit des produits vendus ne prouve pas un débit de recette exact. |
| T94 — Inventaire et pertes | Comptages, motifs/pièces, mouvements et rapprochement | Modifier un stock courant seul ne constitue pas un inventaire traçable. |
| T99 — Langues et responsive | Traductions métier complètes et variantes d'accessibilité | Les contrôles ciblés mobile/tablette/clavier ne qualifient pas toutes les langues, le zoom ou tous les écrans. |

## Conclusion opérationnelle

T69 est le blocage logiciel court traité et validé dans ce lot. La matrice courante
compte **55 PASS / 0 FAIL / 44 BLOCKED / 1 NOT RUN**. Les autres fonctions logicielles
ne sont pas cachées derrière l'absence de matériel : elles demandent des lots
explicites, des critères de sortie et des migrations éventuelles. La vidéo et Stripe
Refunds restent fermés. Aucun changement des archives originales ni des profils
historiques n'est autorisé par cette revue.

T100 reste partiel : le [nouvel inventaire](preuves/inventaire-t100-fiabilite-2026-10-17.jsonl)
compte **402 fichiers, 3 697 contrôles et 157 routes**, avec 828 gabarits détectés
et aucun diagnostic d'analyse syntaxique. Le nombre de contrôles source n'est ni le nombre
de clics exécutés ni celui de combinaisons écran/rôle/société vérifiées. Chaque entrée
statique du nouvel inventaire demeure **NOT RUN**, même si son écran possède un
parcours Chrome ciblé réussi.
