import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBusinessQuery } from './useBusinessQuery'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

export interface Product {
  id: string
  name: string
  description?: string | null
  price: number
  categoryId?: string
  category?: Category
  taxRate?: number
  image?: string | null
  allergens?: string[]
  isActive?: boolean
  stock?: number | null
  sortOrder?: number
}

export interface Category {
  id: string
  name: string
  color?: string | null
  icon?: string | null
  sortOrder?: number
  _count?: { products: number }
}

export function useProducts(categoryId?: string, options: { enabled?: boolean } = {}) {
  return useBusinessQuery<Product[]>('catalog.read', {
    queryKey: ['products', categoryId ?? 'all'],
    queryFn: ({ signal }) =>
      api
        .get('/products', {
          params: categoryId ? { categoryId } : undefined,
          signal,
        })
        .then((r) => r.data),
    enabled: options.enabled,
  })
}

export function useProduct(id?: string) {
  return useBusinessQuery<Product>('catalog.read', {
    queryKey: ['products', 'detail', id],
    queryFn: ({ signal }) => api.get(`/products/${id}`, { signal }).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Product>) =>
      api.post('/products', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toastSuccess('Produit créé')
    },
    onError: () => toastError('Impossible de créer le produit'),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      api.put(`/products/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toastSuccess('Produit mis à jour')
    },
    onError: () => toastError('Échec de la mise à jour du produit'),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/products/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toastSuccess('Produit supprimé')
    },
    onError: () => toastError('Échec de la suppression du produit'),
  })
}

export function useCategories() {
  return useBusinessQuery<Category[]>('catalog.read', {
    queryKey: ['categories'],
    queryFn: ({ signal }) => api.get('/categories', { signal }).then((r) => r.data),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Category>) =>
      api.post('/categories', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toastSuccess('Catégorie créée')
    },
    onError: () => toastError('Impossible de créer la catégorie'),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      api.put(`/categories/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toastSuccess('Catégorie mise à jour')
    },
    onError: () => toastError('Impossible de mettre à jour la catégorie'),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toastSuccess('Catégorie supprimée')
    },
    onError: () => toastError('Impossible de supprimer la catégorie'),
  })
}
