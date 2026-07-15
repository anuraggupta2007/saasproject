import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Mail,
  Send,
  MapPin,
  Phone,
  Clock,
  MessageSquare,
  Headphones,
  Users,
  Handshake,
  Globe,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  X,
  Share2,
  MessageCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SEO } from '@/components/seo'
import { Input, Textarea, Tabs } from '@/design-system'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

type ContactFormData = z.infer<typeof contactSchema>

const contactTabs = [
  { id: 'general', label: 'General Inquiry', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'sales', label: 'Sales', icon: <Users className="w-4 h-4" /> },
  { id: 'support', label: 'Technical Support', icon: <Headphones className="w-4 h-4" /> },
  { id: 'partnerships', label: 'Partnerships', icon: <Handshake className="w-4 h-4" /> },
]

const tabSubjects: Record<string, string> = {
  general: 'General Inquiry',
  sales: 'Sales & Pricing',
  support: 'Technical Support Request',
  partnerships: 'Business Partnership Opportunity',
}

const socialLinks = [
  { icon: X, label: 'Twitter', href: 'https://twitter.com/mailsavior', color: 'hover:text-sky-400' },
  { icon: Globe, label: 'GitHub', href: 'https://github.com/mailsavior', color: 'hover:text-white' },
  { icon: Share2, label: 'LinkedIn', href: 'https://linkedin.com/company/mailsavior', color: 'hover:text-blue-400' },
  { icon: MessageCircle, label: 'Discord', href: 'https://discord.gg/mailsavior', color: 'hover:text-indigo-400' },
]

const officeDetails = [
  {
    icon: MapPin,
    title: 'Visit Us',
    lines: ['100 Pine Street, Suite 1250', 'San Francisco, CA 94111', 'United States'],
    color: '#009688',
  },
  {
    icon: Phone,
    title: 'Call Us',
    lines: ['+1 (555) 019-2834', '+1 (555) 019-2835 (Fax)'],
    color: '#009688',
  },
  {
    icon: Clock,
    title: 'Business Hours',
    lines: ['Mon - Fri: 9:00 AM - 6:00 PM EST', 'Sat - Sun: Closed'],
    color: '#f59e0b',
  },
  {
    icon: Mail,
    title: 'Email Us',
    lines: ['support@mailsavior.com', 'sales@mailsavior.com'],
    color: '#08619d',
  },
]

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

export default function ContactPage() {
  const [activeTab, setActiveTab] = useState('general')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: tabSubjects.general,
    },
  })

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  const onSubmit = async (_data: ContactFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    toast.success('Your message has been sent successfully! We\'ll get back to you soon.')
    reset({ name: '', email: '', subject: tabSubjects[activeTab] || '', message: '' })
  }

  return (
    <>
      <SEO
        title="Contact Us"
        description="Get in touch with the MailSavior team. Whether you have a question about features, pricing, need technical support, or want to explore business partnerships — we're here to help."
        canonical="https://mailsavior.com/contact"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contact MailSavior',
          description: 'Contact the MailSavior team for support, sales inquiries, and partnerships.',
        }}
      />

      <div className="min-h-screen relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <span className="section-label">Contact Us</span>
              <h1 className="section-title">
                Get in touch with{' '}
                <span className="gradient-brand-text">our team</span>
              </h1>
              <p className="section-subtitle mx-auto max-w-2xl">
                Have questions about licensing, enterprise security, or need assistance?
                We're here to help. Choose a category below and send us a message.
              </p>
            </motion.div>

            {/* Response Time Indicator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="flex items-center justify-center gap-3 mb-12"
            >
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </div>
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">
                  We typically respond within{' '}
                  <span className="font-semibold text-white">24 hours</span>
                </span>
              </div>
            </motion.div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
              {/* Left Column — Sidebar Info */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-2 space-y-6"
              >
                {/* Office Details */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 space-y-5">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-brand-400" />
                    Our Offices
                  </h2>
                  <div className="space-y-4">
                    {officeDetails.map((item) => (
                      <motion.div
                        key={item.title}
                        variants={fadeInUp}
                        className="flex items-start gap-3.5 group"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                          style={{
                            background: `${item.color}14`,
                            color: item.color,
                          }}
                        >
                          <item.icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-0.5">
                            {item.title}
                          </h3>
                          {item.lines.map((line, i) => (
                            <p key={i} className="text-xs text-slate-400 leading-relaxed">
                              {line}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Google Maps Placeholder */}
                <motion.div
                  variants={fadeInUp}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden"
                >
                  <div className="relative h-48 sm:h-56 bg-gradient-to-br from-slate-800/80 to-slate-900/80 flex flex-col items-center justify-center gap-3">
                    <div className="absolute inset-0 opacity-10">
                      <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
                        <path d="M0 100 Q100 20 200 100 Q300 180 400 100" stroke="currentColor" strokeWidth="0.5" className="text-brand-400" />
                        <path d="M0 120 Q100 40 200 120 Q300 200 400 120" stroke="currentColor" strokeWidth="0.5" className="text-purple-400" />
                        <circle cx="80" cy="60" r="2" fill="currentColor" className="text-brand-400" />
                        <circle cx="200" cy="100" r="2" fill="currentColor" className="text-purple-400" />
                        <circle cx="320" cy="80" r="2" fill="currentColor" className="text-emerald-400" />
                        <circle cx="150" cy="140" r="1.5" fill="currentColor" className="text-sky-400" />
                        <circle cx="280" cy="50" r="1.5" fill="currentColor" className="text-amber-400" />
                      </svg>
                    </div>
                    <div className="relative z-10 w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-brand-400" />
                    </div>
                    <div className="relative z-10 text-center">
                      <p className="text-sm font-medium text-white">San Francisco, CA</p>
                      <p className="text-xs text-slate-400 mt-0.5">Interactive map coming soon</p>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <a
                        href="https://maps.google.com/?q=100+Pine+Street+San+Francisco+CA"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
                      >
                        Open in Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>

                {/* Social Links */}
                <motion.div
                  variants={fadeInUp}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6"
                >
                  <h2 className="text-lg font-bold text-white mb-4">Connect With Us</h2>
                  <p className="text-xs text-slate-400 mb-5">
                    Follow us on social media for updates, tips, and community support.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {socialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 transition-all duration-200 hover:bg-white/[0.06] hover:border-white/10 ${link.color}`}
                      >
                        <link.icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-medium">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Column — Form */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="lg:col-span-3"
              >
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                      <Send className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Send us a message</h2>
                      <p className="text-xs text-slate-400">Fill out the form below and we'll get back to you.</p>
                    </div>
                  </div>

                  {/* Contact Type Tabs */}
                  <div className="mb-6">
                    <Tabs
                      tabs={contactTabs}
                      activeTab={activeTab}
                      onChange={handleTabChange}
                      variant="pills"
                      size="sm"
                      fullWidth
                    />
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Your Name"
                        placeholder="John Doe"
                        error={errors.name?.message}
                        {...register('name')}
                      />
                      <Input
                        label="Email Address"
                        type="email"
                        placeholder="you@example.com"
                        error={errors.email?.message}
                        {...register('email')}
                      />
                    </div>

                    <div>
                      <Input
                        label="Subject"
                        placeholder="How can we help you?"
                        value={tabSubjects[activeTab]}
                        error={errors.subject?.message}
                        {...register('subject')}
                      />
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Auto-filled based on your selected contact type. Feel free to edit.
                      </p>
                    </div>

                    <Textarea
                      label="Message"
                      placeholder="Tell us details about your request..."
                      rows={6}
                      error={errors.message?.message}
                      {...register('message')}
                    />

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full justify-center btn-lg glow-brand-sm group"
                    >
                      {isSubmitting ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Trust Badges */}
                  <div className="mt-6 pt-5 border-t border-white/[0.06]">
                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                      {[
                        'SOC2 Compliant',
                        'GDPR Ready',
                        'Encrypted',
                        '24h Response',
                      ].map((badge) => (
                        <div key={badge} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" />
                          {badge}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FAQ Teaser */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6"
                >
                  <h3 className="text-sm font-bold text-white mb-2">
                    Looking for quick answers?
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Check out our frequently asked questions — you might find what you need right away.
                  </p>
                  <a
                    href="/faq"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Browse FAQ <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
