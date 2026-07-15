import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/utils/error'
import { Input } from '@/design-system'
import { PasswordStrengthMeter } from '@/components/auth'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormData,
  type ResetPasswordFormData,
} from '@/lib/validations'

// ─── Forgot Password ──────────────────────────────────────────────────────────
export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const mutation = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => setSent(true),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animated-gradient-bg">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 glow-brand-sm">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
          <p className="text-sm text-slate-400">Enter your email and we'll send a reset link</p>
        </div>

        <div className="glass-card p-8 rounded-2xl">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-accent-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-sm text-slate-400 mb-6">
                We sent a reset link to <span className="text-white font-medium">{getValues('email')}</span>.
                It expires in 1 hour.
              </p>
              <div className="space-y-3">
                <button onClick={() => setSent(false)} className="btn-ghost btn-sm w-full justify-center">
                  Try a different email
                </button>
                <button
                  onClick={() => {
                    mutation.mutate(getValues('email'))
                  }}
                  disabled={mutation.isPending}
                  className="btn-secondary btn-sm w-full justify-center"
                >
                  {mutation.isPending ? 'Resending...' : 'Resend email'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => mutation.mutate(d.email))} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                leftIcon={<Mail className="w-4 h-4" />}
                {...register('email')}
              />
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary w-full justify-center btn-lg"
              >
                {mutation.isPending ? 'Sending...' : <><ArrowRight className="w-4 h-4" /> Send Reset Link</>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link to="/login" className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

// ─── Reset Password ───────────────────────────────────────────────────────────
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [showPw, setShowPw] = useState(false)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const pw = watch('password') || ''

  const mutation = useMutation({
    mutationFn: (data: { password: string }) => authApi.resetPassword(token, data.password),
    onSuccess: () => {
      setSuccess(true)
      toast.success('Password reset successfully!')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 animated-gradient-bg">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-6 glow-brand">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Password reset successful</h1>
          <p className="text-slate-400 mb-8">Your password has been updated. You can now sign in with your new password.</p>
          <Link to="/login" className="btn-primary btn-lg inline-flex items-center gap-2">
            Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animated-gradient-bg">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 glow-brand-sm">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
          <p className="text-sm text-slate-400">Must be at least 8 characters with uppercase and numbers</p>
        </div>

        <div className="glass-card p-8 rounded-2xl">
          {!token ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-400 mb-4">Invalid or expired reset link.</p>
              <Link to="/forgot-password" className="btn-primary">
                Request new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
              <div>
                <Input
                  label="New Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password"
                  error={errors.password?.message}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button type="button" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  {...register('password')}
                />
                <PasswordStrengthMeter password={pw} />
              </div>
              <Input
                label="Confirm Password"
                type={showPw ? 'text' : 'password'}
                placeholder="Confirm password"
                error={errors.confirm_password?.message}
                leftIcon={<Lock className="w-4 h-4" />}
                {...register('confirm_password')}
              />
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary w-full justify-center btn-lg"
              >
                {mutation.isPending ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Email Verification ───────────────────────────────────────────────────────
export function EmailVerificationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const verifyMutation = useMutation({
    mutationFn: () => authApi.verifyEmail(token!),
    onSuccess: () => {
      setStatus('success')
      toast.success('Email verified successfully!')
      setTimeout(() => navigate('/dashboard'), 2000)
    },
    onError: (err) => {
      setStatus('error')
      toast.error(getErrorMessage(err))
    },
  })

  const resendMutation = useMutation({
    mutationFn: () => authApi.resendVerification(user?.email || ''),
    onSuccess: () => toast.success('Verification email sent!'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animated-gradient-bg">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        {/* Success State */}
        {status === 'success' ? (
          <>
            <div className="w-20 h-20 rounded-3xl bg-accent-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-accent-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Email verified!</h1>
            <p className="text-slate-400 mb-8">Your account is now active. Redirecting to dashboard...</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-6 glow-brand">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Verify your email</h1>
            <p className="text-slate-400 mb-8">
              {token
                ? "Click below to verify your email address and activate your account."
                : `We sent a verification link to ${user?.email || 'your email'}. Please check your inbox.`
              }
            </p>
          </>
        )}

        <div className="glass-card p-6 rounded-2xl space-y-3">
          {token && status !== 'success' && (
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="btn-primary w-full justify-center btn-lg"
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Verify Email Address'}
            </button>
          )}

          {status === 'error' && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              Verification failed. The link may have expired or already been used.
            </div>
          )}

          <button
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            className="btn-ghost w-full justify-center"
          >
            {resendMutation.isPending ? 'Sending...' : 'Resend verification email'}
          </button>

          <Link to="/login" className="block text-sm text-slate-500 hover:text-slate-300 transition-colors">
            Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
