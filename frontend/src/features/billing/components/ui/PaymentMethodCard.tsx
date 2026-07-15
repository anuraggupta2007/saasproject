import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Trash2, Star, CheckCircle, Building2, Wallet } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';
import type { PaymentMethod } from '../../types';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onRemove?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  className?: string;
}

function getMethodIcon(type: PaymentMethod['type']) {
  switch (type) {
    case 'card': return <CreditCard className="w-5 h-5" />;
    case 'paypal': return <Wallet className="w-5 h-5" />;
    case 'razorpay': return <Wallet className="w-5 h-5" />;
    case 'bank_transfer': return <Building2 className="w-5 h-5" />;
    default: return <CreditCard className="w-5 h-5" />;
  }
}

function getMethodLabel(method: PaymentMethod): string {
  switch (method.type) {
    case 'card':
      return `${method.card?.brand || 'Card'} •••• ${method.card?.last4 || '****'}`;
    case 'paypal':
      return `PayPal • ${method.paypal?.email || ''}`;
    case 'razorpay':
      return `Razorpay • ${method.razorpay?.vpa || ''}`;
    case 'bank_transfer':
      return `Bank •••• ${method.bankTransfer?.last4 || '****'}`;
    default:
      return 'Payment Method';
  }
}

function getMethodDetails(method: PaymentMethod): string {
  if (method.type === 'card' && method.card) {
    return `Expires ${method.card.expMonth.toString().padStart(2, '0')}/${method.card.expYear}`;
  }
  return '';
}

export const PaymentMethodCard = memo(
  forwardRef<HTMLDivElement, PaymentMethodCardProps>(
    ({ method, onRemove, onSetDefault, className }, ref) => {
      return (
        <motion.div ref={ref} className={className} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            variant="elevated"
            padding="md"
            className={cn(
              'relative overflow-hidden',
              method.isDefault && 'border-brand-500/30 ring-1 ring-brand-500/10'
            )}
          >
            {method.isDefault && (
              <div className="absolute top-3 right-3">
                <Badge variant="brand" size="sm">
                  <Star className="w-3 h-3 mr-1" /> Default
                </Badge>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                method.isDefault ? 'bg-brand-500/10 text-brand-400' : 'bg-white/5 text-slate-400'
              )}>
                {getMethodIcon(method.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{getMethodLabel(method)}</p>
                {getMethodDetails(method) && (
                  <p className="text-xs text-slate-500 mt-0.5">{getMethodDetails(method)}</p>
                )}
                {method.billingAddress && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {method.billingAddress.city}, {method.billingAddress.country}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!method.isDefault && onSetDefault && (
                  <Button variant="ghost" size="sm" onClick={() => onSetDefault(method.id)} leftIcon={<CheckCircle className="w-4 h-4" />}>
                    Set Default
                  </Button>
                )}
                {onRemove && (
                  <Button variant="ghost" size="sm" onClick={() => onRemove(method.id)} leftIcon={<Trash2 className="w-4 h-4" />} className="text-red-400 hover:text-red-300">
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      );
    }
  )
);

PaymentMethodCard.displayName = 'PaymentMethodCard';
