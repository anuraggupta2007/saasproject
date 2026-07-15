export default function TermsPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <span className="section-label">Legal</span>
        <h1 className="text-3xl font-extrabold text-white mb-8 font-display">Terms of Service</h1>

        <div className="card p-8 border border-white/5 bg-surface-800/40 space-y-6 text-sm text-slate-300 leading-relaxed">
          <p className="text-slate-400">Last updated: July 8, 2026</p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Agreement to Terms</h2>
            <p>
              By accessing or using MailSavior, you agree to be bound by these Terms of Service. If you do not agree to all these terms, do not access or use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Use of Services</h2>
            <p>
              You must use MailSavior in compliance with all applicable laws and regulations. You are solely responsible for ensuring you have the legal right to back up or convert the emails you link to our service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. Accounts & Billing</h2>
            <p>
              To access certain features of the service, you must register for an account. You agree to maintain the security of your password. We bill subscription fees in advance on a recurring monthly or annual basis. You can cancel at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, MailSavior shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data, arising from your use of the service.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
