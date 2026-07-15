import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Shield, RefreshCw, CheckCircle, Mail,
  Filter, Lock, Building2, ArrowRight,
  FileText, FileCode, FileArchive, FileType,
  Database, Calendar,
  HardDrive, Gauge,
} from 'lucide-react'
import { SEO } from '@/components/seo'

const featureCategories = [
  {
    category: 'Email Backup',
    icon: Shield,
    title: 'Secure, Automatic Backups',
    description:
      'Protect your inbox from accidental deletion, ransomware, or service outages. MailSavior continuously syncs and secures your emails with zero downtime.',
    details: [
      'Backup all folders: Inbox, Sent, Drafts, custom labels, and archives.',
      'Preserve read/unread status, flags, stars, and folder hierarchy.',
      'Support for Gmail, Outlook, Yahoo, iCloud, Zoho, AOL, and any IMAP/POP3 server.',
      'Real-time progress tracking with detailed backup logs and health status.',
    ],
  },
  {
    category: 'Email Converter',
    icon: RefreshCw,
    title: 'High-Fidelity Format Converter',
    description:
      'Seamlessly convert large archives between popular formats with zero data loss. Ideal for migrations, legal discovery, and long-term archiving.',
    details: [
      'Batch conversion: drag and drop thousands of files for parallel processing.',
      'Preserve metadata: header logs, timestamps, read status, and threading.',
      'Attachment management: extract, embed, or include as separate files.',
      'Lossless conversion engine with integrity verification on every export.',
    ],
  },
  {
    category: 'Advanced Filters',
    icon: Filter,
    title: 'Granular Control Over Every Operation',
    description:
      'Fine-tune exactly which emails to backup or convert with powerful filter rules. Save filter presets for repeated workflows.',
    details: [
      'Filter by date range, sender, recipient, subject, or keyword.',
      'Filter by attachment presence, file type, or size threshold.',
      'Exclude specific folders, labels, or sender addresses from operations.',
      'Save and reuse filter presets for recurring compliance or migration tasks.',
    ],
  },
  {
    category: 'Incremental Backup',
    icon: Database,
    title: 'Smart Differential Sync',
    description:
      'Save bandwidth and storage by only downloading new or changed messages since the last backup. Our deduplication engine ensures no redundant data.',
    details: [
      'SHA-256 content hashing detects changes at the message level.',
      'Delta sync reduces bandwidth usage by up to 95% after initial backup.',
      'Automatic conflict resolution for messages modified across devices.',
      'Historical snapshots: restore any previous backup state with one click.',
    ],
  },
  {
    category: 'Scheduling',
    icon: Calendar,
    title: 'Set It and Forget It',
    description:
      'Configure automated backup schedules that run in the background. Never worry about manual exports again.',
    details: [
      'Predefined schedules: hourly, daily, weekly, or monthly backups.',
      'Custom cron expressions for advanced scheduling requirements.',
      'Timezone-aware scheduling for global teams and multi-region backups.',
      'Email and webhook notifications when scheduled tasks complete or fail.',
    ],
  },
  {
    category: 'Security',
    icon: Lock,
    title: 'Enterprise-Grade Protection',
    description:
      'Your email data is protected with military-grade encryption at rest and in transit. Fully SOC 2 Type II and GDPR compliant.',
    details: [
      'AES-256 encryption at rest for all stored backups and exports.',
      'TLS 1.3 encryption in transit for every API call and sync operation.',
      'Zero-knowledge architecture: we never have access to your plaintext data.',
      'SSO/SAML integration, 2FA enforcement, and role-based access controls.',
    ],
  },
  {
    category: 'Performance',
    icon: Gauge,
    title: 'Built for Speed at Scale',
    description:
      'Our distributed processing engine handles millions of emails without breaking a sweat. Optimized for throughput and low latency.',
    details: [
      'Parallel processing: convert up to 10,000 emails per minute.',
      'CDN-accelerated downloads for exported archives and converted files.',
      'Auto-scaling infrastructure handles traffic spikes without degradation.',
      'Background processing queue so your dashboard stays responsive.',
    ],
  },
  {
    category: 'Enterprise Features',
    icon: Building2,
    title: 'Designed for IT Teams & Compliance',
    description:
      'Full API access, audit logs, team management, and white-label options for organizations that need control and visibility.',
    details: [
      'REST API with OAuth 2.0 for deep integration into existing workflows.',
      'Detailed audit logs tracking every backup, conversion, and access event.',
      'Multi-account management: connect and monitor unlimited accounts.',
      'White-label deployment, on-premise options, and dedicated account managers.',
    ],
  },
]

const supportedFormats = [
  { name: 'PST', desc: 'Outlook Archive', icon: FileArchive, color: '#0078D4' },
  { name: 'MBOX', desc: 'Unix Mailbox', icon: HardDrive, color: '#10b981' },
  { name: 'EML', desc: 'Email Message', icon: Mail, color: '#8b5cf6' },
  { name: 'MSG', desc: 'Outlook Item', icon: FileText, color: '#f59e0b' },
  { name: 'PDF', desc: 'Portable Document', icon: FileType, color: '#ef4444' },
  { name: 'HTML', desc: 'Web Format', icon: FileCode, color: '#3b82f6' },
]

const comparisonPlans = [
  {
    name: 'Free',
    color: '#64748b',
    cta: 'Get Started Free',
    href: '/register',
  },
  {
    name: 'Starter',
    color: '#6366f1',
    cta: 'Start 14-Day Trial',
    href: '/register?plan=starter',
  },
  {
    name: 'Pro',
    color: '#8b5cf6',
    cta: 'Start 14-Day Trial',
    href: '/register?plan=pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    color: '#f59e0b',
    cta: 'Contact Sales',
    href: '/contact',
  },
]

const comparisonFeatures = [
  { name: 'Email accounts', free: '1', starter: '3', pro: '10', enterprise: 'Unlimited' },
  { name: 'Backup storage', free: '1 GB', starter: '25 GB', pro: '100 GB', enterprise: 'Unlimited' },
  { name: 'Email conversions', free: '100/batch', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Export formats', free: 'MBOX, EML', starter: 'All formats', pro: 'All formats', enterprise: 'All formats' },
  { name: 'Auto scheduling', free: '—', starter: 'Weekly', pro: 'Hourly / Daily', enterprise: 'Custom cron' },
  { name: 'Incremental backup', free: '—', starter: '—', pro: 'Yes', enterprise: 'Yes' },
  { name: 'Advanced filters', free: 'Basic', starter: 'Full', pro: 'Full + Presets', enterprise: 'Full + Custom' },
  { name: 'API access', free: '—', starter: '1K calls/day', pro: '10K calls/day', enterprise: 'Custom limits' },
  { name: 'Audit logs', free: '—', starter: '—', starter2: '—', pro: '30 days', enterprise: 'Unlimited' },
  { name: 'SSO / SAML', free: '—', starter: '—', pro: '—', enterprise: 'Yes' },
  { name: 'White-label', free: '—', starter: '—', pro: '—', enterprise: 'Yes' },
  { name: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', enterprise: '24/7 Phone' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

export default function FeaturesPage() {
  return (
    <>
      <SEO
        title="Features | Email Backup & Converter"
        description="Explore MailSavior's complete feature set: secure email backup, high-fidelity format conversion, advanced filters, incremental sync, scheduling, and enterprise-grade security."
        canonical="https://mailsavior.io/features"
      />

      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* ========== PAGE HEADER ========== */}
          <motion.div
            className="text-center mb-20"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            <span className="section-label">Features</span>
            <h1 className="section-title">
              Complete control over your{' '}
              <span className="gradient-brand-text">email archives</span>
            </h1>
            <p className="section-subtitle mx-auto">
              From secure backups to lightning-fast conversions, MailSavior gives
              you everything you need to protect, manage, and migrate your email
              data with confidence.
            </p>
          </motion.div>

          {/* ========== FEATURE CATEGORIES ========== */}
          <div className="space-y-24 mb-28">
            {featureCategories.map((feat, index) => (
              <motion.div
                key={feat.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className={`flex flex-col lg:flex-row gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Text Content */}
                <div className="flex-1 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-xs font-semibold uppercase tracking-wider">
                    <feat.icon className="w-3.5 h-3.5" />
                    {feat.category}
                  </div>
                  <h2 className="text-3xl font-bold text-white">{feat.title}</h2>
                  <p className="text-slate-400 text-base leading-relaxed">
                    {feat.description}
                  </p>
                  <ul className="space-y-3">
                    {feat.details.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-start gap-2.5 text-sm text-slate-300"
                      >
                        <CheckCircle className="w-4 h-4 text-accent-400 mt-0.5 shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual Card */}
                <div className="flex-1 w-full">
                  <div className="glass-card p-8 rounded-2xl relative overflow-hidden group min-h-[320px] flex flex-col justify-center border border-white/5 bg-surface-800/40">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-[80px]" />
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-white mb-6 shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
                        <feat.icon className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {feat.category} Dashboard
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mb-6">
                        Connect to the dashboard to monitor live operations, track
                        progress, and download exports in real-time.
                      </p>
                      <Link
                        to="/register"
                        className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                      >
                        Try {feat.category} Now
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ========== SUPPORTED FORMATS ========== */}
          <motion.section
            className="mb-28"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-14">
              <span className="section-label">Formats</span>
              <h2 className="section-title">
                Supported <span className="gradient-brand-text">export formats</span>
              </h2>
              <p className="section-subtitle mx-auto">
                Convert your emails to any format you need. Every format preserves
                full metadata, attachments, and folder structure.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              {supportedFormats.map((fmt) => (
                <motion.div
                  key={fmt.name}
                  variants={fadeUp}
                  transition={{ duration: 0.4 }}
                  className="glass-card p-6 rounded-2xl flex flex-col items-center text-center group cursor-default"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ background: `${fmt.color}18`, color: fmt.color }}
                  >
                    <fmt.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{fmt.name}</h3>
                  <p className="text-xs text-slate-500">{fmt.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          {/* ========== COMPARISON TABLE ========== */}
          <motion.section
            className="mb-28"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-14">
              <span className="section-label">Compare Plans</span>
              <h2 className="section-title">
                Choose the plan that{' '}
                <span className="gradient-brand-text">fits your needs</span>
              </h2>
              <p className="section-subtitle mx-auto">
                Start free and scale as you grow. Every plan includes core backup
                and conversion features.
              </p>
            </div>

            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[700px]">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-3 mb-4 px-4">
                  <div />
                  {comparisonPlans.map((plan) => (
                    <div
                      key={plan.name}
                      className={`text-center p-4 rounded-xl border ${
                        plan.popular
                          ? 'border-brand-500/50 bg-brand-500/5'
                          : 'border-white/5 bg-surface-800/40'
                      }`}
                    >
                      {plan.popular && (
                        <span className="badge badge-brand text-[10px] px-2 py-0.5 mb-2">
                          Popular
                        </span>
                      )}
                      <h3
                        className="text-sm font-bold"
                        style={{ color: plan.color }}
                      >
                        {plan.name}
                      </h3>
                    </div>
                  ))}
                </div>

                {/* Table Rows */}
                <div className="space-y-2">
                  {comparisonFeatures.map((row) => (
                    <div
                      key={row.name}
                      className="grid grid-cols-5 gap-3 px-4 py-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm text-slate-400 font-medium flex items-center">
                        {row.name}
                      </span>
                      {[row.free, row.starter, row.pro, row.enterprise].map(
                        (val, i) => (
                          <div
                            key={i}
                            className="text-center text-sm font-medium"
                          >
                            {val === 'Yes' ? (
                              <CheckCircle className="w-4 h-4 text-accent-400 mx-auto" />
                            ) : val === '—' ? (
                              <span className="text-slate-600">{val}</span>
                            ) : (
                              <span className="text-slate-300">{val}</span>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>

                {/* Table Footer CTAs */}
                <div className="grid grid-cols-5 gap-3 mt-6 px-4">
                  <div />
                  {comparisonPlans.map((plan) => (
                    <Link
                      key={plan.name}
                      to={plan.href}
                      className={`text-center text-xs py-2.5 rounded-lg font-semibold inline-flex items-center justify-center gap-1 ${
                        plan.popular
                          ? 'btn-primary'
                          : 'btn-secondary'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* ========== CTA SECTION ========== */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <div className="glass-card rounded-3xl p-10 md:p-16 text-center relative overflow-hidden border border-white/5">
              {/* Background accents */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/8 rounded-full blur-[120px]" />
              <div className="absolute bottom-0 right-0 w-[400px] h-[200px] bg-purple-500/5 rounded-full blur-[100px]" />

              <div className="relative z-10">
                <span className="section-label">Ready to Get Started?</span>
                <h2 className="section-title max-w-2xl mx-auto mb-6">
                  Protect your email data{' '}
                  <span className="gradient-brand-text">in minutes</span>
                </h2>
                <p className="section-subtitle mx-auto mb-10">
                  Join 50,000+ users who trust MailSavior to back up and convert
                  their email archives. Start with our free plan — no credit card
                  required.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/register"
                    className="btn-primary text-base px-8 py-3"
                  >
                    Start Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/pricing"
                    className="btn-secondary text-base px-8 py-3"
                  >
                    View Pricing
                  </Link>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-accent-400" />
                    No credit card required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-accent-400" />
                    14-day free trial
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-accent-400" />
                    Cancel anytime
                  </span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </>
  )
}
