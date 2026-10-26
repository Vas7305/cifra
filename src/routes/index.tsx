import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import { BreakdownTable } from "@/components/dashboard/breakdown-table";
import { CategoryTable } from "@/components/dashboard/category-table";
import { CleanMetrics } from "@/components/dashboard/clean-metrics";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { LedgerKpis } from "@/components/dashboard/ledger-kpis";
import { LedgerPanel } from "@/components/dashboard/ledger-panel";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { TrendCharts } from "@/components/dashboard/trend-charts";
import {
  loadLedger,
  loadPrefs,
  MODES,
  saveLedger,
  savePrefs,
  type FinanceMode,
  type LedgerEntry,
} from "@/lib/ledger";
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
  const [mode, setMode] = useState<FinanceMode>("negocio");
  const [sampleHidden, setSampleHidden] = useState(false);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [ledgerReady, setLedgerReady] = useState(false);
  const sample = mode === "negocio" && !sampleHidden;
  const range = useMemo(() => clampRange(from, to), [from, to]);
  const model = useMemo(
    () => buildDashboard(range.from, range.to, entries, { sample }),
    [range.from, range.to, entries, sample],
  );
  const activePreset = matchingPreset(range.from, range.to);
  const adjusted = from !== range.from || to !== range.to;

  function applyPreset(id: Exclude<PresetId, "custom">) {
    const next = presetRange(id);
    setFrom(next.from);
    setTo(next.to);
  }

  useEffect(() => {
    const prefs = loadPrefs();
    setMode(prefs.mode);
    setSampleHidden(prefs.sampleHidden);
    setEntries(loadLedger(prefs.mode));
    setLedgerReady(true);
  }, []);

  useEffect(() => {
    if (ledgerReady) saveLedger(mode, entries);
  }, [mode, entries, ledgerReady]);

  useEffect(() => {
    if (ledgerReady) savePrefs({ mode, sampleHidden });
  }, [mode, sampleHidden, ledgerReady]);

  // Mode and entries change in the same render, so the save effect never
  // writes one system's movements under the other system's key.
  function switchMode(next: FinanceMode) {
    if (next === mode) return;
    setMode(next);
    setEntries(loadLedger(next));
  }

  function cleanMetrics() {
    setEntries([]);
    if (mode === "negocio") setSampleHidden(true);
    applyPreset("30");
  }

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
            <Logo />
            <h1 className="mt-2 text-base font-medium text-ink">
              {mode === "personal" ? "Finanzas personales" : "Libro del negocio"}
            </h1>
            <p className="text-sm text-muted">
              {mode === "personal"
                ? "Tus cuentas · guardadas en este navegador"
                : sample
                  ? "Taller Norte · datos de muestra, disponibles sin conexión"
                  : "Taller Norte · solo tus movimientos, guardados en este navegador"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-xl bg-ink-soft p-1" role="group" aria-label="Sistema">
                {MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={mode === item.id}
                    onClick={() => switchMode(item.id)}
                    className={cn(
                      "min-h-11 rounded-lg px-3 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
                      mode === item.id ? "bg-ink text-paper" : "text-ink hover:bg-surface",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <CleanMetrics mode={mode} count={entries.length} sample={sample} onConfirm={cleanMetrics} />
              <ThemeToggle />
            </div>
            {sample ? (
              <p className="text-sm text-muted">
                Cierre al <span className="font-medium text-ink">{shortDate(DATA_END, true)}</span>
              </p>
            ) : mode === "negocio" ? (
              <button
                type="button"
                onClick={() => setSampleHidden(false)}
                className="min-h-11 self-start rounded-xl px-1 text-sm font-medium text-pine underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine sm:self-end"
              >
                Restaurar datos de muestra
              </button>
            ) : null}
          </div>
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
          key={mode}
          mode={mode}
          sample={sample}
          entries={entries}
          from={range.from}
          to={range.to}
          defaultDate={range.to}
          onAdd={addEntry}
          onUpdate={updateEntry}
          onRemove={(id) => setEntries((current) => current.filter((entry) => entry.id !== id))}
        />
        {sample ? (
          <>
            <KpiCards model={model} />
            <TrendCharts points={model.trend.points} grain={model.trend.grain} />
            <BreakdownTable
              plans={model.plans}
              channels={model.channels}
              days={model.summary.days}
              totalGrowth={model.summary.growth}
              totalChurn={model.summary.churn}
            />
          </>
        ) : (
          <>
            <LedgerKpis model={model} mode={mode} />
            <TrendCharts points={model.trend.points} grain={model.trend.grain} customers={false} />
            <CategoryTable income={model.incomeCategories} expenses={model.expenseCategories} />
          </>
        )}
      </div>
    </main>
  );
}
