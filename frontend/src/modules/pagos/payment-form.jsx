"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, CreditCard, LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getQuotes } from "@/services/cotizaciones";
import { getQuoteFinancialSummary, paymentFormSchema, registerPayment } from "@/services/pagos";

const defaultValues = {
  quoteId: "",
  method: "TRANSFERENCIA",
  amount: "",
  reference: "",
  registeredBy: "",
};

export function PaymentForm({ onSaved, preselectedQuoteId = null }) {
  const [open, setOpen] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: preselectedQuoteId ? { ...defaultValues, quoteId: preselectedQuoteId } : defaultValues,
  });

  const selectedQuoteId = watch("quoteId");
  const selectedMethod = watch("method");

  useEffect(() => {
    if (open) {
      getQuotes()
        .then((items) => setQuotes(Array.isArray(items) ? items : []))
        .catch(() => setQuotes([]));
      setServerError("");
    }
  }, [open]);

  useEffect(() => {
    if (selectedQuoteId) {
      setLoadingSummary(true);
      getQuoteFinancialSummary(selectedQuoteId)
        .then((summary) => setFinancialSummary(summary))
        .catch(() => setFinancialSummary(null))
        .finally(() => setLoadingSummary(false));
    } else {
      setFinancialSummary(null);
    }
  }, [selectedQuoteId]);

  function handleOpenChange(next) {
    if (isSubmitting) return;
    setOpen(next);
    if (!next) {
      reset(defaultValues);
      setFinancialSummary(null);
      setServerError("");
    }
  }

  async function onSubmit(data) {
    setServerError("");
    try {
      const payload = {
        quoteId: data.quoteId,
        method: data.method,
        amount: Number(data.amount),
        reference: data.reference ? data.reference.trim() : null,
        registeredBy: data.registeredBy ? data.registeredBy.trim() : null,
      };

      const result = await registerPayment(payload);
      handleOpenChange(false);
      if (onSaved) onSaved(result);
    } catch (failure) {
      setServerError(failure.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="primary-action">
          <Plus aria-hidden="true" />
          Registrar pago
        </Button>
      </DialogTrigger>

      <DialogContent className="equipment-dialog max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar recepción de pago</DialogTitle>
          <DialogDescription>
            Registra el comprobante en efectivo o transferencia. La recepción quedará pendiente de verificación.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="equipment-form">
          <div className="field">
            <Label htmlFor="payment-quote">Cotización asociada *</Label>
            <select
              id="payment-quote"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting || Boolean(preselectedQuoteId)}
              {...register("quoteId")}
            >
              <option value="">Selecciona la cotización a abonar…</option>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.code} — {q.client?.name || "Cliente"} (${Number(q.total).toLocaleString("es-CL")})
                </option>
              ))}
            </select>
            {errors.quoteId ? <p className="field-error">{errors.quoteId.message}</p> : null}
          </div>

          {loadingSummary ? (
            <p className="text-xs text-muted-foreground animate-pulse">Consultando saldo de la cotización…</p>
          ) : financialSummary ? (
            <div className="bg-muted/40 p-3 rounded-md border text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total cotización:</span>
                <span className="font-semibold">${financialSummary.totalCotizacion.toLocaleString("es-CL")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total ya verificado:</span>
                <span className="font-semibold text-emerald-600">
                  ${financialSummary.totalVerificado.toLocaleString("es-CL")}
                </span>
              </div>
              {financialSummary.totalRegistradoPendiente > 0 && (
                <div className="flex justify-between text-xs text-amber-600">
                  <span>En proceso de verificación:</span>
                  <span>${financialSummary.totalRegistradoPendiente.toLocaleString("es-CL")}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Saldo pendiente por verificar:</span>
                <span className="text-primary">${financialSummary.saldoPendiente.toLocaleString("es-CL")}</span>
              </div>
            </div>
          ) : null}

          <div className="field">
            <Label>Método de pago recibido *</Label>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="radio"
                  value="TRANSFERENCIA"
                  {...register("method")}
                  disabled={isSubmitting}
                />
                <CreditCard className="w-4 h-4 text-primary" aria-hidden="true" />
                Transferencia electrónica
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="radio"
                  value="EFECTIVO"
                  {...register("method")}
                  disabled={isSubmitting}
                />
                <Banknote className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                Efectivo
              </label>
            </div>
            {errors.method ? <p className="field-error">{errors.method.message}</p> : null}
          </div>

          <div className="field">
            <Label htmlFor="payment-amount">Monto recibido ($ CLP) *</Label>
            <Input
              id="payment-amount"
              type="number"
              min="1"
              step="1"
              placeholder="Ej. 150000"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.amount)}
              {...register("amount")}
            />
            {errors.amount ? <p className="field-error">{errors.amount.message}</p> : null}
          </div>

          <div className="field">
            <Label htmlFor="payment-reference">
              {selectedMethod === "TRANSFERENCIA"
                ? "N° de comprobante / Operación bancaria"
                : "N° de recibo o comprobante físico (opcional)"}
            </Label>
            <Input
              id="payment-reference"
              type="text"
              placeholder={
                selectedMethod === "TRANSFERENCIA"
                  ? "Ej. Operación #89451234 Banco Santander"
                  : "Ej. Recibo N° 00482"
              }
              maxLength={120}
              disabled={isSubmitting}
              {...register("reference")}
            />
          </div>

          <div className="field">
            <Label htmlFor="payment-registeredBy">Recepcionado por (opcional)</Label>
            <Input
              id="payment-registeredBy"
              type="text"
              placeholder="Ej. Juan Recepción Comercial"
              maxLength={120}
              disabled={isSubmitting}
              {...register("registeredBy")}
            />
          </div>

          <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-md border border-amber-200 dark:border-amber-900">
            <strong>Importante:</strong> Registrar la recepción no disminuye inmediatamente el saldo disponible hasta que el pago sea formalmente verificado.
          </p>

          {serverError ? (
            <p role="alert" className="error-message">
              {serverError}
            </p>
          ) : null}

          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="spin" aria-hidden="true" />
                  Registrando recepción…
                </>
              ) : (
                "Registrar recepción"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
