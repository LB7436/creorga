import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  categoryId?: string
  category?: string
  imageUrl?: string
  active?: boolean
  stock?: number
}

export interface Category {
  id: string
  name: string
  color?: string
  icon?: string
  order?: number
}

export function useProducts(categoryId?: string) {
  return useQuery<Product[]>({
    queryKey: ['products', categoryId ?? 'all'],
    queryFn: () =>
      api
        .get('/products', {
          params: categoryId ? { categoryId } : undefined,
        })
        .then((r) => r.data),
  })
}

export function useProduct(id?: string) {
  return useQuery<Product>({
    queryKey: ['products', 'detail', id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
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
      api.patch(`/products/${id}`, data).then((r) => r.data),
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
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
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
