import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Zap } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { PricingCard } from '../components/ui/PricingCard';
import { FeatureComparisonTable } from '../components/ui/FeatureComparisonTable';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { usePlans, useCurrentSubscription } from '../hooks';
import { useBillingStore } from '../store';
import type { PlanInterval } from '../types';

export const PricingPage = memo(() => {
  const navigate = useNavigate();
  const { data: plans, isLoading } = usePlans();
  const { data: subscription } = useCurrentSubscription();
  const { ui, setBillingCycle } = useBillingStore();
  const [interval, setInterval] = useState<PlanInterval>(ui.billingCycle);

  const handleSelectPlan = (planId: string) => {
    navigate(`/dashboard/billing/checkout?plan=${planId}&interval=${interval}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <SkeletonLoader count={3} variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-3">Choose Your Plan</h1>
        <p className="text-slate-400">
          Select the plan that fits your needs. Upgrade or downgrade anytime.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 p-1 bg-white/5 rounded-xl w-fit mx-auto">
        {(['monthly', 'yearly'] as PlanInterval[]).map((int) => (
          <button
            key={int}
            onClick={() => { setInterval(int); setBillingCycle(int); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              interval === int
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {int === 'monthly' ? 'Monthly' : 'Yearly'}
            {int === 'yearly' && <span className="ml-2 text-xs text-emerald-400">Save 20%</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans?.filter(p => p.tier !== 'enterprise').map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            interval={interval}
            isCurrentPlan={subscription?.planId === plan.id}
            onSelect={handleSelectPlan}
          />
        ))}
        {plans?.find(p => p.tier === 'enterprise') && (
          <PricingCard
            plan={plans.find(p => p.tier === 'enterprise')!}
            interval={interval}
            isCurrentPlan={subscription?.planId === plans.find(p => p.tier === 'enterprise')?.id}
            onSelect={() => window.open('mailto:sales@mailsavior.com', '_blank')}
          />
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Feature Comparison</h2>
        <Card variant="elevated" padding="lg">
          <FeatureComparisonTable plans={plans || []} />
        </Card>
      </div>
    </div>
  );
});

PricingPage.displayName = 'PricingPage';

export default PricingPage;
