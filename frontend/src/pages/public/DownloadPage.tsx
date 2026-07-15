import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Shield,
  Terminal,
  Apple,
  Monitor,
  Cpu,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Users,
  Zap,
  Lock,
  Globe,
  AlertTriangle,
  Hash,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SEO } from '@/components/seo'

/* -------------------------------------------------------------------------- */
/*                                DATA                                        */
/* -------------------------------------------------------------------------- */

const platforms = [
  {
    name: 'macOS Desktop',
    version: 'v1.4.2',
    arch: 'Apple Silicon & Intel',
    icon: Apple,
    fileSize: '48.2 MB',
    link: '#',
    recommended: true,
    checksum: 'a3f8c2d1e5b79f4062d81a3c7e9f0b12',
    requirements: ['macOS 12.0+'],
  },
  {
    name: 'Windows Desktop',
    version: 'v1.4.2',
    arch: 'x64 / ARM64',
    icon: Monitor,
    fileSize: '54.1 MB',
    link: '#',
    checksum: '7e4d2b8f1a9c3e560781f2d4a6b8c0e3',
    requirements: ['Windows 10+'],
  },
  {
    name: 'Linux Desktop',
    version: 'v1.4.2',
    arch: '.AppImage / .deb',
    icon: Cpu,
    fileSize: '42.9 MB',
    link: '#',
    checksum: 'b1c9e5f3a7d24860194e7f0b3c5a8d16',
    requirements: ['Ubuntu 20.04+ / Debian 11+'],
  },
  {
    name: 'MailSavior CLI',
    version: 'v1.1.0',
    arch: 'Terminal Tool',
    icon: Terminal,
    fileSize: '12.4 MB',
    link: '#',
    checksum: 'd4e8f2a1b6c390754028f9e1d5c7a3b0',
    requirements: ['Node.js 18+ / macOS / Linux'],
  },
]

const releases = [
  {
    version: 'v1.4.2',
    date: 'June 28, 2026',
    tag: 'Latest',
    changes: [
      'Fixed PST import crash for archives larger than 50 GB',
      'Added Apple Silicon native binary — 3× faster conversions',
      'Improved EML header parsing for malformed messages',
      'New drag-and-drop support on macOS Finder',
      'Security patch: updated OpenSSL to 3.2.1',
    ],
  },
  {
    version: 'v1.4.1',
    date: 'May 14, 2026',
    tag: 'Stable',
    changes: [
      'Added MBOX folder-level batch conversion',
      'Windows ARM64 build now available',
      'Fixed memory leak when processing 10 000+ attachments',
      'Added dark mode toggle in Preferences',
      'Improved progress bar accuracy for large archives',
    ],
  },
  {
    version: 'v1.4.0',
    date: 'March 30, 2026',
    tag: 'Major',
    changes: [
      'Complete UI redesign with glassmorphism dark theme',
      'Multi-threaded conversion engine — up to 4× faster',
      'New backup scheduler with cron-like syntax',
      'Added support for OST (Offline Outlook Data File)',
      'Full Unicode support for non-Latin email content',
      'Export to PDF with inline attachment previews',
    ],
  },
]

const systemRequirements = {
  os: [
    'Windows 10 / 11 (64-bit)',
    'macOS 12 Monterey or later',
    'Ubuntu 20.04+ / Debian 11+ / Fedora 36+',
  ],
  ram: '4 GB minimum, 8 GB recommended',
  disk: '200 MB free space for installation, plus 2× archive size during conversion',
  processor: 'Dual-core 2 GHz+ (x64); Apple M1+ recommended for macOS',
  display: '1024×768 minimum, 1920×1080 recommended',
  network: 'Required only for license activation and update checks',
}

const installationSteps = {
  macOS: [
    'Download the .dmg installer from above.',
    'Open the downloaded file and drag MailSavior into your Applications folder.',
    'On first launch, right-click the app and select "Open" to bypass Gatekeeper.',
    'Enter your license key when prompted, or start a free trial.',
  ],
  windows: [
    'Download the .exe installer from above.',
    'Run the installer as Administrator.',
    'Follow the on-screen wizard — default settings work for most users.',
    'Launch MailSavior from the Start Menu and activate your license.',
  ],
  linux: [
    'Download the .deb or .AppImage package.',
    'For .deb: run sudo dpkg -i mailsavior_1.4.2_amd64.deb',
    'For .AppImage: chmod +x mailsavior-1.4.2.AppImage && ./mailsavior-1.4.2.AppImage',
    'Grant execute permissions if prompted, then activate your license.',
  ],
  cli: [
    'Install Node.js 18+ from nodejs.org.',
    'Run: npm install -g @mailsavior/cli',
    'Authenticate: mailsavior login',
    'Convert: mailsavior convert input.pst --format mbox --output ./output/',
  ],
}

const stats = [
  { icon: Download, label: 'Total Downloads', value: '127 400+' },
  { icon: Users, label: 'Active Users', value: '52 800+' },
  { icon: Globe, label: 'Countries Served', value: '143' },
  { icon: Zap, label: 'Avg Conversion Speed', value: '< 2 min / GB' },
]

/* -------------------------------------------------------------------------- */
/*                              COMPONENT                                     */
/* -------------------------------------------------------------------------- */

export default function DownloadPage() {
  const [activeOs, setActiveOs] = useState<'macOS' | 'windows' | 'linux' | 'cli'>('macOS')
  const [expandedRelease, setExpandedRelease] = useState<string | null>('v1.4.2')
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  const handleDownload = (platformName: string) => {
    toast.success(`Starting download for ${platformName}...`)
  }

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    toast.success('Checksum copied to clipboard')
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  }

  return (
    <>
      <SEO
        title="Download MailSavior — Desktop & CLI"
        description="Download MailSavior for macOS, Windows, Linux, or CLI. Convert PST, MBOX, and EML archives locally with full privacy."
      />

      <div className="py-20 px-4">
        <div className="max-w-5xl mx-auto">

          {/* ─── Header ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="section-label">Downloads</span>
            <h1 className="section-title">
              Get the MailSavior <span className="gradient-brand-text">desktop app</span>
            </h1>
            <p className="section-subtitle mx-auto">
              Convert files locally on your own machine without uploading to the cloud, or run automated backups directly from your workstation.
            </p>
          </motion.div>

          {/* ─── Platform Cards ─── */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-20"
          >
            {platforms.map((p) => (
              <motion.div
                key={p.name}
                variants={item}
                className={`glass-card p-6 relative flex flex-col justify-between ${
                  p.recommended
                    ? 'border-brand-500/30 shadow-lg shadow-brand-500/5'
                    : 'border border-white/5'
                }`}
              >
                {p.recommended && (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-brand-500 text-white shadow-md">
                    <CheckCircle2 className="w-3 h-3" /> Recommended
                  </span>
                )}

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white shrink-0 shadow-md">
                    <p.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.version} — {p.arch}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      File size: {p.fileSize}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requires: {p.requirements.join(', ')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(p.name)}
                  className="btn-primary w-full justify-center"
                >
                  <Download className="w-4 h-4" /> Download Installer
                </button>
              </motion.div>
            ))}
          </motion.div>

          {/* ─── Privacy Callout ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card p-8 flex flex-col md:flex-row items-center gap-6 mb-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent-500/10 flex items-center justify-center text-accent-400 shrink-0">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                100% Private Offline Conversion
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Prefer not to upload files to the cloud? The MailSavior Desktop App converts your PST, MBOX, and EML archives locally on your computer. Your sensitive emails never leave your device — no data is transmitted, no accounts are required.
              </p>
            </div>
          </motion.div>

          {/* ─── Download Statistics ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-20"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Download Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="glass-card p-6 text-center border border-white/5"
                >
                  <s.icon className="w-6 h-6 text-brand-400 mx-auto mb-3" />
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ─── System Requirements ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-20"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              System Requirements
            </h2>
            <div className="glass-card p-8 border border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Operating System</h4>
                      <ul className="mt-2 space-y-1">
                        {systemRequirements.os.map((os) => (
                          <li key={os} className="text-xs text-slate-400 flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 mt-0.5 text-brand-400 shrink-0" />
                            {os}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <HardDrive className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Disk Space</h4>
                      <p className="text-xs text-slate-400 mt-1">{systemRequirements.disk}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Processor</h4>
                      <p className="text-xs text-slate-400 mt-1">{systemRequirements.processor}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Memory (RAM)</h4>
                      <p className="text-xs text-slate-400 mt-1">{systemRequirements.ram}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Monitor className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Display</h4>
                      <p className="text-xs text-slate-400 mt-1">{systemRequirements.display}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Network</h4>
                      <p className="text-xs text-slate-400 mt-1">{systemRequirements.network}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── Installation Guide ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-20"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Installation Guide
            </h2>
            <div className="glass-card border border-white/5 overflow-hidden">
              <div className="flex border-b border-white/5">
                {(['macOS', 'windows', 'linux', 'cli'] as const).map((os) => (
                  <button
                    key={os}
                    onClick={() => setActiveOs(os)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeOs === os
                        ? 'text-brand-400 bg-brand-500/10 border-b-2 border-brand-500'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {os === 'macOS' ? 'macOS' : os === 'windows' ? 'Windows' : os === 'linux' ? 'Linux' : 'CLI'}
                  </button>
                ))}
              </div>
              <div className="p-8">
                <ol className="space-y-4">
                  {installationSteps[activeOs].map((step, i) => (
                    <motion.li
                      key={`${activeOs}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.08 }}
                      className="flex items-start gap-4"
                    >
                      <span className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed pt-1">{step}</p>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>

          {/* ─── Version History ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-20"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Version History
            </h2>
            <div className="space-y-4">
              {releases.map((r) => {
                const isOpen = expandedRelease === r.version
                return (
                  <motion.div
                    key={r.version}
                    layout
                    className="glass-card border border-white/5 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedRelease(isOpen ? null : r.version)
                      }
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">{r.version}</span>
                        <span className="text-xs text-slate-500">{r.date}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.tag === 'Latest'
                              ? 'bg-brand-500/15 text-brand-400'
                              : r.tag === 'Major'
                                ? 'bg-green-500/15 text-green-400'
                                : 'bg-slate-500/15 text-slate-400'
                          }`}
                        >
                          {r.tag}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="px-5 pb-5 border-t border-white/5">
                            <ul className="mt-4 space-y-2">
                              {r.changes.map((c, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-slate-400"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* ─── SHA Checksums ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              SHA-256 Checksums
            </h2>
            <p className="text-sm text-slate-400 text-center mb-8">
              Verify the integrity of your download using the checksums below.
            </p>
            <div className="glass-card border border-white/5 overflow-hidden">
              <div className="divide-y divide-white/5">
                {platforms.map((p) => (
                  <div
                    key={p.name}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <p.icon className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-sm text-white font-medium truncate">
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-slate-400 font-mono bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                        <Hash className="w-3 h-3 inline mr-1 text-slate-500" />
                        {p.checksum}
                      </code>
                      <button
                        onClick={() => handleCopyHash(p.checksum)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        title="Copy checksum"
                      >
                        {copiedHash === p.checksum ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </>
  )
}
