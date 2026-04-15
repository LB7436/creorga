import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChefHat, Plus, ChevronDown, ChevronUp } from 'lucide-react'

interface Ingredient {
  name: string
  quantity: number
  unit: string
  costPerUnit: number
}

interface Recipe {
  id: string
  name: string
  category: string
  ingredients: Ingredient[]
  sellingPrice: number
}

const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Pizza Margherita',
    category: 'Pizzas',
    sellingPrice: 12.5,
    ingredients: [
      { name: 'Farine', quantity: 250, unit: 'g', costPerUnit: 0.0012 },
      { name: 'Sauce tomate', quantity: 100, unit: 'g', costPerUnit: 0.003 },
      { name: 'Mozzarella', quantity: 150, unit: 'g', costPerUnit: 0.008 },
      { name: 'Huile d\'olive', quantity: 15, unit: 'ml', costPerUnit: 0.006 },
      { name: 'Basilic frais', quantity: 5, unit: 'g', costPerUnit: 0.02 },
    ],
  },
  {
    id: '2',
    name: 'Burger Classic',
    category: 'Burgers',
    sellingPrice: 14.9,
    ingredients: [
      { name: 'Pain burger', quantity: 1, unit: 'pcs', costPerUnit: 0.35 },
      { name: 'Steak haché', quantity: 180, unit: 'g', costPerUnit: 0.012 },
      { name: 'Cheddar', quantity: 30, unit: 'g', costPerUnit: 0.015 },
      { name: 'Salade', quantity: 20, unit: 'g', costPerUnit: 0.004 },
      { name: 'Tomate', quantity: 40, unit: 'g', costPerUnit: 0.003 },
      { name: 'Sauce maison', quantity: 25, unit: 'ml', costPerUnit: 0.005 },
    ],
  },
  {
    id: '3',
    name: 'Salade César',
    category: 'Salades',
    sellingPrice: 11.0,
    ingredients: [
      { name: 'Laitue romaine', quantity: 150, unit: 'g', costPerUnit: 0.004 },
      { name: 'Poulet grillé', quantity: 120, unit: 'g', costPerUnit: 0.009 },
      { name: 'Parmesan', quantity: 25, unit: 'g', costPerUnit: 0.025 },
      { name: 'Croûtons', quantity: 30, unit: 'g', costPerUnit: 0.006 },
      { name: 'Sauce César', quantity: 40, unit: 'ml', costPerUnit: 0.008 },
    ],
  },
  {
    id: '4',
    name: 'Pâtes Carbonara',
    category: 'Pâtes',
    sellingPrice: 13.5,
    ingredients: [
      { name: 'Spaghetti', quantity: 200, unit: 'g', costPerUnit: 0.002 },
      { name: 'Lardons', quantity: 80, unit: 'g', costPerUnit: 0.012 },
      { name: 'Œufs', quantity: 2, unit: 'pcs', costPerUnit: 0.3 },
      { name: 'Parmesan', quantity: 40, unit: 'g', costPerUnit: 0.025 },
      { name: 'Crème fraîche', quantity: 50, unit: 'ml', costPerUnit: 0.004 },
    ],
  },
  {
    id: '5',
    name: 'Tiramisu',
    category: 'Desserts',
    sellingPrice: 7.5,
    ingredients: [
      { name: 'Mascarpone', quantity: 150, unit: 'g', costPerUnit: 0.008 },
      { name: 'Biscuits cuillère', quantity: 80, unit: 'g', costPerUnit: 0.01 },
      { name: 'Café expresso', quantity: 100, unit: 'ml', costPerUnit: 0.002 },
      { name: 'Œufs', quantity: 2, unit: 'pcs', costPerUnit: 0.3 },
      { name: 'Cacao en poudre', quantity: 10, unit: 'g', costPerUnit: 0.015 },
    ],
  },
]

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
  padding: 24,
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-LU', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)

function calcCost(ingredients: Ingredient[]) {
  return ingredients.reduce(
    (sum, ing) => sum + ing.quantity * ing.costPerUnit,
    0
  )
}

export default function RecettesPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Header */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
              Recettes
            </h1>
            <p style={{ fontSize: 14, color: '#475569' }}>
              Composition et coût de revient des produits
            </p>
          </div>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              borderRadius: 12,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: '#92400E',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Nouvelle recette
          </button>
        </motion.div>

        {/* Summary */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          <div style={{ ...card, padding: 18 }}>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
              Total recettes
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>
              {mockRecipes.length}
            </p>
          </div>
          <div style={{ ...card, padding: 18 }}>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
              Coût moyen
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>
              {fmt(
                mockRecipes.reduce((s, r) => s + calcCost(r.ingredients), 0) /
                  mockRecipes.length
              )}
            </p>
          </div>
          <div style={{ ...card, padding: 18 }}>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
              Marge moyenne
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#16a34a' }}>
              {Math.round(
                mockRecipes.reduce((s, r) => {
                  const cost = calcCost(r.ingredients)
                  return s + ((r.sellingPrice - cost) / r.sellingPrice) * 100
                }, 0) / mockRecipes.length
              )}
              %
            </p>
          </div>
        </motion.div>

        {/* Recipe cards */}
        {mockRecipes.map((recipe) => {
          const cost = calcCost(recipe.ingredients)
          const margin = ((recipe.sellingPrice - cost) / recipe.sellingPrice) * 100
          const isOpen = expanded === recipe.id

          return (
            <motion.div key={recipe.id} variants={fadeUp} style={card}>
              <div
                onClick={() => setExpanded(isOpen ? null : recipe.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ChefHat size={20} style={{ color: '#92400E' }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#1e293b',
                      }}
                    >
                      {recipe.name}
                    </p>
                    <p style={{ fontSize: 12, color: '#475569' }}>
                      {recipe.category} · {recipe.ingredients.length} ingrédients
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <p
                      style={{
                        fontSize: 13,
                        color: '#475569',
                        marginBottom: 2,
                      }}
                    >
                      Coût de revient
                    </p>
                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#1e293b',
                      }}
                    >
                      {fmt(cost)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p
                      style={{
                        fontSize: 13,
                        color: '#475569',
                        marginBottom: 2,
                      }}
                    >
                      Marge
                    </p>
                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: margin >= 65 ? '#16a34a' : '#d97706',
                      }}
                    >
                      {Math.round(margin)}%
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p
                      style={{
                        fontSize: 13,
                        color: '#475569',
                        marginBottom: 2,
                      }}
                    >
                      Prix vente
                    </p>
                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#1e293b',
                      }}
                    >
                      {fmt(recipe.sellingPrice)}
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronUp size={18} style={{ color: '#475569' }} />
                  ) : (
                    <ChevronDown size={18} style={{ color: '#475569' }} />
                  )}
                </div>
              </div>

              {/* Expanded ingredients */}
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                  style={{ marginTop: 16 }}
                >
                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: 16,
                    }}
                  >
                    <table
                      style={{ width: '100%', borderCollapse: 'collapse' }}
                    >
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          {['Ingrédient', 'Quantité', 'Coût unitaire', 'Sous-total'].map(
                            (h) => (
                              <th
                                key={h}
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#475569',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {recipe.ingredients.map((ing, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid #f8fafc',
                            }}
                          >
                            <td
                              style={{
                                padding: '8px 12px',
                                fontSize: 13,
                                color: '#1e293b',
                                fontWeight: 500,
                              }}
                            >
                              {ing.name}
                            </td>
                            <td
                              style={{
                                padding: '8px 12px',
                                fontSize: 13,
                                color: '#475569',
                              }}
                            >
                              {ing.quantity} {ing.unit}
                            </td>
                            <td
                              style={{
                                padding: '8px 12px',
                                fontSize: 13,
                                color: '#475569',
                              }}
                            >
                              {fmt(ing.costPerUnit)}/{ing.unit}
                            </td>
                            <td
                              style={{
                                padding: '8px 12px',
                                fontSize: 13,
                                color: '#1e293b',
                                fontWeight: 600,
                              }}
                            >
                              {fmt(ing.quantity * ing.costPerUnit)}
                            </td>
                          </tr>
                        ))}
                        <tr
                          style={{
                            borderTop: '2px solid #e2e8f0',
                          }}
                        >
                          <td
                            colSpan={3}
                            style={{
                              padding: '10px 12px',
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#1e293b',
                              textAlign: 'right',
                            }}
                          >
                            Total coût de revient
                          </td>
                          <td
                            style={{
                              padding: '10px 12px',
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#92400E',
                            }}
                          >
                            {fmt(cost)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
