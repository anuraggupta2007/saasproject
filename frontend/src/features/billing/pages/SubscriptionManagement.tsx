import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CreditCard } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { SubscriptionCard } from '../components/ui/SubscriptionCard';
import { PricingCard } from '../components/ui/PricingCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useCurrentSubscription, usePlans, useCancelSubscription, useResumeSubscription } from '../hooks';
import { toast } from 'react-hot-toast';
import type { PlanInterval } from '../types';

export const SubscriptionManagement = memo(() => {
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useCurrentSubscription();
  const { data: plans } = usePlans();
  const cancelSubscription = useCancelSubscription();
  const resumeSubscription = useResumeSubscription();

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      cancelSubscription.mutate(true, {
        onSuccess: () => toast.success('Subscription will cancel at period end'),
        onError: () => toast.error('Failed to cancel subscription'),
      });
    }
  };

  const handleResume = () => {
    resumeSubscription.mutate(undefined, {
      onSuccess: () => toast.success('Subscription resumed'),
      onError: () => toast.error('Failed to resume subscription'),
    });
  };

  const handleUpgrade = (planId: string) => {
    navigate(`/dashboard/billing/checkout?plan=${planId}&interval=${subscription?.interval || 'monthly'}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/billing')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
          <p className="text-slate-400 mt-1">Manage your current plan and billing</p>
        </div>
      </div>

      {subscription ? (
        <SubscriptionCard
          subscription={subscription}
          onUpgrade={() => {
            const nextTier = plans?.find(p => {
              const tiers = ['free', 'personal', 'professional', 'business'];
              const currentIdx = tiers.findIndex(t => subscription.planName.toLowerCase().includes(t));
              return tiers.indexOf(p.tier) === currentIdx + 1;
            });
            if (nextTier) handleUpgrade(nextTier.id);
            else navigate('/dashboard/billing/pricing');
          }}
          onCancel={handleCancel}
          onResume={handleResume}
        />
      ) : (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">No active subscription</p>
          <Button variant="brand" onClick={() => navigate('/dashboard/billing/pricing')} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Browse Plans
          </Button>
        </div>
      )}

      {plans && plans.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.filter(p => p.tier !== 'enterprise').map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                interval={subscription?.interval || 'monthly'}
                isCurrentPlan={subscription?.planId === plan.id}
                onSelect={handleUpgrade}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SubscriptionManagement.displayName = 'SubscriptionManagement';

export default SubscriptionManagement;
