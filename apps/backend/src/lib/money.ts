// Politique explicite : centimes exacts, arrondi demi-supérieur et ventilation par taux.
// Les nombres JS sont lus comme leur écriture décimale ; aucun calcul d'argent en flottant.
type Fraction = { n: bigint; d: bigint }
function fraction(value: number | string): Fraction {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError('Valeur monétaire non finie')
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i)
  if (!match) throw new RangeError('Valeur décimale invalide')
  const exponent = Number(match[4] || 0) - (match[3]?.length || 0)
  if (Math.abs(exponent) > 30) throw new RangeError('Précision monétaire excessive')
  let n = BigInt(match[2] + (match[3] || '')) * (match[1] ? -1n : 1n)
  return exponent >= 0 ? { n: n * 10n ** BigInt(exponent), d: 1n } : { n, d: 10n ** BigInt(-exponent) }
}
function rounded(n: bigint, d: bigint) {
  const sign = n < 0n ? -1n : 1n, absolute = n * sign
  return sign * ((absolute * 2n + d) / (2n * d))
}
function safeNumber(value: bigint) {
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new RangeError('Montant hors limites')
  return result
}
export function moneyMinor(value: number | string): number {
  const f = fraction(value)
  return safeNumber(rounded(f.n * 100n, f.d))
}
function extendedMinor(price: number, quantity: number) {
  const p = fraction(price), q = fraction(quantity)
  if (p.n < 0n || q.n <= 0n) throw new RangeError('Prix ou quantité invalide')
  return safeNumber(rounded(p.n * q.n * 100n, p.d * q.d))
}
export function allocateMinor(total: number, weights: number[]): number[] {
  if (!Number.isSafeInteger(total) || total < 0 || weights.some(w => !Number.isSafeInteger(w) || w < 0)) throw new RangeError('Allocation invalide')
  const sum = weights.reduce((s, w) => s + BigInt(w), 0n)
  if (!sum) { if (total) throw new RangeError('Allocation sans base'); return weights.map(() => 0) }
  const parts = weights.map((w, index) => ({ index, amount: BigInt(total) * BigInt(w) / sum, remainder: BigInt(total) * BigInt(w) % sum }))
  let remaining = BigInt(total) - parts.reduce((s, p) => s + p.amount, 0n)
  for (const part of [...parts].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)) {
    if (!remaining) break
    part.amount++; remaining--
  }
  return parts.map(p => safeNumber(p.amount))
}
export interface TaxGroup { taxRate: number; baseCents: number; taxCents: number; totalCents: number }
export interface TaxLine { price: number; qty: number; taxRate: number }
function groupsFrom(lines: TaxLine[], values: number[], ttc: boolean): TaxGroup[] {
  const groups = new Map<number, number>()
  lines.forEach((line, i) => {
    const rate = moneyMinor(line.taxRate)
    if (rate < 0 || rate > 10000) throw new RangeError('Taux invalide')
    groups.set(rate, (groups.get(rate) || 0) + values[i])
  })
  return [...groups].sort(([a], [b]) => a - b).map(([rate, value]) => {
    const baseCents = ttc ? safeNumber(rounded(BigInt(value) * 10000n, 10000n + BigInt(rate))) : value
    const taxCents = ttc ? value - baseCents : safeNumber(rounded(BigInt(baseCents) * BigInt(rate), 10000n))
    return { taxRate: rate / 100, baseCents, taxCents, totalCents: baseCents + taxCents }
  })
}
export function totalsFromTtc(lines: TaxLine[], discountCents = 0) {
  const gross = lines.map(l => extendedMinor(l.price, l.qty)), grossCents = gross.reduce((s, n) => s + n, 0)
  if (discountCents > grossCents) throw new RangeError('Remise supérieure au montant')
  const discounts = allocateMinor(discountCents, gross), netLines = gross.map((n, i) => n - discounts[i])
  const groups = groupsFrom(lines, netLines, true)
  return { grossCents, totalCents: grossCents - discountCents, baseCents: groups.reduce((s, g) => s + g.baseCents, 0), taxCents: groups.reduce((s, g) => s + g.taxCents, 0), groups }
}
export function totalsFromHt(lines: TaxLine[]) {
  const groups = groupsFrom(lines, lines.map(l => extendedMinor(l.price, l.qty)), false)
  const baseCents = groups.reduce((s, g) => s + g.baseCents, 0), taxCents = groups.reduce((s, g) => s + g.taxCents, 0)
  return { baseCents, taxCents, totalCents: baseCents + taxCents, groups }
}
