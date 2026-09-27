import { ArrowUpRight, Blocks, Building2 } from 'lucide-react'
import { LinkButton } from '@/components/ui/Button'
import { Avatar, Badge, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/Primitives'
import { useMyApps } from '@/lib/queries'
import type { LaunchableApp } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

/**
 * Dirección con la que se abre la app. La empresa viaja como pista: la app la usa para dejar
 * elegida esa empresa al entrar, pero quien decide si el usuario puede usarla es One al emitir
 * el código, no este enlace.
 */
function launchHref(app: LaunchableApp, tenantId?: string) {
  const url = new URL(app.launchUrl)
  if (tenantId) url.searchParams.set('tenant', tenantId)
  return url.toString()
}

export function MyAppsPage() {
  const { user } = useAuth()
  const { data, isPending } = useMyApps()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hola, ${user?.firstName ?? ''}`}
        description="Tus aplicaciones. Se abren con la sesión que ya iniciaste aquí, sin volver a escribir la contraseña."
      />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.length ? (
        <Card padded={false}>
          <EmptyState
            icon={<Blocks className="size-5" />}
            title="Todavía no tienes aplicaciones"
            description={
              user?.isPlatformAdmin
                ? 'Una app aparece aquí cuando tiene URL de inicio configurada en el catálogo y está asignada a una empresa.'
                : 'Aparecerán aquí cuando una de tus empresas tenga una aplicación asignada. Si esperabas ver alguna, habla con el administrador.'
            }
            action={
              user?.isPlatformAdmin && (
                <LinkButton to="/apps" icon={<Blocks className="size-4" />}>
                  Ir al catálogo
                </LinkButton>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((app) => (
            <LaunchCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  )
}

function LaunchCard({ app }: { app: LaunchableApp }) {
  // Con una sola empresa no hay nada que elegir: la tarjeta entera la abre con esa. Con varias,
  // la tarjeta abre la app sin preferencia y cada empresa tiene su propio acceso directo.
  const single = app.tenants.length === 1 ? app.tenants[0] : undefined

  return (
    <div className="surface-card group relative flex flex-col gap-3.5 p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lifted)]">
      <div className="flex items-start gap-3">
        <Avatar name={app.name} src={app.iconUrl} color={app.color} square size="lg" />

        <div className="min-w-0 flex-1">
          {/* El enlace principal cubre toda la tarjeta con un pseudo-elemento; los accesos por
              empresa quedan por encima para poder tener su propio destino sin anidar enlaces. */}
          <a
            href={launchHref(app, single?.tenantId)}
            target="_blank"
            rel="noopener"
            className="truncate font-medium text-ink after:absolute after:inset-0 after:rounded-xl after:content-['']"
          >
            {app.name}
          </a>
          <p className="truncate text-[0.75rem] text-ink-muted">
            {single ? single.name : app.category ?? app.slug}
          </p>
        </div>

        <ArrowUpRight
          className="size-4.5 shrink-0 text-ink-muted transition-colors group-hover:text-accent"
          aria-hidden
        />
      </div>

      <p className="line-clamp-2 min-h-10 text-[0.8125rem] leading-relaxed text-ink-muted">
        {app.description || 'Sin descripción.'}
      </p>

      {app.tenants.length > 1 && (
        <div className="relative z-10 mt-auto flex flex-wrap gap-1.5 border-t border-line pt-3">
          <span className="sr-only">Abrir con la empresa:</span>
          {app.tenants.map((tenant) => (
            <a
              key={tenant.tenantId}
              href={launchHref(app, tenant.tenantId)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-inset/60 px-2.5 py-1 text-[0.75rem] text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              <Building2 className="size-3" aria-hidden />
              {tenant.name}
            </a>
          ))}
        </div>
      )}

      {app.tenants.length === 0 && (
        <div className="mt-auto">
          <Badge tone="caution">Sin empresas asignadas</Badge>
        </div>
      )}
    </div>
  )
}
