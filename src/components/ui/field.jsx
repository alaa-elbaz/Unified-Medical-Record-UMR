import { Label } from './label.jsx'
import { Separator } from './separator.jsx'
import { cn } from '@/lib/utils.js'
import { useMemo } from 'react'

export function FieldSet({ className, ...props }) {
  return <fieldset data-slot="field-set" className={cn('flex flex-col gap-6', className)} {...props} />
}

export function FieldGroup({ className, ...props }) {
  return (
    <div
      data-slot="field-group"
      className={cn('group/field-group flex w-full flex-col gap-7 [&>[data-slot=field-group]]:gap-4', className)}
      {...props}
    />
  )
}

export function Field({ className, orientation = 'vertical', ...props }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        'group/field flex w-full gap-3',
        orientation === 'vertical' && 'flex-col [&>*]:w-full',
        orientation === 'horizontal' && 'flex-row items-center',
        className
      )}
      {...props}
    />
  )
}

export function FieldLabel({ className, ...props }) {
  return (
    <Label
      data-slot="field-label"
      className={cn('peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50', className)}
      {...props}
    />
  )
}

export function FieldDescription({ className, ...props }) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-muted-foreground text-sm leading-normal font-normal', className)}
      {...props}
    />
  )
}

export function FieldError({ className, children, errors, ...props }) {
  const content = useMemo(() => {
    if (children) return children
    if (!errors) return null
    if (errors.length === 1 && errors[0]?.message) return errors[0].message
    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {errors.map((error, i) => error?.message && <li key={i}>{error.message}</li>)}
      </ul>
    )
  }, [children, errors])

  if (!content) return null
  return (
    <div role="alert" data-slot="field-error" className={cn('text-destructive text-sm font-normal', className)} {...props}>
      {content}
    </div>
  )
}

export function FieldContent({ className, ...props }) {
  return <div data-slot="field-content" className={cn('group/field-content flex flex-1 flex-col gap-1.5 leading-snug', className)} {...props} />
}
