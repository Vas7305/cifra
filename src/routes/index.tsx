import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BreakdownTable } from "@/components/dashboard/breakdown-table";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { LedgerPanel } from "@/components/dashboard/ledger-panel";
import { TrendCharts } from "@/components/dashboard/trend-charts";
import { loadLedger, saveLedger, type LedgerEntry } from "@/lib/ledger";
import {
  buildDashboard,
  clampRange,
  DATA_END,
  DATA_START,
  LEDGER_END,
  matchingPreset,
  PRESETS,
  presetRange,
  rangeLabel,
  shortDate,
  type PresetId,
} from "@/lib/revenue-data";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const initial = presetRange("30");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [ledgerReady, setLedgerReady] = useState(false);
  const range = useMemo(() => clampRange(from, to), [from, to]);
  const model = useMemo(
    () => buildDashboard(range.from, range.to, entries),
    [range.from, range.to, entries],
  );
  const activePreset = matchingPreset(range.from, range.to);
  const adjusted = from !== range.from || to !== range.to;

  function applyPreset(id: Exclude<PresetId, "custom">) {
    const next = presetRange(id);
    setFrom(next.from);
    setTo(next.to);
  }

  useEffect(() => {
    setEntries(loadLedger());
    setLedgerReady(true);
  }, []);

  useEffect(() => {
    if (ledgerReady) saveLedger(entries);
  }, [entries, ledgerReady]);

  function placeEntry(entry: LedgerEntry) {
    setFrom((current) => (entry.date < current ? entry.date : current));
    setTo((current) => (entry.date > current ? entry.date : current));
  }

  function addEntry(entry: LedgerEntry) {
    setEntries((current) => [entry, ...current]);
    placeEntry(entry);
  }

  function updateEntry(entry: LedgerEntry) {
    setEntries((current) => current.map((item) => (item.id === entry.id ? entry : item)));
    placeEntry(entry);
  }

  const compare =
    model.summary.comparable
      ? `Comparado con ${rangeLabel(model.summary.prevFrom, model.summary.prevTo)}`
      : "El período anterior no tiene historial suficiente para comparar";

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="h-1 bg-pine" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-serif text-3xl leading-none tracking-tight text-ink italic">Cifra</p>
            <h1 className="mt-2 text-base font-medium text-ink">Libro de ingresos</h1>
            <p className="text-sm text-muted">Taller Norte · datos de muestra, disponibles sin conexión</p>
          </div>
          <p className="text-sm text-muted">
            Cierre al <span className="font-medium text-ink">{shortDate(DATA_END, true)}</span>
          </p>
        </header>

        <section className="rounded-2xl bg-surface p-2 shadow-card" aria-label="Filtro de fechas">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Rangos rápidos">
              {PRESETS.filter((preset) => preset.id !== "custom").map((preset) => {
                const selected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      if (preset.id !== "custom") applyPreset(preset.id);
                    }}
                    className={cn(
                      "min-h-11 rounded-xl px-3 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
                      selected ? "bg-ink text-paper" : "text-ink hover:bg-ink-soft",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
              {activePreset === "custom" ? (
                <span className="inline-flex min-h-11 items-center rounded-xl bg-ink px-3 text-sm font-medium text-paper">
                  Personalizado
                </span>
              ) : null}
            </div>
            <div className="grid gap-2 px-1 pb-1 sm:grid-cols-2 lg:pb-0">
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-ink-soft px-3 text-sm">
                <span className="text-muted">Desde</span>
                <input
                  type="date"
                  value={from}
                  min={DATA_START}
                  max={LEDGER_END}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-11 bg-transparent text-ink focus-visible:outline-none"
                />
              </label>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-ink-soft px-3 text-sm">
                <span className="text-muted">Hasta</span>
                <input
                  type="date"
                  value={to}
                  min={DATA_START}
                  max={LEDGER_END}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-11 bg-transparent text-ink focus-visible:outline-none"
                />
              </label>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-ink">{rangeLabel(range.from, range.to)}</p>
          <p className="text-sm text-muted">
            {model.summary.days} días · {compare}
            {adjusted ? ` · Ajustado al historial (${shortDate(DATA_START, true)} – ${shortDate(DATA_END, true)})` : ""}
          </p>
        </div>

        <LedgerPanel
          entries={entries}
          from={range.from}
          to={range.to}
          defaultDate={range.to}
          onAdd={addEntry}
          onUpdate={updateEntry}
          onRemove={(id) => setEntries((current) => current.filter((entry) => entry.id !== id))}
        />
        <KpiCards model={model} />
        <TrendCharts points={model.trend.points} grain={model.trend.grain} />
        <BreakdownTable
          plans={model.plans}
          channels={model.channels}
          days={model.summary.days}
          totalGrowth={model.summary.growth}
          totalChurn={model.summary.churn}
        />
      </div>
    </main>
  );
}
