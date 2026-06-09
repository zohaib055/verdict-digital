import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X, BarChart3, Briefcase, Info, Home, UserCircle2, Coins, Trophy, ShieldCheck, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';

const baseNavLinks = [
  { label: 'Explore', path: '/explore', icon: Home },
  { label: 'Markets', path: '/markets', icon: BarChart3 },
  { label: 'Portfolio', path: '/portfolio', icon: Briefcase },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { label: 'About', path: '/about', icon: Info },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const navLinks = useMemo(
    () => (
      user?.is_admin
        ? [...baseNavLinks, { label: 'Admin', path: '/admin/markets', icon: ShieldCheck }, { label: 'Intel', path: '/intelligence', icon: Radar }]
        : baseNavLinks
    ),
    [user?.is_admin],
  );
  const searchPlaceholder = useMemo(
    () => (user ? `Search markets, ${user.username}...` : "Search markets..."),
    [user],
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center h-14 px-4 lg:px-6 gap-4 max-w-[1400px] mx-auto w-full">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">Verdict</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-lg hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-9 h-9 bg-muted border-border text-sm"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="hidden h-8 w-32 rounded-full bg-secondary md:block" />
                <div className="h-8 w-20 rounded-md bg-secondary" />
              </div>
            ) : user ? (
              <>
                <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
                  <Coins className="h-3.5 w-3.5 text-primary" />
                  <span className="tabular-nums">${user.balance.toFixed(2)} play money</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm text-foreground">
                  <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                  <Link to={`/profile/${user.id}`} className="hover:text-primary transition-colors">
                    {user.username}
                  </Link>
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Log In</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="font-semibold">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Category Nav - Horizontal tabs like Polymarket */}
        <div className="border-t border-border">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-thin py-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    location.pathname === link.path
                      ? 'text-foreground bg-accent'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-40 bg-background/95 backdrop-blur p-4">
          <div className="space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main content - full width, no sidebar */}
      <main className="flex-1 min-w-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-center justify-around h-14">
          {navLinks.slice(0, 4).map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center gap-0.5 text-xs ${location.pathname === link.path ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
