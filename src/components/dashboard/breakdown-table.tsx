import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  formatCount,
  formatMoney,
  formatPct,
  rowDetail,
  type BreakdownRow,
} from "@/lib/revenue-data";
import { cn } from "@/lib/cn";

type Dimension = "plan" | "canal";
type SortKey = "name" | "revenue" | "share" | "growth" | "cancellations" | "churn";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right"; hint: string }[] = [
  { key: "name", label: "Segmento", align: "left", hint: "Plan o canal de origen" },
  { key: "revenue", label: "Ingresos", align: "right", hint: "Ingresos del rango" },
  { key: "share", label: "Parte", align: "right", hint: "Participación sobre el total" },
  { key: "growth", label: "Crecimiento", align: "right", hint: "Contra el período anterior" },
  { key: "cancellations", label: "Bajas", align: "right", hint: "Clientes que cancelaron" },
  { key: "churn", label: "Tasa", align: "right", hint: "Bajas entre activos al inicio" },
];

export function BreakdownTable({
  plans,
  channels,
  days,
  totalGrowth,
  totalChurn,
}: {
  plans: BreakdownRow[];
  channels: BreakdownRow[];
  days: number;
  totalGrowth: number | null;
  totalChurn: number | null;
}) {
  const [dimension, setDimension] = useState<Dimension>("plan");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "revenue",
    dir: "desc",
  });
  const source = dimension === "plan" ? plans : channels;
  const signature = source.map((row) => row.id).join("|");
  const [activeId, setActiveId] = useState<string | null>(source[0]?.id ?? null);

  useEffect(() => {
    setActiveId((current) =>
      current && source.some((row) => row.id === current) ? current : (source[0]?.id ?? null),
    );
  }, [signature, source]);

  const rows = useMemo(() => {
    const copy = [...source];
    copy.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const left = a[sort.key];
      const right = b[sort.key];
      if (typeof left === "string" && typeof right === "string") return left.localeCompare(right) * dir;
      const ln = left == null ? -Infinity : Number(left);
      const rn = right == null ? -Infinity : Number(right);
      return (ln - rn) * dir;
    });
    return copy;
  }, [source, sort]);

  const active = rows.find((row) => row.id === activeId) ?? rows[0];
  const totalRevenue = source.reduce((acc, row) => acc + row.revenue, 0);
  const totalCancels = source.reduce((acc, row) => acc + row.cancellations, 0);

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" },
    );
  }

  return (
    <section className="rounded-2xl bg-surface p-4 shadow-card sm:p-5" aria-label="Desglose">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-ink">Desglose</h2>
          <p className="text-xs text-muted">Pasa el cursor o toca una fila para ver el detalle</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-ink-soft p-1" role="group" aria-label="Agrupar desglose">
          {(
            [
              ["plan", "Por plan"],
              ["canal", "Por canal"],
            ] as const
          ).map(([id, label]) => {
            const selected = dimension === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => setDimension(id)}
                className={cn(
                  "min-h-11 flex-1 rounded-lg px-3 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine sm:flex-none",
                  selected ? "bg-ink text-paper" : "text-ink hover:bg-surface",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      <p className="mt-4 min-h-12 text-sm leading-relaxed text-muted" aria-live="polite">
        {active ? rowDetail(active, days) : "No hay movimientos en este rango."}
      </p>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-lg border-collapse text-left">
          <caption className="sr-only">
            Desglose de ingresos {dimension === "plan" ? "por plan" : "por canal"}
          </caption>
          <thead>
            <tr className="border-b border-line">
              {COLUMNS.map((column) => {
                const selected = sort.key === column.key;
                const Icon = sort.dir === "asc" ? ChevronUp : ChevronDown;
                return (
                  <th key={column.key} scope="col" className={column.align === "right" ? "text-right" : ""}>
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      title={column.hint}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-1 text-xs font-medium text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
                        column.align === "right" ? "w-full justify-end" : "",
                      )}
                    >
                      {column.label}
                      {selected ? <Icon className="size-3.5" aria-hidden="true" /> : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = row.id === active?.id;
              return (
                <tr
                  key={row.id}
                  onMouseEnter={() => setActiveId(row.id)}
                  onFocus={() => setActiveId(row.id)}
                  onClick={() => setActiveId(row.id)}
                  className={cn(
                    "cursor-pointer border-b border-line transition-colors duration-150 ease-out",
                    selected ? "bg-ink-soft" : "hover:bg-ink-soft",
                  )}
                >
                  <th scope="row" className="py-3 pr-3 text-sm font-medium whitespace-nowrap text-ink">
                    {row.name}
                  </th>
                  <td className="py-3 text-right text-sm tabular-nums">{formatMoney(row.revenue)}</td>
                  <td className="py-3 pl-4 text-right">
                    <span className="inline-flex min-w-28 items-center justify-end gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-soft">
                        <span
                          className="block h-full rounded-full bg-pine"
                          style={{ width: `${Math.max(row.share > 0 ? 4 : 0, row.share * 100)}%` }}
                        />
                      </span>
                      <span className="w-12 text-right text-sm tabular-nums text-muted">
                        {formatPct(row.share, 0)}
                      </span>
                    </span>
                  </td>
                  <td
                    className={cn(
                      "py-3 text-right text-sm tabular-nums",
                      row.growth == null
                        ? "text-muted"
                        : row.growth >= 0
                          ? "text-pine"
                          : "text-rust",
                    )}
                  >
                    {row.growth == null ? "—" : formatPct(row.growth, 1, true)}
                  </td>
                  <td className="py-3 text-right text-sm tabular-nums">
                    {formatCount(row.cancellations)}
                  </td>
                  <td className="py-3 text-right text-sm tabular-nums">
                    {row.churn == null ? "—" : formatPct(row.churn)}
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
                {formatMoney(totalRevenue)}
              </td>
              <td className="py-3 text-right text-sm font-semibold tabular-nums">100%</td>
              <td
                className={cn(
                  "py-3 text-right text-sm font-semibold tabular-nums",
                  totalGrowth == null ? "text-muted" : totalGrowth >= 0 ? "text-pine" : "text-rust",
                )}
              >
                {totalGrowth == null ? "—" : formatPct(totalGrowth, 1, true)}
              </td>
              <td className="py-3 text-right text-sm font-semibold tabular-nums">
                {formatCount(totalCancels)}
              </td>
              <td className="py-3 text-right text-sm font-semibold tabular-nums">
                {totalChurn == null ? "—" : formatPct(totalChurn)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
