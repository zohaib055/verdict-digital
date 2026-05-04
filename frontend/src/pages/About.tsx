import { Link } from 'react-router-dom';
import { Shield, Globe, BarChart3, CheckCircle, ArrowLeft } from 'lucide-react';

export default function About() {
  return (
    <div className="p-4 lg:p-6 pb-20 md:pb-6 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-2xl font-bold mb-2">About Verdict</h1>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Verdict is an institutional-grade political prediction market platform. We provide data-driven markets for elections, referenda, policy outcomes, and geopolitical events — enabling participants to trade on real-world political outcomes with full transparency.
      </p>

      <div className="space-y-6">
        {[
          { icon: BarChart3, title: 'Data-Driven Markets', text: 'Every market is backed by verifiable data sources, clear resolution criteria, and transparent rules. No speculation without accountability.' },
          { icon: Shield, title: 'Security First', text: 'Account-based authentication keeps the product simple. All trades, balances, and resolutions are recorded in the backend ledger.' },
          { icon: Globe, title: 'Global Coverage', text: 'From US elections to EU policy decisions, our markets cover political events worldwide with institutional-grade analytics.' },
          { icon: CheckCircle, title: 'Transparent Resolution', text: 'Markets resolve based on authoritative public sources — Associated Press, government records, and official bodies.' },
        ].map(item => (
          <div key={item.title} className="rounded-lg border border-border bg-card p-5 flex gap-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <item.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
