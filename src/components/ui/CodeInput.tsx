import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { useAnimate, useReducedMotion } from 'motion/react'
import { FieldShell } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

interface CodeInputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  /** Se llama cuando se completan los dígitos (al escribir o pegar el código). */
  onComplete?: (value: string) => void
  length?: number
  error?: string
  /** En rojo sin mensaje propio, cuando el error ya se muestra en otra parte del formulario. */
  invalid?: boolean
  hint?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

/**
 * Código de verificación en recuadros, uno por dígito. Por debajo es un solo input: así siguen
 * funcionando el autocompletado del teléfono y del gestor de contraseñas, pegar el código entero
 * y los lectores de pantalla. Los recuadros solo lo dibujan.
 */
export const CodeInput = forwardRef<HTMLInputElement, CodeInputProps>(function CodeInput(
  { label, value, onChange, onComplete, length = 6, error, invalid, hint, disabled, autoFocus, className },
  ref,
) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => input.current!, [])

  const [focused, setFocused] = useState(false)
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduceMotion = useReducedMotion()

  const wrong = Boolean(error) || Boolean(invalid)

  // Un código rechazado sacude los recuadros.
  useEffect(() => {
    if (wrong && scope.current && !reduceMotion)
      void animate(scope.current, { x: [0, -8, 8, -5, 5, -2, 0] }, { duration: 0.4, ease: 'easeOut' })
  }, [wrong, error, animate, scope, reduceMotion])

  const digits = value.slice(0, length)
  const active = Math.min(digits.length, length - 1)
  const half = length % 2 === 0 ? length / 2 : -1

  // El cursor siempre al final: se escribe y se borra de a un dígito, como en los recuadros.
  const toEnd = () => {
    const el = input.current
    if (el) requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length))
  }

  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <div
        ref={scope}
        className={cn('relative flex items-center gap-2', disabled && 'opacity-55')}
        onClick={() => input.current?.focus()}
      >
        {Array.from({ length }, (_, i) => {
          const digit = digits[i]
          const isActive = focused && i === active && !disabled
          return (
            <div key={i} className="contents">
              {i === half && <span className="h-0.5 w-2.5 shrink-0 rounded-full bg-line-strong" aria-hidden />}
              <div
                aria-hidden
                className={cn(
                  'relative flex h-13 min-w-0 flex-1 items-center justify-center rounded-xl border bg-inset',
                  'text-[1.375rem] font-semibold text-ink tabular-nums',
                  'transition-[border-color,box-shadow,background-color,transform] duration-150',
                  digit ? 'border-line-strong bg-raised' : 'border-line',
                  isActive && 'border-accent ring-3 ring-[var(--ring)]',
                  wrong && 'border-critical',
                  wrong && isActive && 'ring-[rgb(117_19_38/0.25)]',
                  digit && 'animate-[otp-pop_160ms_ease-out]',
                )}
              >
                {digit ?? (isActive && <span className="otp-caret h-6 w-0.5 rounded-full bg-accent" />)}
              </div>
            </div>
          )
        })}

        <input
          ref={input}
          id={id}
          value={digits}
          // Mientras se verifica, solo lectura y no disabled: así no pierde el foco y, si el código
          // no sirve, se puede escribir el siguiente de una vez.
          readOnly={disabled}
          aria-busy={disabled || undefined}
          autoFocus={autoFocus}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern={`\\d{${length}}`}
          maxLength={length}
          aria-invalid={wrong || undefined}
          spellCheck={false}
          className="absolute inset-0 size-full cursor-text appearance-none border-0 bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
          style={{ letterSpacing: '-1em', fontSize: 1 }}
          onFocus={() => {
            setFocused(true)
            toEnd()
          }}
          onBlur={() => setFocused(false)}
          onClick={toEnd}
          onKeyUp={toEnd}
          onChange={(event) => {
            // Pegar "123 456" o "123-456" también sirve: solo cuentan los dígitos.
            const next = event.target.value.replace(/\D/g, '').slice(0, length)
            onChange(next)
            if (next.length === length && next !== digits) onComplete?.(next)
          }}
        />
      </div>
    </FieldShell>
  )
})
