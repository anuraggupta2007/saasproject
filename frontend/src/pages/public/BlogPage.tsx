import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, ArrowRight, Search, Tag, X } from 'lucide-react'
import { SEO } from '@/components/seo'
import { NewsletterForm } from '@/components/shared/NewsletterForm'

interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  date: string
  author: string
  readTime: string
  gradient: string
  featured?: boolean
}

const blogPosts: BlogPost[] = [
  {
    id: 'mailsavior-2-launch',
    title: 'Introducing MailSavior 2.0: Local Desktop Client for Absolute Privacy',
    excerpt: 'We are thrilled to launch MailSavior 2.0, featuring our all-new Desktop application for macOS, Windows, and Linux. Now you can back up and convert massive email files completely offline.',
    content: 'This release marks a major milestone in our mission to give users full control over their email data.',
    category: 'Announcements',
    tags: ['Product Launch', 'Desktop', 'Privacy', 'Offline'],
    date: 'July 8, 2026',
    author: 'Alex Johnson',
    readTime: '4 min read',
    gradient: 'from-brand-500 via-purple-500 to-pink-500',
    featured: true,
  },
  {
    id: 'outlook-to-gmail',
    title: 'Migrating from Outlook to Gmail: The Complete Guide',
    excerpt: 'Everything you need to know about exporting PST files and importing them into your Google Workspace with zero data loss. We cover every step from start to finish.',
    content: 'Migrating email providers can feel daunting, but with the right tooling it becomes straightforward.',
    category: 'Guides',
    tags: ['Migration', 'Outlook', 'Gmail', 'PST', 'Google Workspace'],
    date: 'July 5, 2026',
    author: 'Alex Johnson',
    readTime: '6 min read',
    gradient: 'from-brand-500 to-purple-500',
  },
  {
    id: 'soc2-compliance',
    title: 'Why Email Backups are Critical for SOC2 Compliance',
    excerpt: 'Understand the compliance audits, archiving standards, and security controls needed to pass your enterprise audits. Email retention is a cornerstone of SOC2.',
    content: 'SOC2 compliance demands rigorous data retention policies that many organizations overlook.',
    category: 'Security',
    tags: ['SOC2', 'Compliance', 'Enterprise', 'Archiving', 'Audit'],
    date: 'June 28, 2026',
    author: 'Sarah Jenkins',
    readTime: '8 min read',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 'email-file-formats',
    title: 'Understanding PST, MBOX, and EML File Formats',
    excerpt: 'A deep dive into the technical details, structure, and differences of the major email archiving file standards. Know which format fits your workflow.',
    content: 'Each file format was designed for different ecosystems and carries unique trade-offs.',
    category: 'Technical',
    tags: ['PST', 'MBOX', 'EML', 'File Formats', 'Deep Dive'],
    date: 'June 15, 2026',
    author: 'David Chen',
    readTime: '10 min read',
    gradient: 'from-blue-500 to-teal-500',
  },
  {
    id: 'email-security-checklist',
    title: 'The 10-Point Email Security Checklist for 2026',
    excerpt: 'Protect your inbox with this actionable security checklist covering MFA, encryption, phishing awareness, backup redundancy, and more.',
    content: 'Email remains the number one attack vector for businesses of all sizes.',
    category: 'Security',
    tags: ['Checklist', 'MFA', 'Encryption', 'Phishing', 'Best Practices'],
    date: 'June 10, 2026',
    author: 'Sarah Jenkins',
    readTime: '7 min read',
    gradient: 'from-red-500 to-orange-500',
  },
  {
    id: 'convert-pst-to-mbox',
    title: 'How to Convert PST Files to MBOX in Under 5 Minutes',
    excerpt: 'A step-by-step tutorial showing you how to use MailSavior to convert legacy Outlook PST archives into universal MBOX files.',
    content: 'Converting PST to MBOX unlocks cross-platform compatibility for your email archives.',
    category: 'Tutorials',
    tags: ['PST', 'MBOX', 'Conversion', 'Tutorial', 'Step-by-Step'],
    date: 'June 2, 2026',
    author: 'David Chen',
    readTime: '5 min read',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'cloud-vs-local-backup',
    title: 'Cloud vs. Local Email Backups: Which Strategy is Right for You?',
    excerpt: 'We compare cloud-based email backup services with local-only solutions across security, cost, speed, and compliance dimensions.',
    content: 'The backup strategy you choose has lasting implications for data sovereignty and disaster recovery.',
    category: 'Guides',
    tags: ['Cloud', 'Local', 'Backup', 'Strategy', 'Comparison'],
    date: 'May 25, 2026',
    author: 'Alex Johnson',
    readTime: '9 min read',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    id: 'bulk-export-gmail',
    title: 'Tutorial: Bulk Export All Gmail Labels with MailSavior',
    excerpt: 'Learn how to connect your Google account, select specific labels, and export thousands of emails to MBOX or EML in a single batch operation.',
    content: 'Google Takeout is limited. MailSavior gives you granular control over bulk exports.',
    category: 'Tutorials',
    tags: ['Gmail', 'Export', 'Bulk', 'Tutorial', 'MBOX'],
    date: 'May 18, 2026',
    author: 'David Chen',
    readTime: '6 min read',
    gradient: 'from-green-500 to-emerald-500',
  },
]

const categories = ['All', 'Guides', 'Security', 'Technical', 'Announcements', 'Tutorials'] as const
type Category = (typeof categories)[number]

const categoryColors: Record<string, string> = {
  Guides: 'badge-brand',
  Security: 'badge-warning',
  Technical: 'badge-info',
  Announcements: 'badge-success',
  Tutorials: 'badge-neutral',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const featuredPost = blogPosts.find((p) => p.featured)
  const regularPosts = blogPosts.filter((p) => !p.featured)

  const filteredPosts = useMemo(() => {
    let posts = regularPosts
    if (activeCategory !== 'All') {
      posts = posts.filter((p) => p.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return posts
  }, [activeCategory, searchQuery, regularPosts])

  const relatedArticles = useMemo(() => {
    if (!featuredPost) return []
    return blogPosts
      .filter((p) => p.id !== featuredPost.id && p.category === featuredPost.category)
      .slice(0, 3)
  }, [featuredPost])

  return (
    <>
      <SEO
        title="Blog | MailSavior"
        description="Stay up-to-date with email security best practices, migration guides, technical deep-dives, and product announcements from MailSavior."
      />

      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="section-label">Blog</span>
            <h1 className="section-title">
              Insights on email security &{' '}
              <span className="gradient-brand-text">migrations</span>
            </h1>
            <p className="section-subtitle mx-auto max-w-xl">
              Stay up-to-date with industry best practices, expert guides, and technical tutorials.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="max-w-xl mx-auto mb-10"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, tags, or topics..."
                className="w-full pl-11 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Category Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-14"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:border-white/15 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Featured Post */}
          {featuredPost && activeCategory === 'All' && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card border border-white/5 bg-surface-800/40 p-6 md:p-10 flex flex-col lg:flex-row gap-8 mb-12 hover:border-white/10 transition-all"
            >
              <div className="flex-1 rounded-xl bg-gradient-to-br from-brand-500 via-purple-500 to-pink-500 min-h-[250px] flex items-center justify-center p-6 text-center">
                <h2 className="text-2xl md:text-3xl font-extrabold text-white max-w-md leading-tight">
                  MailSavior 2.0: Introducing Desktop Local Mode
                </h2>
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="badge badge-success">Announcements</span>
                  <h2 className="text-2xl font-bold text-white hover:text-brand-300 transition-colors cursor-pointer">
                    {featuredPost.title}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {featuredPost.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-xs text-slate-400 border border-white/5"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-6">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {featuredPost.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {featuredPost.readTime}
                    </div>
                    <span className="text-slate-600">by {featuredPost.author}</span>
                  </div>
                  <button className="text-brand-400 hover:text-brand-300 font-semibold text-sm flex items-center gap-1.5 group">
                    Read Article{' '}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Regular Posts Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${searchQuery}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredPosts.map((post) => (
                <motion.article
                  key={post.id}
                  variants={itemVariants}
                  className="card flex flex-col justify-between hover:scale-[1.01] transition-all cursor-pointer group"
                >
                  <div className="space-y-4">
                    <div
                      className={`h-40 rounded-xl bg-gradient-to-br ${post.gradient} opacity-80 group-hover:opacity-100 transition-opacity mb-4`}
                    />
                    <span className={`badge ${categoryColors[post.category] || 'badge-neutral'} text-xs`}>
                      {post.category}
                    </span>
                    <h3 className="text-lg font-bold text-white leading-snug group-hover:text-brand-300 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3">{post.excerpt}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-slate-500 border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-slate-600">
                          +{post.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {post.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readTime}
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Empty State */}
          {filteredPosts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-400 mb-2">No articles found</h3>
              <p className="text-sm text-slate-500">
                Try adjusting your search or category filter.
              </p>
            </motion.div>
          )}

          {/* Related Articles Section */}
          {relatedArticles.length > 0 && activeCategory === 'All' && !searchQuery && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              className="mt-20"
            >
              <div className="mb-8">
                <span className="section-label">Related Articles</span>
                <h2 className="text-2xl font-bold text-white">
                  More in <span className="gradient-brand-text">{featuredPost?.category}</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((post) => (
                  <motion.article
                    key={post.id}
                    whileHover={{ y: -4 }}
                    className="card flex flex-col justify-between hover:border-white/15 transition-all cursor-pointer group"
                  >
                    <div className="space-y-3">
                      <div
                        className={`h-32 rounded-xl bg-gradient-to-br ${post.gradient} opacity-70 group-hover:opacity-100 transition-opacity`}
                      />
                      <span className={`badge ${categoryColors[post.category] || 'badge-neutral'} text-xs`}>
                        {post.category}
                      </span>
                      <h3 className="text-base font-bold text-white leading-snug group-hover:text-brand-300 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{post.excerpt}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {post.date}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readTime}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.section>
          )}

          {/* Newsletter CTA */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            className="mt-20"
          >
            <div className="glass-card rounded-2xl p-8 md:p-12 text-center max-w-3xl mx-auto border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-brand-600/15 blur-[80px] rounded-full" />
              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Stay in the loop
                </h2>
                <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                  Get the latest articles, tutorials, and product updates delivered straight to your inbox. No spam, unsubscribe anytime.
                </p>
                <NewsletterForm variant="card" />
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </>
  )
}
