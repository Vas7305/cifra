import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import {
  formatCount,
  formatMoney,
  formatPct,
  type DashboardModel,
} from "@/lib/revenue-data";
import { cn } from "@/lib/cn";
import { Hint } from "./hint";
import { Sparkline } from "./sparkline";

export function Delta({
  value,
  invert = false,
}: {
  value: number | null;
  invert?: boolean;
}) {
  if (value == null) {
    return <span className="text-xs text-muted">Sin base comparable</span>;
  }
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
        <Minus className="size-3.5" aria-hidden="true" />
        Sin cambio
      </span>
    );
  }
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium tabular-nums",
        good ? "bg-pine-soft text-pine" : "bg-rust-soft text-rust",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {formatPct(Math.abs(value), 1)}
    </span>
  );
}

function CompareBars({ previous, current }: { previous: number; current: number }) {
  const max = Math.max(previous, current, 1);
  const rows = [
    { label: "Anterior", value: previous, className: "bg-faint" },
    { label: "Actual", value: current, className: "bg-pine" },
  ];
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
          <span className="text-xs text-muted">{row.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-ink-soft">
            <span
              className={cn("block h-full rounded-full", row.className)}
              style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-xs tabular-nums text-ink">{formatMoney(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function KpiCards({ model }: { model: DashboardModel }) {
  const { summary } = model;
  const revenueDelta = summary.revenue - summary.prevRevenue;
  const churnDelta =
    summary.churn != null && summary.prevChurn != null ? summary.churn - summary.prevChurn : null;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
      <article className="flex flex-col rounded-2xl bg-surface p-4 shadow-card sm:p-5">
        <header className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-medium text-muted">Ingresos</h2>
          <Hint label="Qué mide ingresos">
            Suma de la muestra y de los ingresos que registres en el rango.
          </Hint>
        </header>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-ink">
          {formatMoney(summary.revenue)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Delta value={summary.growth} />
          <span className="text-xs text-muted">vs. período anterior</span>
        </div>
        <div className="mt-auto pt-4">
          <Sparkline values={model.revenueSpark} tone="pine" />
        </div>
      </article>

      <article className="flex flex-col rounded-2xl bg-surface p-4 shadow-card sm:p-5">
        <header className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-medium text-muted">Gastos</h2>
          <Hint label="Qué mide gastos">
            Suma de los gastos que registres en el rango. Una subida es desfavorable.
          </Hint>
        </header>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-ink">
          {formatMoney(summary.expenses)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {summary.expenses === 0 && summary.prevExpenses === 0 ? (
            <span className="text-xs text-muted">Sin gastos en este período</span>
          ) : (
            <>
              <Delta value={summary.expenseGrowth} invert />
              <span className="text-xs text-muted">vs. período anterior</span>
            </>
          )}
        </div>
        <div className="mt-auto pt-4">
          <Sparkline values={model.expenseSpark} tone="rust" />
        </div>
      </article>

      <article className="flex flex-col rounded-2xl bg-surface p-4 shadow-card sm:p-5">
        <header className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-medium text-muted">Crecimiento</h2>
          <Hint label="Qué mide crecimiento">
            Variación de ingresos contra la ventana anterior, de la misma cantidad de días.
          </Hint>
        </header>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-ink">
          {summary.growth == null ? "—" : formatPct(summary.growth, 1, true)}
        </p>
        <p className="mt-3 text-xs text-muted">
          {summary.comparable
            ? `${revenueDelta >= 0 ? "Sube" : "Baja"} ${formatMoney(Math.abs(revenueDelta))} respecto a la base`
            : "El historial anterior no cubre un período igual"}
        </p>
        <div className="mt-auto pt-4">
          <CompareBars previous={summary.prevRevenue} current={summary.revenue} />
        </div>
      </article>

      <article className="flex flex-col rounded-2xl bg-surface p-4 shadow-card sm:p-5">
        <header className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-medium text-muted">Cancelación</h2>
          <Hint label="Qué mide la cancelación" align="end">
            Bajas del período divididas entre los clientes activos al inicio. Una subida es
            desfavorable.
          </Hint>
        </header>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-ink">
          {summary.churn == null ? "—" : formatPct(summary.churn)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Delta value={churnDelta} invert />
          <span className="text-xs text-muted">
            {formatCount(summary.cancellations)} bajas · {formatCount(summary.startActive)} activos
          </span>
        </div>
        <div className="mt-auto pt-4">
          <Sparkline values={model.cancelSpark} tone="rust" />
        </div>
      </article>
    </section>
  );
}
