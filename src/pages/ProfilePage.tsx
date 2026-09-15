import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, KeyRound, Save, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Avatar, Badge, Card, CardHeader, PageHeader } from '@/components/ui/Primitives'
import { api, ApiError } from '@/lib/api'
import { tenantRoleMeta } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import type { CurrentUser } from '@/lib/types'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!user) return

    setFirstName(user.firstName)
    setLastName(user.lastName)
    setJobTitle(user.jobTitle ?? '')
    setAvatarUrl(user.avatarUrl ?? '')
    setDirty(false)
  }, [user])

  const saveProfile = async () => {
    setSaving(true)

    try {
      await api.put<CurrentUser>('/auth/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        jobTitle: jobTitle.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      })

      await refreshUser()
      toast.success('Perfil actualizado')
      setDirty(false)
    } catch (error) {
      toast.error('No se pudo actualizar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const track = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setDirty(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Mi cuenta"
        description="Sus datos personales, su contraseña y las empresas a las que pertenece."
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-5">
            <CardHeader title="Perfil" description="Así lo verán el resto de administradores." />

            <div className="flex items-center gap-4">
              <Avatar name={user?.fullName} src={avatarUrl || user?.avatarUrl} size="xl" />
              <Input
                label="URL del avatar"
                value={avatarUrl}
                onChange={(event) => track(setAvatarUrl)(event.target.value)}
                placeholder="https://…/foto.jpg"
                wrapperClassName="flex-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nombre"
                value={firstName}
                onChange={(event) => track(setFirstName)(event.target.value)}
              />
              <Input
                label="Apellido"
                value={lastName}
                onChange={(event) => track(setLastName)(event.target.value)}
              />
            </div>

            <Input
              label="Cargo"
              value={jobTitle}
              onChange={(event) => track(setJobTitle)(event.target.value)}
              placeholder="Líder de integraciones"
            />

            <Input label="Correo" value={user?.email ?? ''} disabled hint="El correo no se puede cambiar desde el portal." />

            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
              {dirty && <span className="text-[0.8125rem] text-ink-muted">Hay cambios sin guardar</span>}
              <Button
                variant="primary"
                icon={<Save className="size-4" />}
                onClick={saveProfile}
                loading={saving}
                disabled={!dirty}
              >
                Guardar
              </Button>
            </div>
          </Card>

          <PasswordCard />
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <CardHeader title="Acceso" description="Permisos globales de su cuenta." />

            <div className="flex flex-wrap gap-1.5">
              {user?.roles.length ? (
                user.roles.map((role) => (
                  <Badge key={role} tone={role === 'PlatformAdmin' ? 'accent' : 'neutral'}>
                    {role === 'PlatformAdmin'
                      ? 'Administrador de plataforma'
                      : role === 'PlatformSupport'
                        ? 'Soporte'
                        : role}
                  </Badge>
                ))
              ) : (
                <Badge tone="neutral">Sin roles globales</Badge>
              )}
            </div>

            <p className="flex items-start gap-2 text-[0.78rem] leading-relaxed text-ink-muted">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-positive" aria-hidden />
              Los roles globales los asigna un administrador de plataforma desde la sección de
              usuarios.
            </p>
          </Card>

          <Card className="flex flex-col gap-3">
            <CardHeader title="Empresas" description="Los espacios a los que tiene acceso." />

            {user?.memberships.length ? (
              <ul className="flex flex-col gap-1">
                {user.memberships.map((membership) => (
                  <li key={membership.tenantId}>
                    <Link
                      to={`/empresas/${membership.tenantId}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-inset"
                    >
                      <Avatar name={membership.tenantName} src={membership.logoUrl} size="sm" square />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8438rem] font-medium text-ink">
                          {membership.tenantName}
                        </span>
                        <span className="block truncate font-mono text-[0.6875rem] text-ink-muted">
                          {membership.tenantSlug}
                        </span>
                      </span>
                      <Badge tone={membership.role === 'Owner' ? 'accent' : 'neutral'}>
                        {tenantRoleMeta[membership.role].label}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 py-2 text-[0.8125rem] text-ink-muted">
                <Building2 className="size-4" aria-hidden />
                No pertenece a ninguna empresa.
              </p>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <CardHeader title="Apariencia" description="Se guarda en este navegador." />

            <Select
              label="Tema"
              value={theme}
              onChange={(event) => setTheme(event.target.value as 'light' | 'dark')}
            >
              <option value="dark">Oscuro</option>
              <option value="light">Claro</option>
            </Select>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>()

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  const submit = async () => {
    setErrors(undefined)
    setSaving(true)

    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })

      toast.success('Contraseña actualizada', {
        description: 'Se cerraron las demás sesiones abiertas.',
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        toast.error('No se pudo cambiar la contraseña', { description: error.message })
      }
    } finally {
      setSaving(false)
    }
  }

  const firstError = errors ? Object.values(errors)[0]?.[0] : undefined

  return (
    <Card className="flex flex-col gap-5">
      <CardHeader
        title="Contraseña"
        description="Debe tener al menos 10 caracteres, con mayúsculas, minúsculas, números y un símbolo."
      />

      <Input
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          error={firstError}
        />

        <Input
          label="Repetir contraseña"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={mismatch ? 'Las contraseñas no coinciden.' : undefined}
        />
      </div>

      <div className="flex justify-end border-t border-line pt-4">
        <Button
          variant="primary"
          icon={<KeyRound className="size-4" />}
          onClick={submit}
          loading={saving}
          disabled={!currentPassword || newPassword.length < 10 || mismatch}
        >
          Cambiar contraseña
        </Button>
      </div>
    </Card>
  )
}
