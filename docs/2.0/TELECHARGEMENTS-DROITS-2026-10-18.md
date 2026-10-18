# Documents et téléchargements — 18 octobre2026

État actuel L3 : les octets des fichiers téléchargés restent BLOCKED ; seul le
parcours du reçu canonique Bar est observé en HTTP200. Voir l'actualisation en
fin de document et le [rapport courant](F18-REPRISE-INDEPENDANTE-2026-10-18.md).
Les constats F18-L2 suivants sont historiques.

F18-L2 : aucun nouveau fichier téléchargé n'est qualifié en octets par Chrome.
Les26PDF comparés dans les nouvelles restaurations sont des preuves de stockage,
pas de téléchargement/lecture autorisée par chaque rôle. Les restrictions
officielles ne sont pas contournées. Le GET de récupération d'un paiement200
n'est ni un téléchargement PDF ni une preuve de sortie papier.

## F18 — état courant, pas de contournement

MANAGER Café a réellement cliqué CSV sur une clôture historique. Le retrait puis
rétablissement du droit d'export agit dans l'ancien onglet, sans retirer la lecture
du CA autorisée. **Octets du fichier non attestés** : pas de chemin de téléchargement
fourni/lu par l'outil officiel, pas de recherche alternative dans les profils ou
Downloads. Aucun nouveau test Excel ni nouveau PDF téléchargé dans F18.

Les 26 PDF identiques de la restauration initiale 10:38 UTC sont une preuve séparée,
pas celle des fichiers obtenus par Chrome. Les refus officiels antérieurs 2102
et 2144 restent BLOCKED ; ils n'ont pas été contournés ni rejoués par un autre outil.
Trois captures F18 inline ont pu être inspectées selon les retours autorisés,
mais aucun nouveau PNG sur disque/SHA d'image n'est revendiqué. Impression physique
58/80 mm, tiroir et terminal toujours BLOCKED matériel.

| Contrôle | Preuve | État exact |
| --- | --- | --- |
| Facture Restaurant existante31,50 | Vrai clic de détail, données visibles cohérentes, pas de nouvel envoi/émission | PASS de consultation ciblée seulement |
| Bouton PDF A4 | Vrai clic dans Chrome, GET `/api/invoices/:id/pdf?format=A4`, requête273HTTP200 | PASS déclenchementHTTP ; pas preuve d'octets téléchargés |
| Inspection détaillée du même téléchargement | Outil officiel refusé pour risque inacceptable, événement2102TOOL_ERROR ; aucun autre chemin d'accès essayé | **BLOCKED**, protection respectée. Revalider origine/capacité autorisée dans l'outil officiel ; ne pas la désactiver |
| Empreinte PDF source/restitution | Nouvelle restauration PG :15PDF factures+11avoirs, mêmes octets/hashes,0différence | PASS restauration de26PDF, pas un PASS du fichier téléchargé Chrome |
| CSV UI | Anciens clics conservés, octets non inspectés dans ce lot | **NOTRUN / non qualifié pour contenu téléchargé** |
| Export sans autorisation | Gardes UI/directURL et tests API/PG selon capacités | PASS technique ciblé ; pas toutes les variantes de fichiers/WS par six profils |
| Capture PNG de stock | Tentative officielle2144, chemin refusé par les racines configurées de l'outil | **BLOCKED**, aucun PNG attesté et aucune tentative de chemin alternatif pour contourner |

[Preuves datées](preuves/droits-robi-validation-2026-10-18.json),
[T100](T100-DROITS-2026-10-18.md). Aucun mot de passe, cookie, jeton, adresse réelle
ou corps de document client publié. Il n'existe pas de capturePNG réussie ajoutée
par ce rapport. Matériel/banque/Zoho et fournisseur IA réel non qualifiés.
## Actualisation L3 —18octobre

Les téléchargements restent **BLOCKED bout en bout** lorsque les outils officiels
ne permettent pas l'inspection des octets. Au Bar, sélection réelle du ticket
numérique après confirmation8,40€ et bouton Terminer : GET601/200 du reçu canonique
de la vente `561a986e-17b0-415c-8729-e9e7aa1f6d19`. Cela ne prouve ni le contenu
du fichier téléchargé, ni une ouverture HTML/PDF, ni une impression physique.
Ne pas contourner le contrôle en lisant un fichier par un autre mécanisme.

Le rendu d'arrière-plan de la caisse après clôture affiche0, différent de la
confirmation8,40/1,60et de la source du reçu canonique : défaut UIà revoir, pas
preuve d'une pièce fiscale fausse. Les26PDF de la restauration sont vérifiés
par contenu/empreinte en base, preuve différente d'un téléchargement UI.
Les droits d'export testés précédemment et leurs tests de non-régression sont
conservés, sans promotion de tous les fichiers/colonnes/montants. Voir
[preuve actuelle](preuves/f18-l3-validation-2026-10-18.json).
