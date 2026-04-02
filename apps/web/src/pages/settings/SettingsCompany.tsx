import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import SettingsLayout from './SettingsLayout'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'

const companySchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  legalName: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
})

type CompanyForm = z.infer<typeof companySchema>

export default function SettingsCompany() {
  const company = useAuthStore((s) => s.company)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name ?? '',
      legalName: company?.legalName ?? '',
      vatNumber: company?.vatNumber ?? '',
    },
  })

  const onSubmit = async (_data: CompanyForm) => {
    // TODO: API call PUT /api/companies/:id
    toast.success('Informations sauvegardées')
  }

  return (
    <SettingsLayout>
      <div className="max-w-2xl">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Informations société</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nom commercial" error={errors.name?.message} {...register('name')} />
              <Input label="Raison sociale" error={errors.legalName?.message} {...register('legalName')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Numéro TVA" placeholder="LU12345678" error={errors.vatNumber?.message} {...register('vatNumber')} />
              <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            </div>
            <Input label="Adresse" error={errors.address?.message} {...register('address')} />
            <Input label="Téléphone" error={errors.phone?.message} {...register('phone')} />

            <div className="pt-4">
              <Button type="submit" isLoading={isSubmitting}>
                Sauvegarder
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </SettingsLayout>
  )
}
