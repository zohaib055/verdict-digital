import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Coins,
  LockKeyhole,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';

import BrandLogo from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import heroBg from '@/assets/hero-bg.jpg';

const valueProps = [
  {
    title: 'Trade with play money',
    description: 'No wallet setup, deposits, or crypto flow. Create an account and start with internal credits.',
    icon: Coins,
  },
  {
    title: 'Questions with receipts',
    description: 'Markets are framed around source-backed events, deadlines, and resolution criteria.',
    icon: Newspaper,
  },
  {
    title: 'Build a public record',
    description: 'Track your calls, compete on leaderboards, and share predictions from your profile.',
    icon: Trophy,
  },
];

const trustPoints = [
  'No wallet required',
  'Play-money balances',
  'Source-backed outcomes',
  'Public profile stats',
];

const steps = [
  'Create a free account',
  'Claim weekly play-money credits',
  'Pick YES or NO on political outcomes',
  'Track your performance as markets resolve',
];

export default function Landing() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (user) {
    return <Navigate to="/explore" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="absolute left-0 right-0 top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo textClassName="text-white" markClassName="shadow-lg shadow-black/20" />

          <nav className="hidden items-center gap-7 text-sm font-medium text-white/68 md:flex">
            <Link to="/markets" className="transition-colors hover:text-white">Markets</Link>
            <Link to="/about" className="transition-colors hover:text-white">About</Link>
            <a href="#how-it-works" className="transition-colors hover:text-white">How It Works</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-white/78 hover:bg-white/10 hover:text-white">
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1.5 bg-white text-slate-950 hover:bg-white/90">
                Sign Up <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section
        className="relative min-h-[88vh] overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(215_50%_8%/.97),hsl(215_50%_8%/.9)_48%,hsl(215_50%_8%/.66)),linear-gradient(180deg,hsl(215_50%_8%/.36),hsl(215_50%_8%/.97))]" />

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl items-center px-4 pb-20 pt-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.07] px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Political prediction markets, without real-money risk
            </div>

            <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.04] tracking-normal text-white sm:text-5xl lg:text-7xl">
              Make better political calls. Build a public track record.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
              Verdict is a play-money political prediction platform for people who want to make specific calls, track judgment over time, and compare their public record against real outcomes.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup">
                <Button size="lg" className="h-12 w-full gap-2 px-7 text-base font-semibold sm:w-auto">
                  Create Free Account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/markets">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-white/18 bg-white/[0.06] px-7 text-base font-semibold text-white hover:bg-white/12 hover:text-white sm:w-auto"
                >
                  Browse Markets
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {trustPoints.map((point) => (
                <div
                  key={point}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/42 px-3 py-2 text-sm text-white/72 backdrop-blur"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/70 px-4 py-5 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[
            { label: 'Fast signup', detail: 'Email, username, and you are in.', icon: LockKeyhole },
            { label: 'Weekly credits', detail: 'Come back and keep making calls.', icon: Coins },
            { label: 'Shareable reputation', detail: 'Your best predictions become proof.', icon: BarChart3 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4 py-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{item.label}</div>
                <div className="text-sm leading-6 text-muted-foreground">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Built For Clear Outcomes
            </div>
            <h2 className="text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
              A cleaner way to test your political instincts.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              Verdict is for people who want to make specific calls, compare judgment with others, and see those calls resolved against public evidence.
            </p>
            <Link to="/signup" className="mt-7 inline-flex">
              <Button className="gap-2">
                Start Predicting <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {valueProps.map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
              From signup to first prediction in minutes.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              The product is intentionally simple: get credits, choose a side, and let your record speak over time.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-4 rounded-md px-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-bold text-foreground">
                  {index + 1}
                </div>
                <div className="font-medium text-foreground">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card/45 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-[1.2fr_.8fr_.8fr]">
            <div>
              <BrandLogo />
              <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                Play-money political prediction markets for testing judgment, building a public record, and learning from source-backed outcomes.
              </p>
            </div>

            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</div>
              <div className="grid gap-3 text-sm">
                <Link to="/markets" className="text-muted-foreground transition-colors hover:text-foreground">Markets</Link>
                <Link to="/about" className="text-muted-foreground transition-colors hover:text-foreground">About</Link>
                <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground">Log In</Link>
                <Link to="/signup" className="text-muted-foreground transition-colors hover:text-foreground">Sign Up</Link>
              </div>
            </div>

            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Policies</div>
              <div className="grid gap-3 text-sm">
                <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">Terms</Link>
                <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">Privacy</Link>
                <Link to="/risk" className="text-muted-foreground transition-colors hover:text-foreground">Risk Disclosure</Link>
                <Link to="/resolution-policy" className="text-muted-foreground transition-colors hover:text-foreground">Resolution Policy</Link>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Verdict. All rights reserved.</p>
            <p>Verdict uses play money only. It is not a gambling, brokerage, or real-money trading platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
