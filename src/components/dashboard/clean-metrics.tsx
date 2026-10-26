import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Eraser } from "lucide-react";
import type { FinanceMode } from "@/lib/ledger";

export function CleanMetrics({
  mode,
  count,
  sample,
  onConfirm,
}: {
  mode: FinanceMode;
  count: number;
  sample: boolean;
  onConfirm: () => void;
}) {
  const scope = mode === "personal" ? "tus finanzas personales" : "el libro del negocio";
  const entries =
    count === 0
      ? "No hay movimientos propios que borrar"
      : count === 1
        ? "Se borrará 1 movimiento"
        : `Se borrarán ${count} movimientos`;

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface px-3 text-sm font-medium text-ink shadow-card transition-colors duration-200 ease-out hover:bg-rust-soft hover:text-rust focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          <Eraser className="size-4" aria-hidden="true" />
          Limpiar métricas
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-5 text-ink shadow-card focus-visible:outline-none">
          <AlertDialog.Title className="text-base font-medium">
            ¿Limpiar las métricas?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted">
            {entries} de {scope}
            {sample ? " y se ocultarán los datos de muestra" : ""}. Todos los indicadores empezarán
            desde cero. Esto no se puede deshacer.
          </AlertDialog.Description>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="min-h-11 rounded-xl bg-ink-soft px-4 text-sm font-medium text-ink transition-colors duration-200 ease-out hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
              >
                Cancelar
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onConfirm}
                className="min-h-11 rounded-xl bg-rust px-4 text-sm font-medium text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
              >
                Limpiar
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
