interface ProbabilityGaugeProps {
  percentage: number;
  size?: 'sm' | 'lg';
}

export default function ProbabilityGauge({ percentage, size = 'sm' }: ProbabilityGaugeProps) {
  const isLarge = size === 'lg';
  const safePercentage = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  const displayPercentage = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: isLarge ? 1 : 0,
  }).format(safePercentage);
  const r = 29;
  const stroke = 4.5;

  // Arc spans ~200° (from 190° to 350° in SVG coords), with a ~20° gap at the bottom
  const gapDeg = 10; // degrees past horizontal on each side
  const startAngle = 180 + gapDeg; // left start in degrees
  const endAngle = 360 - gapDeg;   // right end in degrees
  const totalArc = endAngle - startAngle; // ~340° ... wait

  // Actually matching Polymarket: arc from ~190° to ~350° (going clockwise over the top)
  // Convert to radians
  const toRad = (d: number) => (d * Math.PI) / 180;

  // Start point (bottom-left, slightly past horizontal)
  const sx = r * Math.cos(toRad(startAngle));
  const sy = r * Math.sin(toRad(startAngle));

  // End point (bottom-right, slightly past horizontal)  
  const ex = r * Math.cos(toRad(endAngle));
  const ey = r * Math.sin(toRad(endAngle));

  // Filled arc endpoint based on percentage
  const filledAngle = startAngle + (totalArc * safePercentage) / 100;
  const fx = r * Math.cos(toRad(filledAngle));
  const fy = r * Math.sin(toRad(filledAngle));

  // Background arc: from filled endpoint to end
  const bgAngle = totalArc * (1 - safePercentage / 100);
  const bgLargeArc = bgAngle > 180 ? 1 : 0;

  // Filled arc
  const fillArcDeg = totalArc * safePercentage / 100;
  const fillLargeArc = fillArcDeg > 180 ? 1 : 0;

  const color = safePercentage >= 50
    ? 'hsl(var(--yes))'
    : 'hsl(var(--no))';

  // ViewBox: center at origin, show top half + a bit below
  const vbX = -r - 2;
  const vbY = -r - 2;
  const vbW = (r + 2) * 2;
  const vbH = r + 2 + Math.abs(sy) + 2;

  const scale = isLarge ? 1.3 : 0.85;
  const svgW = vbW * scale;
  const svgH = vbH * scale;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        style={{ overflow: 'visible' }}
      >
        {/* Background arc (unfilled portion) */}
        {safePercentage < 100 && (
          <path
            d={`M ${fx} ${fy} A ${r} ${r} 0 ${bgLargeArc} 1 ${ex} ${ey}`}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        )}
        {/* Filled arc */}
        {safePercentage > 0 && (
          <path
            d={`M ${sx} ${sy} A ${r} ${r} 0 ${fillLargeArc} 1 ${fx} ${fy}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div
        className="flex flex-col items-center"
        style={{ marginTop: isLarge ? -28 : -18 }}
      >
        <span
          className="font-medium tabular-nums text-foreground leading-none"
          style={{ fontSize: isLarge ? 18 : 14 }}
        >
          {displayPercentage}%
        </span>
        <span
          className="font-medium leading-tight"
          style={{
            fontSize: isLarge ? 11 : 9,
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          chance
        </span>
      </div>
    </div>
  );
}
