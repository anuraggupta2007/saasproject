import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  BookOpen,
  Download,
  Zap,
  Shield,
  RefreshCw,
  Wrench,
  FileCode,
  Tag,
  Terminal,
  ArrowRight,
  ChevronRight,
  Star,
  LifeBuoy,
  Clock,
  HelpCircle,
  Settings,
  HardDrive,
  FileOutput,
} from 'lucide-react'
import { SEO } from '@/components/seo'

const docSections = [
  {
    title: 'Getting Started',
    icon: BookOpen,
    description: 'Learn the fundamentals and get up and running in minutes.',
    items: [
      { label: 'Introduction to MailSavior', href: '#' },
      { label: 'System Requirements', href: '#' },
      { label: 'Connecting your first account', href: '#' },
      { label: 'Creating your first backup', href: '#' },
    ],
  },
  {
    title: 'Installation',
    icon: Download,
    description: 'Step-by-step guides for every platform and deployment option.',
    items: [
      { label: 'Desktop app installation', href: '#' },
      { label: 'Docker & self-hosted setup', href: '#' },
      { label: 'CLI tool installation', href: '#' },
      { label: 'Environment configuration', href: '#' },
    ],
  },
  {
    title: 'Activation',
    icon: Zap,
    description: 'Activate your license and configure your workspace.',
    items: [
      { label: 'License activation flow', href: '#' },
      { label: 'Trial & upgrade paths', href: '#' },
      { label: 'Team seat management', href: '#' },
      { label: 'SSO & workspace settings', href: '#' },
    ],
  },
  {
    title: 'Backup Guide',
    icon: Shield,
    description: 'Configure automated backups for any connected email provider.',
    items: [
      { label: 'Cloud account backup setup', href: '#' },
      { label: 'Scheduling recurring backups', href: '#' },
      { label: 'Backup retention policies', href: '#' },
      { label: 'Restoring from a backup archive', href: '#' },
    ],
  },
  {
    title: 'Conversion Guide',
    icon: RefreshCw,
    description: 'Convert email files between formats — PST, MBOX, EML, MSG and more.',
    items: [
      { label: 'Supported conversion formats', href: '#' },
      { label: 'Offline bulk converter (desktop)', href: '#' },
      { label: 'Preserving folder structures', href: '#' },
      { label: 'Batch conversion & filtering', href: '#' },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: Wrench,
    description: 'Resolve common issues, errors, and performance bottlenecks.',
    items: [
      { label: 'Connection & OAuth errors', href: '#' },
      { label: 'Large file handling tips', href: '#' },
      { label: 'Export download failures', href: '#' },
      { label: 'Filing a support ticket', href: '#' },
    ],
  },
  {
    title: 'API Documentation',
    icon: FileCode,
    description: 'Integrate MailSavior programmatically via our REST API.',
    items: [
      { label: 'Authentication & API keys', href: '#' },
      { label: 'Job creation endpoint', href: '#' },
      { label: 'Polling status & downloads', href: '#' },
      { label: 'Webhooks & event callbacks', href: '#' },
    ],
  },
  {
    title: 'Release Notes',
    icon: Tag,
    description: 'Track every feature, fix, and improvement across all versions.',
    items: [
      { label: 'Latest release — v3.4.0', href: '#' },
      { label: 'Breaking changes log', href: '#' },
      { label: 'Upcoming roadmap', href: '#' },
      { label: 'Version archive', href: '#' },
    ],
  },
]

const popularArticles = [
  {
    title: 'Quick CLI Setup',
    description: 'Install and authenticate the CLI in under two minutes.',
    icon: Terminal,
    href: '#',
    tag: 'Most Used',
  },
  {
    title: 'OAuth Troubleshooting',
    description: 'Fix the most common Google and Outlook connection errors.',
    icon: HelpCircle,
    href: '#',
    tag: 'Trending',
  },
  {
    title: 'PST to MBOX Conversion',
    description: 'Convert legacy Outlook archives to open MBOX format.',
    icon: FileOutput,
    href: '#',
    tag: 'Popular',
  },
  {
    title: 'Backup Scheduling',
    description: 'Set up recurring daily or weekly automated backups.',
    icon: Clock,
    href: '#',
    tag: 'Essential',
  },
]

const quickStartSteps = [
  {
    step: 1,
    title: 'Install',
    description: 'Download the desktop app or install the CLI via npm.',
    command: 'npm install -g @mailsavior/cli',
  },
  {
    step: 2,
    title: 'Authenticate',
    description: 'Log in with your API token or connect via OAuth.',
    command: 'mailsavior auth login',
  },
  {
    step: 3,
    title: 'Run',
    description: 'Start your first backup or conversion job immediately.',
    command: 'mailsavior convert --input archive.pst --output backup.mbox',
  },
]

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}

export default function DocsPage() {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return docSections
    const q = search.toLowerCase()
    return docSections
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            s.title.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.items.length > 0 || s.title.toLowerCase().includes(q))
  }, [search])

  return (
    <>
      <SEO
        title="Documentation & Guides"
        description="Everything you need to integrate, build, and scale with MailSavior. Installation guides, API reference, backup tutorials, and troubleshooting."
      />

      <div className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-10 sm:mb-14"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="section-label">Documentation</span>
            <h1 className="section-title mt-2">
              Documentation &{' '}
              <span className="gradient-brand-text">Guides</span>
            </h1>
            <p className="section-subtitle mx-auto max-w-2xl">
              Everything you need to integrate, build, and scale with
              MailSavior — from first install to production API integration.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            className="max-w-xl mx-auto mb-14 sm:mb-16"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search docs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface-800/60 border border-white/8 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/40 transition-all backdrop-blur-sm"
              />
            </div>
          </motion.div>

          {/* Quick Start */}
          {!search.trim() && (
            <motion.section
              className="mb-14 sm:mb-20"
              variants={stagger}
              initial="initial"
              animate="animate"
            >
              <motion.h2
                className="text-xl sm:text-2xl font-bold text-white mb-2 text-center"
                variants={fadeInUp}
              >
                Quick <span className="gradient-brand-text">Start</span>
              </motion.h2>
              <motion.p
                className="text-sm text-slate-400 text-center mb-8"
                variants={fadeInUp}
              >
                Go from zero to your first conversion in three steps.
              </motion.p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quickStartSteps.map((s) => (
                  <motion.div
                    key={s.step}
                    className="glass-card p-6 border border-white/5 bg-surface-800/40 rounded-2xl"
                    variants={fadeInUp}
                  >
                    <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm mb-4 shadow-lg shadow-brand-500/20">
                      {s.step}
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      {s.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                      {s.description}
                    </p>
                    <pre className="p-3 rounded-lg bg-surface-900 border border-white/5 font-mono text-[11px] text-brand-300 overflow-x-auto">
                      <code>{s.command}</code>
                    </pre>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Popular Articles */}
          {!search.trim() && (
            <motion.section
              className="mb-14 sm:mb-20"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-8">
                <Star className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Popular <span className="gradient-brand-text">Articles</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {popularArticles.map((a) => (
                  <a
                    key={a.title}
                    href={a.href}
                    className="glass-card p-5 rounded-2xl border border-white/5 bg-surface-800/40 hover:border-white/15 transition-all group block"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md shadow-brand-500/15 group-hover:scale-105 transition-transform">
                        <a.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">
                        {a.tag}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1 group-hover:text-brand-300 transition-colors">
                      {a.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {a.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-400 group-hover:text-brand-300 transition-colors">
                      Read more
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </a>
                ))}
              </div>
            </motion.section>
          )}

          {/* Documentation Sections Grid */}
          <motion.section
            className="mb-14 sm:mb-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-8 text-center">
              All <span className="gradient-brand-text">Topics</span>
            </h2>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-sm">
                No results for &ldquo;{search}&rdquo; — try a different term.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((section, idx) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="glass-card p-6 rounded-2xl border border-white/5 bg-surface-800/40 hover:border-white/10 transition-all"
                >
                  <div className="flex items-start gap-4 mb-5 pb-4 border-b border-white/5">
                    <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-500/20">
                      <section.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {section.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {section.items.map((item) => (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          className="text-sm text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-2 group"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-500 transition-colors shrink-0" />
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* CLI Code Example */}
          <motion.section
            className="mb-14 sm:mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="glass-card border border-white/5 bg-surface-800/40 p-6 sm:p-8 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Quick CLI Example
                </h3>
              </div>
              <p className="text-sm text-slate-400 mb-5 leading-relaxed max-w-2xl">
                Run a local email conversion command directly from your
                terminal using our lightweight CLI wrapper — no cloud upload
                required.
              </p>
              <div className="space-y-3">
                <pre className="p-4 rounded-xl bg-surface-900 border border-white/5 font-mono text-xs text-brand-300 overflow-x-auto">
                  <code>
                    mailsavior convert --input archive.pst --output
                    backup.mbox --preserve-folders
                  </code>
                </pre>
                <pre className="p-4 rounded-xl bg-surface-900 border border-white/5 font-mono text-xs text-slate-400 overflow-x-auto">
                  <code>
                    <span className="text-slate-600"># Schedule an automated daily backup</span>
                    {'\n'}
                    mailsavior backup --account work@acme.com --schedule
                    daily --retention 90d
                  </code>
                </pre>
              </div>
              <a
                href="#"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
              >
                View full CLI reference
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.section>

          {/* Status / Release Banner */}
          {!search.trim() && (
            <motion.section
              className="mb-14 sm:mb-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5 bg-surface-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-500/20">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      MailSavior v3.4.0
                    </h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Improved PST parsing, faster bulk conversions, and new
                      S3-compatible storage options.
                    </p>
                  </div>
                </div>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold gradient-brand text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all shrink-0"
                >
                  What's New
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.section>
          )}

          {/* Need Help? CTA */}
          <motion.section
            className="mb-10"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className="glass-card p-8 sm:p-12 rounded-2xl border border-white/5 bg-surface-800/40 text-center">
              <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-500/20">
                <LifeBuoy className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Need <span className="gradient-brand-text">Help</span>?
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                Our support team is available 24/7 for Pro and Enterprise
                customers. Free plan users can browse the community forum.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold gradient-brand text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all"
                >
                  Contact Support
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-white/10 text-slate-300 hover:bg-white/5 transition-all"
                >
                  <HardDrive className="w-4 h-4" />
                  Community Forum
                </a>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </>
  )
}
