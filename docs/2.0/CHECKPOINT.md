# Checkpoint Creorga 2.0

Mission du 8 octobre 2026, en cours. Ne pas présenter ce checkpoint comme une recette complète.

- Copie source : `creorga-2.0`, branche `codex/creorga-2-0-2026-10-08`.
- Base de départ : `350b35120f44d2508d863a3a73f644eb0aa6b141`.
- Copie de septembre et archives Contabo conservées. Aucun changement de DNS ou déploiement public.
- Laboratoire privé adjacent : `local-2.0`, PostgreSQL 16.15, écoute 127.0.0.1:5450.
- Trois bases : snapshot conservé, copie d'exploitation locale, base fictive de tests.
- Reprise actuelle vérifiée : 18 empreintes de fichiers, 48 tables identiques au dump source,
  49 entrées de fichiers métier conservées avec le même snapshot. Preuve privée `REPRISE-VERIFIEE.json`.
- Migration additive du journal POS puis migration additive `20261008130000_payment_attempts`
  appliquées uniquement aux deux copies de travail. Aucun seed ni reset sur les données restaurées.
- Référence actuelle des tests unitaires : 172 backend, 46 web, 31 POS, tous réussis.
- Lot P0 paiement : neuf anomalies reproduites avant correction ; dix tests d'intégration
  passent sur PostgreSQL réel et prestataire remplacé. Le remplacement ne prouve pas un paiement bancaire.
- Travaux : tentative durable avant appel, clé stable, réservation serveur, cloisonnement,
  montant/devise contrôlés, retour limité à l'origine configurée, résultat ambigu conservé.
- Vérification de capture encore à implémenter : aucun retour navigateur ne marque payé.
- Prochaine action : unifier les verrous avec les encaissements manuels et les mutations de commande,
  puis connecter une preuve PayPal/Stripe complète et documenter les conditions de qualification.
- Matériel : imprimante et caméra non qualifiées ; identifiants PayPal sandbox non fournis.
- Vidéo : option désactivée ; le suivi permanent des tables n'entre pas dans le produit par défaut.

Reprise : lire ce fichier, vérifier la branche et le diff, utiliser le laboratoire isolé ; ne pas
connecter les scripts de tests à une autre base. Les services applicatifs ne sont pas encore lancés.
