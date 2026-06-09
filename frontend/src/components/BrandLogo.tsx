import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
  to?: string;
};

function VerdictMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn('h-8 w-8 shrink-0', className)}
      fill="none"
    >
      <rect width="40" height="40" rx="9" fill="currentColor" className="text-primary" />
      <path
        d="M11 20.6L17.3 27L29.5 13"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 13.5H19.5"
        stroke="white"
        strokeOpacity=".42"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M23.5 27.5H30.5"
        stroke="white"
        strokeOpacity=".42"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BrandLogo({
  className,
  markClassName,
  textClassName,
  showText = true,
  to = '/',
}: BrandLogoProps) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Verdict home">
      <VerdictMark className={markClassName} />
      {showText ? (
        <span className={cn('text-lg font-bold tracking-tight text-foreground', textClassName)}>
          Verdict
        </span>
      ) : null}
    </Link>
  );
}
