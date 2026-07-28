import { useState, useEffect } from 'react'
import { store } from '../store'

/**
 * Carte du portail client.
 *
 * Cette page affichait un tableau de 16 produits CODÉ EN DUR. Mesuré le
 * 27/07/2026 : le client y voyait un Mojito à 12,00 € quand la caisse en
 * facturait 10,50 €, et un burger à 17,00 € facturé 18,50 €. Au Luxembourg
 * le prix affiché engage le commerçant : c'était une exposition juridique,
 * pas seulement un défaut d'affichage.
 *
 * La carte vient désormais de `/api/portal-config/menu`, la même source que
 * le back-office. En cas d'échec réseau on n'affiche AUCUN prix : montrer un
 * tarif qu'on ne peut pas confirmer est précisément le défaut à supprimer.
 */

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface ProduitCarte {
  id: string
  name: string
  price: number
  category: string
  emoji: string
  isAvailable?: boolean
}

/** Décoration : l'API ne porte pas d'emoji, on en déduit un par catégorie. */
const EMOJI_CATEGORIE: Record<string, string> = {
  boisson: '🥤',
  boissons: '🥤',
  'boissons chaudes': '☕',
  café: '☕',
  cafe: '☕',
  soft: '🥤',
  softs: '🥤',
  bière: '🍺',
  bieres: '🍺',
  bières: '🍺',
  vin: '🍷',
  vins: '🍷',
  cocktail: '🍹',
  cocktails: '🍹',
  apéritifs: '🥂',
  digestifs: '🥃',
  whisky: '🥃',
  entrée: '🥗',
  entrées: '🥗',
  plat: '🍽️',
  plats: '🍽️',
  cuisine: '🍔',
  snacks: '🍟',
  dessert: '🍮',
  desserts: '🍮',
}

function emojiPour(categorie: string): string {
  return EMOJI_CATEGORIE[categorie.toLowerCase().trim()] || '🍽️'
}

const S = {
  page: { padding: '20px 16px' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  cats: { display: 'flex' as const, gap: 8, overflowX: 'auto' as const, marginBottom: 20, paddingBottom: 4 },
  catBtn: (active: boolean) => ({
    padding: '8px 18px',
    borderRadius: 20,
    border: active ? '2px solid #6366f1' : '2px solid #e5e7eb',
    background: active ? '#ede9fe' : '#fff',
    color: active ? '#6366f1' : '#6b7280',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  }),
  list: { display: 'flex' as const, flexDirection: 'column' as const, gap: 10 },
  item: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 14,
    padding: '14px 16px',
    borderRadius: 16,
    background: '#f9fafb',
    border: '1px solid #f3f4f6',
  },
  emoji: { fontSize: 32, flexShrink: 0 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: 600, color: '#1a1a2e' },
  price: { fontSize: 14, fontWeight: 700, color: '#6366f1', marginTop: 2 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  etat: {
    padding: '32px 16px',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 1.6,
  },
  reessayer: {
    marginTop: 14,
    padding: '10px 22px',
    borderRadius: 12,
    border: '2px solid #6366f1',
    background: '#fff',
    color: '#6366f1',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  added: {
    position: 'fixed' as const,
    bottom: 90,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1a1a2e',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
}

export default function MenuPage() {
  const [produits, setProduits] = useState<ProduitCarte[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [activeCat, setActiveCat] = useState('')
  const [toast, setToast] = useState('')
  const [tentative, setTentative] = useState(0)

  useEffect(() => {
    let annule = false

    async function charger() {
      setChargement(true)
      setErreur('')
      try {
        // Le QR de la table porte l'enseigne : sans lui le serveur retombe
        // sur la plus ancienne société, ce qui affichait la carte d'un autre
        // restaurant.
        const companyId =
          new URLSearchParams(window.location.search).get('companyId') ||
          (import.meta as any).env?.VITE_COMPANY_ID ||
          ''
        const url = `${BACKEND}/api/portal-config/menu${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`

        const r = await fetch(url)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()

        const plats: ProduitCarte[] = (data.categories || []).flatMap((cat: any) =>
          (cat.products || [])
            .filter((p: any) => p.isActive !== false && p.isAvailable !== false)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              price: Number(p.price),
              category: cat.name,
              emoji: emojiPour(cat.name),
              isAvailable: p.isAvailable,
            }))
        )

        if (annule) return
        setProduits(plats)
        setActiveCat((prec) => prec || plats[0]?.category || '')
      } catch (e: any) {
        if (annule) return
        // Aucun repli sur une carte locale : mieux vaut ne rien afficher
        // qu'un prix faux.
        setErreur(String(e?.message || e))
        setProduits([])
      } finally {
        if (!annule) setChargement(false)
      }
    }

    charger()
    return () => {
      annule = true
    }
  }, [tentative])

  const categories = [...new Set(produits.map((p) => p.category))]
  const filtered = produits.filter((p) => p.category === activeCat)

  function handleAdd(item: ProduitCarte) {
    store.addItem({ id: item.id, name: item.name, price: item.price, emoji: item.emoji })
    setToast(`${item.emoji} ${item.name} ajouté !`)
    setTimeout(() => setToast(''), 1500)
  }

  if (chargement) {
    return (
      <div style={S.page}>
        <div style={S.title}>Notre Menu</div>
        <div style={S.etat}>Chargement de la carte…</div>
      </div>
    )
  }

  if (erreur || produits.length === 0) {
    return (
      <div style={S.page}>
        <div style={S.title}>Notre Menu</div>
        <div style={S.etat}>
          La carte n'a pas pu être chargée.
          <br />
          Les prix affichés doivent être ceux du restaurant : nous préférons ne rien
          afficher plutôt qu'un tarif erroné.
          <br />
          <button style={S.reessayer} onClick={() => setTentative((t) => t + 1)}>
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.title}>Notre Menu</div>
      <div style={S.cats}>
        {categories.map((c) => (
          <button key={c} style={S.catBtn(c === activeCat)} onClick={() => setActiveCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div style={S.list}>
        {filtered.map((item) => (
          <div key={item.id} style={S.item}>
            <span style={S.emoji}>{item.emoji}</span>
            <div style={S.info}>
              <div style={S.name}>{item.name}</div>
              <div style={S.price}>{item.price.toFixed(2)} EUR</div>
            </div>
            <button style={S.addBtn} onClick={() => handleAdd(item)}>
              +
            </button>
          </div>
        ))}
      </div>
      {toast && <div style={S.added} className="fade-in">{toast}</div>}
    </div>
  )
}
