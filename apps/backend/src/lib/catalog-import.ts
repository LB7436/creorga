import { createHash } from 'node:crypto'

/** Identité stable : réimporter le même fichier ne recrée pas les produits. */
export function importedProductId(companyId: string, product: { id?: string; name: string; category: string }): string {
  const source = product.id ? ['id', product.id] : ['nom', product.category.trim().normalize('NFC'), product.name.trim().normalize('NFC')]
  return `import-${createHash('sha256').update(JSON.stringify([companyId, ...source])).digest('hex').slice(0, 40)}`
}
