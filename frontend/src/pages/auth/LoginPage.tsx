import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/utils/error'
import { Input } from '@/design-system'
import { OAuthButtons } from '@/components/auth'
import { loginSchema, type LoginFormData } from '@/lib/validations'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { setUser, setTokens } = useAuthStore()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      toast.error(`OAuth failed: ${decodeURIComponent(error)}`)
      navigate('/login', { replace: true })
    }
  }, [searchParams, navigate])

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      const { user, access_token, refresh_token } = res.data
      setUser(user)
      setTokens({ accessToken: access_token, refreshToken: refresh_token ?? '', expiresIn: 0 })
      toast.success(`Welcome back, ${user.full_name}!`)
      navigate(from, { replace: true })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
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
        transition={{ duration: 0.5 }}
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
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-2xl shadow-2xl">
          {/* OAuth Buttons */}
          <OAuthButtons
            onGoogle={handleGoogleLogin}
            onMicrosoft={handleMicrosoftLogin}
            loading={oauthLoading}
            mode="login"
          />

          {/* Divider */}
          <div className="divider-text mb-6">or continue with email</div>

          {/* Form */}
          <form onSubmit={handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
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
                placeholder="Enter your password"
                error={errors.password?.message}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                autoComplete="current-password"
                {...register('password')}
              />
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-brand-500" {...register('remember_me')} />
              <span className="text-sm text-slate-400">Remember me for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full justify-center btn-lg glow-brand-sm"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Create one free
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
