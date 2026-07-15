import { memo, forwardRef } from 'react';
import { AlertTriangle, RefreshCw, Wifi, CreditCard, Shield, Key, FileText } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';

interface ErrorStateProps {
  type: 'payment_failed' | 'invalid_coupon' | 'license_activation_failed' | 'expired_license' | 'insufficient_permissions' | 'network_error' | 'billing_unavailable';
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const errorConfig: Record<ErrorStateProps['type'], { icon: React.ReactNode; title: string; description: string; color: string }> = {
  payment_failed: {
    icon: <CreditCard className="w-8 h-8" />,
    title: 'Payment Failed',
    description: 'Your payment could not be processed. Please check your payment method and try again.',
    color: 'text-red-400',
  },
  invalid_coupon: {
    icon: <FileText className="w-8 h-8" />,
    title: 'Invalid Coupon',
    description: 'The coupon code you entered is invalid or has expired.',
    color: 'text-amber-400',
  },
  license_activation_failed: {
    icon: <Key className="w-8 h-8" />,
    title: 'License Activation Failed',
    description: 'Unable to activate the license key. Please verify the key and try again.',
    color: 'text-red-400',
  },
  expired_license: {
    icon: <Shield className="w-8 h-8" />,
    title: 'License Expired',
    description: 'Your license has expired. Please renew or purchase a new license.',
    color: 'text-amber-400',
  },
  insufficient_permissions: {
    icon: <Shield className="w-8 h-8" />,
    title: 'Insufficient Permissions',
    description: 'You do not have permission to perform this action.',
    color: 'text-red-400',
  },
  network_error: {
    icon: <Wifi className="w-8 h-8" />,
    title: 'Network Error',
    description: 'Unable to connect to the server. Please check your connection and try again.',
    color: 'text-slate-400',
  },
  billing_unavailable: {
    icon: <AlertTriangle className="w-8 h-8" />,
    title: 'Billing Service Unavailable',
    description: 'The billing service is temporarily unavailable. Please try again later.',
    color: 'text-slate-400',
  },
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
