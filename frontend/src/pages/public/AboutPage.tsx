import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Shield, Target, Award, Users, Heart, Zap, Globe,
  Lock, Eye, Lightbulb, ArrowRight, Building2, Mail,
  Clock, TrendingUp, CheckCircle, Rocket, Star, Handshake,
} from 'lucide-react'
import { SEO } from '@/components/seo'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const },
  }),
}

const stats = [
  { value: '2019', label: 'Founded', icon: Building2 },
  { value: '85+', label: 'Team Members', icon: Users },
  { value: '50K+', label: 'Users Worldwide', icon: Globe },
  { value: '2M+', label: 'Emails Backed Up', icon: Mail },
  { value: '99.9%', label: 'Uptime SLA', icon: Clock },
  { value: '150+', label: 'Countries Served', icon: TrendingUp },
]

const coreValues = [
  {
    icon: Shield,
    title: 'Absolute Privacy',
    description: 'Your email archives are yours alone. We invest heavily in encryption protocols and local-first offline conversions to ensure maximum data protection.',
    color: '#6366f1',
  },
  {
    icon: Target,
    title: 'Reliability & Precision',
    description: 'Not a single bit should be lost when backing up or converting emails. Our parsing engines are built with maximum accuracy and redundancy.',
    color: '#8b5cf6',
  },
  {
    icon: Award,
    title: 'Premium Quality',
    description: 'We build software that is fast, accessible, secure, and visually beautiful. SaaS design should wow users and perform flawlessly.',
    color: '#10b981',
  },
  {
    icon: Heart,
    title: 'Customer First',
    description: 'Every feature decision starts with our users. We listen, iterate, and deliver tools that solve real problems for real people.',
    color: '#ec4899',
  },
  {
    icon: Eye,
    title: 'Transparency',
    description: 'Open pricing, honest communication, and clear documentation. No hidden fees, no dark patterns, no surprises.',
    color: '#f59e0b',
  },
  {
    icon: Handshake,
    title: 'Trust & Integrity',
    description: 'We earn trust through consistent action — SOC2 compliance, GDPR adherence, and a relentless commitment to doing the right thing.',
    color: '#3b82f6',
  },
]

const team = [
  {
    name: 'Elena Vasquez',
    role: 'CEO & Co-Founder',
    bio: 'Former cybersecurity lead at a Fortune 500 company. Passionate about building tools that make data ownership simple for everyone.',
    initials: 'EV',
    color: '#6366f1',
  },
  {
    name: 'Marcus Chen',
    role: 'CTO & Co-Founder',
    bio: 'Systems architect with 15+ years in distributed computing. Designed the core email parsing engine that powers MailSavior.',
    initials: 'MC',
    color: '#8b5cf6',
  },
  {
    name: 'Priya Sharma',
    role: 'VP of Engineering',
    bio: 'Led infrastructure teams at top SaaS startups. Now scaling MailSivor\'s platform to serve millions of emails reliably.',
    initials: 'PS',
    color: '#10b981',
  },
  {
    name: 'James O\'Brien',
    role: 'Head of Product',
    bio: 'Product strategist obsessed with UX. Bridges the gap between complex email formats and intuitive user experiences.',
    initials: 'JO',
    color: '#ec4899',
  },
  {
    name: 'Amara Diallo',
    role: 'Lead Security Engineer',
    bio: 'Certified ethical hacker and encryption specialist. Ensures every layer of MailSavior meets the highest security standards.',
    initials: 'AD',
    color: '#f59e0b',
  },
  {
    name: 'David Kim',
    role: 'Head of Customer Success',
    bio: 'Empathetic problem-solver who built our support and onboarding programs. Helps thousands of users migrate and manage their emails.',
    initials: 'DK',
    color: '#3b82f6',
  },
]

const milestones = [
  { year: '2019', event: 'MailSavior founded by Elena and Marcus to solve email backup challenges.' },
  { year: '2020', event: 'Launched desktop converter supporting PST, MBOX, and EML formats.' },
  { year: '2021', event: 'Reached 10,000 users. Released cloud backup feature for Gmail and Outlook.' },
  { year: '2022', event: 'Achieved SOC2 Type II certification. Expanded to 50+ countries.' },
  { year: '2023', event: 'Launched enterprise API, team management, and real-time monitoring dashboard.' },
  { year: '2024', event: 'Surpassed 50,000 users. Released AI-powered email search and batch conversion.' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About MailSavior',
  description: 'Learn about MailSavior — the email backup and converter SaaS platform trusted by over 50,000 users worldwide.',
  publisher: {
    '@type': 'Organization',
    name: 'MailSavior',
    foundingDate: '2019',
  },
}

export default function AboutPage() {
  return (
    <div className="overflow-hidden">
      <SEO
        title="About Us"
        description="Learn about MailSavior — the email backup and converter SaaS platform trusted by over 50,000 users worldwide. Our mission, team, and story."
        jsonLd={jsonLd}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-[60vh] flex items-center justify-center pt-28 pb-16 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-brand-600/8 blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] rounded-full bg-purple-600/6 blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.span
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="section-label"
          >
            About Us
          </motion.span>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-[1.08] tracking-tight mb-6"
          >
            Safeguarding your{' '}
            <span className="gradient-brand-text">digital memory</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            MailSavior was founded with a clear mission: to make email backup,
            archiving, and migration effortless, secure, and accessible for
            everyone.
          </motion.p>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="py-16 px-4 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
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
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mx-auto mb-3">
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold gradient-brand-text font-display mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Company Story ───────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card p-8 sm:p-10 border border-white/5 bg-surface-800/40"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
                <Rocket className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white">Our Story</h2>
            </div>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                In the modern business landscape, emails represent the ultimate
                record of truth. Conversations, agreements, attachments, and
                historical interactions live inside your mailboxes. However,
                standard providers make archiving, backing up, and converting
                between different system formats complex and frustrating.
              </p>
              <p>
                MailSavior was built by a team of system administrators,
                security engineers, and developers who wanted to create a
                bulletproof email utility that was SOC2-compliant, automated,
                fast, and secure. What started as a side project quickly grew
                into a platform trusted by professionals, teams, and enterprises
                worldwide.
              </p>
              <p>
                Today, over 50,000 users rely on MailSavior to protect their
                most critical communications. From solo freelancers migrating
                between email providers to Fortune 500 companies auditing
                decades of correspondence, we build the tools that make email
                data portable, safe, and always accessible.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mission & Vision ────────────────────────────────── */}
      <section className="py-24 px-4 bg-surface-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-label">
              <Lightbulb className="w-3.5 h-3.5" /> Purpose
            </span>
            <h2 className="section-title">
              Our Mission & <span className="gradient-brand-text">Vision</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              className="glass-card p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-5">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Our Mission</h3>
              <p className="text-slate-400 leading-relaxed">
                To empower every individual and organization with full control
                over their email data — providing effortless backup, instant
                conversion, and uncompromising security. We believe no one
                should ever lose access to their critical communications
                because of vendor lock-in, format incompatibility, or
                inadequate tools.
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              className="glass-card p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-5">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Our Vision</h3>
              <p className="text-slate-400 leading-relaxed">
                A world where email data is truly portable, universally
                accessible, and never held hostage by proprietary platforms. We
                envision a future where every email — from the first sent
                message to the latest thread — is preserved, searchable, and
                ready for whatever comes next, on the user's terms.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Core Values ─────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-label">
              <Star className="w-3.5 h-3.5" /> Values
            </span>
            <h2 className="section-title">
              Our Core <span className="gradient-brand-text">Values</span>
            </h2>
            <p className="section-subtitle mx-auto">
              The principles that guide every decision we make, every feature
              we build, and every interaction we have.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {coreValues.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-6 hover:border-white/15 transition-all group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform"
                  style={{ background: `${value.color}18`, color: value.color }}
                >
                  <value.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {value.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Milestones Timeline ─────────────────────────────── */}
      <section className="py-24 px-4 bg-surface-800/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-label">
              <Clock className="w-3.5 h-3.5" /> Journey
            </span>
            <h2 className="section-title">
              Key <span className="gradient-brand-text">Milestones</span>
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-brand-500/50 via-purple-500/30 to-transparent" />
            <div className="space-y-10">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  className="relative pl-16 sm:pl-20"
                >
                  <div className="absolute left-3 sm:left-5 top-1 w-7 h-7 rounded-full gradient-brand flex items-center justify-center glow-brand-sm">
                    <span className="text-[10px] font-bold text-white">
                      {m.year.slice(2)}
                    </span>
                  </div>
                  <div className="glass-card p-5">
                    <span className="text-sm font-bold gradient-brand-text">
                      {m.year}
                    </span>
                    <p className="text-slate-300 text-sm leading-relaxed mt-1">
                      {m.event}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-label">
              <Users className="w-3.5 h-3.5" /> Team
            </span>
            <h2 className="section-title">
              Meet the <span className="gradient-brand-text">people behind MailSavior</span>
            </h2>
            <p className="section-subtitle mx-auto">
              A passionate team of engineers, designers, and security experts
              united by a shared goal — protecting your digital communications.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="glass-card p-6 text-center hover:border-white/15 transition-all group"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-black text-white mx-auto mb-4 group-hover:scale-110 transition-transform"
                  style={{ background: `${member.color}20`, color: member.color }}
                >
                  {member.initials}
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  {member.name}
                </h3>
                <p
                  className="text-xs font-semibold mb-3"
                  style={{ color: member.color }}
                >
                  {member.role}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {member.bio}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ──────────────────────────────────── */}
      <section className="py-24 px-4 bg-surface-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="section-label">
              <CheckCircle className="w-3.5 h-3.5" /> Why MailSavior
            </span>
            <h2 className="section-title">
              Built for <span className="gradient-brand-text">enterprise reliability</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Lock,
                title: 'SOC2 & GDPR Compliant',
                description:
                  'Enterprise-grade compliance baked into every layer of our infrastructure and workflows.',
              },
              {
                icon: Zap,
                title: 'Lightning-Fast Conversion',
                description:
                  'Convert thousands of emails in seconds with our distributed, fault-tolerant processing engine.',
              },
              {
                icon: Globe,
                title: 'Universal Provider Support',
                description:
                  'Gmail, Outlook, Yahoo, iCloud, Zoho, AOL, and any IMAP-compatible server work out of the box.',
              },
              {
                icon: Shield,
                title: 'Military-Grade Encryption',
                description:
                  'AES-256 at rest and TLS 1.3 in transit. Your data is encrypted end-to-end, always.',
              },
              {
                icon: Rocket,
                title: 'Offline Desktop App',
                description:
                  'Convert files locally without sending data to the cloud. Complete privacy, zero compromise.',
              },
              {
                icon: Users,
                title: 'Dedicated Support Team',
                description:
                  'Real humans available 24/7 to help with migrations, troubleshooting, and best practices.',
              },
            ].map((item, i) => (
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
                <h3 className="text-base font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact CTA ────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card p-10 sm:p-14 border border-white/5"
          >
            <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6 glow-brand-sm">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Let's build something{' '}
              <span className="gradient-brand-text">together</span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
              Whether you have a question, need help with a migration, or want
              to explore an enterprise partnership — we'd love to hear from
              you. Our team responds within 24 hours.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/contact"
                className="btn-primary btn-xl glow-brand-sm"
              >
                Contact Us
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="mailto:hello@mailsavior.com"
                className="btn-ghost btn-xl"
              >
                hello@mailsavior.com
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
