import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  KeyRound,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { CopyButton, DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/Controls'
import { Avatar, Badge, EmptyState, PageHeader } from '@/components/ui/Primitives'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import {
  useCreateUser,
  useDeleteUser,
  useResetPassword,
  useRoles,
  useToggleUserLock,
  useUpdateUser,
  useUser,
  useUsers,
} from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { formatDate, formatRelative } from '@/lib/utils'
import { useDebounced } from '@/lib/useDebounced'
import type { UserListItem } from '@/lib/types'

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string>()
  const [removing, setRemoving] = useState<UserListItem>()
  const [resetting, setResetting] = useState<UserListItem>()

  const debouncedSearch = useDebounced(search, 300)
  const { data, isPending } = useUsers({
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
    role: role || undefined,
  })
  const { data: roles } = useRoles()

  const deleteUser = useDeleteUser()
  const toggleLock = useToggleUserLock()

  useEffect(() => setPage(1), [debouncedSearch, role])

  const confirmDelete = async () => {
    if (!removing) return

    try {
      await deleteUser.mutateAsync(removing.id)
      toast.success('Usuario eliminado')
      setRemoving(undefined)
    } catch (error) {
      toast.error('No se pudo eliminar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  const changeLock = async (user: UserListItem) => {
    try {
      await toggleLock.mutateAsync({ id: user.id, locked: !user.isLockedOut })
      toast.success(user.isLockedOut ? 'Usuario desbloqueado' : 'Usuario bloqueado')
    } catch (error) {
      toast.error('No se pudo cambiar el bloqueo', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  const columns: Column<UserListItem>[] = [
    {
      key: 'user',
      header: 'Usuario',
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} src={user.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{user.fullName}</p>
            <p className="truncate text-[0.75rem] text-ink-muted">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (user) =>
        user.roles.length === 0 ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {user.roles.map((item) => (
              <Badge key={item} tone={item === 'PlatformAdmin' ? 'accent' : 'neutral'}>
                {item === 'PlatformAdmin' ? 'Administrador' : item === 'PlatformSupport' ? 'Soporte' : item}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: 'tenants',
      header: 'Empresas',
      align: 'right',
      className: 'w-24',
      render: (user) => <span className="tabular">{user.tenantCount}</span>,
    },
    {
      key: 'state',
      header: 'Estado',
      render: (user) =>
        user.isLockedOut ? (
          <Badge tone="critical" dot>
            Bloqueado
          </Badge>
        ) : user.isActive ? (
          <Badge tone="positive" dot>
            Activo
          </Badge>
        ) : (
          <Badge tone="caution" dot>
            Inactivo
          </Badge>
        ),
    },
    {
      key: 'lastLogin',
      header: 'Último acceso',
      align: 'right',
      className: 'w-36',
      render: (user) => (
        <span className="text-[0.8125rem] text-ink-muted">
          {user.lastLoginAt ? formatRelative(user.lastLoginAt) : 'Nunca'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-12',
      render: (user) => (
        <DropdownMenu
          trigger={({ toggle }) => (
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Acciones de ${user.fullName}`}
              onClick={(event) => {
                event.stopPropagation()
                toggle()
              }}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                icon={<UserRound className="size-4" />}
                onClick={() => {
                  close()
                  setEditingId(user.id)
                }}
              >
                Editar usuario
              </MenuItem>

              <MenuItem
                icon={<KeyRound className="size-4" />}
                onClick={() => {
                  close()
                  setResetting(user)
                }}
              >
                Restablecer contraseña
              </MenuItem>

              <MenuItem
                icon={user.isLockedOut ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                onClick={() => {
                  close()
                  void changeLock(user)
                }}
              >
                {user.isLockedOut ? 'Desbloquear' : 'Bloquear acceso'}
              </MenuItem>

              <MenuSeparator />

              <MenuItem
                tone="danger"
                icon={<Trash2 className="size-4" />}
                onClick={() => {
                  close()
                  setRemoving(user)
                }}
              >
                Eliminar
              </MenuItem>
            </>
          )}
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Usuarios"
        description="Cuentas de la plataforma y su pertenencia a empresas. Los roles globales dan acceso transversal."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Nuevo usuario
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, correo o cargo…"
            leading={<Search className="size-4" />}
            wrapperClassName="min-w-64 flex-1 sm:max-w-sm"
            aria-label="Buscar usuarios"
          />

          <Select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            wrapperClassName="w-52"
            aria-label="Filtrar por rol"
          >
            <option value="">Todos los roles</option>
            {roles?.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name === 'PlatformAdmin'
                  ? 'Administrador de plataforma'
                  : item.name === 'PlatformSupport'
                    ? 'Soporte'
                    : item.name}
              </option>
            ))}
          </Select>
        </div>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={data?.items}
        rowKey={(user) => user.id}
        loading={isPending}
        empty={
          <EmptyState
            icon={<UserRound className="size-5" />}
            title={search || role ? 'Sin coincidencias' : 'No hay usuarios'}
            description={
              search || role
                ? 'Pruebe con otro término o quite el filtro de rol.'
                : 'Cree cuentas para que su equipo pueda administrar empresas y configuraciones.'
            }
          />
        }
      />

      {data && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.totalCount}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}

      <CreateUserModal open={creating} onClose={() => setCreating(false)} />
      <EditUserModal userId={editingId} onClose={() => setEditingId(undefined)} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(undefined)} />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(undefined)}
        onConfirm={confirmDelete}
        loading={deleteUser.isPending}
        title="Eliminar usuario"
        confirmLabel="Eliminar"
        description={
          <>
            Se eliminará la cuenta de <strong className="text-ink">{removing?.fullName}</strong> y su
            pertenencia a todas las empresas. No se puede deshacer.
          </>
        }
      />
    </div>
  )
}

function RolesPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (roles: string[]) => void
}) {
  const { data: roles } = useRoles()

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.8125rem] font-medium text-ink-soft">Roles de plataforma</span>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-inset/50 p-3.5">
        {roles?.length ? (
          roles.map((role) => (
            <Switch
              key={role.id}
              checked={selected.includes(role.name)}
              onChange={(checked) =>
                onChange(
                  checked
                    ? [...selected, role.name]
                    : selected.filter((item) => item !== role.name),
                )
              }
              label={
                role.name === 'PlatformAdmin'
                  ? 'Administrador de plataforma'
                  : role.name === 'PlatformSupport'
                    ? 'Soporte'
                    : role.name
              }
              description={role.description ?? undefined}
            />
          ))
        ) : (
          <p className="text-[0.8125rem] text-ink-muted">No hay roles definidos.</p>
        )}
      </div>

      <p className="text-[0.78rem] text-ink-muted">
        Sin rol global, el usuario solo ve las empresas a las que pertenece.
      </p>
    </div>
  )
}

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser()

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string[]>>()
  const [issued, setIssued] = useState<{ email: string; password: string }>()

  useEffect(() => {
    if (!open) return

    setEmail('')
    setFirstName('')
    setLastName('')
    setJobTitle('')
    setRoles([])
    setErrors(undefined)
  }, [open])

  const submit = async () => {
    setErrors(undefined)

    try {
      const result = await createUser.mutateAsync({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        jobTitle: jobTitle.trim() || null,
        isActive: true,
        mustChangePassword: true,
        roles,
        memberships: [],
      })

      onClose()

      if (result.temporaryPassword) {
        setIssued({ email: result.user.email, password: result.temporaryPassword })
      } else {
        toast.success('Usuario creado')
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors)
        toast.error('No se pudo crear el usuario', { description: error.message })
      }
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Nuevo usuario"
        description="Se generará una contraseña temporal que deberá cambiar en su primer acceso."
        locked={createUser.isPending}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={createUser.isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              loading={createUser.isPending}
              disabled={!email.trim() || !firstName.trim() || !lastName.trim()}
            >
              Crear usuario
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Input
            label="Correo"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@empresa.com"
            error={errors?.Email?.[0] ?? errors?.DuplicateUserName?.[0]}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <Input
              label="Apellido"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>

          <Input
            label="Cargo"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="Líder de integraciones"
          />

          <RolesPicker selected={roles} onChange={setRoles} />
        </div>
      </Modal>

      <TemporaryPasswordModal issued={issued} onClose={() => setIssued(undefined)} />
    </>
  )
}

function EditUserModal({ userId, onClose }: { userId?: string; onClose: () => void }) {
  const { data: user } = useUser(userId)
  const updateUser = useUpdateUser(userId ?? '')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [roles, setRoles] = useState<string[]>([])

  useEffect(() => {
    if (!user) return

    setFirstName(user.firstName)
    setLastName(user.lastName)
    setJobTitle(user.jobTitle ?? '')
    setPhoneNumber(user.phoneNumber ?? '')
    setIsActive(user.isActive)
    setRoles(user.roles)
  }, [user])

  const submit = async () => {
    try {
      await updateUser.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        jobTitle: jobTitle.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        isActive,
        roles,
      })

      toast.success('Usuario actualizado')
      onClose()
    } catch (error) {
      toast.error('No se pudo actualizar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  return (
    <Modal
      open={Boolean(userId)}
      onClose={onClose}
      title={user?.fullName ?? 'Usuario'}
      description={user?.email}
      locked={updateUser.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={updateUser.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={updateUser.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          <Input label="Apellido" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          <Input label="Cargo" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
          <Input
            label="Teléfono"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
          />
        </div>

        <Switch
          checked={isActive}
          onChange={setIsActive}
          label="Cuenta activa"
          description="Una cuenta inactiva no puede iniciar sesión y pierde sus sesiones abiertas."
        />

        <RolesPicker selected={roles} onChange={setRoles} />

        {user && user.memberships.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[0.8125rem] font-medium text-ink-soft">Empresas</span>
            <ul className="flex flex-wrap gap-1.5">
              {user.memberships.map((membership) => (
                <li key={membership.tenantId}>
                  <Badge tone="neutral">
                    {membership.tenantName} · {membership.role}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="text-[0.78rem] text-ink-muted">
              La pertenencia se administra desde la ficha de cada empresa.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose }: { user?: UserListItem; onClose: () => void }) {
  const resetPassword = useResetPassword()
  const [issued, setIssued] = useState<{ email: string; password: string }>()

  const submit = async () => {
    if (!user) return

    try {
      const result = await resetPassword.mutateAsync({ id: user.id, mustChangePassword: true })
      onClose()

      if (result.temporaryPassword) {
        setIssued({ email: result.email, password: result.temporaryPassword })
      } else {
        toast.success('Contraseña restablecida')
      }
    } catch (error) {
      toast.error('No se pudo restablecer', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  return (
    <>
      <ConfirmDialog
        open={Boolean(user)}
        onClose={onClose}
        onConfirm={submit}
        loading={resetPassword.isPending}
        tone="primary"
        title="Restablecer contraseña"
        confirmLabel="Generar contraseña"
        description={
          <>
            Se generará una contraseña temporal para{' '}
            <strong className="text-ink">{user?.fullName}</strong> y se cerrarán todas sus sesiones.
            Tendrá que cambiarla al entrar.
          </>
        }
      />

      <TemporaryPasswordModal issued={issued} onClose={() => setIssued(undefined)} />
    </>
  )
}

function TemporaryPasswordModal({
  issued,
  onClose,
}: {
  issued?: { email: string; password: string }
  onClose: () => void
}) {
  if (!issued) return null

  return (
    <Modal
      open
      onClose={onClose}
      width="sm"
      title="Contraseña temporal"
      description="Entréguesela al usuario por un canal seguro. No volverá a mostrarse."
      footer={
        <Button variant="primary" onClick={onClose}>
          Entendido
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 rounded-xl border border-line bg-inset px-4 py-3">
          <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-positive" aria-hidden />
          <p className="text-[0.8438rem] leading-relaxed text-ink-soft">
            El usuario deberá cambiarla en su primer acceso. Hasta entonces, cualquiera con esta
            clave puede entrar con su cuenta.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-ink-soft">Cuenta</span>
          <code className="rounded-lg border border-line bg-inset px-3 py-2 font-mono text-[0.8125rem] text-ink">
            {issued.email}
          </code>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[0.8125rem] font-medium text-ink-soft">Contraseña temporal</span>
            <CopyButton value={issued.password} label="Copiar" size="inline" />
          </div>
          <code className="rounded-lg border border-line bg-inset px-3 py-2 font-mono text-[0.9375rem] text-ink select-all">
            {issued.password}
          </code>
        </div>

        <p className="text-[0.75rem] text-ink-muted">Generada el {formatDate(new Date().toISOString())}.</p>
      </div>
    </Modal>
  )
}
