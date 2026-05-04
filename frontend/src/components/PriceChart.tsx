import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const timeRanges = ['1H', '24H', '7D', '30D', 'All'] as const;

type ChartPoint = {
  date: string;
  yes: number;
  no: number;
};

function buildFallbackData(probability: number): ChartPoint[] {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.now() - (11 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const drift = Math.sin(index / 2) * 2;
    const yes = Math.max(1, Math.min(99, probability + drift));
    return { date, yes, no: 100 - yes };
  });
}

export default function PriceChart({ data }: { data?: ChartPoint[] }) {
  const [range, setRange] = useState<string>('30D');
  const [showNo, setShowNo] = useState(false);
  const source = data?.length ? data : buildFallbackData(50);

  const dataSlice = (() => {
    switch (range) {
      case '1H': return source.slice(-2);
      case '24H': return source.slice(-3);
      case '7D': return source.slice(-7);
      case '30D': return source.slice(-30);
      default: return source;
    }
  })();

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {timeRanges.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setShowNo(false)}
            className={`px-2 py-1 rounded ${!showNo ? 'bg-yes-muted text-yes font-medium' : 'text-muted-foreground hover:bg-accent'}`}
          >
            Yes
          </button>
          <button
            onClick={() => setShowNo(true)}
            className={`px-2 py-1 rounded ${showNo ? 'bg-no-muted text-no font-medium' : 'text-muted-foreground hover:bg-accent'}`}
          >
            No
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={dataSlice}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 30%, 22%)" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            tick={{ fontSize: 11, fill: 'hsl(215, 15%, 55%)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}¢`}
            tick={{ fontSize: 11, fill: 'hsl(215, 15%, 55%)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(215, 35%, 12%)',
              border: '1px solid hsl(215, 30%, 22%)',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              color: 'hsl(210, 20%, 90%)',
            }}
            labelFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            formatter={(value: number) => [`${value.toFixed(1)}¢`, showNo ? 'No' : 'Yes']}
          />
          {!showNo && (
            <Line
              type="monotone"
              dataKey="yes"
              stroke="hsl(152, 55%, 38%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(152, 55%, 38%)' }}
            />
          )}
          {showNo && (
            <Line
              type="monotone"
              dataKey="no"
              stroke="hsl(0, 60%, 50%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(0, 60%, 50%)' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
