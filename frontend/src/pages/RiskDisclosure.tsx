import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function RiskDisclosure() {
  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold mb-2">Risk Disclosure</h1>
      <p className="text-xs text-muted-foreground mb-8">Last updated: February 2026</p>

      <div className="rounded-lg border border-border bg-card p-4 mb-8 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-no shrink-0 mt-0.5" />
        <p className="text-sm text-foreground leading-relaxed">
          Verdict uses play money only. You cannot lose real capital here, but market outcomes can still affect your fake-money balance, rank, streaks, and public reputation.
        </p>
      </div>

      <div className="prose-sm space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Market Risk</h2>
          <p>The value of play-money positions may fluctuate significantly based on new information, sentiment shifts, and market liquidity. Past performance does not guarantee future accuracy.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Liquidity Risk</h2>
          <p>Some markets may have limited play-money liquidity, making it difficult to enter or exit positions at desired prices.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Resolution Risk</h2>
          <p>Markets are resolved based on predefined sources and criteria. In rare cases, resolution may be delayed or disputed.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Technology Risk</h2>
          <p>Backend services, scheduled jobs, and data providers may fail or return incomplete information. Admins retain final authority over published markets and resolutions.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Regulatory Risk</h2>
          <p>Prediction markets may be subject to changing regulations in your jurisdiction. It is your responsibility to ensure compliance with local laws.</p>
        </section>
      </div>
    </div>
  );
}
