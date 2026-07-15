import { passwordStrength, passwordRequirements } from '@/lib/validations'

interface PasswordStrengthMeterProps {
  password: string
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null

  const { score, label, color } = passwordStrength(password)

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bars */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: s <= score ? color : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>

      {/* Strength label */}
      <p className="text-xs font-medium" style={{ color }}>
        {label}
      </p>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-1">
        {passwordRequirements.map((req) => {
          const met = req.test(password)
          return (
            <div
              key={req.label}
              className={`flex items-center gap-1.5 text-xs ${
                met ? 'text-accent-400' : 'text-slate-600'
              }`}
            >
              <div
                className={`w-1 h-1 rounded-full ${
                  met ? 'bg-accent-400' : 'bg-slate-600'
                }`}
              />
              {req.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
