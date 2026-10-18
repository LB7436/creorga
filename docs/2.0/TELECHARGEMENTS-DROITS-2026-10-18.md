# Documents et téléchargements — 18 octobre2026

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
