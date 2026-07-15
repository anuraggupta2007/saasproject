import { memo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CreditCard, CheckCircle, Lock, Shield,
  Tag, ChevronRight, Loader2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Input } from '@/features/backup/components/ui/Input';
import { CouponInput } from '../components/ui/CouponInput';
import { usePlan, usePaymentMethods, useCreateCheckout, useConfirmCheckout, useValidateCoupon } from '../hooks';
import { useBillingStore } from '../store';
import { toast } from 'react-hot-toast';
import type { CouponValidation, PlanInterval } from '../types';

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

const steps = [
  { id: 'payment', label: 'Payment Method' },
  { id: 'review', label: 'Review Order' },
  { id: 'complete', label: 'Confirmation' },
];

export const Checkout = memo(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan') || '';
  const intervalParam = (searchParams.get('interval') || 'monthly') as PlanInterval;

  const { checkout, setPaymentMethod, setCouponValidation, setCheckoutStep } = useBillingStore();
  const [currentStep, setCurrentStep] = useState<'payment' | 'review' | 'complete'>('payment');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [couponValidation, setLocalCouponValidation] = useState<CouponValidation | null>(null);

  const { data: plan, isLoading: planLoading } = usePlan(planId);
  const { data: paymentMethods } = usePaymentMethods();
  const createCheckout = useCreateCheckout();
  const confirmCheckout = useConfirmCheckout('');

  const price = plan?.prices[intervalParam];
  const discount = couponValidation?.discount || 0;
  const subtotal = price?.amount || 0;
  const tax = (subtotal - discount) * 0.1;
  const total = subtotal - discount + tax;

  const handlePaymentSelect = useCallback((id: string) => {
    setSelectedPaymentMethod(id);
  }, []);

  const handleCouponApply = useCallback((validation: CouponValidation) => {
    setLocalCouponValidation(validation);
  }, []);

  const handleProceedToReview = () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    setPaymentMethod(selectedPaymentMethod);
    setCurrentStep('review');
  };

  const handlePlaceOrder = async () => {
    try {
      const session = await createCheckout.mutateAsync({
        planId,
        interval: intervalParam,
        couponCode: couponValidation?.coupon?.code || '',
        paymentMethodId: selectedPaymentMethod,
        billingAddress: {
          name: '',
          line1: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US',
        },
      });
      setCurrentStep('complete');
      toast.success('Payment processed successfully!');
    } catch {
      toast.error('Payment failed. Please try again.');
    }
  };

  if (planLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        <div className="text-center py-12">
          <p className="text-slate-400">Plan not found</p>
          <Button variant="brand" className="mt-4" onClick={() => navigate('/dashboard/billing/pricing')}>Browse Plans</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
          <p className="text-slate-400 mt-1">Complete your purchase</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 ${i <= steps.findIndex(s => s.id === currentStep) ? 'text-brand-400' : 'text-slate-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < steps.findIndex(s => s.id === currentStep) ? 'bg-brand-500 text-white' :
                i === steps.findIndex(s => s.id === currentStep) ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' :
                'bg-white/5 text-slate-500'
              }`}>
                {i < steps.findIndex(s => s.id === currentStep) ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-sm hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600 mx-2" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 'payment' && (
            <Card variant="elevated" padding="lg">
              <CardHeader title="Select Payment Method" />
              <CardContent className="space-y-3">
                {paymentMethods && paymentMethods.length > 0 ? (
                  paymentMethods.map((method) => (
                    <motion.div
                      key={method.id}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-brand-500/50 bg-brand-500/5'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                      onClick={() => handlePaymentSelect(method.id)}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {method.type === 'card' ? `${method.card?.brand} •••• ${method.card?.last4}` :
                             method.type === 'paypal' ? `PayPal • ${method.paypal?.email}` :
                             method.type}
                          </p>
                          {method.card && (
                            <p className="text-xs text-slate-500">Expires {method.card.expMonth}/{method.card.expYear}</p>
                          )}
                        </div>
                        {method.isDefault && <Badge variant="brand" size="sm">Default</Badge>}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPaymentMethod === method.id ? 'border-brand-500' : 'border-white/20'
                        }`}>
                          {selectedPaymentMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">No payment methods on file</p>
                    <Button variant="outline" onClick={() => navigate('/dashboard/billing/payment-methods')}>
                      Add Payment Method
                    </Button>
                  </div>
                )}
                <Button variant="brand" fullWidth size="lg" onClick={handleProceedToReview} disabled={!selectedPaymentMethod}>
                  Continue to Review
                </Button>
              </CardContent>
            </Card>
          )}

          {currentStep === 'review' && (
            <Card variant="elevated" padding="lg">
              <CardHeader title="Review Your Order" />
              <CardContent className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{plan.name}</p>
                      <p className="text-sm text-slate-400 capitalize">{intervalParam} billing</p>
                    </div>
                    <p className="text-lg font-bold text-white">{price ? formatPrice(price.amount) : 'Custom'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep('payment')}>Back</Button>
                  <Button variant="brand" fullWidth size="lg" onClick={handlePlaceOrder} loading={createCheckout.isPending} leftIcon={<Lock className="w-4 h-4" />}>
                    Pay {formatPrice(total)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'complete' && (
            <Card variant="elevated" padding="lg">
              <CardContent className="text-center py-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                  <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
                <p className="text-slate-400 mb-6">Your subscription is now active. Thank you for your purchase.</p>
                <div className="flex justify-center gap-3">
                  <Button variant="brand" onClick={() => navigate('/dashboard/billing')}>
                    Go to Billing Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card variant="elevated" padding="lg" className="sticky top-6">
            <CardHeader title="Order Summary" />
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Plan</span>
                <span className="text-white font-medium">{plan.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Billing</span>
                <span className="text-white capitalize">{intervalParam}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white">{price ? formatPrice(price.amount) : '—'}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-400">Discount</span>
                  <span className="text-emerald-400">-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Tax (10%)</span>
                <span className="text-white">{formatPrice(tax)}</span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="text-xl font-bold text-white">{formatPrice(total)}</span>
              </div>

              {currentStep === 'payment' && (
                <CouponInput
                  planId={planId}
                  interval={intervalParam}
                  onApply={handleCouponApply}
                  appliedCoupon={couponValidation}
                />
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
                <Shield className="w-4 h-4" />
                <span>Secured by 256-bit SSL encryption</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

Checkout.displayName = 'Checkout';

export default Checkout;
