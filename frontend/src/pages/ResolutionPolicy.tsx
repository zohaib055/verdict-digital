import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ResolutionPolicy() {
  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold mb-2">Market Resolution Policy</h1>
      <p className="text-xs text-muted-foreground mb-8">Last updated: February 2026</p>

      <div className="prose-sm space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Resolution Sources</h2>
          <p>Each market specifies a primary resolution source (e.g., Associated Press, official government records, regulatory bodies). The resolution source is defined at market creation and cannot be changed.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Resolution Timeline</h2>
          <p>Markets are resolved within 48 hours of the resolution date, provided the outcome is clear from the specified source. Complex or contested outcomes may take longer.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Dispute Process</h2>
          <p>If a resolution is contested, a review period of 72 hours is initiated. During this time, evidence may be submitted for consideration. A resolution committee reviews all disputes and issues a final determination.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Edge Cases</h2>
          <p>If a market's outcome is ambiguous or the resolution source is unavailable, the market may be voided and all positions returned at their entry price.</p>
        </section>
      </div>
    </div>
  );
}
