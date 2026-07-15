import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { User, Mail, Lock, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { userApi } from '@/api/index'
import { Input } from '@/design-system'
import { getErrorMessage } from '@/utils/error'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string()
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
})

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()

  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    }
  })

  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { errors: passwordErrors } } = useForm({
    resolver: zodResolver(passwordSchema)
  })

  const profileMutation = useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (res) => {
      setUser(res.data)
      toast.success('Profile updated successfully!')
    },
    onError: (err) => toast.error(getErrorMessage(err))
  })

  const passwordMutation = useMutation({
    mutationFn: userApi.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully!')
      resetPassword()
    },
    onError: (err) => toast.error(getErrorMessage(err))
  })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">User Profile</h1>
        <p className="text-slate-500 text-sm">Manage your profile details and security settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="card space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-brand-400" /> Account Details
          </h2>
          <form onSubmit={handleSubmitProfile((d) => profileMutation.mutate(d))} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="John Doe"
              error={profileErrors.full_name?.message}
              leftIcon={<User className="w-4 h-4" />}
              {...registerProfile('full_name')}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              error={profileErrors.email?.message}
              leftIcon={<Mail className="w-4 h-4" />}
              disabled
              {...registerProfile('email')}
            />
            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {profileMutation.isPending ? 'Saving...' : 'Update Details'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" /> Security Settings
          </h2>
          <form onSubmit={handleSubmitPassword((d) => passwordMutation.mutate(d))} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              error={passwordErrors.current_password?.message}
              leftIcon={<Lock className="w-4 h-4" />}
              {...registerPassword('current_password')}
            />
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={passwordErrors.new_password?.message}
              leftIcon={<Lock className="w-4 h-4" />}
              {...registerPassword('new_password')}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              error={passwordErrors.confirm_password?.message}
              leftIcon={<Lock className="w-4 h-4" />}
              {...registerPassword('confirm_password')}
            />
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="btn-secondary w-full justify-center text-purple-400 hover:text-purple-300"
            >
              {passwordMutation.isPending ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
