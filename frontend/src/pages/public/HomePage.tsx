import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Shield, Zap, Cloud, Download, Star,
  CheckCircle, Play, Mail, Lock, RefreshCw, Globe,
  FileText, Check, HelpCircle, ChevronRight,
  Building2, Award, Clock, Users, TrendingUp,
} from 'lucide-react'
import { SEO } from '@/components/seo'
import {
  FeatureCard, TestimonialCard, CTASection, FAQAccordion, NewsletterForm,
} from '@/components/shared'

const trustedBy = [
  'TechCorp', 'DataVault', 'CloudSync', 'SecureMail', 'Enterprise Co', 'GlobalTech',
]

const stats = [
  { value: '2M+', label: 'Emails Backed Up' },
  { value: '50K+', label: 'Happy Users' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '150+', label: 'Countries' },
]

const supportedProviders = [
  { name: 'Gmail', color: '#EA4335' },
  { name: 'Outlook', color: '#0078D4' },
  { name: 'Microsoft 365', color: '#0078D4' },
  { name: 'Yahoo', color: '#720E9E' },
  { name: 'iCloud', color: '#3a7afe' },
  { name: 'Zoho', color: '#E42527' },
  { name: 'AOL', color: '#FF0B00' },
  { name: 'IMAP/POP3', color: '#009688' },
]

const exportFormats = [
  { name: 'PST', desc: 'Outlook Archive', color: '#0078D4' },
  { name: 'MBOX', desc: 'Unix Mailbox', color: '#009688' },
  { name: 'EML', desc: 'Email Message', color: '#009688' },
  { name: 'MSG', desc: 'Outlook Item', color: '#f59e0b' },
  { name: 'PDF', desc: 'Portable Document', color: '#ef4444' },
  { name: 'HTML', desc: 'Web Format', color: '#3b82f6' },
]

const features = [
  { icon: Shield, title: 'Military-Grade Encryption', description: 'AES-256 encryption at rest and in transit. Your emails are always safe.', color: '#08619d' },
  { icon: Zap, title: 'Lightning Fast Conversion', description: 'Convert thousands of emails in seconds with our distributed processing engine.', color: '#009688' },
  { icon: Cloud, title: 'Cloud & Local Backup', description: 'Backup to cloud storage or your local device. Full control over your data.', color: '#ec4899' },
  { icon: RefreshCw, title: 'Auto Scheduled Backup', description: 'Set it and forget it. Daily, weekly, or monthly automatic backups.', color: '#009688' },
  { icon: Globe, title: 'All Major Providers', description: 'Gmail, Outlook, Yahoo, iCloud, Zoho, IMAP – we support them all.', color: '#f59e0b' },
  { icon: Download, title: 'Universal Format Support', description: 'PST, MBOX, EML, MSG, PDF, HTML – convert to any format you need.', color: '#3b82f6' },
]

const whyMailSavior = [
  { icon: Lock, title: 'SOC2 & GDPR Compliant', description: 'Enterprise-grade compliance built into every layer of our platform.' },
  { icon: Clock, title: 'Incremental Backups', description: 'Only sync new messages. Save bandwidth and storage with smart differential sync.' },
  { icon: Users, title: 'Team Management', description: 'Connect unlimited accounts, assign roles, and manage everything from one dashboard.' },
  { icon: TrendingUp, title: 'Real-Time Monitoring', description: 'Track backup progress, conversion queues, and system health in real-time.' },
  { icon: Award, title: '99.9% Uptime SLA', description: 'Our infrastructure is built for reliability with automatic failover and redundancy.' },
  { icon: Building2, title: 'Enterprise API', description: 'Full REST API with webhooks for seamless integration into your existing workflows.' },
]

const testimonials = [
  { name: 'Sarah Mitchell', role: 'IT Director, TechCorp', avatar: 'SM', rating: 5, text: 'MailSavior saved us during a migration. Backed up 500K emails overnight. Absolutely stellar.' },
  { name: 'James Rodriguez', role: 'Freelance Developer', avatar: 'JR', rating: 5, text: 'The PST to MBOX conversion is seamless. I use it for every client project now.' },
  { name: 'Priya Sharma', role: 'Legal Counsel', avatar: 'PS', rating: 5, text: 'We need email records for compliance. MailSavior automates everything perfectly.' },
]

const faqPreview = [
  { q: 'What is MailSavior?', a: 'MailSavior is a comprehensive Email Backup & Converter SaaS platform. It allows users to connect various email accounts for automated backups, and convert bulk email files to different formats.' },
  { q: 'Is my data secure?', a: 'Absolutely. We use industry-standard AES-256 encryption at rest and TLS 1.3 in transit. Our offline desktop app converts files locally so no data ever leaves your device.' },
  { q: 'What email providers do you support?', a: 'We support Gmail, Outlook, Microsoft 365, Yahoo, iCloud, Zoho, AOL, and any IMAP/POP3 compatible email server.' },
]

const screenshots = [
  { title: 'Dashboard Overview', description: 'Monitor all your backups and conversions at a glance.' },
  { title: 'Email Backup', description: 'Connect accounts and configure automated backup schedules.' },
  { title: 'File Converter', description: 'Drag and drop files for instant format conversion.' },
  { title: 'Settings & Security', description: 'Manage security settings, API keys, and team access.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const },
  }),
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MailSavior',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Windows, macOS, Linux',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '2500',
  },
}

export default function HomePage() {
  const [activeScreenshot, setActiveScreenshot] = useState(0)

  return (
    <div className="overflow-hidden">
      <SEO
        title="MailSavior — Email Backup & Converter SaaS"
        description="The most powerful email backup and converter platform. Connect any email provider, backup automatically, and convert between PST, MBOX, EML, MSG."
        jsonLd={jsonLd}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-brand-600/8 blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/6 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-pink-600/5 blur-[80px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-500/20 mb-8"
          >
            <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
            <span className="text-sm text-slate-300">New: Batch conversion now supports 10,000+ emails</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold font-display leading-[1.05] tracking-tight mb-6"
          >
            <span className="text-white">Back Up & Convert</span>
            <br />
            <span className="gradient-brand-text text-glow">Every Email</span>
            <br />
            <span className="text-white">You've Ever Sent</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            MailSavior is the most powerful email backup and converter platform.
            Connect any email provider, backup automatically, and convert between
            PST, MBOX, EML, MSG — in minutes.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="flex flex-wrap items-center justify-center gap-4 mb-14"
          >
            <Link to="/register" className="btn-primary btn-xl glow-brand-sm">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/download" className="btn-ghost btn-xl">
              <Download className="w-5 h-5" />
              Download Free
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {[
              { icon: Lock, text: 'SOC2 Certified' },
              { icon: Shield, text: 'GDPR Compliant' },
              { icon: CheckCircle, text: 'No Credit Card Required' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-sm text-slate-500">
                <item.icon className="w-4 h-4 text-accent-500" />
                {item.text}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Trusted By ───────────────────────────────────────── */}
      <section className="py-12 px-4 border-y border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-6">Trusted by leading companies</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {trustedBy.map((name) => (
              <span key={name} className="text-lg font-bold text-slate-700 font-display">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="text-center"
            >
              <p className="text-4xl font-extrabold gradient-brand-text font-display mb-1">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Supported Providers ───────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-slate-500 mb-8 uppercase tracking-widest font-semibold">
            Works with all major email providers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {supportedProviders.map((p) => (
              <div key={p.name} className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/5 hover:border-white/10 transition-all">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                <span className="text-sm font-medium text-slate-300">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Export Formats ────────────────────────────────────── */}
      <section className="py-20 px-4 bg-surface-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="section-label"><FileText className="w-3.5 h-3.5" /> Export Formats</span>
            <h2 className="section-title">Convert to <span className="gradient-brand-text">any format</span></h2>
            <p className="section-subtitle mx-auto">Export your emails in the format that works for you.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {exportFormats.map((fmt, i) => (
              <motion.div
                key={fmt.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 text-center hover:border-white/15 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform" style={{ background: `${fmt.color}18`, color: fmt.color }}>
                  {fmt.name}
                </div>
                <p className="text-xs text-slate-500">{fmt.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-24 px-4" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="section-label"><Zap className="w-3.5 h-3.5" /> Features</span>
            <h2 className="section-title">Everything you need to <br /><span className="gradient-brand-text">protect your email</span></h2>
            <p className="section-subtitle mx-auto">
              From automated backups to blazing-fast conversions, MailSavior has every tool you need.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why MailSavior ───────────────────────────────────── */}
      <section className="py-24 px-4 bg-surface-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="section-label"><Award className="w-3.5 h-3.5" /> Why MailSavior</span>
            <h2 className="section-title">Built for <span className="gradient-brand-text">enterprise reliability</span></h2>
            <p className="section-subtitle mx-auto">
              Every feature is designed with security, compliance, and performance in mind.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {whyMailSavior.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-4">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="section-label"><Play className="w-3.5 h-3.5" /> How It Works</span>
            <h2 className="section-title">Backup in <span className="gradient-brand-text">3 easy steps</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
            {[
              { step: '01', title: 'Connect Account', desc: 'Link your Gmail, Outlook, or any IMAP account with OAuth or credentials.' },
              { step: '02', title: 'Select & Schedule', desc: 'Choose folders, set filters, and configure automatic backup schedules.' },
              { step: '03', title: 'Download & Convert', desc: 'Access your backups anytime and convert to PST, MBOX, EML, or PDF.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-2xl font-black text-white mx-auto mb-5 glow-brand-sm">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Screenshots Carousel ─────────────────────────────── */}
      <section className="py-24 px-4 bg-surface-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="section-label"><Play className="w-3.5 h-3.5" /> Product Preview</span>
            <h2 className="section-title">See MailSavior <span className="gradient-brand-text">in action</span></h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              {screenshots.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => setActiveScreenshot(i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    activeScreenshot === i
                      ? 'border-brand-500/50 bg-brand-500/5'
                      : 'border-white/5 bg-white/5 hover:border-white/10'
                  }`}
                >
                  <h4 className="text-sm font-semibold text-white">{s.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{s.description}</p>
                </button>
              ))}
            </div>
            <div className="glass-card rounded-2xl p-8 min-h-[350px] flex items-center justify-center border border-white/10">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-semibold text-white mb-1">{screenshots[activeScreenshot].title}</p>
                <p className="text-sm text-slate-500">{screenshots[activeScreenshot].description}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-label"><Star className="w-3.5 h-3.5" /> Testimonials</span>
            <h2 className="section-title">Loved by <span className="gradient-brand-text">50,000+ users</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ──────────────────────────────────── */}
      <section className="py-24 px-4 bg-surface-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="section-label"><TrendingUp className="w-3.5 h-3.5" /> Pricing</span>
            <h2 className="section-title">Simple, <span className="gradient-brand-text">transparent pricing</span></h2>
            <p className="section-subtitle mx-auto">Start free. Scale as you grow. No surprise fees.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { name: 'Free', price: '$0', features: ['1 email account', '1 GB storage', '100 emails per conversion'], cta: 'Get Started Free' },
              { name: 'Pro', price: '$29', features: ['10 email accounts', '100 GB storage', 'Unlimited conversions'], cta: 'Start 14-Day Trial', popular: true },
              { name: 'Enterprise', price: 'Custom', features: ['Unlimited accounts', 'Unlimited storage', 'Dedicated support'], cta: 'Contact Sales' },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-6 border text-center ${plan.popular ? 'border-brand-500/50 bg-brand-500/5' : 'border-white/8 bg-surface-700/50'}`}
              >
                {plan.popular && <span className="badge badge-brand text-xs mb-4">Most Popular</span>}
                <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-3xl font-extrabold text-white mb-4">{plan.price}<span className="text-sm text-slate-500 font-normal">{plan.price !== 'Custom' ? '/mo' : ''}</span></p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center justify-center gap-2 text-sm text-slate-400">
                      <Check className="w-4 h-4 text-accent-400" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/pricing" className={plan.popular ? 'btn-primary w-full justify-center' : 'btn-secondary w-full justify-center'}>
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/pricing" className="text-sm text-brand-400 hover:text-brand-300 font-medium">
              View all plans and features <ChevronRight className="w-4 h-4 inline" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ Preview ──────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="section-label"><HelpCircle className="w-3.5 h-3.5" /> FAQ</span>
            <h2 className="section-title">Frequently asked <span className="gradient-brand-text">questions</span></h2>
          </div>
          <FAQAccordion items={faqPreview} />
          <div className="text-center mt-8">
            <Link to="/faq" className="text-sm text-brand-400 hover:text-brand-300 font-medium">
              View all FAQs <ChevronRight className="w-4 h-4 inline" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Newsletter ───────────────────────────────────────── */}
      <section className="py-16 px-4 bg-surface-800/30">
        <div className="max-w-xl mx-auto text-center">
          <Mail className="w-10 h-10 text-brand-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Stay updated</h2>
          <p className="text-sm text-slate-500 mb-6">Get the latest updates, security tips, and product news.</p>
          <NewsletterForm />
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <CTASection
        icon={<Mail className="w-8 h-8 text-white" />}
        title="Start protecting your emails today"
        description="Join 50,000+ users who trust MailSavior. Free plan available — no credit card required."
        primaryAction={{ label: 'Get Started Free', href: '/register' }}
        secondaryAction={{ label: 'View Pricing', href: '/pricing' }}
      />
    </div>
  )
}
