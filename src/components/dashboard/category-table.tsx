import { useState } from "react";
import type { LedgerKind } from "@/lib/ledger";
import { formatMoney, formatPct, type CategoryRow } from "@/lib/revenue-data";
import { cn } from "@/lib/cn";

export function CategoryTable({
  income,
  expenses,
}: {
  income: CategoryRow[];
  expenses: CategoryRow[];
}) {
  const [kind, setKind] = useState<LedgerKind>("gasto");
  const rows = kind === "ingreso" ? income : expenses;
  const total = rows.reduce((acc, row) => acc + row.amount, 0);
  const bar = kind === "ingreso" ? "bg-pine" : "bg-rust";

  return (
    <section
      className="rounded-2xl bg-surface p-4 shadow-card sm:p-5"
      aria-label="Desglose por categoría"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-ink">Por categoría</h2>
          <p className="text-xs text-muted">En qué se va y de dónde viene el dinero del rango</p>
        </div>
        <div
          className="flex gap-1 rounded-xl bg-ink-soft p-1"
          role="group"
          aria-label="Tipo de desglose"
        >
          {(
            [
              ["gasto", "Gastos"],
              ["ingreso", "Ingresos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
              className={cn(
                "min-h-11 flex-1 rounded-lg px-3 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine sm:flex-none",
                kind === id ? "bg-ink text-paper" : "text-ink hover:bg-surface",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {kind === "ingreso" ? "No hay ingresos en este rango." : "No hay gastos en este rango."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-md border-collapse text-left">
            <caption className="sr-only">
              Desglose de {kind === "ingreso" ? "ingresos" : "gastos"} por categoría
            </caption>
            <thead>
              <tr className="border-b border-line text-xs font-medium text-muted">
                <th scope="col" className="py-3 pr-3 font-medium">
                  Categoría
                </th>
                <th scope="col" className="py-3 text-right font-medium">
                  Importe
                </th>
                <th scope="col" className="py-3 pl-4 text-right font-medium">
                  Parte
                </th>
                <th scope="col" className="py-3 pl-4 text-right font-medium">
                  Crecimiento
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const good =
                  row.growth != null && (kind === "ingreso" ? row.growth >= 0 : row.growth <= 0);
                return (
                  <tr key={row.id} className="border-b border-line">
                    <th scope="row" className="py-3 pr-3 text-sm font-medium text-ink">
                      {row.name}
                    </th>
                    <td className="py-3 text-right text-sm tabular-nums">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <span className="inline-flex min-w-28 items-center justify-end gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-soft">
                          <span
                            className={cn("block h-full rounded-full", bar)}
                            style={{
                              width: `${Math.max(row.share > 0 ? 4 : 0, row.share * 100)}%`,
                            }}
                          />
                        </span>
                        <span className="w-12 text-right text-sm tabular-nums text-muted">
                          {formatPct(row.share, 0)}
                        </span>
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-3 pl-4 text-right text-sm tabular-nums",
                        row.growth == null ? "text-muted" : good ? "text-pine" : "text-rust",
                      )}
                    >
                      {row.growth == null ? "—" : formatPct(row.growth, 1, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="py-3 pr-3 text-sm font-semibold text-ink">
                  Total
                </th>
                <td className="py-3 text-right text-sm font-semibold tabular-nums">
                  {formatMoney(total)}
                </td>
                <td className="py-3 text-right text-sm font-semibold tabular-nums">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
