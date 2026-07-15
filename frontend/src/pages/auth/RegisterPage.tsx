import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/utils/error'
import { Input } from '@/design-system'
import { OAuthButtons, PasswordStrengthMeter } from '@/components/auth'
import { registerSchema, type RegisterFormData } from '@/lib/validations'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | null>(null)
  const navigate = useNavigate()
  const { setUser, setTokens } = useAuthStore()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const pw = watch('password') || ''

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      const { user, access_token } = res.data
      setUser(user)
      if (access_token) setTokens({ accessToken: access_token, refreshToken: '', expiresIn: 0 })
      toast.success('Account created! Please verify your email.')
      navigate('/verify-email')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleGoogleLogin = async () => {
    setOauthLoading('google')
    try {
      const res = await authApi.oauthGoogleUrl()
      window.location.href = res.data.url
    } catch {
      toast.error('Google login unavailable')
      setOauthLoading(null)
    }
  }

  const handleMicrosoftLogin = async () => {
    setOauthLoading('microsoft')
    try {
      const res = await authApi.oauthMicrosoftUrl()
      window.location.href = res.data.url
    } catch {
      toast.error('Microsoft login unavailable')
      setOauthLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 animated-gradient-bg">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/8 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center glow-brand-sm">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white font-display">
              Mail<span className="gradient-brand-text">Savior</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-slate-400 text-sm">Free to start — no credit card required</p>
        </div>

        <div className="glass-card p-8 rounded-2xl shadow-2xl">
          {/* OAuth Buttons */}
          <OAuthButtons
            onGoogle={handleGoogleLogin}
            onMicrosoft={handleMicrosoftLogin}
            loading={oauthLoading}
            mode="register"
          />

          <div className="divider-text mb-6">or register with email</div>

          <form onSubmit={handleSubmit((d) => registerMutation.mutate({
            full_name: d.full_name,
            email: d.email,
            password: d.password,
          }))} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="John Smith"
              error={errors.full_name?.message}
              leftIcon={<User className="w-4 h-4" />}
              autoComplete="name"
              {...register('full_name')}
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                error={errors.password?.message}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                autoComplete="new-password"
                {...register('password')}
              />
              <PasswordStrengthMeter password={pw} />
            </div>

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              error={errors.confirm_password?.message}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="new-password"
              {...register('confirm_password')}
            />

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 mt-0.5 accent-brand-500"
                {...register('terms')}
              />
              <span className="text-sm text-slate-400">
                I agree to the{' '}
                <Link to="/terms" className="text-brand-400 hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-brand-400 hover:underline">Privacy Policy</Link>
              </span>
            </label>
            {errors.terms && <p className="error-text -mt-2">{errors.terms.message}</p>}

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="btn-primary w-full justify-center btn-lg glow-brand-sm"
            >
              {registerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="grid grid-cols-2 gap-2">
              {['Free forever plan', '14-day Pro trial', 'No credit card', 'Cancel anytime'].map((b) => (
                <div key={b} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle className="w-3 h-3 text-accent-400 shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
