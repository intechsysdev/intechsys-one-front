import { useEffect, useState } from 'react'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { SectionDivider } from '@/components/ui/Primitives'
import { slugify } from '@/lib/utils'
import type { Tenant, TenantStatus } from '@/lib/types'

export interface TenantFormValues {
  name: string
  slug: string
  legalName: string
  taxId: string
  contactEmail: string
  contactPhone: string
  website: string
  logoUrl: string
  brandColor: string
  country: string
  city: string
  address: string
  status: TenantStatus
  plan: string
  notes: string
  maxApps: string
  maxUsers: string
}

export const emptyTenantForm: TenantFormValues = {
  name: '',
  slug: '',
  legalName: '',
  taxId: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  logoUrl: '',
  brandColor: '#6366f1',
  country: 'Colombia',
  city: '',
  address: '',
  status: 'Trial',
  plan: '',
  notes: '',
  maxApps: '',
  maxUsers: '',
}

export function tenantToForm(tenant: Tenant): TenantFormValues {
  return {
    name: tenant.name,
    slug: tenant.slug,
    legalName: tenant.legalName ?? '',
    taxId: tenant.taxId ?? '',
    contactEmail: tenant.contactEmail ?? '',
    contactPhone: tenant.contactPhone ?? '',
    website: tenant.website ?? '',
    logoUrl: tenant.logoUrl ?? '',
    brandColor: tenant.brandColor ?? '#6366f1',
    country: tenant.country ?? '',
    city: tenant.city ?? '',
    address: tenant.address ?? '',
    status: tenant.status,
    plan: tenant.plan ?? '',
    notes: tenant.notes ?? '',
    maxApps: tenant.maxApps?.toString() ?? '',
    maxUsers: tenant.maxUsers?.toString() ?? '',
  }
}

/** Convierte el formulario al cuerpo que espera el API, omitiendo los vacíos. */
export function tenantFormToPayload(values: TenantFormValues, includeSlug: boolean) {
  const optional = (value: string) => (value.trim() === '' ? null : value.trim())

  return {
    name: values.name.trim(),
    ...(includeSlug && values.slug.trim() ? { slug: values.slug.trim() } : {}),
    legalName: optional(values.legalName),
    taxId: optional(values.taxId),
    contactEmail: optional(values.contactEmail),
    contactPhone: optional(values.contactPhone),
    website: optional(values.website),
    logoUrl: optional(values.logoUrl),
    brandColor: optional(values.brandColor),
    country: optional(values.country),
    city: optional(values.city),
    address: optional(values.address),
    status: values.status,
    plan: optional(values.plan),
    notes: optional(values.notes),
    maxApps: values.maxApps.trim() === '' ? null : Number(values.maxApps),
    maxUsers: values.maxUsers.trim() === '' ? null : Number(values.maxUsers),
  }
}

const statuses: { value: TenantStatus; label: string }[] = [
  { value: 'Trial', label: 'En prueba' },
  { value: 'Active', label: 'Activa' },
  { value: 'Suspended', label: 'Suspendida' },
  { value: 'Archived', label: 'Archivada' },
]

export function TenantForm({
  values,
  onChange,
  errors,
  mode,
}: {
  values: TenantFormValues
  onChange: (values: TenantFormValues) => void
  errors?: Record<string, string[]>
  mode: 'create' | 'edit'
}) {
  // Al crear, el identificador sigue al nombre hasta que el usuario lo edita a mano.
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')

  useEffect(() => {
    if (mode !== 'create' || slugTouched) return

    const derived = slugify(values.name)
    if (derived !== values.slug) onChange({ ...values, slug: derived })
  }, [values, onChange, slugTouched, mode])

  const set = <K extends keyof TenantFormValues>(key: K, value: TenantFormValues[K]) =>
    onChange({ ...values, [key]: value })

  const errorFor = (field: string) => errors?.[field]?.[0]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nombre comercial"
          required
          autoFocus
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          placeholder="Acme Logística"
          error={errorFor('Name')}
        />

        <Input
          label="Identificador"
          required
          value={values.slug}
          disabled={mode === 'edit'}
          onChange={(event) => {
            setSlugTouched(true)
            set('slug', slugify(event.target.value))
          }}
          placeholder="acme-logistica"
          hint={
            mode === 'edit'
              ? 'No se puede cambiar: las integraciones lo usan como referencia.'
              : 'Se usa en URLs y en la API. Solo minúsculas, números y guiones.'
          }
          className="font-mono"
          error={errorFor('Slug')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Razón social"
          value={values.legalName}
          onChange={(event) => set('legalName', event.target.value)}
          placeholder="Acme Logística S.A.S."
        />
        <Input
          label="NIT o identificación fiscal"
          value={values.taxId}
          onChange={(event) => set('taxId', event.target.value)}
          placeholder="900.123.456-7"
        />
      </div>

      <SectionDivider>Contacto</SectionDivider>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Correo de contacto"
          type="email"
          value={values.contactEmail}
          onChange={(event) => set('contactEmail', event.target.value)}
          placeholder="operaciones@acme.co"
          error={errorFor('ContactEmail')}
        />
        <Input
          label="Teléfono"
          value={values.contactPhone}
          onChange={(event) => set('contactPhone', event.target.value)}
          placeholder="+57 300 000 0000"
        />
        <Input
          label="Sitio web"
          value={values.website}
          onChange={(event) => set('website', event.target.value)}
          placeholder="https://acme.co"
        />
        <Input
          label="País"
          value={values.country}
          onChange={(event) => set('country', event.target.value)}
        />
        <Input
          label="Ciudad"
          value={values.city}
          onChange={(event) => set('city', event.target.value)}
        />
        <Input
          label="Dirección"
          value={values.address}
          onChange={(event) => set('address', event.target.value)}
        />
      </div>

      <SectionDivider>Identidad y plan</SectionDivider>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="URL del logotipo"
          value={values.logoUrl}
          onChange={(event) => set('logoUrl', event.target.value)}
          placeholder="https://…/logo.svg"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-ink-soft">Color de marca</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Color de marca"
              value={values.brandColor || '#6366f1'}
              onChange={(event) => set('brandColor', event.target.value)}
              className="h-9.5 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-inset p-1"
            />
            <Input
              value={values.brandColor}
              onChange={(event) => set('brandColor', event.target.value)}
              className="font-mono"
              wrapperClassName="flex-1"
              placeholder="#6366f1"
            />
          </div>
        </div>

        <Select
          label="Estado"
          value={values.status}
          onChange={(event) => set('status', event.target.value as TenantStatus)}
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>

        <Input
          label="Plan"
          value={values.plan}
          onChange={(event) => set('plan', event.target.value)}
          placeholder="Enterprise"
        />

        <Input
          label="Máximo de apps"
          type="number"
          min={1}
          value={values.maxApps}
          onChange={(event) => set('maxApps', event.target.value)}
          placeholder="Sin límite"
        />

        <Input
          label="Máximo de usuarios"
          type="number"
          min={1}
          value={values.maxUsers}
          onChange={(event) => set('maxUsers', event.target.value)}
          placeholder="Sin límite"
        />
      </div>

      <Textarea
        label="Notas internas"
        rows={3}
        value={values.notes}
        onChange={(event) => set('notes', event.target.value)}
        placeholder="Contexto del cliente, acuerdos, contactos técnicos…"
      />
    </div>
  )
}
