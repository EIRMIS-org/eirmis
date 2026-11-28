import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from 'cn'
import * as React from 'react'
import type { FieldError } from 'react-hook-form'

interface ControlAccessibilityProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid': boolean
  required?: boolean
}

interface RowProps {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
  error?: FieldError | string
  containerClassName?: string
  required?: boolean
  'aria-describedby'?: string
}

type InputProps = Omit<React.ComponentProps<typeof Input>, keyof RowProps | 'aria-invalid'>

// A custom renderer owns its control's registration, value, and event props.
export type FormRowProps = RowProps & (
  | (InputProps & { renderControl?: never })
  | ({ renderControl: (props: ControlAccessibilityProps) => React.ReactNode } &
      { [K in keyof InputProps]?: never })
)

export function FormRow({
  id,
  label,
  description,
  error,
  containerClassName,
  renderControl,
  className,
  required,
  'aria-describedby': ariaDescribedBy,
  ...inputProps
}: FormRowProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message
  const descriptionId = description === undefined ? undefined : `${id}-description`
  const errorId = errorMessage === undefined ? undefined : `${id}-error`
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(' ') || undefined
  const accessibilityProps: ControlAccessibilityProps = {
    id,
    'aria-invalid': errorMessage !== undefined,
    'aria-describedby': describedBy,
    required,
  }

  return (
    <div className={cn('grid gap-1.5', containerClassName)} data-slot="form-row">
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true" className="text-destructive">*</span>}
      </Label>

      {renderControl ? (
        renderControl(accessibilityProps)
      ) : (
        <Input
          {...inputProps}
          {...accessibilityProps}
          className={className}
        />
      )}

      {description !== undefined && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}

      {errorMessage !== undefined && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
