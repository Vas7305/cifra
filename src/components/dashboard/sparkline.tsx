export function Sparkline({ values, tone }: { values: number[]; tone: "pine" | "rust" }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 120;
  const height = 36;
  const coords = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });
  const line = coords
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const last = coords[coords.length - 1] ?? [width, height];
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const stroke = tone === "pine" ? "var(--color-pine)" : "var(--color-rust)";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-full" aria-hidden="true">
      <path d={area} fill={stroke} opacity="0.12" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.25" fill={stroke} />
    </svg>
  );
}
