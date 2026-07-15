import { memo, forwardRef } from 'react';
import { AlertTriangle, RefreshCw, Wifi, Shield, Lock, Mail } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';

interface ErrorStateProps {
  type: 'profile_update_failed' | 'invalid_password' | '2fa_setup_failed' | 'api_key_failed' | 'email_verification' | 'network_error' | 'permission_denied';
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const errorConfig: Record<ErrorStateProps['type'], { icon: React.ReactNode; title: string; description: string; color: string }> = {
  profile_update_failed: { icon: <AlertTriangle className="w-8 h-8" />, title: 'Update Failed', description: 'Failed to update your profile. Please try again.', color: 'text-red-400' },
  invalid_password: { icon: <Lock className="w-8 h-8" />, title: 'Invalid Password', description: 'The password you entered is incorrect.', color: 'text-red-400' },
  '2fa_setup_failed': { icon: <Shield className="w-8 h-8" />, title: '2FA Setup Failed', description: 'Failed to set up two-factor authentication.', color: 'text-red-400' },
  api_key_failed: { icon: <Shield className="w-8 h-8" />, title: 'API Key Error', description: 'Failed to create or manage API key.', color: 'text-red-400' },
  email_verification: { icon: <Mail className="w-8 h-8" />, title: 'Email Verification Required', description: 'Please verify your email address to continue.', color: 'text-amber-400' },
  network_error: { icon: <Wifi className="w-8 h-8" />, title: 'Network Error', description: 'Unable to connect to the server. Check your connection.', color: 'text-slate-400' },
  permission_denied: { icon: <Shield className="w-8 h-8" />, title: 'Permission Denied', description: 'You do not have permission to perform this action.', color: 'text-red-400' },
};

export const ErrorState = memo(
  forwardRef<HTMLDivElement, ErrorStateProps>(
    ({ type, message, onRetry, className }, ref) => {
      const config = errorConfig[type];
      return (
        <div ref={ref} className={cn('text-center py-12', className)}>
          <div className={cn('w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4', config.color)}>
            {config.icon}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{config.title}</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-2">{message || config.description}</p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />} className="mt-4">
              Try Again
            </Button>
          )}
        </div>
      );
    }
  )
);

ErrorState.displayName = 'ErrorState';
