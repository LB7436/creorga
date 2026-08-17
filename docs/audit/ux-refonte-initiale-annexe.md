# Annexe — Détail des constats de l'audit initial

Générée automatiquement depuis les audits bruts du 17 août 2026.
Chaque constat : gravité, fichier:ligne, description, preuve.
**Total : 118 constats — 15 critiques, 52 majeurs, 51 mineurs.**


## Back-office web : routes et modules

**Résumé.** apps/web est un back-office React Router v6 (Vite) dont le routeur unique est App.tsx (~80 routes, toutes en lazy) : la garde se limite a RequireAuth (authentification seule, aucun support de role, et le mode demo la court-circuite), le seul controle de role etant enfoui dans AdminLayout (OWNER/MANAGER) et dans un filtrage purement visuel du selecteur pour les employes. Le selecteur (ModuleSelector.tsx) affiche 18 modules definis dans moduleStore.ts ; leur etat visible/masque/bientot vient de deux sources concurrentes — le store local zustand (creorga-module-config) ecrit par SettingsModules, et la config backend /api/module-config qui gagne au merge mais que SettingsModules ne pousse jamais : la persistance echoue donc en silence (reglages non partages, ecrases par le remote, fetch sans auth avec repli localhost:3002). La navigation cumule un layout legacy mort (AppLayout/Sidebar avec routes inexistantes et badges en dur) et six layouts/onze pages orphelins, tandis que le sous-menu POS compte 3 entrees sur 6 qui ne sont que des redirections. Le plus grave : le coeur du POS est factice — OrderPage ignore le :tableId de l'URL (table T4 en dur, 20 produits mock, panier pre-rempli) et le dashboard POS par defaut affiche un CA et des evenements inventes ; une douzaine d'autres pages (caisse, cloture, depenses, factures, RH, HACCP, fidelite) tournent encore sur des constantes mock. Enfin, seules 2 pages de toute l'application consomment isError : partout ailleurs une API en 4xx/5xx produit un ecran vide ou des donnees par defaut sans le moindre signal.

### [CRITIQUE] `apps/web/src/pages/pos/OrderPage.tsx:111`

La prise de commande (/pos/order/:tableId) est entierement factice : le parametre :tableId de l'URL est ignore (table T4 en dur l.111-112), les 20 produits sont des constantes mock (l.55-76), les clients aussi (l.81-86), le panier arrive pre-rempli avec une entrecote et 2 verres de vin (l.102-105), et TVA_RATE=0.17 en fraction contredit la convention du depot (taxRate en pourcentage 17).

```
const tableName = 'Table T4'\nconst tableId = 'T4'  // l.111-112, useParams jamais appele ; l.53: /* MOCK PRODUCTS (20) */ ; l.102: useState<CartItem[]>([{ product: products[3], qty: 1 }, ...])
```

### [CRITIQUE] `apps/web/src/pages/pos/DashboardPage.tsx:24`

La page d'atterrissage par defaut du module POS (/pos redirige vers /pos/dashboard) affiche des KPIs 100% inventes : CA du jour 2430 EUR, 8/12 tables occupees, top produits et un flux d'evenements live entierement fabrique.

```
l.22 /* MOCK DATA */ ; const metrics = { tablesOccupees: 8, ... caJour: 2430, caHier: 2180, ... } ; l.55 initialEvents: 'Paiement recu — Table T4 · 128,80 EUR'
```

### [CRITIQUE] `apps/web/src/components/auth/RequireAuth.tsx:9`

Aucune garde de role dans tout le routeur : RequireAuth ne verifie que isAuthenticated (pas de prop role). Le masquage des 6 modules sensibles pour les employes n'existe que dans l'UI du selecteur (ModuleSelector.tsx l.304 et l.314) — un employe accede a /rgpd, /backup, /sites, /api, /maintenance, /owner en tapant l'URL. Seul /admin a une garde interne (AdminLayout l.19). De plus le mode demo court-circuite l'auth et ecrit dans localStorage pendant le rendu (l.15-17).

```
RequireAuth: if (demoActive) { localStorage.setItem('creorga-demo-mode','true'); return <>{children}</> } ... if (!isAuthenticated) Navigate /login — aucun test de role ; App.tsx l.392: <Route path="/rgpd" element={<RgpdPage />} /> sous simple RequireAuth
```

### [CRITIQUE] `apps/web/src/pages/settings/SettingsModules.tsx:16`

La persistance du configurateur de modules echoue : SettingsModules ecrit uniquement dans le store zustand local (localStorage creorga-module-config) et n'appelle jamais patchModule du hook partage — la config backend /api/module-config n'est jamais mise a jour depuis le back-office. Or ModuleSelector fusionne avec 'remote gagne' (l.294-300) : toute entree remote ecrase silencieusement le reglage local, et les reglages ne sont ni partages entre navigateurs ni avec le superadmin.

```
SettingsModules: const { config, setDisplayMode, ... } = useModuleConfig() — aucun import de useSharedModuleConfig ; ModuleSelector l.297: merged[id] = { ...(localModuleConfig[id] || {}), ...(remoteModuleConfig[id] || {}) } // Remote wins
```

### [MAJEUR] `apps/web/src/hooks/useSharedModuleConfig.ts:12`

Le canal de persistance distant des modules est fragile : URL absolue avec repli http://localhost:3002 (mort en production si VITE_BACKEND_URL absent), fetch nu sans jeton ni x-company-id (config globale, pas par societe), et toutes les erreurs (GET l.33 et PATCH l.56) sont avalees en silence — un echec d'enregistrement ne produit aucun signal.

```
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002' ; catch { /* offline ok */ } ; catch { /* ignore */ }
```

### [MAJEUR] `apps/web/src/hooks/useFloorState.ts:116`

Le plan de salle (coeur du POS) bascule silencieusement sur un plan par defaut de 9 tables inventees quand le backend est injoignable (catch l.116-119) ; UnifiedFloorPlan.tsx n'affiche jamais floor.error (aucune occurrence). Fetch nu sans auth, base localhost:3002 en repli — en production sans VITE_BACKEND_URL, chaque poll de 2 s echoue et l'utilisateur travaille sur un faux plan sans le savoir.

```
catch (e) { setError(e.message); setState((current) => current ?? cloneDefaultFloorState()) } ; grep 'error' dans UnifiedFloorPlan.tsx : 0 resultat
```

### [MAJEUR] `apps/web/src/pages/crm/ClientsPage.tsx:203`

Cas type d'API sans etat d'erreur : si GET /crm/customers repond 4xx/5xx, apiCustomers reste undefined et la page rend une liste de clients vide, indistinguable d'un CRM reellement vide. Seules 2 pages de toute l'app consomment isError (Dashboard.tsx:358 et pos/FloorPlan.tsx:167) alors que 10 hooks useQuery existent.

```
const customers: Customer[] = useMemo(() => { if (!apiCustomers) return [] ... }, [apiCustomers]) — pas d'isError ni de rendu d'erreur
```

### [MAJEUR] `apps/web/src/pages/accounting/CaissePage.tsx:44`

Le module Comptabilite/Caisse tourne sur des donnees inventees : MOCK_MOUVEMENTS (l.44), MOCK_HISTORIQUE genere sur 30 jours (l.67), MOCK_VENTILATION (l.79) et MOCK_POURBOIRES_SERVEUR (l.86) alimentent graphiques et tableaux. Meme situation dans CloturePage.tsx (mockPaiements l.70, mockHistorique l.76) et DepensesPage.tsx (mockExpenses l.45).

```
const MOCK_MOUVEMENTS: Mouvement[] = [...] ; const MOCK_HISTORIQUE = Array.from({ length: 30 }, ...) ; <AreaChart data={MOCK_HISTORIQUE}> (l.286)
```

### [MAJEUR] `apps/web/src/pages/invoices/FacturesPage.tsx:64`

Le module Factures affiche mockFactures et calcule ses KPIs dessus (a envoyer, en attente, payees, CA total l.780-788) alors qu'un hook reel useInvoices existe et est deja consomme par lib/overdueAlerts.ts. Idem RelancesPage.tsx (mockInvoices l.51) et AvoirsPage.tsx (mockInvoices l.166).

```
const mockFactures: Facture[] = [...] ; const totalCA = mockFactures.filter(f => f.statut === 'PAID').reduce(...)
```

### [MAJEUR] `apps/web/src/pages/hr/EquipePage.tsx:72`

RH/Equipe liste des employes, documents et conges factices (MOCK_EMPLOYEES l.72, MOCK_DOCUMENTS l.117, MOCK_CONGES l.124) rendus directement (l.597, l.625). Meme famille : haccp/HistoriquePage.tsx (mockEntries l.79, mockPhotos l.108), haccp/JourneePage.tsx (photos mock l.86/447/516), haccp/TachesPage.tsx (calendrier mock, firstDayOffset=2 en dur l.184), crm/FidelitePage.tsx (MEMBERS_MOCK l.120), pos/Checkout.tsx (mockItems l.21 + mockCustomer 'Sophie Keller' l.29), marketing/CodesPage.tsx (MOCK_CODES l.44), formation/FormationPage.tsx (l.81), inventory/CommandesPage.tsx (l.81), inventory/FournisseursPage.tsx (historique mock l.365), inventory/StockPage.tsx (_DEMO_DATA l.129 + MOVEMENTS/WASTE_LOG/SUPPLIER_COMPARE l.148-171 toujours constants).

```
const MOCK_EMPLOYEES: Employee[] = [...] ; {MOCK_DOCUMENTS.map((doc, idx) => ...} l.597
```

### [MAJEUR] `apps/web/src/pages/pos/PosLayout.tsx:7`

Navigation POS incoherente : 3 des 6 entrees du sous-menu ne menent nulle part — 'Commandes' (/pos/orders) et 'Configuration' (/pos/config) redirigent vers /pos/dashboard (App.tsx l.306-307), 'Caisse' (/pos/checkout) redirige vers /pos/floor (App.tsx l.303) ; 'Cuisine KDS' (/pos/kitchen) est route HORS AppShell (App.tsx l.274) donc cliquer fait perdre le shell et le sous-menu. Par ailleurs /pos/floor-classic et /pos/design sont routes mais absents de la nav, tout comme /inventory/ocr dans InventoryLayout.

```
PosLayout: { label: 'Commandes', path: '/pos/orders' } ... App.tsx l.306: <Route path="orders" element={<Navigate to="/pos/dashboard" replace />} />
```

### [MAJEUR] `apps/web/src/components/layout/Sidebar.tsx:43`

Systeme de layout legacy mort mais toujours present : AppLayout.tsx + Sidebar.tsx (exportes par layout/index.ts, importes nulle part) proposent 15 entrees de nav dont la majorite pointent vers des routes inexistantes (/dashboard, /kitchen, /staff, /messages, /reports, /notifications, /settings, /profile, /reservations) avec des badges en dur (3, 5, 2). Quiconque le rebranche obtient une nav cassee et de fausses notifications.

```
{ to: '/agenda', ... badge: 3 }, { to: '/reservations', ... badge: 5 }, { to: '/messages', ... badge: 2 } — aucune de ces routes n'existe dans App.tsx
```

### [MAJEUR] `apps/web/src/App.tsx:104`

Imports lazy morts et pages orphelines : ReservListePage/ReservConfigPage (l.104-105), EventsDevisPage/ClientsB2BPage (l.145-146) sont importes mais jamais routes ; SustainabilityPage/CommunityPage/StatusPage (l.165-167) importes alors que leurs routes redirigent vers / (l.460-462). S'y ajoutent 6 layouts non routes (MarketingLayout, ReputationLayout, AgendaLayout, EventsLayout, ReservationsLayout, SettingsLayout) et 4 pages Settings* jamais importees (SettingsUsers, SettingsTables, SettingsCompany, SettingsCatalog, ~600-1100 lignes chacune, pleines de mocks type 'QR exportes en PDF (mock)').

```
const ReservListePage = lazy(() => import('@/pages/reservations/ListePage')) — aucun <Route> ne le reference ; grep SettingsUsers dans src : seulement sa propre definition
```

### [MAJEUR] `apps/web/src/pages/backup/BackupPage.tsx:39`

Module Sauvegarde : chaque appel (liste des sauvegardes, stock, backups complets) avale l'erreur en catch vide — sur 4xx/5xx la page affiche une liste vide comme s'il n'existait aucune sauvegarde, illusion dangereuse pour un module de securite. Contrevient a la convention du depot 'ne jamais avaler une erreur'.

```
l.36-45: const r = await fetchAuth(`${BACKEND}/api/inventory-ocr/backups`) ... } catch { /* offline */ } ... setLoading(false) — aucun etat d'erreur rendu
```

### [MINEUR] `apps/web/src/pages/admin/AdminLayout.tsx:16`

La garde admin lit le role sur companies[0] et non sur la societe active ; en multi-societes le role verifie peut etre celui d'une autre societe. Coherent avec authStore.setActiveCompany (l.88-94) qui change companyId sans recalculer role.

```
const currentRole = companies[0]?.role ?? 'EMPLOYEE' ; authStore.setActiveCompany: set({ company: uc.company, companyId: uc.companyId }) — role inchange
```

### [MINEUR] `apps/web/src/stores/moduleUXStore.ts:22`

Double persistance du viewMode : il vit a la fois dans le blob zustand persist (creorga-module-ux) et dans une cle brute creorga.viewMode lue seulement a l'initialisation — deux sources de verite qui peuvent diverger apres rehydratation.

```
readViewMode() lit window.localStorage.getItem('creorga.viewMode') (l.24) tandis que persist({ name: 'creorga-module-ux' }) sauvegarde aussi viewMode (l.63)
```

### [MINEUR] `apps/web/src/App.tsx:217`

La redirection onboarding utilise window.location.href='/setup' (rechargement complet hors React Router) declenchee par un useEffect sur chaque navigation — fragile, deja annote 'Nav via window to avoid loops'. Par ailleurs /modules et /tour montent le meme ModuleSelector (l.272-273) sans distinction.

```
if (!window.location.pathname.startsWith('/setup')) { window.location.href = '/setup' }
```

### [MINEUR] `apps/web/src/stores/moduleStore.ts:112`

Incoherence id/nom/chemin dans le catalogue de modules : le module id 'marketing' s'appelle 'CRM, Marketing & Reputation' et pointe vers /crm (il n'existe aucun id 'crm'), et 'accounting' annonce 'OCR factures' alors que l'OCR est route sous /inventory/ocr. Les bandeaux de commentaires ('CORE OPERATIONNEL (8 modules)') ne correspondent pas aux categories reelles (hr y figure mais est category 'admin').

```
{ id: 'marketing', name: 'CRM, Marketing & Reputation', path: '/crm', category: 'business' } ; { id: 'accounting', tagline: 'TVA, bilan & OCR factures' }
```

### [MINEUR] `apps/web/src/pages/ModuleSelector.tsx:342`

Un module 'Bientot disponible' declenche un alert() natif bloquant au lieu d'un toast (le commentaire dit d'ailleurs 'show toast-like hint'), et le responsive de la grille repose sur un selecteur CSS d'attribut style inline (div[style*="grid-template-columns: repeat(4"]) qui casse au moindre changement de style (l.774-785).

```
alert(`\u{1F6A7} ${cfg.customLabel || mod.name} est marque "Bientot disponible"`)
```

---

## Caisse (apps/pos)

**Résumé.** La caisse (apps/pos, ~15 800 lignes, 10 vues naviguées par état local sans React Router) repose sur un noyau solide et testé — posStore avec journal des ventes, ticket Z, paiement par couvert, verrou PIN et TVA extraite du TTC (15 tests vitest) — mais une grande partie de l'interface est décorative. Les remises, promos, cartes cadeaux, points et paiements mixtes sont affichés au client puis ignorés par processPayment qui réenregistre le prix plein au journal : la comptabilité ne correspond pas à ce qui est encaissé. La page Configuration entière, le Kitchen Display, le kiosque, les paiements par chaise (SeatPanel), Apple/Google Pay, le QR et l'envoi cuisine sont des maquettes sur données mock qui n'écrivent rien dans le store ; « Fermer la table » contourne même la protection anti-perte de closeTable via setTableStatus. Le plan de salle vient exclusivement du localStorage (12 tables démo par défaut, jamais d'état vide, positions persistées), la sync backend est one-way et avale silencieusement les échecs. Aucune media query dans toute l'application, interactions souris-seulement (hover, Alt+drag, clic droit) et nombreuses cibles tactiles de 22 à 36 px : inutilisable sur téléphone et pénible sur tablette.

### [CRITIQUE] `apps/pos/src/pages/PaymentPage.tsx:546`

Aucune remise n'est enregistrée comptablement : promos, cartes cadeaux, points fidélité, remise membre et arrondi caritatif sont soustraits du montant affiché au client (totalToPay) mais handleConfirm ne transmet que method et tipAmount ; processPayment (posStore.ts:758-811) recalcule le total plein depuis les couverts. Le journal et le ticket Z surévaluent le chiffre encaissé par rapport à ce que le client a réellement payé.

```
function handleConfirm() { const ids = splitMode === 'by-cover' ? [...selectedCoverIds] : undefined; processPayment(tableId, method, tipAmount, ids); setDone(true) } — alors que totalToPay = subtotal - (promoDiscount + giftDiscount + pointsDiscount + memberReduction) + tip + charity (l.457-479)
```

### [CRITIQUE] `apps/pos/src/pages/ConfigPage.tsx:39`

La page Configuration est entièrement factice : elle édite des mocks locaux (INITIAL_MENU 8 produits, INITIAL_STAFF 5 employés, INITIAL_TAXES) sans jamais toucher usePOS. Le vrai menu (170+ produits), le vrai personnel et les vrais réglages ne sont modifiables nulle part dans l'UI — les actions store correspondantes (addMenuItem, updateSettings, addStaff…) n'ont aucun appelant. Le bouton « Réinitialiser données » présenté comme irréversible ne fait que fermer la modale.

```
const INITIAL_MENU: MenuRow[] = [...] (l.39, jamais usePOS dans le fichier) ; bouton Confirmer l.699 : onClick={() => setShowReset(false)}
```

### [CRITIQUE] `apps/pos/src/pages/KitchenDisplay.tsx:70`

Le Kitchen Display est un simulateur : les 6 commandes viennent de generateMockOrders(), jamais du posStore ; aucune commande réelle prise sur OrderPage/WaiterMode n'y arrive (aucun mécanisme d'envoi cuisine n'existe dans l'app). Stats truquées (completedToday=27, avgPrepTime=8.4, cuisiniers fictifs).

```
const [orders, setOrders] = useState<KDSOrder[]>(generateMockOrders) (l.194) — usePOS n'est importé nulle part dans le fichier
```

### [CRITIQUE] `apps/pos/src/pages/FloorPlanPage.tsx:603`

« Fermer la table » contourne la protection anti-perte de closeTable : handleMarkDirty appelle setTableStatus(id,'dirty') sans vérifier les impayés. Une table avec consommations non réglées passe « à nettoyer » puis « libre » (Table nettoyée → handleMarkAvailable), et la prochaine ouverture (openTable, posStore.ts:506-517) écrase covers — les commandes impayées disparaissent sans encaissement, précisément le bug que closeTable (posStore.ts:529-546) devait empêcher.

```
function handleMarkDirty() { setTableStatus(table.id, 'dirty'); onClose() } — bouton « Fermer la table » l.725, sans passer par closeTable ni contrôle c.paidAt
```

### [CRITIQUE] `apps/pos/src/pages/KioskPage.tsx:501`

La commande kiosque validée n'est écrite nulle part : le bouton de confirmation fait setStep('success') avec numéro de commande aléatoire (l.94) et position de file aléatoire (l.124), puis le panier est vidé après 6 s. Aucun addItem/openTable, aucune trace store ni backend. De plus calcTax AJOUTE 8 %/17 % de taxes sur des prix qui sont déjà TTC selon la convention du store (et CLAUDE.md), gonflant le total affiché.

```
onClick={() => dineIn !== null && setStep('success')} ; calcTax l.84 : return { …, foodTax: foodSub * 0.08, drinkTax: drinkSub * 0.17, subtotal: foodSub + drinkSub }
```

### [MAJEUR] `apps/pos/src/pages/PaymentPage.tsx:363`

Paiement mixte factice : les paiements partiels (espèces+carte…) ne sont que de l'état local ; la vente est enregistrée avec l'unique state `method` (défaut 'card'), donc la ventilation par méthode du ticket Z est fausse dès qu'un paiement mixte est utilisé. Le mode « Parts égales » n'affiche qu'une division, tout est encaissé en une seule vente.

```
const [method, setMethod] = useState<PayMethod>('card') ; const [partials, setPartials] = useState<Partial[]>([]) — handleConfirm (l.546) ignore partials et passe method
```

### [MAJEUR] `apps/pos/src/pages/PaymentPage.tsx:1377`

« Garder ouvert pour +1 consommation » (keepOpen) ne change rien au comportement : handleConfirm encaisse normalement et processPayment libère la table dès que tout est payé. La promesse « la table reste ouverte » est fausse.

```
keepOpen ne sert qu'au style du bouton (l.1421 : background keepOpen ? orange : vert) et à son libellé ; aucun branchement dans handleConfirm
```

### [MAJEUR] `apps/pos/src/pages/PaymentPage.tsx:1169`

Apple Pay et Google Pay sont des boutons sans onClick ; le paiement QR est une simulation setTimeout (scanné à 2,6 s, payé à 5,2 s) sans transaction ; le reçu email/SMS collecte un contact jamais envoyé. Le vrai client de paiement lib/payments.ts (chargePayment vers /api/payments/charge, 6 providers) n'est importé nulle part — code mort.

```
<motion.button whileTap={{ scale: 0.96 }} style={walletBtn('#000')}>…Apple Pay (aucun onClick) ; useEffect QR l.432 : setTimeout(() => setQrStatus('scanned'), 2600); setTimeout(() => setQrStatus('paid'), 5200)
```

### [MAJEUR] `apps/pos/src/pages/OrderPage.tsx:642`

Plusieurs actions de commande sont jetées : note ticket (F2) et message cuisine (F3) ferment la modale en jetant le texte ; le transfert de table fait un alert() sans appeler transferTable ; l'historique affiche un mock en alert ; les modificateurs (+ suppléments €) et poids ne vivent qu'en état local — le total affiché avec suppléments diverge du store qui encaissera sans eux.

```
onConfirm={() => setShowNote(false)} (l.642), onConfirm={() => setShowCuisine(false)} (l.650), TransferModal onConfirm : alert(`Commande transférée vers …`) (l.669), lineTotal = (it.price + modExtra) * it.qty (l.335) vs coverTotal store sans modExtra
```

### [MAJEUR] `apps/pos/src/pages/OrderPage.tsx:127`

On peut ajouter des articles à un couvert déjà réglé (OrderPage ne filtre pas paidAt ; currentCover retombe sur covers[0] qui peut être payé après un règlement partiel). Ces articles deviennent inencaissables : PaymentPage et processPayment ne considèrent que les couverts !paidAt — consommation servie jamais facturée.

```
const currentCover = useMemo(() => table?.covers.find(c => c.id === activeCover) ?? table?.covers[0], …) — aucun contrôle c.paidAt ; PaymentPage l.445 : const covers = table.covers.filter(c => !c.paidAt)
```

### [MAJEUR] `apps/pos/src/pages/WaiterMode.tsx:178`

Le mode serveur encaisse en un seul tap, sans confirmation, toujours en 'card' et pourboire 0 (fausse ventilation par méthode) ; la table par défaut est codée en dur 't3' (l.54) ; et sélectionner une table libre l'ouvre automatiquement à 2 couverts (l.140-144) — simplement parcourir les tables les marque occupées. « Envoyé vers station » n'est qu'un toast (l.173-176), rien ne part en cuisine.

```
function handlePayment() { processPayment(selectedTableId, 'card', 0); setToast({ text: 'Paiement effectué ✓' }) … } ; useEffect(() => { if (selectedTable && selectedTable.status === 'available') { openTable(selectedTableId, 2) } }, [selectedTableId])
```

### [MAJEUR] `apps/pos/src/components/SeatPanel.tsx:171`

Le paiement par chaise est un alert() : les commandes prises par siège (seatStore) constituent une comptabilité parallèle jamais encaissée ni inscrite au journal, et invisibles pour floorBridge qui ne synchronise que les covers des tables (floorBridge.ts:31).

```
onClick={() => alert(`Paiement chaise ${total.toFixed(2)} €`)}
```

### [MAJEUR] `apps/pos/src/pages/FloorPlanPage.tsx:1078`

Fusion, séparation et transfert de tables n'existent que dans le store (mergeTables/unmergeTable/transferTable, posStore.ts:688-741, aucun appelant UI). Le transfert Alt+drag et le menu contextuel « Transférer » n'affichent qu'une notice « Commande transférée » sans rien déplacer ; « Réassigner serveur » et « Marquer VIP » ne font qu'un toast (le serveur affiché est un hash de l'id de table, l.25-35).

```
function onGlobalMouseUpTransfer() { if (transferFrom && transferTo) { … setTransferNotice(`Commande transférée : ${src.name} → ${dst.name}`) … } } — aucun appel à transferTable
```

### [MAJEUR] `apps/pos/src/pages/OrderPage.tsx:235`

Aucune adaptation mobile dans toute l'application : zéro media query (grep @media/matchMedia/innerWidth vide sur apps/pos), layouts en colonnes fixes (ticket 30 %/menu 70 % ici ; panneau 40 % PaymentPage:760 ; SeatPanel largeur fixe 460 px > écran téléphone 375 px), et interactions souris-seulement (hover pour les labels, Shift+clic, Alt+drag, clic droit pour le menu contextuel) sans équivalent tactile — sur tablette le menu contextuel des tables est inaccessible.

```
display: 'grid', gridTemplateColumns: '30% 70%' (OrderPage:235) ; width: 460 (SeatPanel:100) ; onContextMenu seul déclencheur du ContextMenu (FloorPlanPage:1013)
```

### [MAJEUR] `apps/pos/src/pages/KioskPage.tsx:62`

Les allergènes et régimes affichés au client kiosque sont fabriqués par hash de l'id produit (getFakeAllergens/getFakeDiets) : le filtre « allergies » affiche des avertissements et absences d'avertissement sans aucun rapport avec les produits réels — dangereux si mis devant un vrai client.

```
function getFakeAllergens(itemId: string): string[] { const hash = itemId.charCodeAt(0) + itemId.charCodeAt(itemId.length - 1) … }
```

### [MAJEUR] `apps/pos/src/lib/floorBridge.ts:41`

La synchronisation caisse→back-office avale silencieusement tout échec réseau (catch vide) : backend indisponible = divergence silencieuse du plan de salle côté web, sans indicateur, sans file d'attente ni retry (seul un prochain changement d'état re-poussera tout). Contraire à la convention CLAUDE.md « ne jamais avaler une erreur ».

```
} catch { /* backend down: ignore */ }
```

### [MINEUR] `apps/pos/src/pages/PinLoginPage.tsx:58`

Écran PIN : le compteur « 3 tentatives restantes » est purement décoratif (le vrai blocage store intervient à 5/10/15 échecs, posStore.ts:891) ; MOCK_META est indexé sur les ids '1'-'6' alors que le staff réel a 's1'-'s4' donc statuts/dernières connexions toujours au fallback ; météo « Rumelange 12°C » codée en dur (l.187) ; la modale « Accès administrateur » (triple tap logo) a un champ inerte (l.359) ; le PIN n'est pas saisissable au clavier physique.

```
const [attempts, setAttempts] = useState(3) … ({attempts} {t.attemptsLeft}) ; MOCK_META: Record<string,…> = { '1': …, '2': … } vs DEFAULT_STAFF ids 's1'-'s4'
```

### [MINEUR] `apps/pos/src/pages/OrderPage.tsx:165`

Le raccourci F4 (payer) appelle onPay() sans garde alors que le bouton Encaisser est disabled quand rawTotal === 0 : on peut ouvrir l'écran de paiement d'une table vide au clavier.

```
else if (e.key === 'F4') { e.preventDefault(); onPay() } — vs bouton l.467 : disabled={rawTotal === 0}
```

### [MINEUR] `apps/pos/src/components/SeatPanel.tsx:314`

Nombreuses cibles tactiles sous 44 px pour une caisse tactile : qtyBtn 26×26 ici ; chipRemove 22×22 (PaymentPage:1493) ; MiniBtn ≈23 px de haut (OrderPage:700) ; headerBtn ≈31 px (App.tsx:349) ; croix de modale 28×28 (OrderPage:783) ; hitbox des pastilles sièges r=11 soit 22 px (FloorPlanPage:114) ; counterBtn 36×36 (PaymentPage:1485).

```
const qtyBtn: React.CSSProperties = { width: 26, height: 26, … }
```

### [MINEUR] `apps/pos/src/pages/ReceiptPreview.tsx:1`

Code mort : ReceiptPreview.tsx (756 lignes), RoomsPager.tsx, TableSummary.tsx et LoyaltyScanner.tsx ne sont importés nulle part (seul SeatPanel l'est) ; lib/payments.ts non plus. Actions store sans appelant : mergeTables, unmergeTable, transferTable, removeCover, renameCover, addMenuItem, updateMenuItem, removeMenuItem, toggleMenuItem, updateSettings, addStaff, removeStaff.

```
grep « import .*(ReceiptPreview|RoomsPager|TableSummary|LoyaltyScanner) » sur apps/pos/src : 0 résultat hors SeatPanel
```

### [MINEUR] `apps/pos/src/pages/OrderPage.tsx:124`

Références à un ancien menu : favoriteIds ['m7','m21','m14',…] ne correspondent à aucun id du DEFAULT_MENU réel (bc1, s1, b1…) donc la rangée Favoris ne s'affiche jamais ; CATEGORY_ICONS/CATEGORY_COLORS (l.12-20) ciblent des catégories inexistantes ('Boissons', 'Cuisine', 'Desserts') donc toutes les catégories retombent sur '•' et l'indigo ; même problème dans WaiterMode (CAT_EMOJIS/STATION_MAP l.15-23).

```
const [favoriteIds] = useState<string[]>(['m7', 'm21', 'm14', 'm4', 'm11', 'm26']) — DEFAULT_MENU utilise des ids 'bc1'…'dv1'
```

### [MINEUR] `apps/pos/package.json:10`

Le script « test »: « vitest run » fonctionne uniquement par hoisting (vitest est déclaré dans apps/backend, pas dans apps/pos) : dépendance non déclarée, fragile si le workspace backend change.

```
devDependencies de apps/pos : @types/react, @types/react-dom, @vitejs/plugin-react, typescript, vite — pas de vitest ; node_modules/.bin/vitest présent à la racine seulement
```

### [MINEUR] `apps/pos/src/App.tsx:28`

setState pendant le rendu pour la transition post-login (setView('floor') appelé dans le corps du composant), et le champ MenuItem.stock (initialisé à 100 partout) n'est jamais décrémenté ni affiché — gestion de stock décorative.

```
if (view === 'pin_login' && currentStaff) { setView('floor') } (hors useEffect) ; posStore.ts:151 : mk = (…) => ({ …, stock: 100 })
```

### [MINEUR] `apps/pos/src/store/seatStore.ts:165`

seatStore est persisté sans version ni migrate ('creorga-pos-seats') — le défaut exactement corrigé (et documenté) sur posStore (version 1 + migrate, posStore.ts:926-948) est reproduit sur le second store.

```
{ name: 'creorga-pos-seats' } — aucun champ version/migrate
```

---

## Securite backend

**Résumé.** Le chemin de commande faisant autorité (routes/orders.ts) est sain : il recalcule prix et TVA depuis la base, restreint les produits à la société et cloisonne chaque route par id — les 6 routeurs du commit 607307a (stats, categories, products, tables, orders, companies/members) passent bien par requireCompany qui vérifie l'adhésion UserCompany. En revanche, le chemin public guest (routes/guest.ts) fait confiance au prix ET au total envoyés par le navigateur, y compris pour déclencher un paiement Stripe d'un montant arbitraire. Les routes /api/stripe (facturation) ne sont protégées que par authenticate : tout compte authentifié, même STAFF d'une autre société, peut annuler ou lire n'importe quel abonnement par id (IDOR inter-locataires). Le webhook Stripe ne peut pas vérifier la signature (corps déjà parsé par express.json global, monté derrière authenticate, repli qui fait confiance à un payload non signé). Le changement de statut de commande n'est protégé par aucun rôle (public côté guest, STAFF/appareil côté staff). Tous les champs monétaires du schéma sont des Float. La branche jeton d'appareil de requireCompany croit encore l'en-tête x-company-id (seule l'existence de la société est vérifiée, pas la liaison appareil-société).

### [MAJEUR] `apps/backend/src/routes/guest.ts:130`

La route publique POST /api/guest/pay prend le montant `total` directement dans le corps de la requête et le facture tel quel via Stripe (unit_amount: Math.round(total*100)). Aucun recalcul depuis une commande en base. Un client peut régler un montant arbitraire (ex. 0,50 € pour une addition de 80 €). Aucune liaison à une commande réelle n'est vérifiée.

```
l.131 `const { tableId, total } = req.body` puis l.147 `unit_amount: Math.round(total * 100)` — le total vient du navigateur, jamais de la base.
```

### [MAJEUR] `apps/backend/src/routes/guest.ts:55`

POST /api/guest/orders (public) calcule le total à partir des prix envoyés par le client sans les revalider contre le catalogue. Le suivi de commande guest et son total reposent sur des prix falsifiables. Contraste direct avec orders.ts qui recalcule depuis la base.

```
l.60 `const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)` — `i.price` provient de `req.body.items` (l.56), aucun accès à prisma.product.
```

### [MAJEUR] `apps/backend/src/routes/stripe.ts:155`

Le routeur /api/stripe est monté avec authenticate seul (index.ts:232), sans requireCompany ni requireRole. DELETE /subscription/:id, GET /subscriptions/:customerId, POST /portal et GET /session/:id acceptent des identifiants Stripe arbitraires du client sans vérifier qu'ils appartiennent à la société de l'appelant. Tout compte authentifié (y compris STAFF d'une autre société) peut annuler ou lire l'abonnement de n'importe quel locataire — IDOR de facturation inter-sociétés. Le commentaire index.ts:229-231 prétend avoir corrigé l'IDOR en ajoutant authenticate, mais authenticate n'exige aucune appartenance à ce client Stripe.

```
l.155-162 `router.delete('/subscription/:id', ...) => stripe.subscriptions.cancel(req.params.id)` sans aucun contrôle de propriété ; index.ts:232 `app.use('/api/stripe', authenticate, stripeRoutes)` — pas de requireCompany/requireRole.
```

### [MAJEUR] `apps/backend/src/routes/stripe.ts:48`

Le webhook POST /api/stripe/webhook ne peut pas vérifier la signature : (1) express.json() global (index.ts:160) parse le corps AVANT la route, donc req.body n'est plus le Buffer brut requis par constructEvent — aucun express.raw n'est monté pour ce chemin ; (2) il est placé derrière authenticate (index.ts:232), or Stripe n'envoie pas de JWT, la route est donc inatteignable par Stripe ; (3) en l'absence de secret ou de signature, le code retombe sur `event = req.body`, faisant confiance à un événement non signé. Les handlers sont de toute façon des TODO no-op.

```
l.54-58 `if (secret && sig) { event = stripe.webhooks.constructEvent(req.body, sig, secret) } else { event = req.body as Stripe.Event }` ; req.body est déjà du JSON parsé (pas de Buffer), et le repli `else` accepte un payload non vérifié.
```

### [MAJEUR] `apps/backend/src/routes/orders.ts:224`

PUT /api/orders/:id/status et POST /api/orders/:id/checkout ne sont protégés par aucun rôle : ils vérifient seulement l'appartenance de la commande à la société. Un membre STAFF, ou tout porteur du jeton d'appareil POS, peut passer une commande à PAID ou CANCELLED, ou l'encaisser. Contraste avec rapports-caisse monté sous requireRole('OWNER').

```
l.224 `router.put('/:id/status', validate(updateStatusSchema), ...)` et l.256 `router.post('/:id/checkout', ...)` — aucun requireRole ; montage index.ts:208 `app.use('/api/orders', deviceOrUserAuth, ordersRoutes)` sans rôle.
```

### [MAJEUR] `apps/backend/src/routes/guest.ts:85`

PATCH /api/guest/orders/:id/status est totalement public (routeur guest monté avec publicLimiter seul, index.ts:261). N'importe qui connaissant/devinant un id de commande guest peut changer son statut (received/preparing/on_the_way). Combiné à l'absence de tout companyId sur guest-orders.json, il n'y a aucune restriction de locataire.

```
l.85 `router.patch('/orders/:id/status', (req, res) => { ... order.status = status ... })` sans authenticate ; index.ts:261 `app.use('/api/guest', publicLimiter, guestRoutes)`.
```

### [MAJEUR] `apps/backend/src/middleware/requireCompany.ts:32`

Branche jeton d'appareil : quand la requête porte un X-Device-Token (donc req.device sans req.user), requireCompany ne vérifie QUE l'existence de la société annoncée dans x-company-id (findUnique), jamais une liaison appareil-société. Le jeton POS étant un secret d'installation partagé (POS_DEVICE_TOKEN unique), un terminal peut fixer n'importe quel x-company-id et atteindre les commandes/plan de salle/config d'une autre société sur les routes deviceOrUserAuth (orders, floor-state, module-config, payments). Le code documente cette limite mais elle reste exploitable en multi-locataire.

```
l.40-48 `const company = await prisma.company.findUnique({ where: { id: companyId } }) ... ;(req).companyId = companyId ;(req).role = null` — aucune vérification que l'appareil est rattaché à cette société.
```

### [MAJEUR] `apps/backend/prisma/schema.prisma:159`

Tous les champs monétaires sont stockés en Float (binaire flottant), jamais en Decimal ni en centimes entiers : Product.price/taxRate (159-160), Order.subtotal/taxAmount/total/cashReceived/cashChange (186-192), OrderItem.unitPrice/taxRate (218-219), Customer.walletBalance (254), LoyaltyTransaction.amount (276), GiftCard.initialValue/currentBalance (289-290), Invoice.subtotal/taxAmount/total (309-311), InvoiceItem.unitPrice/taxRate (332-333), Quote.total (347), QuoteItem.unitPrice/taxRate (365-366), Ingredient.costPerUnit/currentStock/minStockLevel (401-403), PurchaseOrder.total (450), PurchaseOrderItem.unitCost (466), CashDrawer.openAmount/closeAmount/totalSales/discrepancy (602-605), Expense.amount/taxRate (619-620), EventQuote.subtotal/depositAmount/total (662-665), EventQuoteItem.unitPrice (682), EmployeeProfile.salaireBrut (704), TenantMetricDaily.revenue/cashDiscrepancy/invoicesOverdueAmount (850-856). La TVA est calculée sur des Float (product.price * taxRate/100). Le helper cents() arrondit à l'écriture mais le stockage reste flottant, sujet aux erreurs de représentation et d'agrégation.

```
schema.prisma l.159 `price Float`, l.160 `taxRate Float @default(17)`, l.186-188 `subtotal/taxAmount/total Float @default(0)` — aucun `@db.Decimal` dans tout le fichier.
```

### [MINEUR] `apps/backend/src/routes/guest.ts:218`

GET /api/guest/loyalty/:phone (public) fait un findFirst sur Customer par téléphone SANS filtre companyId : dans un déploiement multi-sociétés, un numéro renverrait les points de fidélité de la première société correspondante, fuite inter-locataires. Pattern « première entreprise/ligne trouvée ».

```
l.220-223 `prisma.customer.findFirst({ where: { phone: req.params.phone }, select: { points: true } })` — pas de `companyId` dans le where.
```

### [MINEUR] `apps/backend/src/lib/stockStore.ts:87`

Le job de synchro stock retombe sur `prisma.company.findFirst({ select: { id: true } })` (première société trouvée) quand aucun companyId n'est fourni, et y rattache les ingrédients. En multi-locataire, le stock JSON serait injecté dans la mauvaise société. Travail de fond, mais pattern « première entreprise trouvée » explicite.

```
l.87 `companyId || (await prisma.company.findFirst({ select: { id: true } }))?.id`.
```

### [MINEUR] `apps/backend/src/routes/help-feedback.ts:56`

/api/help/feedback est monté sans aucun middleware (index.ts:280 : ni authenticate, ni limiteur, ni requireCompany). GET / renvoie les 200 dernières entrées de feedback (commentaires libres) à tout visiteur anonyme, et POST / permet d'inonder le fichier (plafond 5000). Lecture publique de données de gestion + vecteur de spam non authentifié.

```
index.ts:280 `app.use('/api/help/feedback', helpFeedbackRoutes)` (aucun garde) ; help-feedback.ts:56 `router.get('/', (_req, res) => { res.json({ items: load().slice(0, 200) }) })`.
```

### [MINEUR] `apps/backend/src/routes/email.ts:7`

Le routeur /api/email (authenticate seul, index.ts:233) laisse tout compte authentifié, quel que soit son rôle ou sa société, envoyer un email via le SMTP de la plateforme à un destinataire arbitraire (`to` du corps) avec des templates. Pas de requireCompany ni de rôle. Vecteur d'abus/spam sortant depuis le domaine de l'application (le lien de reset est heureusement validé contre FRONTEND_URL, l.36).

```
email.ts:7-9 `router.post('/test', ...) { const { to, template, data } = req.body ... }` puis sendEmail vers `to` ; index.ts:233 `app.use('/api/email', authenticate, emailRoutes)`.
```

### [MINEUR] `apps/backend/src/middleware/audit-log.ts:88`

Trou de journalisation sur des actions sensibles : /api/guest (paiements guest, changement de statut de commande, appel serveur) et /api/floor-state (ouverture/encaissement de table, ajout d'articles) sont dans CHEMINS_EXCLUS, donc ni journalisés dans audit-log.json ni tracés. Un paiement guest ou une modification d'addition ne laisse aucune trace d'audit. Les mutations Stripe (annulation d'abonnement) sont en revanche bien journalisées (chemin non exclu).

```
l.88-97 `CHEMINS_EXCLUS = ['/api/owner/audit','/api/creator','/api/health','/api/floor-state','/api/portal-config','/api/guest','/api/game-scores','/api/media-affichage']` — guest et floor-state exclus alors qu'ils portent des actions monétaires.
```

### [MINEUR] `apps/backend/src/routes/floorState.ts:110`

L'état du plan de salle (tables, chaises, additions en cours, prix) est un singleton global chargé une fois depuis un fichier unique floor-state.json via dataPath() sans req, donc sans siteId : aucune séparation par société. Idem moduleConfig.ts (module-config.json) et ads.ts (ads.json). En multi-locataire, toutes les sociétés partagent le même plan de salle et les mêmes additions. Documenté comme repli mono-site (TODO dataDir(req)) mais reste un défaut de cloisonnement.

```
floorState.ts:110-113 `let state: FloorState = safeReadJson<FloorState>(dataPath(FICHIER), ...)` — `state` au niveau module, fichier global, aucun companyId dans FloorState (l.71-78).
```

---

## Toggles et options

**Résumé.** Audit exhaustif des interrupteurs de apps/web et apps/pos (racine C:\Users\Bryan\Desktop\claude code\creorga). Sur environ 70 toggles de configuration recenses, seuls 2 atteignent reellement le serveur (isLive des pubs via /api/ads, marketingConsent a la creation d'un client) ; une dizaine vivent en localStorage (moduleConfigStore, envModeStore, assistantStore, accessibilite, portail client) ; tout le reste est COSMETIQUE, souvent avec un faux bouton Enregistrer qui affiche un toast de succes sans rien sauvegarder. SettingsModules est confirme localStorage-only (zustand persist 'creorga-module-config'), alors qu'une route backend /api/module-config existe et que ModuleSelector applique un merge "remote wins" qui peut ecraser silencieusement les reglages locaux. Decouverte critique sur le portail client : ClientsConfig synchronise via PATCH /api/portal-config sans header Authorization alors que le backend exige depuis un garde Bearer+OWNER pour PATCH — le 401 est avale deux fois (return null dans usePortalConfig, .catch(() => {}) dans ClientsConfig), donc les toggles jeux/chat/menu/commandes/avis/annonces n'atteignent jamais le portail 5178, et la config backend est de toute facon in-memory (perdue au redemarrage, non multi-tenant). Aucun toggle du depot n'implemente de rollback en cas d'echec API.

### [CRITIQUE] `apps/web/src/hooks/usePortalConfig.ts:39`

La synchronisation des options du portail client (jeux, chat, menu, commandes, avis, annonces) echoue systematiquement en 401 : le PATCH /api/portal-config part sans header Authorization alors que le backend exige Bearer + role OWNER pour PATCH (apps/backend/src/index.ts lignes 239-259, authenticate refuse tout appel sans Bearer — apps/backend/src/middleware/auth.ts lignes 23-27, aucun fallback dev). L'echec est avale deux fois : update() catch et retourne null (usePortalConfig.ts lignes 48-51), puis ClientsConfig.tsx ligne 272 fait .catch(() => { /* offline ok */ }). Resultat : les toggles du back-office ne parviennent JAMAIS au portail 5178, sans aucun message d'erreur.

```
usePortalConfig.ts l.39-43 : fetch(`${BACKEND}/api/portal-config`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, ... }) — pas d'Authorization ; index.ts l.242-243 : protectedRoute = req.method === 'PUT' || req.method === 'PATCH' ... puis authenticate() ; ClientsConfig.tsx l.272 : updateRemoteConfig({...}).catch(() => { /* offline ok */ })
```

### [CRITIQUE] `apps/web/src/pages/settings/SettingsCompany.tsx:994`

Les 5 toggles de la page Parametres entreprise (QR sur tickets l.621, email commandes l.654, SMS urgents l.663, push l.672, et surtout l'authentification a deux facteurs l.832) ne sauvegardent rien : handleSave affiche un toast 'Parametres enregistres' sans aucun appel API ni localStorage. L'utilisateur croit avoir active la 2FA alors que rien n'existe. Valeurs initiales codees en dur (l.634-640, l.744), jamais chargees du serveur.

```
l.994-996 : const handleSave = () => { toast.success('Paramètres enregistrés') } — corps entier de la fonction ; l.744 : const [twoFa, setTwoFa] = useState(false)
```

### [CRITIQUE] `apps/backend/src/routes/portalConfig.ts:35`

(Fichier PROTEGE, lu seulement.) La configuration du portail client est stockee en memoire process ('let current') : perdue a chaque redemarrage du backend, et unique pour toute l'instance — aucune segmentation par companyId, donc non multi-tenant. Meme si le PATCH du back-office fonctionnait, la config retomberait aux defauts au premier redeploiement.

```
l.9 : 'Stored in-memory here (sufficient for dev; swap for Redis or DB in prod)' ; l.35 : let current: PortalConfig = { ...DEFAULT_CONFIG } ; l.262-266 : router.patch('/', ...) mute simplement 'current'
```

### [MAJEUR] `apps/web/src/stores/moduleConfigStore.ts:53`

CONFIRME : SettingsModules est localStorage-only. Le store zustand persiste sous 'creorga-module-config' et ne contient aucun appel reseau, alors que le backend expose /api/module-config (index.ts l.263) persiste dans data/module-config.json. Consequence aggravante : ModuleSelector.tsx (l.293-300) fusionne local + remote avec 'remote wins' — un reglage fait dans SettingsModules peut etre ecrase silencieusement par la config superadmin, et n'est jamais partage entre postes/navigateurs.

```
moduleConfigStore.ts l.34-55 : create()(persist((set,get)=>({...}), { name: 'creorga-module-config' })) — zero fetch ; ModuleSelector.tsx l.293 : '// Remote wins (backend) — falls back to local if no remote entry'
```

### [MAJEUR] `apps/web/src/pages/clients/ClientsConfig.tsx:234`

Au chargement, les valeurs des toggles du portail viennent uniquement de localStorage (jamais du serveur) : le hook est instancie avec usePortalConfig(0) 'no polling here, we're the writer' (l.259) et config n'est jamais lu. Deux navigateurs affichent donc deux etats differents, et un localStorage vide reinitialise tout aux defauts sans avertir.

```
l.234-257 : useEffect(() => { const raw = localStorage.getItem(STORAGE_KEY) ... setSettings(...) }, []) ; l.259 : const { update: updateRemoteConfig } = usePortalConfig(0) — la valeur 'config' retournee par le hook n'est jamais utilisee
```

### [MAJEUR] `apps/web/src/pages/haccp/JourneePage.tsx:440`

La checklist HACCP quotidienne (cases a cocher l.725, toggleTask l.469) vit en etat React pur : aucun localStorage, aucun appel API. Un rechargement de page efface les pointages d'hygiene — donnees de conformite reglementaire perdues sans trace.

```
l.440 : const [blocks, setBlocks] = useState<TimeBlock[]>(buildInitialBlocks) ; grep localStorage|fetch sur le fichier : aucune occurrence
```

### [MAJEUR] `apps/web/src/pages/ads/AdsAdminPage.tsx:61`

Seuls toggles reellement persistes serveur du back-office (isLive), mais sans gestion d'echec : save() et toggleLive() n'ont ni try/catch ni message d'erreur — un echec reseau produit une promesse rejetee non geree et l'UI referme le formulaire comme si tout etait sauve. Pas de rollback (le refetch masque l'echec) et fetchAds avale les erreurs (l.38 catch { /* offline */ }).

```
l.61-64 : const toggleLive = async (id) => { await fetchAuth(`${BACKEND}/api/ads/${id}/toggle-live`, { method: 'POST' }); fetchAds() } — aucun try/catch ; l.42-55 : save() idem puis setShowForm(false)
```

### [MAJEUR] `apps/pos/src/store/posStore.ts:858`

toggleMenuItem (l.858) et updateSettings (l.864) sont persistes dans le store zustand 'creorga-pos-v2' mais ne sont appeles par AUCUNE page : la page ConfigPage du POS manipule a la place des copies mock locales (INITIAL_MENU l.128, INITIAL_TAXES l.501) avec un faux bouton Sauvegarder (l.334 : save() = setSaved(true) + timeout, zero persistance). Les toggles produit actif / taxe active / mode kiosque du POS ne survivent donc pas au rechargement alors que l'infrastructure de persistance existe.

```
grep 'toggleMenuItem|updateSettings' sur apps/pos/src : seules occurrences dans posStore.ts (definitions l.470/473/858/864), aucun appelant ; ConfigPage.tsx l.334 : function save() { setSaved(true); setTimeout(() => setSaved(false), 1800) }
```

### [MAJEUR] `apps/web/src/pages/crm/ClientsPage.tsx:232`

La case marketingConsent (l.1239) est envoyee au serveur a la creation du client (createCustomer.mutate l.356), mais a la lecture le mapping force marketingConsent/emailOptIn/smsOptIn a false pour tous les clients (l.232-234, commentaire RGPD assume) : la valeur affichee ne reflete jamais ce qui a ete enregistre — aller simple sans retour.

```
l.232-234 : marketingConsent: false, emailOptIn: false, smsOptIn: false (dans le map des apiCustomers) ; l.356 : createCustomer.mutate(newForm) ou newForm contient marketingConsent
```

### [MAJEUR] `apps/web/src/pages/hr/ParamsPage.tsx:50`

Parametres RH/paie (report des conges l.281, cotisation CNS l.362, pension l.375, assurance dependance l.388) : le bouton Enregistrer affiche 2 s de confirmation sans rien persister — parametres legaux de paie purement decoratifs.

```
l.50-53 : const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }
```

### [MAJEUR] `apps/web/src/pages/admin/AdminCompany.tsx:129`

Horaires d'ouverture avec cases dejeuner/diner par jour (l.263, l.268) : handleSave = toast 'Informations enregistrees avec succes' sans persistance. Etat initial code en dur (INITIAL_SCHEDULE l.97), jamais charge du serveur.

```
l.129-131 : const handleSave = () => { toast.success('Informations enregistrées avec succès', { duration: 2500, icon: '✓' }) }
```

### [MINEUR] `apps/web/src/pages/qrmenu/QrMenuPage.tsx:146`

Les 7 toggles du generateur QR Menu (posSync l.454, showPrices l.543, showAllergens l.550, showPhotos l.557, allowOrdering l.564, multilingual l.571, tracking l.646) sont des useState a defauts codes en dur, perdus au rechargement ; posSync et allowOrdering ne sont figes en localStorage qu'au moment de publier le document (l.330-343), pas en tant que reglages editables.

```
l.146-163 : const [posSync, setPosSync] = useState(true) ... const [tracking, setTracking] = useState(true) — aucun load/save de ces flags
```

### [MINEUR] `apps/pos/src/pages/KitchenDisplay.tsx:207`

Reglages KDS (son l.1633, gros affichage l.1638, stats l.1643, auto-bump, rotation) en useState sans persistance : un ecran de cuisine redemarre chaque matin repart aux defauts.

```
l.207 : const [settings, setSettings] = useState<Settings>({ ... }) — aucun localStorage ni API dans le fichier pour ces reglages
```

### [MINEUR] `apps/web/src/pages/Dashboard.tsx:347`

La personnalisation des sections du tableau de bord (cases l.1113-1114) est en etat React pur : le fichier ne contient aucun localStorage — la personnalisation disparait a chaque visite.

```
l.347 : const [sections, setSections] = useState<Record<SectionKey, boolean>>(DEFAULT_SECTIONS) ; grep localStorage sur Dashboard.tsx : 0 resultat
```

### [MINEUR] `apps/web/src/pages/settings/SettingsTables.tsx:814`

Attributs de tables (PMR, fenetre, calme, prise, wifi — AccessToggle l.814-847) et regles (acompte, duree max) sur donnees mock INITIAL_TABLES en useState : rien n'est sauvegarde nulle part.

```
l.166-168 : const [salles, setSalles] = useState(INITIAL_SALLES); const [tables, setTables] = useState(INITIAL_TABLES) — aucun fetch/localStorage
```

### [MINEUR] `apps/web/src/pages/reservations/ListePage.tsx:866`

Toggles de rappels automatiques J-2/J-1/H-2 en useState ({ j2: true, j1: true, h2: true } l.287) : aucun envoi au serveur, donc aucun rappel reel ne peut etre configure. Idem CalendrierPage.tsx (requireCard l.976, collectDeposit l.977, linkEvent l.984, linkCatering l.985 — useState l.839-843).

```
l.287 : const [reminders, setReminders] = useState({ j2: true, j1: true, h2: true })
```

### [MINEUR] `apps/web/src/pages/invoices/FacturesPage.tsx:527`

Assistant de facture : peppolEnabled l.527, recurring l.560, showQR l.583 en useState sur donnees mock (FACTURES l.65-72) — le module facturation reel du backend n'est pas branche a ces options. Meme motif : invoices/DevisPage.tsx autoRemind l.464, InvoiceEnhancements.tsx regles de relance l.228 (DEFAULT_RULES).

```
l.431-433 : const [peppolEnabled, setPeppolEnabled] = useState(true); const [showQR, setShowQR] = useState(true); const [recurring, setRecurring] = useState(false)
```

### [MINEUR] `apps/web/src/pages/licences/LicencesPage.tsx:369`

Cases entierement non cablees (ni checked ni onChange) : LicencesPage l.369 'Renouvellement automatique' ; SitesPage.tsx l.585-588 (4 cases defaultChecked jamais lues : cloner menu, grille tarifaire, personnel, synchro auto) ; AudiencesPage.tsx l.736 (segment dynamique) ; RgpdPage.tsx l.384. Purement decoratives.

```
LicencesPage.tsx l.369 : <input type="checkbox" /> Renouvellement automatique — input non controle, valeur jamais lue
```

### [MINEUR] `apps/web/src/pages/pos/Checkout.tsx:123`

Ecran caisse du back-office : autoPrint l.123 et split l.240 en useState — le choix d'impression automatique du ticket n'est pas memorise entre deux encaissements. Idem cote apps/pos : ReceiptPreview showQR l.524 / hasSignature l.566, PrintersTab autoPrint ConfigPage l.422.

```
l.45 : const [autoPrint, setAutoPrint] = useState(true) — aucune persistance
```

---

## Flux produit / stock / menu

**Résumé.** Les produits vivent dans Prisma (model Product), servis par routes/products.ts (back-office) et par la route publique /api/portal-config/menu, mais le POS n'utilise NI l'un NI l'autre pour sa carte principale : son menu est un tableau de ~180 produits codé en dur dans posStore.ts, persisté en localStorage. Le stock existe en TROIS endroits non reliés (Product.stock jamais lu, Ingredient.currentStock en Prisma, et data/inventory-stock.json qui est la vraie source runtime), et RIEN ne le décrémente à la vente : grep « decrement » = 0 occurrence dans tout le monorepo, seule la réception d'un bon de commande fait un increment. syncStockToPrisma (lib/stockStore.ts) réplique le JSON vers Ingredient toutes les 15 min, en sens unique, vers une société arbitraire. Un Coca-Cola à zéro ne produit RIEN dans le POS (stock fictif à 100, jamais lu), disparaît silencieusement de la carte client uniquement si une entrée JSON homonyme existe à quantité 0 (le fichier est actuellement vide), et ne déclenche AUCUNE notification car le worker proactif lit des champs inexistants (qty/minStock au lieu de quantity/lowStockThreshold) et exclut de toute façon qty=0. Les recettes (Recipe en Prisma + API CRUD) ne consomment jamais d'ingrédients à la vente et la page web Recettes est entièrement mock.

### [CRITIQUE] `apps/pos/src/store/posStore.ts:758`

Aucun décrément de stock à la vente, nulle part dans le monorepo : processPayment inscrit la vente au journal local mais ne touche ni menu[].stock ni le backend ; orders.ts et portalConfig.ts (client-events) créent des Order Prisma sans toucher Product.stock, Ingredient.currentStock ni inventory-stock.json.

```
grep -r "decrement" apps/ → 0 occurrence ; la seule opération de stock liée à un flux métier est un increment à la réception d'un bon de commande (inventory.ts:160).
```

### [CRITIQUE] `apps/pos/src/store/posStore.ts:155`

Le menu principal du POS est codé en dur (~180 produits DEFAULT_MENU) et persisté en localStorage, jamais synchronisé avec Prisma Product : deux sources de vérité produit divergentes entre caisse et back-office/carte client, avec un stock fictif initialisé à 100 (l.150-153) jamais lu.

```
const DEFAULT_MENU: MenuItem[] = [ mk('bc1', 'Café', 2.80, …) … ] ; divergence de prix documentée dans SeatPanel.tsx:21-28 (« Burger » 4,50 € en dur vs 16,00 € back-office, mesuré le 27/07/2026).
```

### [MAJEUR] `apps/backend/src/jobs/proactive-worker.ts:76`

L'alerte proactive 'stock-low' est morte : elle lit item.qty et item.minStock alors que le schéma StockEntry utilise quantity et lowStockThreshold, donc qty vaut toujours 0 ; et la condition exige qty > 0, ce qui exclut de toute façon la rupture totale. Une rupture (Coca à 0) ne notifie jamais.

```
const qty = item.qty || 0 ; const min = item.minStock || 5 ; if (qty <= min && qty > 0) — vs stockStore.ts:18-28 : quantity / lowStockThreshold.
```

### [MAJEUR] `apps/backend/src/routes/agent.ts:179`

La commande 'inv.low-stock' (utilisée par le briefing quotidien, /proactive, MobileAlerts, assistant) lit les mêmes champs inexistants s.qty/s.minQty : pour toute entrée réelle, 0 <= 5 est vrai, donc TOUT le stock est déclaré « sous seuil » — bruit permanent au lieu d'alerte fiable.

```
const low = stock.filter((s: any) => (s.qty || 0) <= (s.minQty || 5)) — les entrées écrites par inventory-ai.ts portent quantity/lowStockThreshold.
```

### [MAJEUR] `apps/backend/src/lib/stockStore.ts:82`

Trois stocks non reliés : Product.stock (schema.prisma:165, jamais lu par aucune route), Ingredient.currentStock (Prisma), et inventory-stock.json (runtime). syncStockToPrisma ne réplique qu'en sens unique JSON→Ingredient, toutes les 15 min, vers une société ARBITRAIRE (findFirst sans orderBy, l.87) — défaut multi-tenant, et les modifications faites côté Prisma sont écrasées.

```
const targetCompanyId = companyId || (await prisma.company.findFirst({ select: { id: true } }))?.id — aucun appelant ne passe companyId (startStockSyncJob l.121 appelle syncStockToPrisma()).
```

### [MAJEUR] `apps/backend/src/lib/stockStore.ts:60`

La liaison stock↔produit de la carte publique repose sur une correspondance de NOM bidirectionnelle par includes() : « Sirop » matche « Sirop d'érable », « Cola » matche « Cola Zero »… Un produit peut être masqué de la carte client à cause d'un homonyme partiel à zéro, ou rester affiché en rupture réelle si les libellés diffèrent.

```
return name && (normalized.includes(name) || name.includes(normalized)) — premier match retenu, sans companyId ni identifiant produit.
```

### [MAJEUR] `apps/web/src/pages/inventory/RecettesPage.tsx:101`

Les recettes ne sont PAS liées au stock : l'API Prisma Recipe existe (inventory.ts:174-209) mais aucun code ne consomme les ingrédients d'une recette lors d'une vente, et la page web Recettes est un mock local complet qui n'appelle jamais cette API (marges et food-cost calculés sur des données inventées).

```
/* ─── mock recipes ─── */ const SEED: Omit<Recette, 'allergenes'>[] = [ … ] — grep fetch|axios|api. dans le fichier → 0 résultat ; grep « /recipes » dans apps/web/src → 0 résultat.
```

### [MINEUR] `apps/web/src/hooks/api/useProducts.ts:62`

useProduct (GET /products/:id) et useUpdateProduct (PATCH /products/:id) appellent des routes qui n'existent pas dans products.ts (seuls GET /, POST /, PUT /:id, DELETE /:id sont définis) → 404 garanti si utilisés ; aucun consommateur trouvé aujourd'hui mais piège armé.

```
api.patch(`/products/${id}`, data) — products.ts ne définit ni router.get('/:id') ni router.patch.
```

### [MINEUR] `apps/web/src/pages/settings/SettingsCatalog.tsx:92`

Les pages catalogue du back-office (SettingsCatalog, AdminCatalog) affichent des produits et stocks entièrement fictifs, sans aucun appel API : un exploitant peut croire gérer sa carte et son stock (« Coca-Cola 33cl stock 120 ») alors que rien n'est persisté.

```
{ id: 'p16', emoji: '🥤', name: 'Coca-Cola 33cl', …, stock: 120, stockTracking: true, … } — grep fetch|api. dans les deux fichiers → 0 résultat.
```

### [MINEUR] `apps/backend/data/inventory-stock.json:1`

Le stock runtime est actuellement VIDE : tous les produits de la carte publique sortent en UNTRACKED/isAvailable:true, donc aucune indisponibilité ne peut s'afficher côté client tant qu'aucun reçu n'a été scanné ou saisi.

```
Contenu intégral du fichier : []
```

### [MINEUR] `apps/web/src/components/NotificationCenter.tsx:14`

Le centre de notifications du back-office ne couvre que factures impayées et devis sans réponse : aucune alerte de rupture de stock n'y arrive (les anciennes notifs stock en dur ont été retirées sans être remplacées par des vraies), et le flag lowStock calculé par inventory.ts:16 n'alimente aucune notification.

```
type Category = 'Factures/Devis' — commentaire l.8-16 : « Il affichait 15 notifications écrites en dur : … Rupture de stock : Farine … Ne restent que les notifications adossées à une donnée réelle — factures impayées et devis sans réponse ».
```

---

## Catalogue de jeux

**Résumé.** Le catalogue de jeux vit entièrement dans apps/web (portail guest « /c ») : 43 entrées définies en dur dans apps/web/src/pages/guest/games/catalog.ts, dont 40 jouables (composants lazy-chargés dans GamesSection.tsx) et 3 désactivées (tetris, slots, roulette). L'app apps/guest ne contient aucun jeu propre : sa GamesPage iframe le portail web avec un repli de port 5174 codé en dur, fragile en production. Les miniatures ne sont pas des images mais des vignettes CSS procédurales plus emoji ; les seules vraies images sont les 41 cartes Scopa dans public/cards/scopa. Les incohérences majeures sont : les modes « ensemble/individuel/tournoi » et la difficulté choisis au lancement sont ignorés par 37 jeux sur 40, le code d'invitation duel/tournoi est purement cosmétique (aucun socket ni backend), et plusieurs jeux estampillés « 3D » (Scoopa, Rami, Rummikub, Mahjong) ne sont que du CSS perspective — seuls Petits Chevaux et Tower Defense utilisent réellement three.js, tous deux avec une gestion correcte du portrait.

### [MAJEUR] `apps/web/src/pages/guest/GamesSection.tsx:51`

Les modes de lancement « Ensemble / Individuel / Tournoi » et la difficulté choisis dans le dialog sont transmis via GameShellProvider mais ignorés par 37 des 40 jeux : seuls ChessGame (l.36), CastleRushGame (l.82) et MaxiBurgerGame (l.281) consomment useGameShell. Le sélecteur « Difficulté » facile/moyen/difficile n'a donc aucun effet sur Poker, Reversi, Tower Defense, etc.

```
grep useGameShell → uniquement CastleRushGame.tsx, ChessGame.tsx, MaxiBurgerGame.tsx ; MaxiBurgerGame.tsx:281 `const seeded = shell.playMode !== 'solo'` est le seul usage de playMode dans un jeu
```

### [MAJEUR] `apps/web/src/pages/guest/GamesSection.tsx:764`

Le panneau « Invitation de table » (code duel/tournoi) est purement cosmétique : createCode génère une chaîne aléatoire locale, « Rejoindre » accepte n'importe quel code et ne fait que changer le mode local, rien n'est envoyé au backend. Aucun socket/room/tournament n'existe (grep socket dans games/ : 0 résultat ; grep tournoi dans apps/backend/src : 0 résultat). La promesse « l'adversaire le rejoint, puis la partie se declenche » (l.824) est fausse.

```
l.780-785 : `setCode(`${prefix}-${Math.random().toString(36).slice(2,6).toUpperCase()}`)` ; l.804-814 : join() ne fait que onMode(...) + setCode(normalized) sans aucun appel réseau
```

### [MAJEUR] `apps/guest/src/pages/GamesPage.tsx:8`

Le repli de l'URL de l'iframe des jeux force le port 5174 sur l'origin courant si VITE_WEB_CLIENT_URL est absent — en production (creorga.n8nautomatisations.org, https sans port exposé), l'iframe pointerait vers https://host:5174 et resterait bloquée sur « Chargement des jeux... ».

```
buildGamesUrl : `const url = new URL(window.location.href); url.port = '5174'; return url.origin`
```

### [MAJEUR] `apps/web/src/pages/guest/games/catalog.ts:69`

Incohérence nom/contenu : « Mahjong Bamboo 3D » n'est ni un mahjong ni de la 3D — MahjongGame.tsx (128 l.) est un memory de 24 tuiles (12 faces × 2, createMahjongTiles dans originalsShared.tsx l.176-179) rendu en CSS perspective via Game3DShell.

```
originalsShared.tsx:176 `mahjongFaces = ['bam','lotus','moon',...]` (12 faces) ; MahjongGame.tsx:81 subtitle « Memory chronometre, tuiles face cachee »
```

### [MINEUR] `apps/web/src/pages/guest/games/catalog.ts:66`

Suffixe « 3D » trompeur généralisé : Scoopa 3D (l.66), Rami Salon 3D (l.74), Rummi Kub 3D (l.75) et Mahjong Bamboo 3D (l.69) n'utilisent que du CSS `perspective: 1100` (arcade3d.tsx l.225) — seuls mensch et towerdefense embarquent three.js. De plus « Scoopa » est une orthographe fautive de Scopa, entérinée par les alias scopa→scoopa (l.89).

```
grep three : imports THREE uniquement dans MenschGame.tsx:3 et TowerDefenseGame.tsx:14 ; catalog.ts:89 `scopa: 'scoopa'`
```

### [MINEUR] `apps/web/src/pages/guest/games/SpotErrorGame.tsx:76`

Les 11 zones d'erreur sont des boutons invisibles portant `title={diff.label}` : au survol (desktop/tablette avec souris), le tooltip natif révèle la réponse — triche triviale sur un jeu à classement serveur.

```
l.73-76 : `<button ... title={diff.label}` sur chaque hotspot positionné en % ; le score est soumis au leaderboard via useGameScore('erreur11')
```

### [MINEUR] `apps/web/src/pages/guest/games/catalog.ts:74`

Description du Rami sur-vendue : « tours, défausse, fin de manche et comptage » alors que RamiGame.tsx (192 l.) est un rami simplifié où le joueur ne défausse jamais, ne peut pas ramasser la défausse du CPU (affichée en texte seulement, l.161-163), et où le tour CPU est un simple setTimeout de 800 ms après chaque action joueur.

```
RamiGame.tsx : aucune action de défausse joueur ; l.86-89 `scheduleCpu → setTimeout(cpuTurn, 800)` ; l.162 la défausse CPU n'est qu'un libellé `Défausse CPU : {rank}{suit}`
```

### [MINEUR] `apps/web/src/pages/guest/games/catalog.ts:65`

Icônes dupliquées ou incohérentes dans le catalogue : bingo utilise 🎱 (boule 8 de billard) alors que billard (l.71) utilise aussi 🎱 ; 🃏 partagé par blackjack (l.41), scoopa (l.66), run21 (l.72) et rami (l.74) ; 🎲 par yahtzee, farkle et pig (l.55, 56, 58) ; 🔴 par connect4 et mensch (l.52, 67) ; 🧩 par sliding et rummikub (l.54, 75). Sur des cartes dont la miniature est générée depuis l'emoji, plusieurs jeux deviennent visuellement indistinguables.

```
catalog.ts l.41-75 : recensement direct des champs icon
```

### [MINEUR] `apps/web/src/pages/guest/games/catalog.ts:39`

L'icône du Solitaire est le caractère Unicode '🂡' (as de pique du bloc Playing Cards), non couvert par les polices emoji d'une partie des appareils Android/Windows — risque de carré « tofu » sur la carte et la miniature du jeu.

```
catalog.ts:39 `icon: '🂡'` (tous les autres jeux utilisent des emoji standards)
```

### [MINEUR] `apps/web/src/pages/guest/GamesSection.tsx:98`

Miniatures génériques pour une partie du catalogue : gameMiniatureKind ne connaît qu'une liste d'ids précis ; maxiburger, castlerush et reaction retombent sur le gabarit générique « arcade », 2048/mastermind/erreur11/sliding sur « grid », ttt/connect4 sur « tokens », run21/tritowers/scoopa/rami sur « cards » — combiné aux 4 fonds partagés de GAME_BACKDROP_POOL (l.60-65), beaucoup de cartes se ressemblent et ne reflètent pas le jeu (ex. Maxi Burger affiché comme des barres arcade néon).

```
l.109-113 : `if (categories.includes('cartes')) return 'cards' ... return 'tokens'` — branches fourre-tout après seulement 11 ids nominatifs
```

### [MINEUR] `apps/web/src/pages/guest/games/catalog.ts:41`

Quatre jeux de casino (blackjack, poker, farkle, bingo) figurent dans la liste principale sous un onglet « Casino » visible de tous, sans age-gate ni mention « mises fictives » à l'écran (grep 18 ans/majeur/adulte dans apps/web/src/pages/guest : 0 résultat), alors que slots et roulette ont été désactivés explicitement pour raison légale (l.79-80) — le critère de tri légal appliqué aux uns et pas aux autres n'est documenté nulle part.

```
catalog.ts:79-80 « Désactivé tant que le cadre légal n'est pas validé » vs blackjack/poker actifs avec description « mises fictives » uniquement dans le champ description du catalogue
```

### [MINEUR] `apps/web/src/pages/guest/games/RamiGame.tsx:2`

Les 6 jeux « originals » (Rami, Rummikub, Mahjong, Run21, TriTowers, SpotError) importent chacun ~80 symboles depuis originalsShared.tsx sur une seule ligne, dont la grande majorité inutilisés (RamiGame importe les styles mahjong, rummikub, tri-towers, spot-error...) — poids de bundle par chunk lazy et maintenance dégradés.

```
RamiGame.tsx:2 et SpotErrorGame.tsx:2 : ligne d'import identique de ~1900 caractères couvrant tous les exports d'originalsShared
```

### [MINEUR] `apps/web/src/pages/guest/games/catalog.ts:38`

Les champs rating (4.0 à 4.9) affichés avec une étoile sur chaque carte et le bandeau recommandé sont des valeurs inventées codées en dur — aucune collecte d'avis n'existe ; présentés sans distinction d'une vraie note utilisateur.

```
catalog.ts l.38-81 : `rating: 4.8` etc. sur chaque entrée ; GamesSection.tsx l.728 et l.1327 affichent la valeur avec `<Star fill="#fbbf24">`
```

---

## Tests et outillage

**Résumé.** Le depot compte 27 fichiers de test source (~186 occurrences it()/test() au grep, chiffre legerement gonfle car « split( » matche « it( ») : 16 fichiers unitaires backend (96), 4 fichiers API d'integration (52), 1 store POS (17), 2 libs web (5) et 4 specs Playwright (16). L'outillage est correct cote backend (vitest unit + vitest.api.config + playwright racine) mais aucun lint n'existe nulle part, et pos lance vitest sans dependance ni config (hoisting). Le test:api du backend couvre auth, facturation, CRM, reservations, RH, stock, POS/TVA, regressions et sauvegarde, contre un serveur reel :3002 avec DB seedee. Les exigences de la mission sans AUCUN test : creation/prix/masquage de produits, toggles de modules, logique des jeux, paiement Stripe, et surtout la restauration de sauvegarde (endpoint destructif jamais teste) ; seul le stock zero est couvert unitairement. TypeScript strict est actif dans les 6 apps ; les dependances installees sont recentes grace aux carets, restent esbuild 0.21.5 (CVE dev-server, via vite 5.x en fin de vie), stripe SDK 14.x et bcryptjs 2.4.3 anciens.

### [CRITIQUE] `apps/backend/src/routes/backup.ts:44`

La restauration de sauvegarde (POST /full/:filename/restore), operation destructive qui ecrase data/, n'a AUCUN test : backup.test.ts ne teste que runFullBackup et validFilename, et regressions.api-test.ts (§ SAUVEGARDE) s'arrete au telechargement de l'archive (BAK-1/3/4).

```
router.post('/full/:filename/restore', (req, res) => { — aucun grep 'restore' dans les 27 fichiers de test hormis le commentaire « TESTPLAN §14 — sauvegarde et restauration » de regressions.api-test.ts:139
```

### [MAJEUR] `apps/backend/src/routes/products.ts:99`

Produits : ni la creation (POST), ni la modification de prix, ni le masquage (isActive: false) ne sont testes. Les tests existants ne font que GET /api/products (pos.api-test.ts:43) et un smoke 401 (smoke.spec.ts:42). Seul le stock zero est couvert, unitairement (stockStore.test.ts:31 « stock epuise → OUT et indisponible »), sans test API/e2e du masquage cote POS.

```
products.ts:99 data: { isActive: false } — aucun POST /api/products ni reference a isActive/masquage dans les tests ; grep 'masqu|hidden|isActive' sur les tests ne retourne que stockStore.test.ts (statut stock) et des selecteurs UI e2e
```

### [MAJEUR] `apps/backend/src/routes/moduleConfig.ts:1`

Toggles de modules (cœur du SaaS modulaire, 8 modules) : AUCUN test automatise — ni sur modules.ts/moduleConfig.ts cote backend, ni sur le moduleStore web (fichier protege). Seul un script manuel hors harness existe (tests-qa/test-module-sync.mjs) ; les e2e visitent /settings/modules (balayage-ui.spec.ts:35) sans tester l'activation/desactivation.

```
grep -il 'toggle' sur les 27 fichiers de test : 0 resultat ; aucun *.test.ts en face de modules.ts ni moduleConfig.ts
```

### [MAJEUR] `apps/backend/src/routes/stripe.ts:1`

Paiement : l'encaissement especes POS est bien couvert (POS-10/11/12 api + posStore.test.ts « paiement par couvert »), mais stripe.ts et payments.ts n'ont AUCUN test (webhooks, paiements en ligne) — chemin monetaire non valide.

```
ls apps/backend/src/routes : seuls accounting/backup/owner ont un .test.ts ; grep 'stripe|payment' dans les tests ne matche que l'encaissement cash (pos.api-test.ts, posStore.test.ts)
```

### [MAJEUR] `apps/backend/src/routes/gameScores.ts:1`

Jeux : quasi aucun test. Les ~40 jeux du portail invite (apps/guest, protege, sans script test) n'ont aucun test de logique ni de scores (gameScores.ts sans test) ; seuls 2 tests e2e verifient que le catalogue se charge (GST-6) et que le plateau Petits Chevaux tient dans le viewport tablette (GST-7).

```
grep -il 'jeu|game' sur les fichiers de test : uniquement tests-e2e/parcours-critiques.spec.ts (lignes 100 et 127, tests GST-6/GST-7 d'affichage)
```

### [MINEUR] `apps/pos/package.json:10`

apps/pos declare "test": "vitest run" sans vitest en devDependencies ni vitest.config.ts : les 17 tests de posStore.test.ts ne tournent que grace au hoisting du vitest des autres workspaces et aux defaults d'include — fragile (casse si backend/web changent de version ou hors workspace).

```
devDependencies pos = @types/react, @types/react-dom, @vitejs/plugin-react, typescript, vite (pas de vitest) ; find vitest*.config.* ne trouve que backend (2) et web (1)
```

### [MINEUR] `package.json:12`

Aucun outillage lint dans tout le depot : aucun script "lint" (racine et 6 apps), aucune config .eslintrc/eslint.config.* — seul tsc (via build) fait office de garde-fou.

```
grep -l '"lint"' package.json apps/*/package.json → aucun ; find .eslintrc*/eslint.config.* hors node_modules → 0 fichier
```

### [MINEUR] `package-lock.json:1`

esbuild 0.21.5 embarque par vite 5.4.21 (locks racine, pos et marketing) est vulnerable a GHSA-67mh-4wv8-2f99 (le dev server accepte les requetes de n'importe quel site web, corrige en 0.25) ; de plus la branche vite 5.x est en fin de vie (correctifs de securite sur 6/7). Impact limite au poste de dev.

```
package-lock : node_modules/vite 5.4.21, node_modules/esbuild 0.21.5 (identique dans apps/pos et apps/marketing)
```

### [MINEUR] `apps/backend/package.json:38`

Dependances backend notoirement anciennes (sans CVE active mais en retard de plusieurs majeures) : stripe ^14.25.0 (majeures 15-18 disponibles, version d'API figee 2023) et bcryptjs ^2.4.3 (v3 disponible). A moderniser lors d'un prochain cycle.

```
"stripe": "^14.25.0", "bcryptjs": "^2.4.3" dans package.json ; package-lock confirme stripe 14.25.0 et bcryptjs 2.4.3 installes
```

### [MINEUR] `apps/backend/tsconfig.json:22`

Le tsconfig backend inclut src/**/* avec noEmit: false : les 16 fichiers *.test.ts sont compiles et livres dans dist/ (32 fichiers .test.js/.test.d.ts constates), donc potentiellement deployes en production.

```
"include": ["src/**/*", "prisma/seed.ts"] + presence de apps/backend/dist/src/**/*.test.js (ex. dist/src/routes/backup.test.js)
```

### [MINEUR] `apps/web/vitest.config.ts:16`

Le back-office web (le plus gros front) n'a que 5 tests (api.test.ts, sseAuth.test.ts) et sa config vitest impose environment: 'node' sans jsdom : aucun test de composant React n'est possible en l'etat ; guest, superadmin et marketing n'ont aucun script test du tout.

```
vitest.config.ts web : « Environnement `node` volontairement : ... pas sur du rendu React » ; package.json guest/superadmin/marketing sans script "test"
```

---

## Apps peripheriques (guest, superadmin, marketing)

**Résumé.** Les trois apps périphériques ont des rôles très inégaux. apps/guest (protégée) n'est en réalité qu'une coquille : App.tsx affiche un unique iframe pointant vers le portail /c d'apps/web (port 5174) et tire sa config par polling de GET /api/portal-config toutes les 2,5 s ; aucun jeu n'y est embarqué (les 50+ jeux vivent uniquement dans apps/web/src/pages/guest/games), et tout le reste du dossier (pages/, TabBar, store) est du code mort d'une ancienne maquette. apps/superadmin est bien la « Console créateur » des derniers commits : SPA React Router (port 5177) avec auth email+mot de passe puis TOTP, jeton d'accès 15 min en mémoire et cookie httpOnly creator_refresh, adossée aux routes backend /api/creator/* montées conditionnellement (CREATOR_JWT_SECRET/CREATOR_TOTP_KEY). apps/marketing est la vitrine publique (6 pages FR, port dev 5176), volontairement hors workspaces car déployée comme projet Vercel séparé avec son propre vercel.json et package-lock. En production, aucun Caddyfile n'est versionné dans le dépôt : les commentaires du backend (trust proxy 1, « un seul intermédiaire : Caddy ») et du client superadmin indiquent que Caddy, sur le VPS, sert les SPA buildées et proxifie /api vers Express 3002, tandis que marketing vise Vercel/creorga.lu selon DEPLOYMENT.md.

### [MAJEUR] `apps/guest/package.json:7`

Le script dev lance `vite --host --port 5176` alors que vite.config.ts fixe 5178 comme « port officiel du portail guest (5176 est réservé à marketing) ». Le flag CLI prime sur la config Vite : `npm run dev --workspace=apps/guest` démarre donc sur 5176 et entre en collision avec apps/marketing (et contredit le tableau des ports de CLAUDE.md). Le script preview (ligne 9) a le même défaut.

```
"dev": "vite --host --port 5176" vs apps/guest/vite.config.ts : « // 5178 = port officiel du portail guest (5176 est réservé à marketing) » server: { port: 5178 }
```

### [MAJEUR] `apps/guest/src/usePortalConfig.ts:20`

URL backend de repli en dur `http://localhost:3002` (idem apps/guest/src/pages/MenuPage.tsx:18). Déployé derrière Caddy sans VITE_BACKEND_URL figé au build, le portail guest polle le localhost du visiteur : config jamais chargée en prod. Même famille de défaut dans App.tsx:8-11 et GamesPage.tsx:7-9 : repli `hostname:5174` / port forcé 5174, invalide derrière un reverse-proxy en 443.

```
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002' ; App.tsx : `${window.location.protocol}//${window.location.hostname}:5174`
```

### [MINEUR] `apps/guest/src/App.tsx:1`

Huit fichiers de code mort dans l'app guest : src/pages/* (GuestHome, MenuPage, OrderPage, GamesPage, AccountPage, FeedbackPage), src/components/TabBar.tsx et src/store.ts ne sont importés nulle part — App.tsx n'importe que useMemo et usePortalConfig, main.tsx n'importe qu'App. C'est le vestige d'une ancienne maquette standalone ; l'app réelle est un simple iframe vers /c d'apps/web. App protégée : à signaler seulement, ne pas supprimer sans décision.

```
grep des imports : App.tsx importe uniquement `useMemo` et `./usePortalConfig` ; aucun `from './pages'`, `./components` ou `./store` dans App.tsx/main.tsx, alors que pages/ et TabBar s'importent entre eux (import type { GuestTab } from '../App')
```

### [MINEUR] `CLAUDE.md:33`

Section « Attention : workspaces est incomplet » périmée : elle affirme qu'apps/superadmin n'est pas un workspace, or le package.json racine (lignes 5-11) liste bien apps/superadmin dans workspaces. Seul apps/marketing est réellement hors workspaces (choix cohérent avec son déploiement Vercel séparé et son package-lock propre).

```
package.json racine : "workspaces": ["apps/web", "apps/backend", "apps/pos", "apps/guest", "apps/superadmin"] — marketing seul absent
```

### [MINEUR] `apps/backend/src/index.ts:105`

La configuration de production n'est pas versionnée : aucun Caddyfile dans le dépôt alors que le code en dépend explicitement (trust proxy calibré pour « un seul intermédiaire : Caddy », client superadmin qui suppose que Caddy proxifie /api/creator). Le routage domaines→apps (qui sert web, guest, superadmin ; qui expose l'API) n'existe que sur le VPS : irrécupérable depuis le dépôt en cas de perte, et invérifiable en revue.

```
index.ts:105-111 : « Un seul intermédiaire devant nous : Caddy, sur la même machine » + app.set('trust proxy', 1) ; apps/superadmin/src/lib/api.ts:4 : « proxy Vite en dev, Caddy en prod » ; find -iname '*caddy*' → aucun fichier
```

### [MINEUR] `apps/guest/src/App.tsx:19`

Double polling de /api/portal-config : le wrapper guest polle toutes les 2,5 s (usePortalConfig(2500)) alors que l'iframe /c d'apps/web embarque son propre hook usePortalConfig — chaque tablette cliente génère donc deux flux de polling concurrents vers la même route publique rate-limitée (publicLimiter), gaspillage et risque de 429 partagé par IP.

```
App.tsx:19 `const { config } = usePortalConfig(2500)` + iframe src=/c, et apps/web possède son propre @/hooks/usePortalConfig importé par GuestHome
```

### [MINEUR] `apps/marketing/src/App.tsx:20`

Le thème sombre du site vitrine repose sur un hack CSS global injecté dans un <style> : sélecteurs d'attributs sur les styles inline (`section[style*="background: #fff"]`) avec !important pour écraser les composants enfants qui codent le blanc en dur. Fragile : toute variation d'écriture du style inline (espaces, rgb vs hex) échappe au sélecteur et fait réapparaître des blocs blancs.

```
<style>{` body, html, #root { background: #0a0a1a !important; ... } section[style*="background: #fff"], div[style*="background:#fff"] { background: rgba(255,255,255,0.04) !important; ... } `}</style>
```

---
