import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Search,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  HelpCircle,
  Shield,
  CreditCard,
  Wrench,
  Database,
  Shuffle,
  MessageCircleQuestion,
  Sparkles,
  X,
} from 'lucide-react'
import { SEO } from '@/components/seo'

type FaqItem = {
  q: string
  a: string
  keywords: string[]
}

type Category = {
  category: string
  icon: React.ElementType
  color: string
  questions: FaqItem[]
}

const faqCategories: Category[] = [
  {
    category: 'General',
    icon: HelpCircle,
    color: '#08619d',
    questions: [
      {
        q: 'What is MailSavior?',
        a: 'MailSavior is a comprehensive Email Backup & Email Converter SaaS platform. It allows users to connect various email accounts (like Gmail, Outlook, Zoho, etc.) for automated backups, and convert bulk email files (like PST, MBOX, EML, MSG) to different formats.',
        keywords: ['what', 'mailsavior', 'email', 'backup', 'converter'],
      },
      {
        q: 'Do I need technical skills to use it?',
        a: 'Not at all. We provide a simple, clean, and interactive user dashboard for both backups and file conversions. For developers, we also offer a CLI and API keys, but the primary interface is friendly for all users.',
        keywords: ['technical', 'skills', 'developer', 'cli', 'api', 'dashboard'],
      },
      {
        q: 'Which email providers are supported?',
        a: 'We support Gmail, Outlook, Microsoft 365, Yahoo, iCloud, Zoho Mail, AOL, and any custom IMAP/POP3 server. We are constantly adding new providers based on user requests.',
        keywords: ['providers', 'gmail', 'outlook', 'imap', 'pop3', 'supported'],
      },
      {
        q: 'Is there a desktop version available?',
        a: 'Yes! MailSavior offers both a cloud-based web app and a downloadable desktop application for Windows and macOS. The desktop app converts files locally without uploading any data.',
        keywords: ['desktop', 'download', 'windows', 'macos', 'app'],
      },
    ],
  },
  {
    category: 'Security & Privacy',
    icon: Shield,
    color: '#009688',
    questions: [
      {
        q: 'Is my email data safe?',
        a: 'Absolutely. We use industry-standard AES-256 encryption at rest and TLS 1.3 in transit. For cloud-connected accounts, we use secure OAuth scopes where possible, ensuring we never store your raw password. Furthermore, our offline desktop app converts files locally so no data is ever uploaded.',
        keywords: ['safe', 'security', 'encryption', 'aes', 'tls', 'password'],
      },
      {
        q: 'Who owns the backup archives?',
        a: 'You do. You can download your backup archives at any time in multiple formats (PST, MBOX, EML) and save them to your own storage infrastructure.',
        keywords: ['own', 'archives', 'download', 'ownership'],
      },
      {
        q: 'Does MailSavior comply with GDPR?',
        a: 'Yes. We are fully GDPR compliant. You can request a full data export or permanent deletion of your account and all associated data at any time from the Privacy settings in your dashboard.',
        keywords: ['gdpr', 'compliance', 'privacy', 'data', 'deletion', 'export'],
      },
      {
        q: 'Do you store my email password?',
        a: 'No. We use OAuth authentication for supported providers (Gmail, Outlook, etc.), which means we never see or store your password. For IMAP/POP3 connections, credentials are encrypted with AES-256 and never used outside of the authentication flow.',
        keywords: ['password', 'oauth', 'credentials', 'imap', 'store'],
      },
    ],
  },
  {
    category: 'Billing & Account',
    icon: CreditCard,
    color: '#f59e0b',
    questions: [
      {
        q: 'Can I cancel my subscription?',
        a: 'Yes, you can cancel your subscription at any time from the billing section of your dashboard. There are no cancellation fees. Your access continues until the end of your current billing period.',
        keywords: ['cancel', 'subscription', 'billing', 'fee'],
      },
      {
        q: 'Is there a free tier?',
        a: 'Yes! We offer a free forever plan that allows connecting 1 email account with 1 GB of storage and up to 100 email conversions per file.',
        keywords: ['free', 'plan', 'tier', 'pricing'],
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex), PayPal, and wire transfers for annual enterprise plans. All payments are processed securely through Stripe.',
        keywords: ['payment', 'credit', 'card', 'paypal', 'stripe', 'wire'],
      },
      {
        q: 'Do you offer refunds?',
        a: 'We offer a 14-day money-back guarantee on all paid plans. If you are not satisfied within the first 14 days, contact support for a full refund. After that period, you can cancel anytime but refunds are not provided for partial months.',
        keywords: ['refund', 'money back', 'guarantee', 'return'],
      },
    ],
  },
  {
    category: 'Technical',
    icon: Wrench,
    color: '#009688',
    questions: [
      {
        q: 'What file formats can I convert to?',
        a: 'MailSavior supports conversion between PST, MBOX, EML, MSG, PDF, and HTML formats. Our converter preserves folder structure, attachments, metadata, and formatting during conversion.',
        keywords: ['convert', 'formats', 'pst', 'mbox', 'eml', 'pdf'],
      },
      {
        q: 'Is there an API available?',
        a: 'Yes, we provide a RESTful API for both backup management and email conversion. Documentation is available at docs.mailsavior.com, and API keys can be generated from your account settings.',
        keywords: ['api', 'rest', 'developer', 'integration', 'documentation'],
      },
      {
        q: 'What are the storage limits?',
        a: 'Storage varies by plan: Free (1 GB), Starter (25 GB), Professional (100 GB), and Enterprise (unlimited). You can purchase additional storage add-ons at any time if needed.',
        keywords: ['storage', 'limit', 'plan', 'space', 'quota'],
      },
      {
        q: 'How fast is the conversion engine?',
        a: 'Our distributed processing engine can convert thousands of emails per minute. Typical PST-to-MBOX conversions complete in under 30 seconds for files up to 1 GB. Larger files are processed incrementally.',
        keywords: ['speed', 'fast', 'conversion', 'performance', 'engine'],
      },
    ],
  },
  {
    category: 'Backup & Recovery',
    icon: Database,
    color: '#ec4899',
    questions: [
      {
        q: 'How do I schedule automatic backups?',
        a: 'Navigate to your Connected Accounts, select the account you want to back up, and click "Schedule Backup." You can choose daily, weekly, or monthly intervals. We will notify you if a backup ever fails.',
        keywords: ['schedule', 'automatic', 'backup', 'daily', 'weekly'],
      },
      {
        q: 'Can I restore emails from a backup?',
        a: 'Yes. From your backup archive, select the emails or folders you want to restore and choose the target account. We support restoring to any connected Gmail or Outlook account via our secure API.',
        keywords: ['restore', 'recovery', 'recover', 'backup'],
      },
      {
        q: 'Where are my backups stored?',
        a: 'Backups are stored in encrypted form on our cloud infrastructure (AWS S3 with AES-256). You can also configure backup destinations to include Google Drive, Dropbox, or OneDrive for additional redundancy.',
        keywords: ['storage', 'cloud', 'aws', 'google drive', 'dropbox'],
      },
    ],
  },
  {
    category: 'Conversion',
    icon: Shuffle,
    color: '#06b6d4',
    questions: [
      {
        q: 'How accurate is the email conversion?',
        a: 'Our converter preserves attachments, embedded images, HTML formatting, metadata (sender, date, CC/BCC), and folder hierarchy with 99.9% fidelity. We run automated regression tests on millions of emails.',
        keywords: ['accurate', 'fidelity', 'formatting', 'metadata', 'attachments'],
      },
      {
        q: 'Can I convert large PST files?',
        a: 'Yes. We handle PST files of any size. Our engine processes files in chunks to avoid memory issues. Files over 10 GB are processed server-side with progress tracking so you can monitor the conversion in real time.',
        keywords: ['large', 'pst', 'big', 'size', 'chunk'],
      },
      {
        q: 'Does conversion preserve attachments?',
        a: 'Absolutely. All attachments, including inline images, are fully preserved during conversion. They are embedded in the output file exactly as they appeared in the original email.',
        keywords: ['attachments', 'images', 'preserve', 'inline'],
      },
      {
        q: 'Can I batch convert multiple files?',
        a: 'Yes. You can upload multiple email files at once and convert them all in a single batch job. Our queue system processes them in parallel for maximum speed, and you can download a ZIP archive of all results.',
        keywords: ['batch', 'multiple', 'queue', 'parallel', 'zip'],
      },
    ],
  },
]

const allQuestions = faqCategories.flatMap((cat) =>
  cat.questions.map((q) => ({ ...q, category: cat.category }))
)

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

function HelpfulButtons({ itemKey: _itemKey }: { itemKey: string }) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const [counts, setCounts] = useState({ up: 0, down: 0 })

  const handleVote = (direction: 'up' | 'down') => {
    if (vote === direction) {
      setVote(null)
      setCounts((prev) => ({ ...prev, [direction]: prev[direction] - 1 }))
    } else {
      const prev = vote
      setVote(direction)
      setCounts((prevCounts) => {
        const next = { ...prevCounts }
        if (prev) next[prev] = Math.max(0, next[prev] - 1)
        next[direction] = next[direction] + 1
        return next
      })
    }
  }

  return (
    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5">
      <span className="text-xs text-slate-500 mr-1">Was this helpful?</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleVote('up')
        }}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
          vote === 'up'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        {counts.up > 0 && counts.up}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleVote('down')
        }}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
          vote === 'down'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        {counts.down > 0 && counts.down}
      </button>
    </div>
  )
}

function RelatedQuestions({
  currentQ,
  currentCategory,
  onOpen,
}: {
  currentQ: string
  currentCategory: string
  onOpen: (key: string) => void
}) {
  const related = useMemo(() => {
    const sameCat = allQuestions.filter(
      (item) => item.category === currentCategory && item.q !== currentQ
    )
    const otherCat = allQuestions.filter(
      (item) => item.category !== currentCategory && item.q !== currentQ
    )
    const shuffled = [...sameCat.sort(() => Math.random() - 0.5), ...otherCat.sort(() => Math.random() - 0.5)]
    return shuffled.slice(0, 3)
  }, [currentQ, currentCategory])

  return (
    <div className="mt-4 pt-3 border-t border-white/5">
      <p className="text-xs font-medium text-slate-500 mb-2">Related Questions</p>
      <div className="flex flex-wrap gap-2">
        {related.map((item) => {
          const catObj = faqCategories.find((c) => c.category === item.category)
          const idx = catObj?.questions.findIndex((q) => q.q === item.q) ?? 0
          const key = `${item.category}-${idx}`
          return (
            <button
              key={item.q}
              onClick={(e) => {
                e.stopPropagation()
                onOpen(key)
              }}
              className="text-left text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200 max-w-xs truncate"
              title={item.q}
            >
              {item.q}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) {
      if (!activeCategory) return faqCategories
      return faqCategories.filter((cat) => cat.category === activeCategory)
    }
    return faqCategories
      .map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.toLowerCase().includes(q) ||
            item.keywords.some((k) => k.includes(q))
        ),
      }))
      .filter((cat) => cat.questions.length > 0)
  }, [searchQuery, activeCategory])

  const toggleFaq = (key: string) => {
    setOpenIndex(openIndex === key ? null : key)
  }

  const handleRelatedOpen = (key: string) => {
    setOpenIndex(key)
    setSearchQuery('')
    setActiveCategory(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalResults = filteredCategories.reduce((acc, cat) => acc + cat.questions.length, 0)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqCategories.flatMap((cat) =>
      cat.questions.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      }))
    ),
  }

  return (
    <>
      <SEO
        title="Frequently Asked Questions"
        description="Find answers to common questions about MailSavior email backup, conversion, security, billing, and technical support."
        canonical="https://mailsavior.com/faq"
        jsonLd={jsonLd}
      />

      <div className="min-h-screen relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <span className="section-label">FAQ</span>
              <h1 className="section-title">
                Frequently Asked{' '}
                <span className="gradient-brand-text">Questions</span>
              </h1>
              <p className="section-subtitle mx-auto font-display">
                Got questions? We have answers. Find everything you need about MailSavior.
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mb-8"
            >
              <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setActiveCategory(null)
                  }}
                  className="w-full pl-12 pr-10 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all duration-200 backdrop-blur-md text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-center text-xs text-slate-500 mt-3">
                  {totalResults} result{totalResults !== 1 ? 's' : ''} found
                </p>
              )}
            </motion.div>

            {/* Category Filter Chips */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-wrap justify-center gap-2 mb-12"
            >
              <button
                onClick={() => setActiveCategory(null)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                  activeCategory === null
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <MessageCircleQuestion className="w-3.5 h-3.5" />
                All
              </button>
              {faqCategories.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.category}
                    onClick={() =>
                      setActiveCategory(
                        activeCategory === cat.category ? null : cat.category
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                      activeCategory === cat.category
                        ? 'border'
                        : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                    style={
                      activeCategory === cat.category
                        ? {
                            backgroundColor: `${cat.color}15`,
                            color: cat.color,
                            borderColor: `${cat.color}40`,
                          }
                        : undefined
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat.category}
                  </button>
                )
              })}
            </motion.div>

            {/* FAQ Categories & Accordions */}
            <div className="space-y-10">
              {filteredCategories.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Search className="w-7 h-7 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    No questions found
                  </h3>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto">
                    Try a different search term or browse categories below.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setActiveCategory(null)
                    }}
                    className="mt-4 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors"
                  >
                    Clear search
                  </button>
                </motion.div>
              )}

              {filteredCategories.map((cat) => {
                const Icon = cat.icon
                return (
                  <motion.div
                    key={cat.category}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-40px' }}
                    variants={staggerContainer}
                    className="space-y-4"
                  >
                    <motion.h2
                      variants={fadeInUp}
                      className="text-xl font-bold text-white mb-2 flex items-center gap-2.5"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: `${cat.color}15`,
                          color: cat.color,
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {cat.category}
                    </motion.h2>

                    <div className="space-y-3">
                      {cat.questions.map((faq, index) => {
                        const itemKey = `${cat.category}-${index}`
                        const isOpen = openIndex === itemKey

                        return (
                          <motion.div
                            key={faq.q}
                            variants={fadeInUp}
                            className="card cursor-pointer border border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] backdrop-blur-xl transition-all duration-200"
                            onClick={() => toggleFaq(itemKey)}
                          >
                            <div className="flex justify-between items-center gap-4">
                              <h3 className="text-sm font-semibold text-slate-200">
                                {faq.q}
                              </h3>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <p className="text-sm text-slate-400 mt-3 leading-relaxed border-t border-white/[0.06] pt-3">
                                    {faq.a}
                                  </p>
                                  <HelpfulButtons itemKey={itemKey} />
                                  <RelatedQuestions
                                    currentQ={faq.q}
                                    currentCategory={cat.category}
                                    onOpen={handleRelatedOpen}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Still Have Questions CTA */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-16 mb-8"
            >
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-8 sm:p-10 text-center relative overflow-hidden">
                {/* Subtle background glow */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-brand-500/10 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10">
                  <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-brand-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    Still have questions?
                  </h2>
                  <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                    Our support team is here to help. Reach out and we'll get back to you within 24 hours.
                  </p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all duration-200 glow-brand-sm group"
                  >
                    <MessageCircleQuestion className="w-4 h-4" />
                    Contact Support
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}
