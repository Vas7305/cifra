import { useRef, useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type LedgerEntry,
  type LedgerKind,
} from "@/lib/ledger";
import { DATA_START, formatMoney, LEDGER_END, shortDate } from "@/lib/revenue-data";
import { cn } from "@/lib/cn";

export function LedgerPanel({
  entries,
  from,
  to,
  defaultDate,
  onAdd,
  onUpdate,
  onRemove,
}: {
  entries: LedgerEntry[];
  from: string;
  to: string;
  defaultDate: string;
  onAdd: (entry: LedgerEntry) => void;
  onUpdate: (entry: LedgerEntry) => void;
  onRemove: (id: string) => void;
}) {
  const conceptRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<LedgerKind>("ingreso");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [error, setError] = useState("");

  const baseCategories = (kind === "ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES) as readonly string[];
  const categories = baseCategories.includes(category) ? baseCategories : [category, ...baseCategories];
  const inRange = entries.filter((entry) => entry.date >= from && entry.date <= to);
  const outside = entries.length - inRange.length;
  const visible = [...inRange].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  function chooseKind(next: LedgerKind) {
    const nextCategories = (next === "ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES) as readonly string[];
    setKind(next);
    setCategory((current) => (nextCategories.includes(current) ? current : nextCategories[0]));
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setConcept("");
    setAmount("");
    setError("");
  }

  function startEdit(entry: LedgerEntry) {
    setEditingId(entry.id);
    setKind(entry.kind);
    setConcept(entry.concept);
    setAmount(String(entry.amount));
    setDate(entry.date);
    setCategory(entry.category);
    setError("");
    conceptRef.current?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = Math.round(Number(amount));
    const label = concept.trim();
    if (!label) {
      setError("Escribe un concepto.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed < 1) {
      setError("El importe tiene que ser de al menos $1.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < DATA_START || date > LEDGER_END) {
      setError("Elige una fecha dentro del historial.");
      return;
    }
    const next = {
      id: editingId ?? crypto.randomUUID(),
      kind,
      date,
      amount: parsed,
      concept: label.slice(0, 80),
      category,
    };
    if (editingId) onUpdate(next);
    else onAdd(next);
    resetForm();
  }

  return (
    <section className="rounded-2xl bg-surface p-4 shadow-card sm:p-5" aria-label="Movimientos">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-ink">
            {editingId ? "Editar movimiento" : "Añadir ingreso o gasto"}
          </h2>
          <p className="text-xs text-muted">
            {editingId
              ? "Cambia los datos y guarda. El tablero se actualiza al momento."
              : "Se guarda en este navegador y entra en el rango de fechas."}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-ink-soft p-1" role="group" aria-label="Tipo de movimiento">
          {(
            [
              ["ingreso", "Ingreso"],
              ["gasto", "Gasto"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => chooseKind(id)}
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

      <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <label className="flex min-h-11 flex-col justify-center rounded-xl bg-ink-soft px-3 py-1.5 lg:col-span-2">
          <span className="text-xs text-muted">Concepto</span>
          <input
            ref={conceptRef}
            value={concept}
            onChange={(event) => setConcept(event.target.value)}
            maxLength={80}
            placeholder={kind === "ingreso" ? "Cobro de proyecto" : "Anuncios"}
            className="h-8 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </label>
        <label className="flex min-h-11 flex-col justify-center rounded-xl bg-ink-soft px-3 py-1.5">
          <span className="text-xs text-muted">Importe</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            type="number"
            min={1}
            step={1}
            placeholder="150"
            className="h-8 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </label>
        <label className="flex min-h-11 flex-col justify-center rounded-xl bg-ink-soft px-3 py-1.5">
          <span className="text-xs text-muted">Fecha</span>
          <input
            type="date"
            value={date}
            min={DATA_START}
            max={LEDGER_END}
            onChange={(event) => setDate(event.target.value)}
            className="h-8 bg-transparent text-sm text-ink outline-none"
          />
        </label>
        <label className="flex min-h-11 flex-col justify-center rounded-xl bg-ink-soft px-3 py-1.5">
          <span className="text-xs text-muted">Categoría</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-8 bg-transparent text-sm text-ink outline-none"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1 lg:flex-col">
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-11 flex-1 rounded-xl bg-ink-soft px-3 text-sm font-medium text-ink transition-colors duration-200 ease-out hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
            >
              Cancelar
            </button>
          ) : null}
          <button
            type="submit"
            className={cn(
              "min-h-11 flex-1 rounded-xl px-4 text-sm font-medium text-paper transition-opacity duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
              kind === "ingreso" ? "bg-pine" : "bg-rust",
            )}
          >
            {editingId ? "Guardar" : kind === "ingreso" ? "Añadir ingreso" : "Añadir gasto"}
          </button>
        </div>
      </form>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}

      <ul className="mt-4 divide-y divide-line">
        {visible.length === 0 ? (
          <li className="py-3 text-sm text-muted">
            {entries.length === 0
              ? "Todavía no hay movimientos propios. Los de muestra siguen en el libro."
              : "No hay movimientos propios en este rango."}
          </li>
        ) : (
          visible.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "-mx-2 flex items-center gap-2 rounded-lg px-2 py-1 sm:gap-3",
                editingId === entry.id ? "bg-ink-soft" : "",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{entry.concept}</p>
                <p className="text-xs text-muted">
                  {shortDate(entry.date, true)} · {entry.category} ·{" "}
                  {entry.kind === "ingreso" ? "Ingreso" : "Gasto"}
                </p>
              </div>
              <p
                className={cn(
                  "text-sm font-medium tabular-nums",
                  entry.kind === "ingreso" ? "text-pine" : "text-rust",
                )}
              >
                {entry.kind === "ingreso" ? "+" : "−"}
                {formatMoney(entry.amount)}
              </p>
              <button
                type="button"
                onClick={() => startEdit(entry)}
                aria-label={`Editar ${entry.concept}`}
                className="inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingId === entry.id) resetForm();
                  onRemove(entry.id);
                }}
                aria-label={`Quitar ${entry.concept}`}
                className="inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-out hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))
        )}
      </ul>
      {outside > 0 ? (
        <p className="text-xs text-muted">
          {outside === 1 ? "Hay 1 movimiento fuera de este rango." : `Hay ${outside} movimientos fuera de este rango.`}
        </p>
      ) : null}
    </section>
  );
}
