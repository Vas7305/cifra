export type LedgerKind = "ingreso" | "gasto";
export type FinanceMode = "personal" | "negocio";

export type LedgerEntry = {
  id: string;
  kind: LedgerKind;
  date: string;
  amount: number;
  concept: string;
  category: string;
};

export const MODES: { id: FinanceMode; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "negocio", label: "Negocio" },
];

const CATEGORIES: Record<FinanceMode, Record<LedgerKind, readonly string[]>> = {
  negocio: {
    ingreso: ["Ventas", "Servicios", "Suscripciones", "Inversión de socios", "Otros ingresos"],
    gasto: [
      "Proveedores",
      "Nómina",
      "Alquiler del local",
      "Marketing",
      "Herramientas y software",
      "Impuestos",
      "Otros gastos",
    ],
  },
  personal: {
    ingreso: ["Salario", "Trabajo independiente", "Inversiones", "Regalos", "Otros ingresos"],
    gasto: [
      "Vivienda",
      "Comida",
      "Transporte",
      "Servicios (luz, agua, internet)",
      "Salud",
      "Ocio",
      "Educación",
      "Otros gastos",
    ],
  },
};

export function categoriesFor(mode: FinanceMode, kind: LedgerKind) {
  return CATEGORIES[mode][kind];
}

const LEGACY_KEY = "cifra-ledger-v1";
const PREFS_KEY = "cifra-prefs-v1";

function storageKey(mode: FinanceMode) {
  return `cifra-ledger-${mode}-v1`;
}

function isEntry(value: unknown): value is LedgerEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<LedgerEntry>;
  return (
    typeof entry.id === "string" &&
    (entry.kind === "ingreso" || entry.kind === "gasto") &&
    typeof entry.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
    typeof entry.amount === "number" &&
    Number.isFinite(entry.amount) &&
    entry.amount > 0 &&
    typeof entry.concept === "string" &&
    entry.concept.trim().length > 0 &&
    typeof entry.category === "string"
  );
}

export function loadLedger(mode: FinanceMode): LedgerEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    let raw = localStorage.getItem(storageKey(mode));
    if (raw == null && mode === "negocio") raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

export function saveLedger(mode: FinanceMode, entries: LedgerEntry[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify(entries));
  } catch {
    // Storage can be full or blocked; the dashboard keeps working in memory.
  }
}

export type Prefs = {
  mode: FinanceMode;
  sampleHidden: boolean;
};

const DEFAULT_PREFS: Prefs = { mode: "negocio", sampleHidden: false };

export function loadPrefs(): Prefs {
  if (typeof localStorage === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      mode: parsed.mode === "personal" ? "personal" : "negocio",
      sampleHidden: parsed.sampleHidden === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Same as saveLedger: preferences fall back to the defaults next visit.
  }
}
