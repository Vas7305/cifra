import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import type { LedgerEntry } from "@/lib/ledger";

export const DATA_START = "2025-01-01";
export const DATA_END = "2026-10-20";
export const LEDGER_END = "2026-12-31";

const PLANS = [
  { id: "esencial", name: "Esencial", price: 19, churn: 0.00105, win: 0.52, active: 180 },
  { id: "estudio", name: "Estudio", price: 49, churn: 0.00068, win: 0.28, active: 120 },
  { id: "colectivo", name: "Colectivo", price: 99, churn: 0.00042, win: 0.13, active: 64 },
  { id: "empresa", name: "Empresa", price: 240, churn: 0.00024, win: 0.07, active: 24 },
] as const;

const CHANNELS = [
  { id: "web", name: "Sitio web", weight: 0.41 },
  { id: "referidos", name: "Referidos", weight: 0.27 },
  { id: "socios", name: "Socios", weight: 0.2 },
  { id: "eventos", name: "Eventos", weight: 0.12 },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];
export type ChannelId = (typeof CHANNELS)[number]["id"];

export type Slice = {
  revenue: number;
  cancellations: number;
  newCustomers: number;
  active: number;
};

export type DailyRow = {
  date: string;
  revenue: number;
  cancellations: number;
  newCustomers: number;
  active: number;
  plans: Record<PlanId, Slice>;
  channels: Record<ChannelId, Slice>;
};

export type PresetId = "7" | "30" | "90" | "ytd" | "custom";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "7", label: "7 días" },
  { id: "30", label: "30 días" },
  { id: "90", label: "90 días" },
  { id: "ytd", label: "Este año" },
  { id: "custom", label: "Personalizado" },
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function countEvents(expected: number, rand: () => number) {
  const rate = Math.max(0, expected);
  const limit = Math.exp(-rate);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rand();
  } while (p > limit && k < 48);
  return k - 1;
}

function splitTotal(total: number, weights: number[]) {
  const safe = Math.max(0, Math.round(total));
  const sumW = weights.reduce((acc, w) => acc + Math.max(w, 0), 0) || 1;
  const raw = weights.map((w) => (safe * Math.max(w, 0)) / sumW);
  const floors = raw.map((n) => Math.floor(n));
  let leftover = safe - floors.reduce((acc, n) => acc + n, 0);
  const order = raw
    .map((n, i) => ({ i, frac: n - (floors[i] ?? 0) }))
    .sort((a, b) => b.frac - a.frac);
  for (const item of order) {
    if (leftover <= 0) break;
    floors[item.i] = (floors[item.i] ?? 0) + 1;
    leftover -= 1;
  }
  return floors;
}

function inSpan(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function buildSeries(): DailyRow[] {
  const rand = mulberry32(0xc1f4a);
  const active: Record<PlanId, number> = {
    esencial: 180,
    estudio: 120,
    colectivo: 64,
    empresa: 24,
  };
  const rows: DailyRow[] = [];
  const start = parseISO(DATA_START);
  const totalDays = differenceInCalendarDays(parseISO(DATA_END), start);
  let baseNew = 2.4;

  for (let i = 0; i <= totalDays; i += 1) {
    const date = addDays(start, i);
    const iso = format(date, "yyyy-MM-dd");
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6;
    baseNew += 0.0045;

    let demand = weekend ? 0.42 : 1;
    let churnBoost = weekend ? 0.55 : 1;
    if (inSpan(iso, "2026-03-02", "2026-03-20")) {
      demand *= 0.62;
      churnBoost *= 1.35;
    }
    if (inSpan(iso, "2026-06-08", "2026-06-28")) churnBoost *= 1.85;
    if (inSpan(iso, "2026-09-08", "2026-09-24")) demand *= 1.55;

    const priceBoost = iso >= "2026-06-08" ? 1.08 : 1;
    const plans = {} as Record<PlanId, Slice>;
    let revenue = 0;
    let cancellations = 0;
    let newCustomers = 0;
    let activeTotal = 0;

    for (const plan of PLANS) {
      const startActive = active[plan.id];
      const cancels = Math.min(
        startActive,
        countEvents(startActive * plan.churn * churnBoost, rand),
      );
      const wins = countEvents(baseNew * plan.win * demand, rand);
      const recurring = Math.round((startActive * plan.price * priceBoost) / 30);
      plans[plan.id] = {
        revenue: recurring,
        cancellations: cancels,
        newCustomers: wins,
        active: startActive,
      };
      active[plan.id] = startActive - cancels + wins;
      revenue += recurring;
      cancellations += cancels;
      newCustomers += wins;
      activeTotal += startActive;
    }

    const serviceNoise = 0.75 + rand() * 0.5;
    const serviceBase = weekend ? 220 : 1750;
    let service = Math.round(serviceBase * serviceNoise * (demand > 1 ? 1.15 : demand < 0.7 ? 0.7 : 1));
    if (inSpan(iso, "2026-03-02", "2026-03-20")) service = Math.round(service * 0.55);
    if (inSpan(iso, "2026-09-08", "2026-09-24")) service = Math.round(service * 1.28);

    const serviceWeights = PLANS.map((plan) => plans[plan.id].revenue + plan.price);
    const serviceParts = splitTotal(service, serviceWeights);
    PLANS.forEach((plan, index) => {
      plans[plan.id].revenue += serviceParts[index] ?? 0;
    });
    revenue += service;

    const channelWeights = CHANNELS.map((channel) => channel.weight * (0.86 + rand() * 0.28));
    const channelRevenue = splitTotal(revenue, channelWeights);
    const channelCancels = splitTotal(cancellations, channelWeights);
    const channelWins = splitTotal(newCustomers, channelWeights);
    const channelActive = splitTotal(activeTotal, channelWeights);
    const channels = {} as Record<ChannelId, Slice>;
    CHANNELS.forEach((channel, index) => {
      channels[channel.id] = {
        revenue: channelRevenue[index] ?? 0,
        cancellations: channelCancels[index] ?? 0,
        newCustomers: channelWins[index] ?? 0,
        active: channelActive[index] ?? 0,
      };
    });

    rows.push({
      date: iso,
      revenue,
      cancellations,
      newCustomers,
      active: activeTotal,
      plans,
      channels,
    });
  }

  return rows;
}

export const SERIES: DailyRow[] = buildSeries();

export function formatMoney(value: number) {
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(
    Math.abs(rounded),
  );
  return `${rounded < 0 ? "−" : ""}$${formatted}`;
}

export function formatAxis(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const compact = new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: abs >= 10000 ? 0 : 1,
    }).format(abs / 1000);
    return `${value < 0 ? "−" : ""}$${compact} mil`;
  }
  return formatMoney(value);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatPct(value: number, digits = 1, signed = false) {
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value);
}

export function shortDate(iso: string, withYear = false) {
  const date = parseISO(iso);
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return withYear ? `${label} ${date.getFullYear()}` : label;
}

export function rangeLabel(from: string, to: string) {
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${shortDate(from, !sameYear)} – ${shortDate(to, true)}`;
}

export function presetRange(id: Exclude<PresetId, "custom">) {
  if (id === "ytd") return { from: "2026-01-01", to: DATA_END };
  const days = id === "7" ? 7 : id === "30" ? 30 : 90;
  return {
    from: format(addDays(parseISO(DATA_END), -(days - 1)), "yyyy-MM-dd"),
    to: DATA_END,
  };
}

export function clampRange(from: string, to: string) {
  const valid = /^\d{4}-\d{2}-\d{2}$/;
  let a = valid.test(from) ? from : presetRange("30").from;
  let b = valid.test(to) ? to : DATA_END;
  if (a > b) [a, b] = [b, a];
  if (a < DATA_START) a = DATA_START;
  if (b > LEDGER_END) b = LEDGER_END;
  return { from: a, to: b };
}

export function matchingPreset(from: string, to: string): PresetId {
  const ids = ["7", "30", "90", "ytd"] as const;
  for (const id of ids) {
    const range = presetRange(id);
    if (range.from === from && range.to === to) return id;
  }
  return "custom";
}

function windowRows(from: string, to: string) {
  return SERIES.filter((row) => row.date >= from && row.date <= to);
}

function previousBounds(from: string, to: string) {
  const length = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  const prevTo = addDays(parseISO(from), -1);
  const prevFrom = addDays(prevTo, -(length - 1));
  return {
    from: format(prevFrom, "yyyy-MM-dd"),
    to: format(prevTo, "yyyy-MM-dd"),
    length,
  };
}

export type Summary = {
  from: string;
  to: string;
  days: number;
  revenue: number;
  prevRevenue: number;
  growth: number | null;
  cancellations: number;
  prevCancellations: number;
  churn: number | null;
  prevChurn: number | null;
  startActive: number;
  newCustomers: number;
  prevFrom: string;
  prevTo: string;
  comparable: boolean;
  expenses: number;
  prevExpenses: number;
  expenseGrowth: number | null;
  manualIncome: number;
  balance: number;
  prevBalance: number;
  savingsRate: number | null;
};

function sumBy<T>(rows: T[], pick: (row: T) => number) {
  return rows.reduce((acc, row) => acc + pick(row), 0);
}

export type TrendPoint = {
  key: string;
  label: string;
  fullLabel: string;
  revenue: number;
  expense: number;
  cancellations: number;
  newCustomers: number;
};

export type Trend = {
  grain: "día" | "semana" | "mes";
  points: TrendPoint[];
};

function grainFor(span: number): Trend["grain"] {
  if (span <= 45) return "día";
  if (span <= 140) return "semana";
  return "mes";
}

function pointMeta(date: string, grain: Trend["grain"]) {
  if (grain === "semana") {
    const key = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    return { key, label: shortDate(key), fullLabel: `Semana del ${shortDate(key, true)}` };
  }
  if (grain === "mes") {
    const parsed = parseISO(date);
    const key = date.slice(0, 7);
    const label = `${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
    return { key, label, fullLabel: label };
  }
  return { key: date, label: shortDate(date), fullLabel: shortDate(date, true) };
}

function emptyPoint(date: string, grain: Trend["grain"]): TrendPoint {
  const meta = pointMeta(date, grain);
  return {
    ...meta,
    revenue: 0,
    expense: 0,
    cancellations: 0,
    newCustomers: 0,
  };
}

function trendSeries(rows: DailyRow[], span: number): Trend {
  const grain = grainFor(Math.max(span, rows.length));
  const buckets = new Map<string, TrendPoint>();

  for (const row of rows) {
    const meta = pointMeta(row.date, grain);
    const current = buckets.get(meta.key) ?? emptyPoint(row.date, grain);
    current.revenue += row.revenue;
    current.cancellations += row.cancellations;
    current.newCustomers += row.newCustomers;
    buckets.set(meta.key, current);
  }

  return { grain, points: [...buckets.values()] };
}

// Without sample rows the chart only gets points where entries exist, so give
// every day, week or month in the range a zero point to keep the axis whole.
function seedPoints(trend: Trend, from: string, span: number) {
  for (let index = 0; index < span; index += 1) {
    const date = format(addDays(parseISO(from), index), "yyyy-MM-dd");
    const key = pointMeta(date, trend.grain).key;
    if (!trend.points.some((point) => point.key === key)) trend.points.push(emptyPoint(date, trend.grain));
  }
}

function sumEntries(entries: LedgerEntry[], from: string, to: string, kind: LedgerEntry["kind"]) {
  return entries.reduce((total, entry) => {
    if (entry.kind !== kind || entry.date < from || entry.date > to) return total;
    return total + entry.amount;
  }, 0);
}

function applyEntries(trend: Trend, entries: LedgerEntry[], from: string, to: string) {
  for (const entry of entries) {
    if (entry.date < from || entry.date > to) continue;
    const meta = pointMeta(entry.date, trend.grain);
    const current = trend.points.find((point) => point.key === meta.key) ?? emptyPoint(entry.date, trend.grain);
    if (entry.kind === "ingreso") current.revenue += entry.amount;
    else current.expense += entry.amount;
    if (!trend.points.includes(current)) trend.points.push(current);
  }
  trend.points.sort((a, b) => a.key.localeCompare(b.key));
}

export type BreakdownRow = {
  id: string;
  name: string;
  revenue: number;
  share: number;
  growth: number | null;
  cancellations: number;
  churn: number | null;
};

function segmentRows(
  rows: DailyRow[],
  prevRows: DailyRow[],
  comparable: boolean,
  dimension: "plan" | "canal",
): BreakdownRow[] {
  const catalog = dimension === "plan" ? PLANS : CHANNELS;
  const total = sumBy(rows, (row) => row.revenue);

  return catalog.map((item) => {
    const pick = (row: DailyRow) =>
      dimension === "plan" ? row.plans[item.id as PlanId] : row.channels[item.id as ChannelId];
    const revenue = sumBy(rows, (row) => pick(row).revenue);
    const prevRevenue = sumBy(prevRows, (row) => pick(row).revenue);
    const cancellations = sumBy(rows, (row) => pick(row).cancellations);
    const startActive = rows[0] ? pick(rows[0]).active : 0;
    return {
      id: item.id,
      name: item.name,
      revenue,
      share: total > 0 ? revenue / total : 0,
      growth: comparable && prevRevenue > 0 ? (revenue - prevRevenue) / prevRevenue : null,
      cancellations,
      churn: startActive > 0 ? cancellations / startActive : null,
    };
  });
}

export type CategoryRow = {
  id: string;
  name: string;
  amount: number;
  share: number;
  growth: number | null;
};

function categoryRows(
  entries: LedgerEntry[],
  kind: LedgerEntry["kind"],
  bounds: { from: string; to: string; prevFrom: string; prevTo: string },
  comparable: boolean,
): CategoryRow[] {
  const current = new Map<string, number>();
  const previous = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind !== kind) continue;
    if (entry.date >= bounds.from && entry.date <= bounds.to) {
      current.set(entry.category, (current.get(entry.category) ?? 0) + entry.amount);
    } else if (entry.date >= bounds.prevFrom && entry.date <= bounds.prevTo) {
      previous.set(entry.category, (previous.get(entry.category) ?? 0) + entry.amount);
    }
  }
  const total = [...current.values()].reduce((acc, value) => acc + value, 0);
  return [...current.entries()]
    .map(([name, amount]) => {
      const prev = previous.get(name) ?? 0;
      return {
        id: name,
        name,
        amount,
        share: total > 0 ? amount / total : 0,
        growth: comparable && prev > 0 ? (amount - prev) / prev : null,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

export type DashboardModel = {
  summary: Summary;
  trend: Trend;
  plans: BreakdownRow[];
  channels: BreakdownRow[];
  incomeCategories: CategoryRow[];
  expenseCategories: CategoryRow[];
  revenueSpark: number[];
  expenseSpark: number[];
  cancelSpark: number[];
};

function downsample(values: number[], max = 36) {
  if (values.length <= max) return values;
  const out: number[] = [];
  const step = (values.length - 1) / (max - 1);
  for (let i = 0; i < max; i += 1) out.push(values[Math.round(i * step)] ?? 0);
  return out;
}

export function buildDashboard(
  from: string,
  to: string,
  entries: LedgerEntry[] = [],
  { sample = true }: { sample?: boolean } = {},
): DashboardModel {
  const rows = sample ? windowRows(from, to) : [];
  const prevBounds = previousBounds(from, to);
  const prevRows = sample ? windowRows(prevBounds.from, prevBounds.to) : [];
  const span = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  const comparable = sample
    ? rows.length > 0 && prevRows.length === prevBounds.length && span === rows.length
    : prevBounds.from >= DATA_START;
  const manualIncome = sumEntries(entries, from, to, "ingreso");
  const prevManualIncome = sumEntries(entries, prevBounds.from, prevBounds.to, "ingreso");
  const expenses = sumEntries(entries, from, to, "gasto");
  const prevExpenses = sumEntries(entries, prevBounds.from, prevBounds.to, "gasto");
  const sampleRevenue = sumBy(rows, (row) => row.revenue);
  const prevSampleRevenue = sumBy(prevRows, (row) => row.revenue);
  const revenue = sampleRevenue + manualIncome;
  const prevRevenue = prevSampleRevenue + prevManualIncome;
  const cancellations = sumBy(rows, (row) => row.cancellations);
  const prevCancellations = sumBy(prevRows, (row) => row.cancellations);
  const startActive = rows[0]?.active ?? 0;
  const prevStartActive = prevRows[0]?.active ?? 0;
  const churn = startActive > 0 ? cancellations / startActive : null;
  const prevChurn = comparable && prevStartActive > 0 ? prevCancellations / prevStartActive : null;
  const plans = segmentRows(rows, prevRows, comparable, "plan");
  const base = sumBy(plans, (plan) => plan.revenue);
  const grand = base + manualIncome;
  if (grand > 0) {
    for (const plan of plans) plan.share = plan.revenue / grand;
  }
  if (manualIncome > 0) {
    plans.push({
      id: "registrados",
      name: "Registrados",
      revenue: manualIncome,
      share: manualIncome / grand,
      growth: null,
      cancellations: 0,
      churn: null,
    });
  }

  const trend = trendSeries(rows, span);
  if (!sample) seedPoints(trend, from, span);
  applyEntries(trend, entries, from, to);

  const sampleByDate = new Map(rows.map((row) => [row.date, row.revenue]));
  const revenueSeries: number[] = [];
  const expenseSeries: number[] = [];
  for (let index = 0; index < span; index += 1) {
    const date = format(addDays(parseISO(from), index), "yyyy-MM-dd");
    let income = sampleByDate.get(date) ?? 0;
    let expense = 0;
    for (const entry of entries) {
      if (entry.date !== date) continue;
      if (entry.kind === "ingreso") income += entry.amount;
      else expense += entry.amount;
    }
    revenueSeries.push(income);
    expenseSeries.push(expense);
  }

  const summary: Summary = {
    from,
    to,
    days: span,
    revenue,
    prevRevenue,
    growth: comparable && prevRevenue > 0 ? (revenue - prevRevenue) / prevRevenue : null,
    cancellations,
    prevCancellations,
    churn,
    prevChurn,
    startActive,
    newCustomers: sumBy(rows, (row) => row.newCustomers),
    prevFrom: prevBounds.from,
    prevTo: prevBounds.to,
    comparable,
    expenses,
    prevExpenses,
    expenseGrowth: !comparable
      ? null
      : prevExpenses > 0
        ? (expenses - prevExpenses) / prevExpenses
        : expenses === 0
          ? 0
          : null,
    manualIncome,
    balance: revenue - expenses,
    prevBalance: prevRevenue - prevExpenses,
    savingsRate: revenue > 0 ? (revenue - expenses) / revenue : null,
  };
  const categoryBounds = { from, to, prevFrom: prevBounds.from, prevTo: prevBounds.to };

  return {
    summary,
    trend,
    plans,
    channels: segmentRows(rows, prevRows, comparable, "canal"),
    incomeCategories: categoryRows(entries, "ingreso", categoryBounds, comparable),
    expenseCategories: categoryRows(entries, "gasto", categoryBounds, comparable),
    revenueSpark: downsample(revenueSeries),
    expenseSpark: downsample(expenseSeries),
    cancelSpark: downsample(rows.map((row) => row.cancellations)),
  };
}

export function rowDetail(row: BreakdownRow, days: number) {
  const growth =
    row.growth == null
      ? "sin una base comparable"
      : `${formatPct(row.growth, 1, true)} frente al período anterior`;
  const churn = row.churn == null ? "sin tasa" : formatPct(row.churn);
  return `${row.name} aportó ${formatMoney(row.revenue)} en ${days} días, ${formatPct(row.share)} del total, ${growth}. ${formatCount(row.cancellations)} cancelaciones (${churn}).`;
}
