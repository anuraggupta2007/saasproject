import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Plan } from '../../types';

interface FeatureComparisonTableProps {
  plans: Plan[];
  className?: string;
}

export const FeatureComparisonTable = memo(
  forwardRef<HTMLDivElement, FeatureComparisonTableProps>(
    ({ plans, className }, ref) => {
      const allFeatureNames = Array.from(
        new Set(plans.flatMap((p) => p.features.map((f) => f.name)))
      );

      return (
        <div ref={ref} className={cn('overflow-x-auto', className)}>
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300 sticky left-0 bg-surface-900 z-10">
                  Feature
                </th>
                {plans.map((plan) => (
                  <th key={plan.id} className="px-4 py-3 text-center text-sm font-semibold text-white min-w-[140px]">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allFeatureNames.map((featureName) => (
                <tr key={featureName} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-sm text-slate-300 sticky left-0 bg-surface-900 z-10">
                    {featureName}
                  </td>
                  {plans.map((plan) => {
                    const feature = plan.features.find((f) => f.name === featureName);
                    return (
                      <td key={plan.id} className="px-4 py-3 text-center">
                        {feature ? (
                          feature.included ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <Check className="w-5 h-5 text-emerald-400" />
                              {feature.limit !== undefined && (
                                <span className="text-xs text-slate-400">{feature.limit.toLocaleString()} {feature.unit || ''}</span>
                              )}
                            </div>
                          ) : (
                            <X className="w-5 h-5 text-slate-600 mx-auto" />
                          )
                        ) : (
                          <Minus className="w-5 h-5 text-slate-700 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  )
);

FeatureComparisonTable.displayName = 'FeatureComparisonTable';
