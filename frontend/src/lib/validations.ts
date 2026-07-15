import { z } from 'zod';

// ============================================================
// Password Validation Helpers
// ============================================================

export const passwordRequirements = [
  { id: 'min-length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'One special character', test: (p: string) => /[!@#$%^&*()_+\-=\x5B\]{};':"\\|,.<>/]/.test(p) },
] as const;

export function passwordStrength(password: string): { score: number; label: string; color: string } {
  const passed = passwordRequirements.filter((r) => r.test(password)).length;

  const levels = [
    { score: 0, label: 'Very weak', color: 'text-red-500' },
    { score: 1, label: 'Weak', color: 'text-red-400' },
    { score: 2, label: 'Fair', color: 'text-yellow-500' },
    { score: 3, label: 'Good', color: 'text-blue-500' },
    { score: 4, label: 'Strong', color: 'text-green-500' },
    { score: 5, label: 'Very strong', color: 'text-green-600' },
  ];

  return levels[passed] ?? levels[0];
}

// ============================================================
// Shared Zod Refinements
// ============================================================

const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=\x5B\]{};':"\\|,.<>/]/,
    'Password must contain at least one special character',
  );

// ============================================================
// 1. Login
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ============================================================
// 2. Register
// ============================================================

export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: passwordValidation,
    confirm_password: z.string(),
    terms: z.literal(true, {
      message: 'You must accept the terms and conditions',
    }),
    newsletter: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================================
// 3. Forgot Password
// ============================================================

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ============================================================
// 4. Reset Password
// ============================================================

export const resetPasswordSchema = z
  .object({
    password: passwordValidation,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ============================================================
// 5. Change Password
// ============================================================

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: passwordValidation,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: 'New password must be different from current password',
    path: ['new_password'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ============================================================
// 6. Profile
// ============================================================

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
