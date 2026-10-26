import type { FinanceMode } from "@/lib/ledger";
import { formatMoney, formatPct, type DashboardModel } from "@/lib/revenue-data";
import { cn } from "@/lib/cn";
import { Hint } from "./hint";
import { Delta } from "./kpi-cards";
import { Sparkline } from "./sparkline";

const LABELS: Record<FinanceMode, { balance: string; rate: string; rateHint: string }> = {
  personal: {
    balance: "Balance",
    rate: "Tasa de ahorro",
    rateHint: "Parte de tus ingresos que no se fue en gastos. Más alta es mejor.",
  },
  negocio: {
    balance: "Beneficio neto",
    rate: "Margen",
    rateHint: "Beneficio neto dividido entre los ingresos del rango. Más alto es mejor.",
  },
};

function SplitBars({ income, expense }: { income: number; expense: number }) {
  const max = Math.max(income, expense, 1);
  const rows = [
    { label: "Ingresos", value: income, className: "bg-pine" },
    { label: "Gastos", value: expense, className: "bg-rust" },
  ];
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
          <span className="text-xs text-muted">{row.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-ink-soft">
            <span
              className={cn("block h-full rounded-full", row.className)}
              style={{ width: `${row.value > 0 ? Math.max(4, (row.value / max) * 100) : 0}%` }}
            />
          </span>
          <span className="text-xs tabular-nums text-ink">{formatMoney(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function LedgerKpis({ model, mode }: { model: DashboardModel; mode: FinanceMode }) {
  const { summary } = model;
  const labels = LABELS[mode];
  const balanceDelta =
    summary.comparable && summary.prevBalance !== 0
      ? (summary.balance - summary.prevBalance) / Math.abs(summary.prevBalance)
      : null;
  const prevRate = summary.prevRevenue > 0 ? summary.prevBalance / summary.prevRevenue : null;
  const rateDelta =
    summary.comparable && summary.savingsRate != null && prevRate != null
      ? summary.savingsRate - prevRate
      : null;
  const rate = summary.savingsRate;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
      <article className="flex flex-col rounded-2xl bg-surface p-4 shadow-card sm:p-5">
        <header className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-medium text-muted">Ingresos</h2>
          <Hint label="Qué mide ingresos">Suma de los ingresos que registres en el rango.</Hint>
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
          <h2 className="text-sm font-medium text-muted">{labels.balance}</h2>
          <Hint label={`Qué mide ${labels.balance.toLowerCase()}`}>
            Ingresos menos gastos del rango.
          </Hint>
        </header>
        <p
          className={cn(
            "mt-2 text-3xl font-semibold tracking-tight tabular-nums",
            summary.balance < 0 ? "text-rust" : "text-ink",
          )}
        >
          {formatMoney(summary.balance)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Delta value={balanceDelta} />
          <span className="text-xs text-muted">vs. período anterior</span>
        </div>
        <div className="mt-auto pt-4">
          <SplitBars income={summary.revenue} expense={summary.expenses} />
        </div>
      </article>

      <article className="flex flex-col rounded-2xl bg-surface p-4 shadow-card sm:p-5">
        <header className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-medium text-muted">{labels.rate}</h2>
          <Hint label={`Qué mide ${labels.rate.toLowerCase()}`} align="end">
            {labels.rateHint}
          </Hint>
        </header>
        <p
          className={cn(
            "mt-2 text-3xl font-semibold tracking-tight tabular-nums",
            rate != null && rate < 0 ? "text-rust" : "text-ink",
          )}
        >
          {rate == null ? "—" : formatPct(rate)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {rate == null ? (
            <span className="text-xs text-muted">Sin ingresos en este período</span>
          ) : (
            <>
              <Delta value={rateDelta} />
              <span className="text-xs text-muted">vs. período anterior</span>
            </>
          )}
        </div>
        <div className="mt-auto pt-4">
          <span className="block h-1.5 overflow-hidden rounded-full bg-ink-soft">
            <span
              className={cn(
                "block h-full rounded-full",
                rate != null && rate < 0 ? "bg-rust" : "bg-pine",
              )}
              style={{ width: `${rate == null ? 0 : Math.min(100, Math.abs(rate) * 100)}%` }}
            />
          </span>
        </div>
      </article>
    </section>
  );
}
