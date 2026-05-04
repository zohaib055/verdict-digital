import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle, Coins, Globe, Shield, TrendingUp, Users, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import heroBg from '@/assets/hero-bg.jpg';

const steps = [
  { step: '01', title: 'Create Account', description: 'Sign up with email and get a play-money balance, no wallet required.', icon: Users },
  { step: '02', title: 'Browse Political Markets', description: 'Explore elections, policy, and geopolitical markets curated for public sharing.', icon: BarChart3 },
  { step: '03', title: 'Buy YES or NO', description: 'Take a position, watch the probability move, and share your call.', icon: TrendingUp },
  { step: '04', title: 'Resolve on Official Sources', description: 'Markets close with source-backed explanations and public outcomes.', icon: CheckCircle },
];

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function Landing() {
  const { data } = useQuery({
    queryKey: ['landing-markets'],
    queryFn: () => api.markets({ limit: 4 }),
  });

  const featuredMarkets = data || [];

  const totalVolume = featuredMarkets.reduce((sum, market) => sum + market.traded_volume, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Verdict</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <Link to="/markets" className="hover:text-white transition-colors">Markets</Link>
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-white text-primary hover:bg-white/90 gap-1.5 font-semibold">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section
        className="relative min-h-[85vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(215,50%,8%)]/90 via-[hsl(215,50%,8%)]/80 to-background" />

        <div className="relative z-10 max-w-4xl mx-auto text-center px-6 py-32">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-white/60 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <Globe className="h-3.5 w-3.5" /> Political prediction markets with public profiles and shareable calls
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-white mb-6">
            Trade Political Outcomes
            <br />
            <span className="text-white/60">with Play Money, Not Wallets</span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
            Verdict gives users instant-execution prediction markets, Bayesian-smoothed probabilities, weekly faucet credits, and public profile stats designed to be shared.
          </p>
          <Link to="/markets">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 gap-2 h-12 px-8 text-base font-semibold">
              View Markets <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="relative -mt-16 z-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden shadow-lg">
            {[
              { label: 'Visible Volume', value: formatCurrency(totalVolume), icon: TrendingUp },
              { label: 'Public Markets', value: String(featuredMarkets.length || 0), icon: BarChart3 },
              { label: 'Weekly Faucet', value: '$1,000', icon: Coins },
              { label: 'Resolution Mode', value: 'Manual', icon: Shield },
            ].map((stat) => (
              <div key={stat.label} className="bg-card p-5 lg:p-6 text-center">
                <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="text-xl lg:text-2xl font-bold tabular-nums">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold">Featured Markets</h2>
              <p className="text-sm text-muted-foreground mt-1">Live public markets pulled from the backend.</p>
            </div>
            <Link to="/markets" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
              View all markets <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredMarkets.map((market) => (
              <Link
                key={market.id}
                to={`/market/${market.slug}`}
                className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {market.category}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-yes">
                    <span className="h-1.5 w-1.5 rounded-full bg-yes animate-pulse" />
                    Live
                  </span>
                </div>
                <h3 className="font-semibold text-sm mt-2 mb-4 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {market.question}
                </h3>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 rounded-lg bg-yes-muted px-2 py-2 text-center">
                    <div className="text-[10px] uppercase font-semibold text-yes">Yes</div>
                    <div className="text-sm font-bold tabular-nums text-yes">{(market.display_probability_yes * 100).toFixed(1)}%</div>
                  </div>
                  <div className="flex-1 rounded-lg bg-no-muted px-2 py-2 text-center">
                    <div className="text-[10px] uppercase font-semibold text-no">No</div>
                    <div className="text-sm font-bold tabular-nums text-no">{((1 - market.display_probability_yes) * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Vol {formatCurrency(market.traded_volume)}</span>
                  <span>{new Date(market.close_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-6 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold">How It Works</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">The product stays simple for users: create an account, claim weekly credits, trade, and share the result.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.step} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px bg-border" />
                )}
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-xs font-bold text-primary tracking-wider">STEP {step.step}</div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
