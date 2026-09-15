import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, MoreHorizontal, Search, Star, Trash2, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { DropdownMenu, MenuItem, MenuSeparator } from '@/components/ui/Controls'
import { Avatar, Badge, Card, EmptyState, Skeleton } from '@/components/ui/Primitives'
import {
  useAddTenantMember,
  useRemoveTenantMember,
  useTenantMembers,
  useUpdateTenantMember,
  useUsers,
} from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { cn, formatRelative, tenantRoleMeta } from '@/lib/utils'
import { useDebounced } from '@/lib/useDebounced'
import { useAuth } from '@/providers/AuthProvider'
import type { TenantMember, TenantRole } from '@/lib/types'

const roles: TenantRole[] = ['Owner', 'Admin', 'Member', 'Viewer']

export function MembersPanel({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  const { data: members, isPending } = useTenantMembers(tenantId)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<TenantMember>()
  const [removing, setRemoving] = useState<TenantMember>()

  const removeMember = useRemoveTenantMember(tenantId)

  const confirmRemove = async () => {
    if (!removing) return

    try {
      await removeMember.mutateAsync(removing.membershipId)
      toast.success('Miembro retirado', { description: `${removing.fullName} ya no pertenece a la empresa.` })
      setRemoving(undefined)
    } catch (error) {
      toast.error('No se pudo retirar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  if (isPending) return <Skeleton className="h-64 w-full rounded-xl" />

  return (
    <div className="flex flex-col gap-4">
      {canManage && members && members.length > 0 && (
        <div className="flex justify-end">
          <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setAdding(true)}>
            Añadir miembro
          </Button>
        </div>
      )}

      {!members?.length ? (
        <Card padded={false}>
          <EmptyState
            icon={<Users className="size-5" />}
            title="Sin miembros"
            description="Añada usuarios de la plataforma para que puedan administrar la configuración de esta empresa."
            action={
              canManage && (
                <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setAdding(true)}>
                  Añadir miembro
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li key={member.membershipId} className="flex items-center gap-3.5 px-4 py-3.5">
                <Avatar name={member.fullName} src={member.avatarUrl} />

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-[0.875rem] font-medium text-ink">
                    {member.fullName}
                    {member.isDefault && (
                      <Star className="size-3.5 shrink-0 text-caution" aria-label="Empresa predeterminada" />
                    )}
                  </p>
                  <p className="truncate text-[0.78rem] text-ink-muted">
                    {member.email}
                    {member.jobTitle && ` · ${member.jobTitle}`}
                  </p>
                </div>

                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  <Badge tone={member.role === 'Owner' ? 'accent' : 'neutral'}>
                    {tenantRoleMeta[member.role].label}
                  </Badge>
                  <span className="text-[0.7188rem] text-ink-muted">
                    {member.lastLoginAt ? `Último acceso ${formatRelative(member.lastLoginAt)}` : 'Sin accesos'}
                  </span>
                </div>

                {(!member.isActive || !member.userIsActive) && (
                  <Badge tone="caution">{member.userIsActive ? 'Inactivo aquí' : 'Cuenta inactiva'}</Badge>
                )}

                {canManage && (
                  <DropdownMenu
                    trigger={({ toggle }) => (
                      <Button size="icon" variant="ghost" onClick={toggle} aria-label={`Acciones de ${member.fullName}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    )}
                  >
                    {(close) => (
                      <>
                        <MenuItem
                          icon={<Check className="size-4" />}
                          onClick={() => {
                            close()
                            setEditing(member)
                          }}
                        >
                          Cambiar rol
                        </MenuItem>

                        <MenuSeparator />

                        <MenuItem
                          tone="danger"
                          icon={<Trash2 className="size-4" />}
                          onClick={() => {
                            close()
                            setRemoving(member)
                          }}
                        >
                          Retirar de la empresa
                        </MenuItem>
                      </>
                    )}
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AddMemberModal
        tenantId={tenantId}
        open={adding}
        onClose={() => setAdding(false)}
        existingUserIds={new Set(members?.map((member) => member.userId) ?? [])}
      />

      <EditMemberModal tenantId={tenantId} member={editing} onClose={() => setEditing(undefined)} />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(undefined)}
        onConfirm={confirmRemove}
        loading={removeMember.isPending}
        title="Retirar miembro"
        confirmLabel="Retirar"
        description={
          <>
            <strong className="text-ink">{removing?.fullName}</strong> perderá el acceso a la
            configuración de esta empresa. Su cuenta de plataforma no se elimina.
          </>
        }
      />
    </div>
  )
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: TenantRole
  onChange: (role: TenantRole) => void
  disabled?: boolean
}) {
  return (
    <Select
      label="Rol en la empresa"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as TenantRole)}
      hint={tenantRoleMeta[value].description}
    >
      {roles.map((role) => (
        <option key={role} value={role}>
          {tenantRoleMeta[role].label}
        </option>
      ))}
    </Select>
  )
}

function AddMemberModal({
  tenantId,
  open,
  onClose,
  existingUserIds,
}: {
  tenantId: string
  open: boolean
  onClose: () => void
  existingUserIds: Set<string>
}) {
  const { user: currentUser } = useAuth()
  const addMember = useAddTenantMember(tenantId)

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string>()
  const [role, setRole] = useState<TenantRole>('Member')
  const [isDefault, setIsDefault] = useState(false)

  const debouncedSearch = useDebounced(search, 250)

  // El listado global de usuarios solo lo puede consultar la plataforma.
  const canSearchUsers = currentUser?.isPlatformAdmin ?? false
  const { data } = useUsers({
    page: 1,
    pageSize: 30,
    search: debouncedSearch || undefined,
    isActive: true,
  })

  useEffect(() => {
    if (!open) return

    setSearch('')
    setSelected(undefined)
    setRole('Member')
    setIsDefault(false)
  }, [open])

  const candidates = useMemo(
    () => data?.items.filter((item) => !existingUserIds.has(item.id)) ?? [],
    [data, existingUserIds],
  )

  const submit = async () => {
    if (!selected) return

    try {
      await addMember.mutateAsync({ userId: selected, role, isDefault })
      toast.success('Miembro añadido')
      onClose()
    } catch (error) {
      toast.error('No se pudo añadir', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Añadir miembro"
      description="Solo pueden añadirse usuarios que ya existan en la plataforma."
      locked={addMember.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={addMember.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={addMember.isPending} disabled={!selected}>
            Añadir
          </Button>
        </>
      }
    >
      {!canSearchUsers ? (
        <p className="rounded-lg border border-line bg-inset px-4 py-3 text-[0.8438rem] text-ink-muted">
          Solo un administrador de plataforma puede buscar usuarios para añadirlos a una empresa.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o correo…"
            leading={<Search className="size-4" />}
            aria-label="Buscar usuarios"
          />

          <div className="max-h-60 overflow-y-auto rounded-xl border border-line">
            {candidates.length === 0 ? (
              <p className="px-4 py-8 text-center text-[0.8438rem] text-ink-muted">
                No hay usuarios disponibles para añadir.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(candidate.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors',
                        candidate.id === selected ? 'bg-accent-soft' : 'hover:bg-inset',
                      )}
                    >
                      <Avatar name={candidate.fullName} src={candidate.avatarUrl} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8438rem] font-medium text-ink">
                          {candidate.fullName}
                        </span>
                        <span className="block truncate text-[0.75rem] text-ink-muted">
                          {candidate.email}
                        </span>
                      </span>
                      {candidate.id === selected && (
                        <Check className="size-4 shrink-0 text-accent" aria-hidden />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <RoleSelect value={role} onChange={setRole} />

          <Switch
            checked={isDefault}
            onChange={setIsDefault}
            label="Marcar como empresa predeterminada del usuario"
            description="Es la empresa que verá al entrar al portal."
          />
        </div>
      )}
    </Modal>
  )
}

function EditMemberModal({
  tenantId,
  member,
  onClose,
}: {
  tenantId: string
  member?: TenantMember
  onClose: () => void
}) {
  const updateMember = useUpdateTenantMember(tenantId)
  const [role, setRole] = useState<TenantRole>('Member')
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)

  useEffect(() => {
    if (!member) return

    setRole(member.role)
    setIsActive(member.isActive)
    setIsDefault(member.isDefault)
  }, [member])

  const submit = async () => {
    if (!member) return

    try {
      await updateMember.mutateAsync({ membershipId: member.membershipId, role, isActive, isDefault })
      toast.success('Miembro actualizado')
      onClose()
    } catch (error) {
      toast.error('No se pudo actualizar', {
        description: error instanceof ApiError ? error.message : undefined,
      })
    }
  }

  return (
    <Modal
      open={Boolean(member)}
      onClose={onClose}
      title={member?.fullName ?? ''}
      description={member?.email}
      locked={updateMember.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={updateMember.isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={updateMember.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <RoleSelect value={role} onChange={setRole} />

        <Switch
          checked={isActive}
          onChange={setIsActive}
          label="Pertenencia activa"
          description="Si se desactiva, el usuario deja de ver esta empresa sin perder su cuenta."
        />

        <Switch
          checked={isDefault}
          onChange={setIsDefault}
          label="Empresa predeterminada"
          description="La que verá al entrar al portal."
        />
      </div>
    </Modal>
  )
}
