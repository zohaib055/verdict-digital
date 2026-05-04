import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
      <p className="text-xs text-muted-foreground mb-8">Last updated: February 2026</p>

      <div className="prose-sm space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using Verdict, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Eligibility</h2>
          <p>You must be at least 18 years of age and legally permitted to participate in prediction markets in your jurisdiction.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Account and Play-Money Balance</h2>
          <p>You are responsible for maintaining the security of your account and all activity that occurs through it. Verdict uses an internal play-money balance and does not custody real funds.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Market Participation</h2>
          <p>All trades are final upon confirmation. Market resolution is determined by the specified resolution source and criteria outlined in each market's rules.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Prohibited Conduct</h2>
          <p>Users may not manipulate markets, use automated trading systems without authorization, or engage in any activity that violates applicable law.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Limitation of Liability</h2>
          <p>Verdict is provided "as is" without warranties. We are not liable for loss of play-money credits, account misuse, or platform downtime.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Changes</h2>
          <p>We may update these terms at any time. Continued use constitutes acceptance of the revised terms.</p>
        </section>
      </div>
    </div>
  );
}
