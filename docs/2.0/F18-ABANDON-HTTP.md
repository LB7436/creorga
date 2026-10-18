# F18 — abandon HTTP et achèvement métier

## État L3 final — contre-essai Chrome réellement GREEN

Les blocages ci-dessous décrivent les anciennes instances conservées. Une seule
nouvelle copie autorisée a fourni le contre-essai : GET Chrome réellement Brotli
puis STOPPED15:28:42UTC ; scénario distinct Restaurant9,70€avec acompte2€, solde
7,70€(2,70espèces+5carte déclarée), attente SQL15:41:08.719UTC, recharge avant réponse.
Arrêt officiel15:41:16.763UTC avec1travail actif/1réponse abandonnée/0callback opaque,
1WebSocket ; libération de la barrière15:41:16.764 ; **STOPPED15:41:16.901UTC**.
Les compteurs bornés suivent HTTP, promesses/continuations, transports, tâches,
minuteries et connexions PG, sans URL ni secret, sans nouvel endpoint de diagnostic.

Après redémarrage de la **même** copie : GET397/200 sur
`8e119328-ec6a-44c3-a5d5-3270814252df`, aucun deuxième POST. Une seule vente970c,
une unité d'Eau/Soupe débitée chacune, tenders200/270/500c ; anciennes pièces égales.
L'ancien880cCafé n'est pas rejoué. Le solde courant1005c de sa copie est réglé plus
tard après relecture explicite des tentatives/solde, opération distincte documentée.

Dernier arrêt officiel16:48:36.748UTC confirmé, PID25524 absent/ports libres et
0connexion PG applicative. Restauration après cet arrêt :82tables/21466lignes,
14fichiers/26PDF identiques. Aucun kill, arrêt PostgreSQL/Chrome, reboot ou hotpatch.
Le cas sync+compression correspond à la cause reproduite ; l'identité exacte du
callback ayant bloqué PID35556 n'a jamais été prouvée et n'est pas inventée.

1306unitaires et354PG actuels couvrent aussi rollback, rejouage, réserve UNKNOWN
simulée et refus d'une nouvelle référence. Ils ne deviennent pas autant de pannes
Chrome ni de paiements bancaires. [Chronologie et preuves L3](F18-REPRISE-INDEPENDANTE-2026-10-18.md).

## Complément F18-L2 — copie séparée,14:18UTC

La copie distincte autorisée a permis un **nouveau** scénario Restaurant, sans
rejouer la référence Café880c ci-dessous. Solde28,80€ fictifs :8,80espèces +20carte
déclarée après acompte10€. Attente SQL réelle13:56:34UTC, rechargement Chrome
avant réponse, verrou libéré automatiquement13:56:42UTC. Le commit existe ;
reconnexion même SERVER → GET495/200 pour
`329ddd46-858d-488a-a03e-eff50cfcfa35`, aucun POST supplémentaire, table À nettoyer.
Deux ventes38,80€, cinq lignes/produits débités une fois, mêmes valeurs en SQL
avant/après récupération ; anciennes opérations Restaurant inchangées.

**Arrêt ensuite NON CONFIRMÉ**,14:01:45UTC : diagnostic privé
`http/HTTP_WORK_UNTRACKED`. Ancien et nouveau runtime conservés, pas de kill,
hotpatch, seconde instance sur leurs bases ou nouvelle clé d'encaissement.
Le marqueur opaque est permanent et peut venir d'une lecture antérieure ; il
n'identifie pas nécessairement le POST abandonné comme cause.

Reproduction technique RED :616/617backend, seul le nouveau GET sync+gzip échoue
au drainage. La compression diffère le end natif, writableEnded reste false au
retour ; le tracker marquait à tort ce callback déjà terminé comme opaque.
Le GET floor-state réel possède ce chemin, les anciens tests utilisaient async.
Observation minimale du end **synchrone** et restauration des proxys après le
callback : GREEN, refus conservé des vrais callbacks opaques. La requête exacte
ayant empoisonné PID35556 reste inconnue, aucun correctif en mémoire appliqué.

Nouveau test PG : vraie lecture gzip puis acompte/solde mixte abandonné, arrêt,
reprise et rejeu même clé sans seconde vente ni stock ; trois tenders50/60/150c,
nouvelle clé après solde refusée409. **354PG/617backend** finaux GREEN, mais le
contre-essai Chrome du dernier binaire reste BLOCKED après le refus du runtime.

Nouvelle restauration14:11UTC :82tables/20012lignes/14fichiers/26PDF égaux, AES-GCM,
clé séparée, source L2 seulement. SQL commis/fichiers stables, pas arrêt propre ni
vidange mémoire prouvés. [Chronologie, preuves et reprise](F18-LABORATOIRE-SEPARE-2026-10-18.md).
Les paragraphes suivants décrivent l'incident précédent et les validations
antérieures ; ils ne sont pas une nouvelle exécution du dernier état.

## État de cette preuve intermédiaire

18 octobre 2026. **Tests techniques ciblés, pas encore recette Chrome complète ni
garantie globale d'arrêt.** Voir la matrice des dix-huit parcours. Les preuves
avant/après restent privées et expurgées dans les livrables publics.

## Défaut reproduit avant correction

À 10:48:56–10:48:58 UTC, sur le code précédent, trois scénarios avec vrai
PostgreSQL ont été exécutés : un réussi, **deux échecs attendus** sur le garde
permanent « réponse métier interrompue ; fin du callback non prouvée ».
Source stable pendant cette exécution, SHA agrégé
`6ebbae1c67c33b086bba7c6624d138b53a5bcc3a452e3f9654142745a768db08`.
Les échecs concernent le checkout tenu et le retour prestataire incertain.

La protection précédente évite une déconnexion SQL dangereuse, mais un abandon
terminé conserve définitivement l'incertitude. L'événement HTTP `finish/close`
ne prouve pas non plus que le callback, ses `finally` ou ses tâches filles sont
terminés. Retirer simplement le garde n'est donc pas une correction sûre.

## Complément PostgreSQL réellement exécuté après raccordement ciblé

Exécution du 18 octobre **10:57:32.567–10:57:35.624 UTC**, quatre tests sur source
stable `13e7bbafd8041c764df33298fb2dd884477a1310a5b7c031a4cb110f6dc875c9` :

| Cas | Opération et preuve SQL | Résultat ciblé |
|---|---|---|
| F18-HTTP-01 | Vrai checkout tenu par le verrou financier ; abandon du client ; arrêt attendu avant libération ; commit ; nouveau listener ; même référence rejouée | Une vente, une commande, une provenance de ligne, un débit de stock et un règlement ; arrêt après fin du travail |
| F18-HTTP-02 | Vente commise, réponse client abandonnée ; lecture de la référence et rejeu ; nouvelle référence sur la même ligne refusée | Même vente retrouvée, aucune seconde vente ni second débit |
| F18-HTTP-03 | Vraies écritures SQL tenues dans leur transaction ; panne injectée **dans la fixture** après ces écritures ; rollback PostgreSQL réel ; reprise même référence | Aucun effet commis après rollback ; reprise suivante une seule fois |
| F18-HTTP-04 | Vraie réserve SQL ; prestataire **simulé** tenu puis réponse incertaine ; abandon ; rejeu et nouvelle tentative | Réserve UNKNOWN conservée, un seul appel simulé, nouvelle tentative refusée, ni encaissement confirmé ni stock débité |

Tests : `apps/backend/src/routes/http-abandon.integration.test.ts`. Les sociétés
UUID de `creorga_tests` sont distinctes des trois sociétés de recette ; elles
sont conservées. Aucun fournisseur réel, aucune purge, aucun seed/reset.
L'événement de déconnexion de fixture observe une frontière : le client Prisma
reste ouvert jusqu'aux assertions SQL, il n'est pas simulé comme déconnecté.
Le « redémarrage » de ces tests est celui d'un listener isolé, **pas** un
redémarrage complet du PC ou du runtime métier.

Un passage intermédiaire était 3/4 : le quatrième test exigeait à tort HTTP202
au rejeu UNKNOWN alors que le contrat existant renvoie HTTP200 avec
`status=unknown`, `ok=false`, `confirmation=provider_not_confirmed`. L'assertion
a été corrigée, **pas** le contrat métier pour rendre le test vert. Le statut
HTTP seul ne signifie jamais « payé » ou « aucun effet ».

## Encore à qualifier

### Derniers contrôles techniques avant le vrai incident Chrome

La version renforcée a réellement exécuté **5/5 intégrations PostgreSQL** le
18 octobre11:10:58.963–11:11:01.506 UTC, preuve privée
`validation-f18-targeted-PKAalX`, source stable
`3927c87754c7f889ea1500384797db8653c3994d8a40fee24db1e11daa4578ac`.
Le cinquième cas coupe un corps de requête incomplet avant admission : zéro
commande, vente, règlement et débit de stock. Les quatre autres cas ont été
renforcés : véritable attente de verrou, observation de la fermeture côté
serveur, vrai rollback après écritures et contrôle exact de la réserve UNKNOWN.

Dans le cas de réponse perdue après commit, le client détruit son message dès
les en-têtes et consomme **zéro octet du corps**. Node peut néanmoins marquer
`end/readableEnded` : cela ne signifie ni JSON reçu ni perte de paquet TCP prouvée.
Le nouveau listener reste dans le même processus ; ce n'est pas un démarrage à
froid. Une suite globale ultérieure a passé353 intégrations, avant les derniers
correctifs UI. Les77 contrôles unitaires ciblés HTTP/transport/façade ont aussi
passé ; ils n'ont pas suffi à qualifier le runtime complet ci-dessous.

### Incident Chrome réel — arrêt toujours BLOCKED

Table fictive Café nouvelle, montant total11,80 €, acompte déjà enregistré3 €,
restant8,80 €. Le formulaire réel prépare880 centimes,380 espèces et500 carte
**déclarée**, sans banque. RequestId
`5b93c091-f841-4672-beb3-90c991a7023f`, requête Chrome953.

| Heure UTC du18octobre | Observation réellement exécutée |
|---|---|
| 11:59:17.078 | Transaction de test sans écriture tient seulement le verrou financier de la société fictive |
| 11:59:41.098 | La vraie requête POS attend ce verrou PostgreSQL |
| 11:59:46.336 | Observation READ ONLY : un détenteur et un attendant, relation de blocage enregistrée |
| Après cette observation | Rechargement de cette seule page caisse avant réception du résultat ; affichage connexion, pas « payé » |
| Vers11:59:50 | Demande d'arrêt par le contrôleur officiel, sans signal forcé |
| 12:00:02.080 | Libération de sécurité bornée à45s ; le flux stdin non interactif du harnais ne permettait pas la libération manuelle |
| 12:00:02 | Journal métier : transaction expirée20s, P2028 ; aucune écriture commise |
| 12:00:24.184 | Observation READ ONLY : zéro verrou financier restant |
| 12:00:54.970 | Rapprochement SQL : ventes historiques21,10 € inchangées, acompte300 conservé, solde880 toujours dû, aucun nouveau règlement du solde |

**Résultat : BLOCKED.** Le contrôle d'arrêt répond `SHUTDOWN_UNCONFIRMED` ;
processus conservé, interfaces indisponibles. La libération des cinq ports n'est
pas prouvée : voir le contre-contrôle Windows ci-dessous. Une seconde demande officielle
retrouve le rejet mémorisé : cela ne prouve pas qu'une transaction SQL reste
active. Aucun kill, déconnexion forcée, inspecteur/CDP privé, abandon du garde ou
rejeu de paiement avec une nouvelle référence. Le faux positif « arrêt réussi »
est expressément exclu. Le navigateur présente la requête conservée comme
`pending` ; la base et les logs, pas ce libellé transport, établissent le rollback.

Preuves : `f18-lock-avant-20261018-v1.json`,
`f18-lock-requete-en-cours-20261018-v1.json`,
`f18-lock-apres-abandon-20261018-v1.json`,
`f18-cafe-http-abandon-20261018-v1.json` et événements Chrome horodatés.
La libération automatique du verrou n'est pas une intervention forcée sur le
backend. L'erreur du harnais stdin est séparée du défaut d'arrêt à diagnostiquer.

Le rejeu de cette référence, la reprise du runtime et la qualification métier
restent ouverts. Ne pas compenser ce blocage par une nouvelle vente.

### Rectification de l'observation réseau — 12:30 à12:32UTC

Le premier relevé résumait à tort les refus de connexion comme « ports fermés ».
Contrôle hôte en lecture seule : le runtime officiel PID14676, créé11:09UTC,
existe toujours. `Get-NetTCPConnection` voit **3002 LISTEN** attribué à ce PID ;
les quatre ports d'interface ne sont plus présents. Une requête HTTP native
locale, sans proxy ni redirection, reçoit **ECONNRESET**, pas une réponse métier.

Un drain peut rejeter les nouvelles connexions sans libérer son écoute ; on ne
peut donc **pas** déduire que le serveur HTTP est fermé, que son étape a réussi
ou que le refus concerne forcément un worker/audit ultérieur. Cette inférence
est retirée. Cause exacte toujours non prouvée. Journal append-only annoté,
aucun inspecteur/signal/kill utilisé. Une copie de laboratoire demanderait aussi
des ports distincts validés ; le port officiel3002 n'est pas réutilisable en l'état.

### Diagnostic indépendant après le refus d'arrêt

Trois essais loopback avec les vrais middleware HTTP, `SocketServer`, fermeture
Engine.IO puis `io.close(callback)`, dont un WebSocket connecté, attendent le
contrôleur et ses `finally` après abandon. Le refus de transaction est **simulé
sans PostgreSQL** dans ces trois essais ; les cinq intégrations SQL ci-dessus
restent des preuves séparées. Les trois réussissent : **le rejet du runtime réel
n'est pas reproduit**, aucune cause n'est attribuée au tracker sur cette base.

Défaut distinct établi RED : le canal privé effaçait le motif du rejet d'arrêt
et mémorisait seulement `SHUTDOWN_UNCONFIRMED`. Instrumentation minimale GREEN :
première étape/raison dans des listes fermées (`http-io`, `audit-log`, etc.),
log borné et retour par le seul canal privé authentifié. Aucun message d'erreur,
stack, SQL, identifiant ni secret exporté ; pas de nouvelle route HTTP. Le même
objet d'erreur, les gardes et la promesse d'arrêt refusée restent inchangés.

Ces nouveaux fichiers ne permettent **ni de relire le motif perdu de l'ancien
processus, ni de le réparer en mémoire, ni d'autoriser sa relance**. Aucun inspecteur,
signal forcé, accès CDP privé, redémarrage Windows ou déconnexion forcée effectué.
Relecture indépendante du diagnostic : aucun défaut bloquant relevé, sans en
faire une preuve de cause racine. Suites finales fraîchement exécutées :
616 backend, 513 web, 161 POS, 353 PG et 50 fixtures locales sans échec/ignoré ; le vrai
contre-essai Chrome de l'incident reste BLOCKED.

- Couverture de toutes les entrées asynchrones actives et tâches détachées.
- Protection conservatrice des callbacks opaques, corps interrompus avant
  admission, pipelines mixtes et transports Engine.IO.
- Incident depuis l'interface POS : réponse perdue, état visible explicite,
  récupération, rechargement et contrôle PostgreSQL.
- Arrêt normal du lanceur pendant une opération active, fin du processus et
  cinq ports libres, reprise puis restauration cohérente.

Tant que ces contrôles ne sont pas prouvés, ne pas qualifier l'incident global
ni remplacer la procédure de reprise par un kill, un délai plus grand ou une
nouvelle vente. Une réserve bancaire incertaine reste réservée.
