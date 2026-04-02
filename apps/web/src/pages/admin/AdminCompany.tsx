import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  legalName: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
})

type Form = z.infer<typeof schema>

export default function AdminCompany() {
  const company = useAuthStore((s) => s.company)
  const companyId = useAuthStore((s) => s.companyId)

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company?.name ?? '',
      legalName: company?.legalName ?? '',
      vatNumber: company?.vatNumber ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: Form) => {
      await api.put(`/companies/${companyId}`, data, {
        headers: { 'x-company-id': companyId! },
      })
    },
    onSuccess: () => toast.success('Informations sauvegardées'),
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Informations société</h2>
      <p className="text-sm text-gray-400 mb-6">Paramètres légaux et coordonnées de votre établissement</p>

      <Card>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom commercial" error={errors.name?.message} {...register('name')} />
            <Input label="Raison sociale" error={errors.legalName?.message} {...register('legalName')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Numéro TVA" placeholder="LU12345678" error={errors.vatNumber?.message} {...register('vatNumber')} />
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          </div>
          <Input label="Adresse complète" error={errors.address?.message} {...register('address')} />
          <Input label="Téléphone" error={errors.phone?.message} {...register('phone')} />

          <div className="pt-2">
            <Button type="submit" isLoading={mutation.isPending} disabled={!isDirty}>
              Sauvegarder
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
