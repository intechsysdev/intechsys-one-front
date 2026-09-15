import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Blocks, Building2, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'

const highlights = [
  {
    icon: Building2,
    title: 'Una empresa, un espacio aislado',
    description: 'Cada cliente ve solo sus apps, sus variables y sus credenciales.',
  },
  {
    icon: Blocks,
    title: 'Apps con esquema propio',
    description: 'Declare qué variables espera cada app y el portal genera el formulario.',
  },
  {
    icon: KeyRound,
    title: 'Credenciales que se rotan',
    description: 'Api key y secreto por entorno, con revocación y traza de uso.',
  },
]

export function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(undefined)
    setSubmitting(true)

    try {
      await login(email.trim(), password)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo conectar con el servidor. Verifique que el API esté en ejecución.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <div className="flex items-center justify-center bg-base px-5 py-12 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <BrandLockup />
          </div>

          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-[-0.02em] text-ink">
            Iniciar sesión
          </h1>
          <p className="mt-1.5 text-[0.875rem] text-ink-muted">
            Acceda con su cuenta corporativa para administrar empresas y accesos.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4" noValidate>
            <Input
              label="Correo corporativo"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@empresa.com"
              leading={<Mail className="size-4" />}
            />

            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••"
              leading={<Lock className="size-4" />}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="rounded-lg border border-critical/40 bg-critical-soft px-3 py-2.5 text-[0.8125rem] text-critical"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="mt-1 w-full"
            >
              Entrar
              {!submitting && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-7 flex items-start gap-2 text-[0.75rem] leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-positive" aria-hidden />
            Los accesos quedan registrados en la auditoría de la plataforma, incluidos los intentos
            fallidos.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-info shadow-[0_4px_16px_-4px_var(--accent)]">
        <span className="size-3.5 rounded-full border-2 border-[var(--accent-contrast)]" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-semibold tracking-tight text-ink">One</span>
        <span className="mt-1 text-[0.75rem] text-ink-muted">Consola de configuración</span>
      </span>
    </div>
  )
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-sunken lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 50rem 40rem at 20% 20%, var(--accent-soft), transparent 60%), radial-gradient(ellipse 40rem 30rem at 85% 85%, var(--info-soft), transparent 55%)',
        }}
        aria-hidden
      />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <div className="relative">
        <BrandLockup />
      </div>

      <div className="relative max-w-md">
        <h2 className="text-[2rem] leading-[1.15] font-semibold tracking-[-0.03em] text-ink text-balance">
          El centro donde sus aplicaciones encuentran su configuración.
        </h2>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
          Empresas, apps, llaves y variables en un solo lugar. Sus integraciones piden su
          configuración y reciben exactamente lo que les corresponde.
        </p>

        <ul className="mt-9 flex flex-col gap-5">
          {highlights.map((item, index) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex gap-3.5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-accent">
                <item.icon className="size-4.5" aria-hidden />
              </span>
              <span>
                <span className="block text-[0.875rem] font-medium text-ink">{item.title}</span>
                <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-muted">
                  {item.description}
                </span>
              </span>
            </motion.li>
          ))}
        </ul>
      </div>

      <p className="relative font-mono text-[0.6875rem] text-ink-muted">
        one-api · .NET 10 · SQL Server
      </p>
    </div>
  )
}
