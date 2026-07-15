import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Check, ArrowRight, Zap, Shield, Building2,
  ChevronDown, Star, Mail, Cloud, Lock, Clock, X,
} from 'lucide-react'
import { useState } from 'react'
import { SEO } from '@/components/seo'

type BillingCycle = 'monthly' | 'lifetime'

const plans = [
  {
    id: 'free-trial',
    name: 'Free Trial',
    price: { monthly: 0, lifetime: 0 },
    description: 'Try everything risk-free for 14 days. No credit card required.',
    icon: Zap,
    color: '#64748b',
    features: [
      '1 email account',
      '1 GB backup storage',
      '100 emails per conversion',
      'MBOX & EML export',
      'Manual backup only',
      'Community support',
    ],
    missing: ['PST export', 'Auto scheduling', 'Priority support', 'API access'],
    cta: 'Start Free Trial',
    href: '/register',
  },
  {
    id: 'personal',
    name: 'Personal',
    price: { monthly: 9, lifetime: 149 },
    description: 'Perfect for individuals managing personal email accounts.',
    icon: Mail,
    color: '#08619d',
    features: [
      '3 email accounts',
      '25 GB backup storage',
      'Unlimited conversions',
      'All format exports (PST, MBOX, EML, MSG)',
      'Weekly scheduled backup',
      'Email support',
      'AES-256 encryption',
    ],
    missing: ['Custom schedule', 'Priority support', 'API access', 'Webhook notifications'],
    cta: 'Get Personal',
    href: '/register?plan=personal',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: { monthly: 29, lifetime: 449 },
    description: 'For freelancers and professionals who need reliable backups.',
    icon: Shield,
    color: '#009688',
    popular: true,
    features: [
      '10 email accounts',
      '100 GB backup storage',
      'Unlimited conversions',
      'All format exports',
      'Custom scheduling (daily/hourly)',
      'Incremental backups',
      'Priority email support',
      'API access (10,000 calls/day)',
      'Webhook notifications',
    ],
    missing: [],
    cta: 'Get Professional',
    href: '/register?plan=professional',
  },
  {
    id: 'business',
    name: 'Business',
    price: { monthly: 79, lifetime: 1199 },
    description: 'For growing teams that need advanced collaboration features.',
    icon: Building2,
    color: '#f59e0b',
    features: [
      '50 email accounts',
      '500 GB backup storage',
      'Unlimited conversions',
      'All format exports',
      'Custom scheduling (any interval)',
      'Incremental backups',
      'Priority phone support',
      'API access (50,000 calls/day)',
      'Webhook & Slack notifications',
      'Team management (up to 10 users)',
      'Audit logs',
    ],
    missing: [],
    cta: 'Get Business',
    href: '/register?plan=business',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: null, lifetime: null },
    description: 'Custom solutions for large organizations with specific needs.',
    icon: Building2,
    color: '#f43f5e',
    features: [
      'Unlimited email accounts',
      'Unlimited storage',
      'White-label options',
      'SSO / SAML integration',
      'Dedicated account manager',
      'SLA 99.99% uptime guarantee',
      'On-premise deployment option',
      'Custom API limits',
      '24/7 phone & chat support',
      'Unlimited team members',
      'Custom integrations',
    ],
    missing: [],
    cta: 'Contact Sales',
    href: '/contact',
  },
]

const comparisonFeatures = [
  { label: 'Email Accounts', values: ['1', '3', '10', '50', 'Unlimited'] },
  { label: 'Backup Storage', values: ['1 GB', '25 GB', '100 GB', '500 GB', 'Unlimited'] },
  { label: 'Email Conversions', values: ['100/mo', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'Export Formats', values: ['MBOX, EML', 'All', 'All', 'All', 'All'] },
  { label: 'Scheduled Backup', values: ['Manual', 'Weekly', 'Custom', 'Custom', 'Custom'] },
  { label: 'Incremental Backups', values: [false, false, true, true, true] },
  { label: 'API Access', values: [false, false, '10K/day', '50K/day', 'Custom'] },
  { label: 'Webhook Notifications', values: [false, false, true, true, true] },
  { label: 'Team Management', values: [false, false, false, '10 users', 'Unlimited'] },
  { label: 'SSO / SAML', values: [false, false, false, false, true] },
  { label: 'White-Label', values: [false, false, false, false, true] },
  { label: 'Priority Support', values: [false, 'Email', 'Email', 'Phone', '24/7 Phone + Chat'] },
  { label: 'SLA Guarantee', values: ['99.9%', '99.9%', '99.95%', '99.99%', '99.99%'] },
]

const licenseTiers = [
  {
    name: 'Personal License',
    price: '$9/mo',
    badge: 'For Individuals',
    color: '#08619d',
    includes: [
      'Up to 3 email accounts',
      '25 GB cloud storage per account',
      'Basic email format conversions',
      'Community forum access',
      'Standard encryption (AES-256)',
      'Monthly backup reports',
    ],
  },
  {
    name: 'Professional License',
    price: '$29/mo',
    badge: 'Most Popular',
    color: '#009688',
    includes: [
      'Up to 10 email accounts',
      '100 GB cloud storage per account',
      'All email format conversions + PST',
      'Priority email support',
      'Advanced encryption + audit trail',
      'Real-time backup monitoring',
      'API access (10K calls/day)',
      'Custom backup schedules',
    ],
  },
  {
    name: 'Business License',
    price: '$79/mo',
    badge: 'For Teams',
    color: '#f59e0b',
    includes: [
      'Up to 50 email accounts',
      '500 GB cloud storage per account',
      'All features from Professional',
      'Phone support during business hours',
      'Team management dashboard',
      'Advanced audit logs & compliance',
      'API access (50K calls/day)',
      'Webhook & Slack integrations',
      'Dedicated onboarding session',
    ],
  },
]

const faqs = [
  {
    q: 'Can I change plans at any time?',
    a: 'Yes. Upgrades take effect immediately with prorated billing. Downgrades apply at the next billing cycle with no interruption to your current plan.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Every paid plan comes with a 14-day free trial. No credit card required to start. You can upgrade or cancel anytime during the trial period.',
  },
  {
    q: 'What is a lifetime license?',
    a: 'A lifetime license is a one-time payment that gives you permanent access to the plan features. You receive all future updates and security patches for the version you purchased.',
  },
  {
    q: 'What formats do you support?',
    a: 'We support PST, MBOX, EML, MSG, PDF, and HTML export formats. We regularly add support for new formats based on user requests.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted with AES-256 at rest and TLS 1.3 in transit. We are SOC 2 Type II certified and fully GDPR compliant. Your emails never leave your control.',
  },
  {
    q: 'What happens if I exceed my storage limit?',
    a: 'We will notify you when you reach 80% and 95% of your storage limit. You can upgrade your plan at any time, or archive old backups to reduce usage.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes. We offer a 30-day money-back guarantee on all paid plans. If you are not satisfied, contact support within 30 days for a full refund.',
  },
  {
    q: 'Can I migrate from another backup tool?',
    a: 'Yes. We offer free migration support for users switching from other email backup tools. Contact our support team to get started.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const displayPrice = (plan: (typeof plans)[number]) => {
    if (plan.price.monthly === null) return 'Custom'
    if (billing === 'lifetime') {
      return plan.price.lifetime === 0 ? 'Free' : `$${plan.price.lifetime}`
    }
    return plan.price.monthly === 0 ? 'Free' : `$${plan.price.monthly}`
  }

  const pricePeriod = (plan: (typeof plans)[number]) => {
    if (plan.price.monthly === null) return null
    if (billing === 'lifetime') return plan.price.lifetime > 0 ? 'one-time' : null
    return plan.price.monthly > 0 ? '/mo' : null
  }

  const savingsText = (plan: (typeof plans)[number]) => {
    if (plan.price.monthly === null || plan.price.monthly === 0) return null
    if (billing === 'lifetime') {
      const monthlyTotal = plan.price.monthly * 24
      const saved = monthlyTotal - (plan.price.lifetime ?? 0)
      if (saved > 0) return `Save $${saved} vs 24 months`
    }
    return null
  }

  return (
    <>
      <SEO
        title="Pricing - MailSavior"
        description="Simple, transparent pricing for MailSavior email backup. Start free, scale as you grow. Lifetime and monthly plans available."
      />

      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="section-label">Pricing</span>
            <h1 className="section-title">
              Simple, transparent{' '}
              <span className="gradient-brand-text">pricing</span>
            </h1>
            <p className="section-subtitle mx-auto max-w-xl">
              Start free. Scale as you grow. No surprise fees, no hidden costs.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span
                className={`text-sm font-medium transition-colors ${
                  billing === 'monthly' ? 'text-white' : 'text-slate-500'
                }`}
              >
                Monthly
              </span>
              <button
                onClick={() =>
                  setBilling(billing === 'monthly' ? 'lifetime' : 'monthly')
                }
                className={`relative w-12 h-6 rounded-full transition-all ${
                  billing === 'lifetime' ? 'bg-brand-500' : 'bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    billing === 'lifetime' ? 'translate-x-6' : ''
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium transition-colors ${
                  billing === 'lifetime' ? 'text-white' : 'text-slate-500'
                }`}
              >
                Lifetime
                <span className="ml-1.5 badge badge-success text-xs">
                  One-time
                </span>
              </span>
            </div>
          </motion.div>

          {/* Plans Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-24"
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={itemVariants}
                className={`relative flex flex-col rounded-2xl p-6 border transition-all ${
                  plan.popular
                    ? 'border-brand-500/50 bg-brand-500/5 shadow-lg shadow-brand-500/10'
                    : 'border-white/8 bg-surface-700/50 hover:border-white/15'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="badge badge-brand text-xs px-3 py-1 shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${plan.color}18`, color: plan.color }}
                  >
                    <plan.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-extrabold text-white">
                      {displayPrice(plan)}
                    </span>
                    {pricePeriod(plan) && (
                      <span className="text-slate-500 text-sm mb-1">
                        {pricePeriod(plan)}
                      </span>
                    )}
                  </div>
                  {savingsText(plan) && (
                    <p className="text-xs text-accent-400 mt-1 font-medium">
                      {savingsText(plan)}
                    </p>
                  )}
                  {billing === 'monthly' &&
                    plan.price.monthly !== null &&
                    plan.price.monthly > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Billed monthly
                      </p>
                    )}
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent-400 mt-0.5 shrink-0" />
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm opacity-40"
                    >
                      <X className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                      <span className="text-slate-500">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={plan.href}
                  className={
                    plan.popular
                      ? 'btn-primary text-center justify-center'
                      : 'btn-secondary text-center justify-center'
                  }
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-24"
          >
            <div className="text-center mb-10">
              <span className="section-label">Compare</span>
              <h2 className="section-title">
                Feature <span className="gradient-brand-text">Comparison</span>
              </h2>
              <p className="section-subtitle mx-auto max-w-lg">
                See exactly what you get with each plan at a glance.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-400 w-[220px]">
                      Feature
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.id}
                        className="py-4 px-4 text-center"
                      >
                        <span
                          className={`text-sm font-bold ${
                            plan.popular ? 'text-brand-400' : 'text-white'
                          }`}
                        >
                          {plan.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feat, i) => (
                    <tr
                      key={feat.label}
                      className={`border-b border-white/5 ${
                        i % 2 === 0 ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-sm text-slate-300">
                        {feat.label}
                      </td>
                      {feat.values.map((val, j) => (
                        <td key={j} className="py-3.5 px-4 text-center">
                          {val === true ? (
                            <Check className="w-5 h-5 text-accent-400 mx-auto" />
                          ) : val === false ? (
                            <span className="text-slate-600">—</span>
                          ) : (
                            <span className="text-sm text-slate-300">{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* License Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-24"
          >
            <div className="text-center mb-10">
              <span className="section-label">Licenses</span>
              <h2 className="section-title">
                License <span className="gradient-brand-text">Details</span>
              </h2>
              <p className="section-subtitle mx-auto max-w-lg">
                Each license includes a specific set of capabilities designed
                for your workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {licenseTiers.map((tier, i) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 rounded-2xl border border-white/10"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: `${tier.color}20`,
                        color: tier.color,
                      }}
                    >
                      {tier.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-2xl font-extrabold gradient-brand-text mb-4">
                    {tier.price}
                  </p>
                  <ul className="space-y-2.5">
                    {tier.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-accent-400 mt-0.5 shrink-0" />
                        <span className="text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Why Choose MailSavior */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-24"
          >
            <div className="text-center mb-10">
              <span className="section-label">Why MailSavior</span>
              <h2 className="section-title">
                Built for <span className="gradient-brand-text">reliability</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: Lock,
                  title: 'Bank-Grade Security',
                  desc: 'AES-256 encryption at rest, TLS 1.3 in transit. SOC 2 Type II certified.',
                },
                {
                  icon: Cloud,
                  title: 'Redundant Storage',
                  desc: 'Triple-redundant cloud storage across multiple data centers.',
                },
                {
                  icon: Clock,
                  title: 'Instant Recovery',
                  desc: 'Restore individual emails or entire mailboxes in seconds.',
                },
                {
                  icon: Star,
                  title: '99.99% Uptime',
                  desc: 'Enterprise-grade infrastructure with guaranteed availability.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Refund Policy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-24"
          >
            <div className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-3xl mx-auto border border-white/10">
              <div className="w-16 h-16 rounded-2xl bg-accent-500/10 text-accent-400 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                30-Day Money-Back Guarantee
              </h2>
              <p className="text-slate-400 leading-relaxed max-w-xl mx-auto mb-6">
                We stand behind our product. If you are not completely satisfied
                with MailSavior within the first 30 days of your paid plan,
                contact our support team and we will issue a full refund — no
                questions asked.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent-400" />
                  <span>No cancellation fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent-400" />
                  <span>Instant refund processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent-400" />
                  <span>Keep your data export</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto mb-24"
          >
            <div className="text-center mb-10">
              <span className="section-label">FAQ</span>
              <h2 className="section-title">
                Frequently Asked{' '}
                <span className="gradient-brand-text">Questions</span>
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="glass-card cursor-pointer overflow-hidden"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div className="flex items-center justify-between p-5">
                    <p className="text-sm font-semibold text-slate-200 pr-4">
                      {faq.q}
                    </p>
                    <motion.div
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <p className="text-sm text-slate-400 leading-relaxed px-5 pb-5">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to protect your emails?
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Join over 50,000 users who trust MailSavior to keep their
              communications safe and accessible.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/register" className="btn-primary">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/contact" className="btn-secondary">
                Talk to Sales
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}
