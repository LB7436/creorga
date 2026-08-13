import prisma from '../prisma'
import { listFullBackups } from '../../jobs/backup-worker'

/**
 * Les règles du moteur d'opportunités de la console créateur.
 *
 * Chaque règle observe une société sur une fenêtre glissante et produit — ou
 * non — une OpportuniteCandidate : preuve chiffrée + brouillon de message en
 * français que le créateur copie et envoie LUI-MÊME (la console n'envoie
 * jamais rien).
 *
 * Honnêteté avant tout : une règle dont la source est douteuse porte
 * fiabilite 'estimation' dans sa preuve, et une règle sans assez d'historique
 * s'abstient plutôt que d'accuser à tort.
 */

const JOUR_MS = 24 * 60 * 60 * 1000
const arrondi = (n: number) => Math.round(n * 100) / 100
const euro = (n: number) => `${arrondi(n).toFixed(2).replace('.', ',')} €`
const dateFr = (d: Date) => d.toLocaleDateString('fr-LU')

export type Severite = 'info' | 'warning' | 'critical'

export interface ReglageRegle {
  actif: boolean
  seuil?: number
  seuilCritique?: number
}

export type ReglesConfig = Record<string, ReglageRegle>

export const CONFIG_DEFAUT: ReglesConfig = {
  'ecart-caisse': { actif: true, seuil: 50, seuilCritique: 200 },
  'factures-non-scannees': { actif: true, seuil: 3 },
  impayes: { actif: true, seuil: 500 },
  'depenses-sans-justificatif': { actif: true, seuil: 3 },
  'haccp-silence': { actif: true, seuil: 5 },
  'devis-morts': { actif: true, seuil: 3 },
  'module-dormant': { actif: true },
  'societe-inactive': { actif: true, seuil: 14 },
  'volume-donnees': { actif: true },
  'sauvegarde-agee': { actif: true, seuil: 24 },
}

export interface RegleCtx {
  companyId: string
  companyName: string
  creeLe: Date
  maintenant: Date
  reglage: ReglageRegle
}

export interface Preuve {
  periode: { debut: string; fin: string }
  valeur: number
  unite: string
  seuil: number
  details: Array<Record<string, unknown>>
  methode: string
  fiabilite: 'exacte' | 'estimation'
}

export interface OpportuniteCandidate {
  ruleId: string
  severity: Severite
  title: string
  message: string
  evidence: Preuve
  /** Clé de période pour la déduplication (`${ruleId}:${companyId}:${periode}`). */
  periode: string
}

export interface Regle {
  id: string
  nom: string
  evaluer(ctx: RegleCtx): Promise<OpportuniteCandidate | null>
}

const moisISO = (d: Date) => d.toISOString().slice(0, 7)
const fenetre30j = (maintenant: Date) => new Date(maintenant.getTime() - 30 * JOUR_MS)
const periodeJson = (debut: Date, fin: Date) => ({
  debut: debut.toISOString().slice(0, 10),
  fin: fin.toISOString().slice(0, 10),
})

// ─── 1. Écarts de caisse ──────────────────────────────────────────────

const ecartCaisse: Regle = {
  id: 'ecart-caisse',
  nom: 'Écarts de caisse',
  async evaluer(ctx) {
    const debut = fenetre30j(ctx.maintenant)
    const cloturees = await prisma.cashDrawer.findMany({
      where: { companyId: ctx.companyId, closedAt: { gte: debut } },
      select: {
        closedAt: true,
        discrepancy: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { closedAt: 'desc' },
    })
    // Garde-fou : un écart aberrant (> 10 000 €) trahit une donnée corrompue
    // d'avant le correctif totalSales, pas un vol — on l'écarte.
    const concernees = cloturees.filter(
      (c) => Math.abs(c.discrepancy ?? 0) >= 0.01 && Math.abs(c.discrepancy ?? 0) < 10000,
    )
    const total = arrondi(concernees.reduce((acc, c) => acc + Math.abs(c.discrepancy ?? 0), 0))
    const seuil = ctx.reglage.seuil ?? 50
    if (total < seuil) return null

    const pire = concernees.reduce((a, b) =>
      Math.abs(a.discrepancy ?? 0) >= Math.abs(b.discrepancy ?? 0) ? a : b,
    )
    const critique = total >= (ctx.reglage.seuilCritique ?? 200)

    return {
      ruleId: this.id,
      severity: critique ? 'critical' : 'warning',
      title: `${euro(total)} d'écarts de caisse sur 30 jours`,
      message:
        `Bonjour, en préparant votre suivi j'ai remarqué ${euro(total)} d'écarts de caisse ` +
        `sur les 30 derniers jours (${concernees.length} clôture(s) concernée(s), le plus gros écart ` +
        `le ${dateFr(pire.closedAt as Date)} : ${euro(Math.abs(pire.discrepancy ?? 0))}). ` +
        `Creorga peut vous aider à identifier d'où ça vient — voulez-vous qu'on regarde ensemble le détail par vendeur ?`,
      evidence: {
        periode: periodeJson(debut, ctx.maintenant),
        valeur: total,
        unite: 'EUR',
        seuil,
        details: concernees.slice(0, 10).map((c) => ({
          date: (c.closedAt as Date).toISOString().slice(0, 10),
          libelle: `Caisse ${c.user.firstName} ${c.user.lastName}`,
          montant: arrondi(c.discrepancy ?? 0),
        })),
        methode: 'somme des |discrepancy| des caisses clôturées sur 30 jours glissants',
        fiabilite: 'exacte',
      },
      periode: moisISO(ctx.maintenant),
    }
  },
}

// ─── 2. Factures fournisseurs non scannées ────────────────────────────

const facturesNonScannees: Regle = {
  id: 'factures-non-scannees',
  nom: 'Factures fournisseurs non scannées',
  async evaluer(ctx) {
    const debut = fenetre30j(ctx.maintenant)
    const receptions = await prisma.purchaseOrder.findMany({
      where: { companyId: ctx.companyId, status: 'RECEIVED', createdAt: { gte: debut } },
      select: { total: true, createdAt: true, supplier: { select: { name: true } } },
    })
    if (receptions.length === 0) return null

    const depenses = await prisma.expense.findMany({
      where: { companyId: ctx.companyId, date: { gte: new Date(debut.getTime() - 7 * JOUR_MS) } },
      select: { amount: true, date: true },
    })

    // Proxy assumé : une réception est « justifiée » si une dépense au même
    // montant (± 1 centime) existe à ± 7 jours. Étiqueté « estimation ».
    const sansJustificatif = receptions.filter(
      (r) =>
        !depenses.some(
          (d) =>
            Math.abs(d.amount - r.total) <= 0.01 &&
            Math.abs(d.date.getTime() - r.createdAt.getTime()) <= 7 * JOUR_MS,
        ),
    )
    const seuil = ctx.reglage.seuil ?? 3
    if (sansJustificatif.length < seuil) return null

    const fournisseurs = [...new Set(sansJustificatif.map((r) => r.supplier.name))]

    return {
      ruleId: this.id,
      severity: 'warning',
      title: `${sansJustificatif.length} livraison(s) sans justificatif comptable`,
      message:
        `Bonjour, il semble qu'il manque ${sansJustificatif.length} factures fournisseurs non scannées ` +
        `ce mois-ci (livraisons réceptionnées sans justificatif : ${fournisseurs.join(', ')}). ` +
        `Le scan prend 30 secondes par facture et met vos produits et prix à jour automatiquement — je peux vous montrer ?`,
      evidence: {
        periode: periodeJson(debut, ctx.maintenant),
        valeur: sansJustificatif.length,
        unite: 'livraisons',
        seuil,
        details: sansJustificatif.slice(0, 10).map((r) => ({
          date: r.createdAt.toISOString().slice(0, 10),
          libelle: r.supplier.name,
          montant: arrondi(r.total),
        })),
        methode:
          'réceptions (PurchaseOrder RECEIVED) sans dépense rapprochée à ± 0,01 € et ± 7 jours — proxy',
        fiabilite: 'estimation',
      },
      periode: moisISO(ctx.maintenant),
    }
  },
}

// ─── 3. Factures clients impayées ─────────────────────────────────────

const impayes: Regle = {
  id: 'impayes',
  nom: 'Factures clients impayées',
  async evaluer(ctx) {
    const factures = await prisma.invoice.findMany({
      where: {
        companyId: ctx.companyId,
        dueDate: { lt: ctx.maintenant },
        status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] },
      },
      select: { number: true, total: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
    })
    if (factures.length === 0) return null

    const encours = arrondi(factures.reduce((acc, f) => acc + f.total, 0))
    const seuil = ctx.reglage.seuil ?? 500
    if (encours < seuil && factures.length < 3) return null

    const retardMaxJours = Math.floor(
      (ctx.maintenant.getTime() - (factures[0].dueDate as Date).getTime()) / JOUR_MS,
    )

    return {
      ruleId: this.id,
      severity: retardMaxJours > 30 ? 'critical' : 'warning',
      title: `${euro(encours)} d'impayés (${factures.length} facture(s))`,
      message:
        `Bonjour, ${factures.length} facture(s) client pour ${euro(encours)} ont dépassé leur échéance ` +
        `(la plus ancienne de ${retardMaxJours} jours). Creorga peut générer les relances en un clic — ` +
        `voulez-vous que je vous montre le module de relances ?`,
      evidence: {
        periode: periodeJson(factures[0].dueDate as Date, ctx.maintenant),
        valeur: encours,
        unite: 'EUR',
        seuil,
        details: factures.slice(0, 10).map((f) => ({
          libelle: `Facture ${f.number}`,
          montant: arrondi(f.total),
          echeance: (f.dueDate as Date).toISOString().slice(0, 10),
        })),
        methode: "encours par date d'échéance (dueDate), jamais par le statut OVERDUE",
        fiabilite: 'exacte',
      },
      periode: moisISO(ctx.maintenant),
    }
  },
}

// ─── 4. Dépenses sans justificatif ────────────────────────────────────

const depensesSansJustificatif: Regle = {
  id: 'depenses-sans-justificatif',
  nom: 'Dépenses sans justificatif',
  async evaluer(ctx) {
    const debut = fenetre30j(ctx.maintenant)
    const [total, sans] = await Promise.all([
      prisma.expense.count({ where: { companyId: ctx.companyId, date: { gte: debut } } }),
      prisma.expense.count({
        where: { companyId: ctx.companyId, date: { gte: debut }, receiptUrl: null },
      }),
    ])
    const seuil = ctx.reglage.seuil ?? 3
    // Le dénominateur évite le « 100 % par construction » d'un module inutilisé.
    if (total < 5 || sans < seuil) return null

    return {
      ruleId: this.id,
      severity: 'warning',
      title: `${sans} dépense(s) sur ${total} sans justificatif`,
      message:
        `Bonjour, sur vos ${total} dépenses des 30 derniers jours, ${sans} n'ont pas de justificatif ` +
        `attaché. Un contrôle fiscal les refusera — le scan directement depuis le téléphone prend ` +
        `quelques secondes, je peux vous montrer ?`,
      evidence: {
        periode: periodeJson(debut, ctx.maintenant),
        valeur: sans,
        unite: 'dépenses',
        seuil,
        details: [{ libelle: 'dépenses de la période', total, sansJustificatif: sans }],
        methode: 'dépenses à receiptUrl absent sur 30 jours glissants (dénominateur ≥ 5)',
        fiabilite: 'exacte',
      },
      periode: moisISO(ctx.maintenant),
    }
  },
}

// ─── 5. Silence HACCP ─────────────────────────────────────────────────

const haccpSilence: Regle = {
  id: 'haccp-silence',
  nom: 'Registre HACCP silencieux',
  async evaluer(ctx) {
    const debut = fenetre30j(ctx.maintenant)
    const serie = await prisma.tenantMetricDaily.findMany({
      where: { companyId: ctx.companyId, date: { gte: debut } },
      select: { date: true, wasOpen: true, haccpLogs: true },
    })
    const joursSilencieux = serie.filter((j) => j.wasOpen && j.haccpLogs === 0)
    const seuil = ctx.reglage.seuil ?? 5
    if (joursSilencieux.length < seuil) return null

    return {
      ruleId: this.id,
      severity: 'critical',
      title: `${joursSilencieux.length} jour(s) d'ouverture sans relevé HACCP`,
      message:
        `Bonjour, sur les 30 derniers jours, ${joursSilencieux.length} journées d'ouverture n'ont ` +
        `aucun relevé HACCP — en cas de contrôle, c'est le registre légal qui manque. Les relevés se ` +
        `font en 2 minutes depuis la tablette ; voulez-vous qu'on remette la routine en place ensemble ?`,
      evidence: {
        periode: periodeJson(debut, ctx.maintenant),
        valeur: joursSilencieux.length,
        unite: 'jours',
        seuil,
        details: joursSilencieux.slice(0, 10).map((j) => ({
          date: (j.date as Date).toISOString().slice(0, 10),
        })),
        methode: 'jours à wasOpen=true et haccpLogs=0 dans les instantanés quotidiens',
        fiabilite: 'exacte',
      },
      periode: moisISO(ctx.maintenant),
    }
  },
}

// ─── 6. Devis morts ───────────────────────────────────────────────────

const devisMorts: Regle = {
  id: 'devis-morts',
  nom: 'Devis expirés sans réponse',
  async evaluer(ctx) {
    const quotes = await prisma.quote.findMany({
      where: { companyId: ctx.companyId, status: 'SENT', validUntil: { lt: ctx.maintenant } },
      select: { number: true, total: true, validUntil: true },
      orderBy: { validUntil: 'asc' },
    })
    const seuil = ctx.reglage.seuil ?? 3
    if (quotes.length < seuil) return null

    const montant = arrondi(quotes.reduce((acc, q) => acc + q.total, 0))

    return {
      ruleId: this.id,
      severity: 'info',
      title: `${quotes.length} devis expirés sans réponse (${euro(montant)})`,
      message:
        `Bonjour, ${quotes.length} devis envoyés (pour ${euro(montant)} au total) ont dépassé leur ` +
        `date de validité sans réponse. Une simple relance en récupère souvent un sur trois — ` +
        `voulez-vous qu'on regarde lesquels relancer ?`,
      evidence: {
        periode: periodeJson(quotes[0].validUntil as Date, ctx.maintenant),
        valeur: quotes.length,
        unite: 'devis',
        seuil,
        details: quotes.slice(0, 10).map((q) => ({
          libelle: `Devis ${q.number}`,
          montant: arrondi(q.total),
          expireLe: (q.validUntil as Date).toISOString().slice(0, 10),
        })),
        methode: 'devis SENT dont validUntil est dépassée',
        fiabilite: 'exacte',
      },
      periode: moisISO(ctx.maintenant),
    }
  },
}

// ─── 7. Module dormant ────────────────────────────────────────────────

// Correspondance module activé → segments d'URL mesurés par ActivityEvent.
// Seuls les modules réellement mesurables figurent ici : accuser un module
// invisible de la collecte serait un faux positif garanti.
export const MODULES_MESURABLES: Record<string, string[]> = {
  pos: ['orders', 'tables', 'payments'],
  hr: ['hr', 'hr-dossier'],
  inventory: ['inventory', 'inventory-ocr'],
  invoices: ['invoices'],
  marketing: ['crm', 'marketing', 'reputation'],
  accounting: ['accounting', 'rapports-caisse'],
  haccp: ['haccp'],
  ai: ['ai', 'agent'],
  events: ['events'],
}

const moduleDormant: Regle = {
  id: 'module-dormant',
  nom: 'Module activé jamais utilisé',
  async evaluer(ctx) {
    const debut = fenetre30j(ctx.maintenant)
    const serie = await prisma.tenantMetricDaily.findMany({
      where: { companyId: ctx.companyId, date: { gte: debut } },
      select: { moduleUsage: true },
    })
    // Moins de 3 semaines d'historique : trop tôt pour parler de dormance.
    if (serie.length < 21) return null

    const usage: Record<string, number> = {}
    for (const jour of serie) {
      const u = (jour.moduleUsage ?? {}) as Record<string, number>
      for (const [segment, n] of Object.entries(u)) usage[segment] = (usage[segment] ?? 0) + n
    }

    const modules = await prisma.companyModule.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: { moduleId: true },
    })
    const dormants = modules
      .map((m) => m.moduleId)
      .filter((id) => {
        const segments = MODULES_MESURABLES[id]
        if (!segments) return false
        return segments.every((s) => (usage[s] ?? 0) === 0)
      })
    if (dormants.length === 0) return null

    return {
      ruleId: this.id,
      severity: 'info',
      title: `${dormants.length} module(s) activé(s) jamais ouvert(s) en 30 jours`,
      message:
        `Bonjour, je vois que ${dormants.length} module(s) de votre Creorga (${dormants.join(', ')}) ` +
        `n'ont pas été ouverts depuis un mois. Souvent il ne manque qu'une prise en main de 15 minutes ` +
        `pour qu'ils rapportent — voulez-vous qu'on planifie ça ?`,
      evidence: {
        periode: periodeJson(debut, ctx.maintenant),
        valeur: dormants.length,
        unite: 'modules',
        seuil: 1,
        details: dormants.map((id) => ({ module: id })),
        methode:
          'modules actifs dont tous les segments API mesurables sont à zéro usage sur 30 jours (≥ 21 jours d’historique requis)',
        fiabilite: 'estimation',
      },
      periode: moisISO(ctx.maintenant),
    }
  },
}

// ─── 8. Société inactive (risque de départ) ───────────────────────────

const societeInactive: Regle = {
  id: 'societe-inactive',
  nom: 'Société inactive',
  async evaluer(ctx) {
    const seuilJours = ctx.reglage.seuil ?? 14
    // Société trop récente : silence normal.
    if (ctx.maintenant.getTime() - ctx.creeLe.getTime() < seuilJours * JOUR_MS) return null

    const [premier, dernier] = await Promise.all([
      prisma.activityEvent.findFirst({
        where: { companyId: ctx.companyId },
        orderBy: { ts: 'asc' },
        select: { ts: true },
      }),
      prisma.activityEvent.findFirst({
        where: { companyId: ctx.companyId },
        orderBy: { ts: 'desc' },
        select: { ts: true },
      }),
    ])
    // Jamais aucun événement : la collecte vient peut-être de démarrer,
    // impossible de prouver l'inactivité.
    if (!premier || !dernier) return null

    const joursInactif = Math.floor((ctx.maintenant.getTime() - dernier.ts.getTime()) / JOUR_MS)
    if (joursInactif < seuilJours) return null

    return {
      ruleId: this.id,
      severity: 'critical',
      title: `Aucune activité depuis ${joursInactif} jours — risque de départ`,
      message:
        `Bonjour, je remarque que personne ne s'est servi de Creorga depuis ${joursInactif} jours ` +
        `chez ${ctx.companyName}. Est-ce qu'un blocage vous freine ? Je vous appelle quand vous voulez ` +
        `pour le lever — votre outil doit vous servir, pas dormir.`,
      evidence: {
        periode: periodeJson(dernier.ts, ctx.maintenant),
        valeur: joursInactif,
        unite: 'jours',
        seuil: seuilJours,
        details: [{ derniereActivite: dernier.ts.toISOString() }],
        methode: 'ancienneté du dernier ActivityEvent de la société',
        fiabilite: 'exacte',
      },
      periode: moisISO(ctx.maintenant),
    }
  },
}

// ─── 9. Palier de volume de données ───────────────────────────────────

const PALIERS: Array<{ octets: number; nom: string }> = [
  { octets: 5 * 1024 ** 3, nom: '5 Go' },
  { octets: 1024 ** 3, nom: '1 Go' },
  { octets: 500 * 1024 ** 2, nom: '500 Mo' },
  { octets: 100 * 1024 ** 2, nom: '100 Mo' },
]

const volumeDonnees: Regle = {
  id: 'volume-donnees',
  nom: 'Palier de volume de données',
  async evaluer(ctx) {
    const dernier = await prisma.tenantMetricDaily.findFirst({
      where: { companyId: ctx.companyId },
      orderBy: { date: 'desc' },
      select: { dataBytes: true, rowCounts: true },
    })
    if (!dernier) return null

    const octets = Number(dernier.dataBytes)
    const palier = PALIERS.find((p) => octets >= p.octets)
    if (!palier) return null

    const lignes = (dernier.rowCounts ?? {}) as Record<string, number>

    return {
      ruleId: this.id,
      severity: 'info',
      title: `Palier de données franchi : ${palier.nom}`,
      message:
        `Bonjour, votre établissement a franchi ${palier.nom} de données dans Creorga ` +
        `(${lignes.Order ?? 0} commandes, ${lignes.Customer ?? 0} fiches clients, ` +
        `${lignes.Invoice ?? 0} factures). Tout est sauvegardé toutes les 6 heures. ` +
        `C'est peut-être le bon moment pour parler d'archivage ou d'un plan de sauvegarde renforcé.`,
      evidence: {
        periode: periodeJson(ctx.creeLe, ctx.maintenant),
        valeur: octets,
        unite: 'octets',
        seuil: palier.octets,
        details: [{ palier: palier.nom, commandes: lignes.Order ?? 0, clients: lignes.Customer ?? 0 }],
        methode: 'dataBytes du dernier instantané quotidien (pg_column_size + documents)',
        fiabilite: 'exacte',
      },
      // Une opportunité par palier, à vie — pas une par mois.
      periode: `palier-${palier.nom.replace(' ', '')}`,
    }
  },
}

// ─── 10. Sauvegarde âgée (règle globale, pas par société) ─────────────

export const COMPANY_ID_SERVEUR = 'serveur'

const sauvegardeAgee: Regle = {
  id: 'sauvegarde-agee',
  nom: 'Sauvegarde en retard',
  async evaluer(ctx) {
    const seuilHeures = ctx.reglage.seuil ?? 24
    const zips = listFullBackups()
    const dernier = zips[0]
    const ageHeures = dernier
      ? Math.floor((ctx.maintenant.getTime() - dernier.createdAt) / (60 * 60 * 1000))
      : Infinity
    if (ageHeures <= seuilHeures) return null

    return {
      ruleId: this.id,
      severity: 'critical',
      title: dernier
        ? `Dernière sauvegarde il y a ${ageHeures} h (seuil : ${seuilHeures} h)`
        : 'Aucune sauvegarde trouvée',
      message:
        `Alerte technique : ${dernier ? `la dernière sauvegarde complète date d'il y a ${ageHeures} heures` : 'aucune sauvegarde complète n’a été trouvée'} ` +
        `alors que le cycle est de 6 heures. Vérifier journalctl -u creorga-api et l'espace disque.`,
      evidence: {
        periode: periodeJson(new Date(ctx.maintenant.getTime() - JOUR_MS), ctx.maintenant),
        valeur: Number.isFinite(ageHeures) ? ageHeures : -1,
        unite: 'heures',
        seuil: seuilHeures,
        details: dernier ? [{ fichier: dernier.filename, taille: dernier.size }] : [],
        methode: 'âge du dernier ZIP data/ (listFullBackups)',
        fiabilite: 'exacte',
      },
      // Alerte quotidienne tant que le problème dure.
      periode: ctx.maintenant.toISOString().slice(0, 10),
    }
  },
}

/** Règles évaluées pour CHAQUE société. */
export const REGLES_SOCIETE: Regle[] = [
  ecartCaisse,
  facturesNonScannees,
  impayes,
  depensesSansJustificatif,
  haccpSilence,
  devisMorts,
  moduleDormant,
  societeInactive,
  volumeDonnees,
]

/** Règles évaluées UNE fois par cycle (rattachées à la pseudo-société « serveur »). */
export const REGLES_GLOBALES: Regle[] = [sauvegardeAgee]
