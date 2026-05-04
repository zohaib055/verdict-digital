import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground mb-8">Last updated: February 2026</p>

      <div className="prose-sm space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Information We Collect</h2>
          <p>Verdict collects minimal data. We store account details, play-money trading activity, and basic usage analytics needed to operate the platform.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">How We Use Data</h2>
          <p>Data is used to operate the platform, execute trades, prevent fraud, and improve the user experience. We do not sell data to third parties.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Public Activity</h2>
          <p>Public market pages, profiles, leaderboard stats, and share links may be visible without login. Private account data remains account-gated.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Cookies</h2>
          <p>We use essential cookies for session management and optional analytics cookies. You may disable non-essential cookies in your browser settings.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Contact</h2>
          <p>For privacy inquiries, contact us at privacy@verdict.markets.</p>
        </section>
      </div>
    </div>
  );
}
