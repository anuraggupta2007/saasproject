export default function PrivacyPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <span className="section-label">Legal</span>
        <h1 className="text-3xl font-extrabold text-white mb-8 font-display">Privacy Policy</h1>
        
        <div className="card p-8 border border-white/5 bg-surface-800/40 space-y-6 text-sm text-slate-300 leading-relaxed">
          <p className="text-slate-400">Last updated: July 8, 2026</p>
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Introduction</h2>
            <p>
              MailSavior ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our SaaS platform, or use our offline conversion tools.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, connect email providers via OAuth, or upload files for conversion. This includes your name, email address, transaction information, and OAuth authorization tokens.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. How We Process Email Data</h2>
            <p>
              For our cloud converter, uploaded email files (like PST, MBOX, EML) are processed entirely inside isolated memory sandboxes. They are automatically deleted from our servers immediately after your conversion download is completed or within 24 hours of upload, whichever comes first. We never sell, index, read, or train AI models on your emails.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Your Rights under GDPR & CCPA</h2>
            <p>
              Depending on your location, you may have rights to access, correct, delete, or export your personal data. You can delete your account and all associated backup profiles at any time from your settings panel.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
