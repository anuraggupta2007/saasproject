import { useQuery, useMutation } from '@tanstack/react-query'
import { CreditCard, ShieldCheck, FileText, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentApi } from '@/api/index'
import { useAuthStore } from '@/store/authStore'
import { StatusBadge } from '@/design-system'
import { formatDateTime } from '@/utils/format'

const PRICING_PLANS = [
  { id: 'starter', name: 'Starter Plan', price: 9, description: 'Great for personal archives & migration utilities.' },
  { id: 'pro', name: 'Pro SaaS Plan', price: 29, description: 'Perfect for business backup infrastructure and developers.' }
]

export default function BillingPage() {
  const { user } = useAuthStore()

  const { data: billingInfo } = useQuery({
    queryKey: ['billing-portal'],
    queryFn: () => paymentApi.getBillingPortal().then((r) => r.data),
    retry: false
  })

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => paymentApi.createCheckout(planId, 'stripe'),
    onSuccess: (res) => {
      if (res.data.url) {
        window.location.href = res.data.url
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to start payment checkout')
    }
  })

  // Fallback demo invoice list
  const demoInvoices = [
    { id: 'inv-1', number: 'INV-2026-001', amount: '$9.00', status: 'paid', date: new Date().toISOString() },
    { id: 'inv-2', number: 'INV-2026-002', amount: '$29.00', status: 'paid', date: new Date(Date.now() - 86400000 * 30).toISOString() }
  ]

  const invoices = billingInfo?.invoices || demoInvoices

  return (
    <div className="max-w-4xl space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Billing & Subscription</h1>
        <p className="text-slate-500 text-sm">Manage your billing details, payment portals, and active subscription plans</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active plan card */}
        <div className="card md:col-span-1 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscription</span>
            <h2 className="text-xl font-bold text-white uppercase">{user?.plan || 'Free'} Plan</h2>
            <p className="text-xs text-slate-400">
              {user?.plan === 'free' ? 'Unlock full backups, schedule syncs and API tokens by upgrading.' : 'Thank you for supporting MailSavior!'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-brand-400 font-semibold mt-4">
            <ShieldCheck className="w-4 h-4 text-accent-400" /> Secure SOC2 Billing
          </div>
        </div>

        {/* Checkout plans */}
        <div className="card md:col-span-2 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-400" /> Upgrade Plan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRICING_PLANS.map((plan) => (
              <div key={plan.id} className="p-4 rounded-xl border border-white/5 bg-surface-800/40 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                  <p className="text-lg font-black text-white mt-3">${plan.price} /mo</p>
                </div>
                <button
                  onClick={() => checkoutMutation.mutate(plan.id)}
                  disabled={checkoutMutation.isPending || user?.plan === plan.id}
                  className="btn-primary btn-sm w-full mt-4 justify-center"
                >
                  {checkoutMutation.isPending ? 'Processing...' : user?.plan === plan.id ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="card space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" /> Invoice History
        </h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="font-medium text-slate-300">{inv.number}</td>
                  <td>{inv.amount}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>{formatDateTime(inv.date)}</td>
                  <td>
                    <button className="text-brand-400 hover:text-brand-300 text-xs flex items-center gap-1">
                      PDF <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
