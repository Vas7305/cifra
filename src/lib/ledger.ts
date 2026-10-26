export type LedgerKind = "ingreso" | "gasto";

export type LedgerEntry = {
  id: string;
  kind: LedgerKind;
  date: string;
  amount: number;
  concept: string;
  category: string;
};

export const INCOME_CATEGORIES = ["Servicios", "Suscripción", "Producto", "Otro"] as const;
export const EXPENSE_CATEGORIES = ["Operación", "Nómina", "Marketing", "Herramientas", "Otro"] as const;

const STORAGE_KEY = "cifra-ledger-v1";

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

export function loadLedger(): LedgerEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

export function saveLedger(entries: LedgerEntry[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
