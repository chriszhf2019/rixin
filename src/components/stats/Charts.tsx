// Simple SVG bar chart - no external dependencies
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface BarChartProps {
  data: { label: string; value: number; max: number }[];
  height?: number;
}

export function BarChart({ data, height = 120 }: BarChartProps) {
  if (data.length === 0) return null;
  const w = Math.max(200, data.length * 40);

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <line key={frac} x1={0} y1={height * (1 - frac)} x2={w} y2={height * (1 - frac)}
          stroke="currentColor" className="text-muted opacity-20" strokeWidth={0.5} />
      ))}
      {/* Bars */}
      {data.map((d, i) => {
        const barW = Math.max(16, w / data.length - 8);
        const x = i * (w / data.length) + 4;
        const barH = d.max > 0 ? (d.value / d.max) * (height - 20) : 0;
        return (
          <g key={i}>
            <rect x={x} y={height - 16 - barH} width={barW} height={barH}
              rx={3} className="fill-primary/80 hover:fill-primary transition-colors cursor-pointer" />
            <text x={x + barW / 2} y={height - 4} textAnchor="middle"
              className="fill-muted-foreground" fontSize={9}>
              {d.label.length > 3 ? d.label.slice(0, 3) : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Simple donut chart
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ data, size = 120 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 40;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {data.map((d, i) => {
          const segment = (d.value / total) * circ;
          const strokeOffset = -offset;
          offset += segment;
          return (
            <circle key={i} cx="50" cy="50" r={r} fill="none"
              stroke={d.color} strokeWidth={16}
              strokeDasharray={`${segment} ${circ - segment}`}
              strokeDashoffset={strokeOffset}
              transform="rotate(-90 50 50)"
              className="transition-all duration-500" />
          );
        })}
        {data.length === 0 && (
          <circle cx="50" cy="50" r={r} fill="none"
            stroke="currentColor" strokeWidth={16} className="text-muted opacity-10" />
        )}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold">{total}</span>
        <span className="text-[10px] text-muted-foreground">总计</span>
      </div>
    </div>
  );
}
