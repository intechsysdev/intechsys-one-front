import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const control =
  'w-full rounded-lg border border-line bg-inset px-3 text-sm text-ink placeholder:text-ink-muted/70 ' +
  'transition-[border-color,box-shadow] outline-none ' +
  'hover:border-line-strong focus:border-accent focus:ring-3 focus:ring-[var(--ring)] ' +
  'disabled:cursor-not-allowed disabled:opacity-55'

const invalid = 'border-critical focus:border-critical focus:ring-[oklch(0.6_0.2_25/0.3)]'

interface FieldShellProps {
  label?: string
  hint?: ReactNode
  error?: string
  required?: boolean
  htmlFor?: string
  className?: string
  children: ReactNode
  /** Contenido alineado a la derecha de la etiqueta (acciones, contadores). */
  action?: ReactNode
}

export function FieldShell({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
  action,
}: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || action) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-ink-soft">
              {label}
              {required && <span className="ml-0.5 text-critical">*</span>}
            </label>
          )}
          {action}
        </div>
      )}

      {children}

      {error ? (
        <p className="flex items-start gap-1.5 text-[0.78rem] text-critical">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && <p className="text-[0.78rem] leading-relaxed text-ink-muted">{hint}</p>
      )}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: ReactNode
  error?: string
  wrapperClassName?: string
  leading?: ReactNode
  trailing?: ReactNode
  action?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, wrapperClassName, leading, trailing, action, id, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      htmlFor={fieldId}
      className={wrapperClassName}
      action={action}
    >
      <div className="relative flex items-center">
        {leading && (
          <span className="pointer-events-none absolute left-3 text-ink-muted" aria-hidden>
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          className={cn(
            control,
            'h-9.5',
            leading && 'pl-9',
            trailing && 'pr-9',
            error && invalid,
            className,
          )}
          {...props}
        />
        {trailing && <span className="absolute right-2.5 flex items-center">{trailing}</span>}
      </div>
    </FieldShell>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: ReactNode
  error?: string
  wrapperClassName?: string
  action?: ReactNode
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, wrapperClassName, action, id, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      htmlFor={fieldId}
      className={wrapperClassName}
      action={action}
    >
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(control, 'resize-y py-2 leading-relaxed', error && invalid, className)}
        {...props}
      />
    </FieldShell>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: ReactNode
  error?: string
  wrapperClassName?: string
  action?: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, wrapperClassName, action, id, children, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      htmlFor={fieldId}
      className={wrapperClassName}
      action={action}
    >
      <select
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(
          control,
          'h-9.5 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.625rem_center] bg-no-repeat pr-9',
          error && invalid,
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
})

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3',
        disabled && 'cursor-not-allowed opacity-55',
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5.5 w-9.5 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-inset',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4.5' : 'translate-x-0.5',
          )}
        />
      </button>

      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && <span className="text-sm font-medium text-ink">{label}</span>}
          {description && (
            <span className="text-[0.78rem] leading-relaxed text-ink-muted">{description}</span>
          )}
        </span>
      )}
    </label>
  )
}
