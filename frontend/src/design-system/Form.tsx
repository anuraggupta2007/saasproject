import {
  useForm,
  FormProvider,
  useFormContext as useRHFContext,
  type UseFormReturn,
  type FieldValues,
  type SubmitHandler,
  type FieldError,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ZodSchema } from 'zod'
import { createContext, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface FormProps<T extends FieldValues> {
  schema: ZodSchema<T>
  onSubmit: SubmitHandler<T>
  children: (methods: UseFormReturn<T>) => ReactNode
  defaultValues?: Partial<T>
  className?: string
  id?: string
}

export function Form<T extends FieldValues>({
  schema,
  onSubmit,
  children,
  defaultValues,
  className,
  id,
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: zodResolver(schema as any) as any,
    defaultValues: defaultValues as any,
  })

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        onSubmit={methods.handleSubmit(onSubmit as any)}
        className={className}
        noValidate
      >
        {children(methods as UseFormReturn<T>)}
      </form>
    </FormProvider>
  )
}

// FormContext for child components
interface FormContextValue {
  name: string
  label?: string
  hint?: string
  required?: boolean
}

const FormFieldContext = createContext<FormContextValue | null>(null)

interface FormFieldProps {
  name: string
  label?: string
  hint?: string
  required?: boolean
  children: (props: { field: any; error?: string }) => ReactNode
}

export function FormField({ name, label, hint, required, children }: FormFieldProps) {
  const contextValue: FormContextValue = { name, label, hint, required }

  return (
    <FormFieldContext.Provider value={contextValue}>
      <FormFieldInner name={name} label={label} hint={hint} required={required}>
        {children}
      </FormFieldInner>
    </FormFieldContext.Provider>
  )
}

function FormFieldInner({
  name,
  label,
  hint,
  required,
  children,
}: FormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = getNestedError(errors, name)

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}
      {children({ field: register(name), error: error?.message })}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  )
}

interface FormErrorProps {
  name: string
}

export function FormError({ name }: FormErrorProps) {
  const {
    formState: { errors },
  } = useFormContext()

  const error = getNestedError(errors, name)
  if (!error) return null

  return <p className="text-xs text-destructive">{error.message}</p>
}

interface FormSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  children: ReactNode
}

export function FormSubmit({
  loading = false,
  disabled,
  className,
  children,
  ...props
}: FormSubmitProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'transition-colors',
        className
      )}
      {...props}
    >
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}

// Helpers
function useFormContext() {
  try {
    return useRHFContext()
  } catch {
    throw new Error('Form components must be used within a <Form> component')
  }
}

function getNestedError(errors: any, name: string): FieldError | undefined {
  return name.split('.').reduce((obj, key) => obj?.[key], errors)
}
