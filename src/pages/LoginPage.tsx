import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CodeInput } from '@/components/ui/CodeInput'
import { Input, Switch } from '@/components/ui/Field'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'

const highlights = [
  {
    icon: Building2,
    title: 'Aislamiento por cliente',
    description: 'Nadie ve lo que no es suyo.',
  },
  {
    icon: Blocks,
    title: 'Formularios desde el esquema',
    description: 'Defina las variables una vez y el portal hace el resto.',
  },
  {
    icon: KeyRound,
    title: 'Llaves con rotación',
    description: 'Revocación y traza de uso en cada entorno.',
  },
]

/** A quién escribir si no se puede entrar, dónde abrir un caso y la política de privacidad. */
const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL ?? '').trim() || 'support@intechsyscol.com'
const SUPPORT_URL =
  (import.meta.env.VITE_SUPPORT_URL ?? '').trim() || 'https://team.support.intechsyscol.com/helpcenter/ISC/'
const PRIVACY_URL =
  (import.meta.env.VITE_PRIVACY_URL ?? '').trim() || 'https://www.intechsyscol.com/politicas-de-privacidad'

/** "v1.0" para 1.0.0; el parche solo se muestra cuando no es cero ("v1.0.3"). */
const VERSION = `v${__APP_VERSION__.replace(/^(\d+\.\d+)\.0$/, '$1')}`

/** La franja de la marca: ámbar, carmesí y borgoña, de la paleta del manual. */
const BRAND_STRIPE = 'linear-gradient(90deg, #F8B21D, #E51E49 45%, #751326)'

const YEAR = new Date().getFullYear()

/**
 * El ambiente sale del dominio: la dirección del portal y sus alias son producción y no llevan
 * aviso. Sin dominio configurado no se puede saber, y tampoco se avisa.
 */
function currentEnvironment(): string | null {
  const host = window.location.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1') return 'Ambiente local'

  const main = (import.meta.env.VITE_PORTAL_URL ?? '').trim()
  const production = [main ? new URL(main).hostname : '', ...(import.meta.env.VITE_PORTAL_ALIAS ?? '').split(',')]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  if (production.length === 0) return null
  return production.includes(host) ? null : 'Ambiente de pruebas'
}

const ENVIRONMENT = currentEnvironment()

export function LoginPage() {
  const { status, login, completeTwoFactor } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotHelp, setShowForgotHelp] = useState(false)
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  // Segundo paso: la contraseña ya se validó y falta el código de la app.
  const [challenge, setChallenge] = useState<string>()
  const [code, setCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const codeInput = useRef<HTMLInputElement>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  // Llegar al login desde /autorizar significa que una app pidió entrar con One: se dice, para
  // que el usuario no crea que se equivocó de sitio.
  const forApp = from.startsWith('/autorizar')

  if (status === 'authenticated') return <Navigate to={from} replace />

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submit(code)
  }

  // El código de la app se verifica solo al completar los seis dígitos; también con el botón.
  const submit = async (twoFactorCode: string) => {
    if (submitting) return
    setError(undefined)
    setSubmitting(true)

    try {
      if (challenge) {
        await completeTwoFactor(email.trim(), challenge, twoFactorCode, rememberDevice)
        return
      }

      const pending = await login(email.trim(), password)
      if (pending) {
        setChallenge(pending.challengeToken)
        setCode('')
        setUseRecovery(false)
      }
    } catch (caught) {
      // La constancia del primer paso dura cinco minutos: vencida, se vuelve a la contraseña.
      if (challenge && caught instanceof ApiError && caught.status === 401 && caught.message.includes('venció')) {
        setChallenge(undefined)
        setPassword('')
      }

      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo conectar con el servidor. Verifique que el API esté en ejecución.',
      )

      // Código rechazado: se borra para escribir el siguiente sin tener que limpiar los recuadros.
      if (challenge && !useRecovery) {
        setCode('')
        requestAnimationFrame(() => codeInput.current?.focus())
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <div className="relative flex items-start justify-center bg-base px-6 pt-10 pb-8 sm:items-center sm:px-10 sm:py-12">
        {/* Sin el panel, la franja de la marca va arriba de la pantalla. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 lg:hidden" style={{ backgroundImage: BRAND_STRIPE }} aria-hidden />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[25rem]"
        >
          <div className="mb-8 lg:hidden">
            <BrandLockup />
          </div>

          {ENVIRONMENT && (
            <p
              role="status"
              className="mb-6 flex items-center gap-2.5 rounded-[10px] border border-caution/40 bg-caution-soft px-3.5 py-2.5 text-[0.875rem] text-ink"
            >
              <TriangleAlert className="size-4.5 shrink-0 text-caution" aria-hidden />
              <span>
                <strong className="font-bold">{ENVIRONMENT}</strong> · Los datos de este ambiente no son reales.
              </span>
            </p>
          )}

          <h1 className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em] text-ink sm:text-[1.875rem]">
            {challenge ? 'Verificación en dos pasos' : 'Iniciar sesión'}
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
            {challenge
              ? useRecovery
                ? 'Escriba uno de sus códigos de recuperación. Cada uno sirve una sola vez.'
                : 'Abra la app de autenticación en su teléfono y escriba el código de seis dígitos.'
              : forApp
                ? 'Bienvenido. Ingrese con su cuenta de One para continuar a la aplicación.'
                : 'Bienvenido. Ingrese con su cuenta corporativa.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-[1.125rem]" noValidate>
            {challenge ? (
              <>
                <Switch
                  checked={rememberDevice}
                  onChange={setRememberDevice}
                  label="Recordar este equipo por 30 días"
                  description="No vuelva a pedir el código en este navegador. Úselo solo en un equipo propio."
                />

                {useRecovery ? (
                  <Input
                    key="recuperacion"
                    label="Código de recuperación"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={20}
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="xxxxx-xxxxx"
                    leading={<KeyRound className="size-4" />}
                    className="h-12 text-[0.9375rem]"
                  />
                ) : (
                  <CodeInput
                    key="app"
                    ref={codeInput}
                    label="Código de la app"
                    autoFocus
                    value={code}
                    onChange={setCode}
                    onComplete={(value) => void submit(value)}
                    disabled={submitting}
                    invalid={Boolean(error)}
                  />
                )}
              </>
            ) : (
              <>
                <Input
                  label="Correo corporativo"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nombre@empresa.com"
                  leading={<Mail className="size-4.5" />}
                  className="h-12 text-[0.9375rem]"
                />

                <div className="flex flex-col gap-2.5">
                  <Input
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Su contraseña"
                    leading={<Lock className="size-4.5" />}
                    className="h-12 pr-12 text-[0.9375rem]"
                    action={
                      <button
                        type="button"
                        className="text-[0.8125rem] font-medium text-accent hover:underline"
                        aria-expanded={showForgotHelp}
                        aria-controls="ayuda-contrasena"
                        onClick={() => setShowForgotHelp((value) => !value)}
                      >
                        ¿Olvidó su contraseña?
                      </button>
                    }
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={showPassword}
                        className="-mr-1 flex size-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-inset hover:text-ink"
                      >
                        {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                      </button>
                    }
                  />

                  {/* One no tiene recuperación por correo: la contraseña la restablece un administrador. */}
                  {showForgotHelp && (
                    <p
                      id="ayuda-contrasena"
                      className="rounded-[10px] border border-line bg-inset px-3.5 py-3 text-[0.8125rem] leading-relaxed text-ink-soft"
                    >
                      La contraseña la restablece un administrador de la plataforma desde Usuarios y le
                      entrega una temporal. Pídasela a quien le dio el acceso, escriba a{' '}
                      <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-accent hover:underline">
                        {SUPPORT_EMAIL}
                      </a>{' '}
                      o abra un caso en el{' '}
                      <ExternalLink href={SUPPORT_URL} className="font-medium text-accent hover:underline">
                        portal de soporte
                      </ExternalLink>
                      .
                    </p>
                  )}
                </div>
              </>
            )}

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="rounded-[10px] border border-critical/40 bg-critical-soft px-3.5 py-2.5 text-[0.8125rem] text-critical"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="mt-1.5 h-13 w-full rounded-[10px]"
            >
              {challenge ? 'Verificar' : 'Entrar'}
              {!submitting && <ArrowRight className="size-4.5" />}
            </Button>

            {challenge && (
              <div className="flex items-center justify-between gap-3 text-[0.8125rem]">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink"
                  onClick={() => {
                    setChallenge(undefined)
                    setError(undefined)
                    setPassword('')
                  }}
                >
                  <ArrowLeft className="size-3.5" /> Volver
                </button>
                <button
                  type="button"
                  className="font-medium text-accent hover:underline"
                  onClick={() => {
                    setUseRecovery(!useRecovery)
                    setCode('')
                    setError(undefined)
                  }}
                >
                  {useRecovery ? 'Usar el código de la app' : 'No tengo el teléfono'}
                </button>
              </div>
            )}
          </form>

          <p className="mt-6 flex items-start gap-2.5 rounded-[10px] bg-positive-soft px-3.5 py-3 text-[0.8125rem] leading-relaxed text-ink-soft">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
            Conexión cifrada. Cada acceso queda registrado en la auditoría de la plataforma.
          </p>

          <p className="mt-6 text-center text-[0.875rem] text-ink-muted">
            ¿Problemas para ingresar?{' '}
            <ExternalLink href={SUPPORT_URL} className="font-semibold text-accent hover:underline">
              Contacte a soporte
            </ExternalLink>
          </p>

          {/* Sin el panel, su pie baja aquí; la privacidad no puede quedar fuera de alcance en el celular. */}
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-[0.8125rem] text-ink-muted lg:hidden">
            <span>© {YEAR} Intechsys · {VERSION}</span>
            <span aria-hidden>·</span>
            <ExternalLink href={SUPPORT_URL} className="hover:text-ink hover:underline">
              Soporte
            </ExternalLink>
            <span aria-hidden>·</span>
            <ExternalLink href={PRIVACY_URL} className="hover:text-ink hover:underline">
              Privacidad
            </ExternalLink>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

/** "Portal de administración": dice dónde se está entrando, sobre el panel o sobre el formulario. */
function PortalBadge({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={
        onDark
          ? 'inline-flex items-center gap-2 self-start rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-[0.8125rem] font-medium tracking-[0.02em] text-ink-soft'
          : 'inline-flex items-center gap-2 self-start rounded-full bg-accent-soft px-2.5 py-1 text-[0.75rem] font-medium text-accent'
      }
    >
      <span className="size-1.5 rounded-full bg-accent" aria-hidden />
      Portal de administración
    </span>
  )
}

/** Marca sobre el formulario cuando no se ve el panel: logo horizontal, o la marca compacta si
    la pantalla es angosta (menos de 480 px). La variante clara u oscura sigue al tema. */
function BrandLockup() {
  return (
    <div className="flex flex-col gap-3.5">
      <span className="block min-[480px]:hidden">
        <img src="/marca/marca.svg" alt="INTECHSYS ONE" width={52} height={72} className="marca-clara h-18 w-auto" />
        <img src="/marca/marca-oscuro.svg" alt="INTECHSYS ONE" width={52} height={72} className="marca-oscura h-18 w-auto" />
      </span>
      <span className="hidden min-[480px]:block">
        <img src="/marca/logo.svg" alt="INTECHSYS ONE" width={360} height={130} className="marca-clara h-auto w-90" />
        <img src="/marca/logo-oscuro.svg" alt="INTECHSYS ONE" width={360} height={130} className="marca-oscura h-auto w-90" />
      </span>
      <PortalBadge />
    </div>
  )
}

function BrandPanel() {
  return (
    // Siempre en carbón: es la cara de la marca, con el carmesí y el ámbar como luz.
    <div className="tema-oscuro relative hidden overflow-hidden bg-sunken text-ink lg:flex lg:flex-col lg:justify-between lg:gap-12 lg:px-16 lg:pt-14 lg:pb-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 56rem 38rem at 0% 0%, rgb(229 30 73 / 0.3), transparent 70%), radial-gradient(ellipse 44rem 31rem at 100% 100%, rgb(248 178 29 / 0.14), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1" style={{ backgroundImage: BRAND_STRIPE }} aria-hidden />

      <div className="relative">
        {/* Sin el lema: el mensaje del panel ya va abajo, y el lema pide 640 px de ancho. */}
        <img src="/marca/logo-oscuro.svg" alt="INTECHSYS ONE" width={360} height={130} className="h-auto w-90" />
      </div>

      <div className="relative flex max-w-[35rem] flex-col gap-9">
        <div className="flex flex-col gap-4.5">
          <PortalBadge onDark />
          <h2 className="text-[clamp(2rem,3.6vw,2.875rem)] leading-[1.08] font-extrabold tracking-[-0.02em] text-balance text-ink">
            Cada app recibe exactamente lo que le corresponde.
          </h2>
          <p className="text-[1.0625rem] leading-relaxed text-ink-soft">
            Un solo punto de control para sus integraciones: seguro, por cliente y por entorno.
          </p>
        </div>

        <ul className="flex flex-col gap-5.5">
          {highlights.map((item, index) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent/28 bg-accent/12 text-accent">
                <item.icon className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-base font-semibold text-ink">{item.title}</span>
                <span className="text-[0.9375rem] leading-normal text-ink-muted">{item.description}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3 text-[0.8125rem] text-ink-muted">
        <span>© {YEAR} Intechsys · {VERSION}</span>
        <span className="flex gap-5">
          <ExternalLink href={SUPPORT_URL} className="text-ink-soft hover:text-ink hover:underline">
            Soporte
          </ExternalLink>
          <ExternalLink href={PRIVACY_URL} className="text-ink-soft hover:text-ink hover:underline">
            Privacidad
          </ExternalLink>
        </span>
      </div>
    </div>
  )
}

/** Enlace a un sitio de Intechsys fuera del portal: en otra pestaña, para no perder el login. */
function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}
