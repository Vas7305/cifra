import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAxis, formatCount, formatMoney, type TrendPoint } from "@/lib/revenue-data";

type TipPayload = {
  payload?: TrendPoint;
};

function ChartTip({
  active,
  payload,
  mode,
}: {
  active?: boolean;
  payload?: TipPayload[];
  mode: "revenue" | "customers";
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg bg-ink px-3 py-2 text-paper shadow-card">
      <p className="text-xs text-paper/80">{point.fullLabel}</p>
      {mode === "revenue" ? (
        <p className="mt-1 text-sm font-medium tabular-nums">{formatMoney(point.revenue)}</p>
      ) : null}
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-xs">
        <dt className="text-paper/70">Gastos</dt>
        <dd className="text-right tabular-nums">{formatMoney(point.expense)}</dd>
        <dt className="text-paper/70">Altas</dt>
        <dd className="text-right tabular-nums">{formatCount(point.newCustomers)}</dd>
        <dt className="text-paper/70">Bajas</dt>
        <dd className="text-right tabular-nums">{formatCount(point.cancellations)}</dd>
        {mode === "customers" ? (
          <>
            <dt className="text-paper/70">Ingresos</dt>
            <dd className="text-right tabular-nums">{formatMoney(point.revenue)}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

const axisTick = { fill: "var(--color-muted)", fontSize: 12 };

export function TrendCharts({
  points,
  grain,
}: {
  points: TrendPoint[];
  grain: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <section className="grid gap-4 lg:grid-cols-5" aria-label="Tendencias">
      <article className="rounded-2xl bg-surface p-4 shadow-card lg:col-span-3 sm:p-5">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-ink">Tendencia de ingresos</h2>
            <p className="text-xs text-muted">Agrupado por {grain}</p>
          </div>
          <p className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-pine" aria-hidden="true" />
              Ingresos
            </span>
            {points.some((point) => point.expense > 0) ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full bg-rust" aria-hidden="true" />
                Gastos
              </span>
            ) : null}
          </p>
        </header>
        <div className="h-64 w-full sm:h-72">
          {ready && points.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                  dy={8}
                />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                  tickFormatter={(value: number) => formatAxis(value)}
                />
                <Tooltip
                  content={<ChartTip mode="revenue" />}
                  cursor={{ stroke: "var(--color-line)", strokeWidth: 1 }}
                  wrapperStyle={{ outline: "none", zIndex: 30 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-pine)"
                  fill="var(--color-pine)"
                  fillOpacity={0.14}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--color-pine)", stroke: "var(--color-surface)" }}
                />
                {points.some((point) => point.expense > 0) ? (
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="var(--color-rust)"
                    fill="var(--color-rust)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "var(--color-rust)", stroke: "var(--color-surface)" }}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartPlaceholder label="Preparando ingresos" />
          )}
        </div>
      </article>

      <article className="rounded-2xl bg-surface p-4 shadow-card lg:col-span-2 sm:p-5">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-ink">Altas y bajas</h2>
            <p className="text-xs text-muted">Mismo rango, por {grain}</p>
          </div>
          <p className="flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-ink" aria-hidden="true" />
              Altas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rust" aria-hidden="true" />
              Bajas
            </span>
          </p>
        </header>
        <div className="h-64 w-full sm:h-72">
          {ready && points.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                  dy={8}
                />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTip mode="customers" />}
                  cursor={{ fill: "var(--color-ink-soft)" }}
                  wrapperStyle={{ outline: "none", zIndex: 30 }}
                />
                <Bar
                  dataKey="cancellations"
                  fill="var(--color-rust)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="newCustomers"
                  stroke="var(--color-ink)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--color-ink)", stroke: "var(--color-surface)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ChartPlaceholder label="Preparando altas y bajas" />
          )}
        </div>
      </article>
    </section>
  );
}

function ChartPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full items-end gap-2 rounded-xl bg-ink-soft px-4 pb-4" aria-hidden="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className="flex-1 rounded-t bg-line"
          style={{ height: `${28 + ((index * 17) % 60)}%` }}
        />
      ))}
    </div>
  );
}
