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
};

export function PaymentForm({ onSaved, preselectedQuoteId = null }) {
  const [open, setOpen] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [serverError, setServerError] = useState("");
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [quotesAttempt, setQuotesAttempt] = useState(0);
  const [summaryAttempt, setSummaryAttempt] = useState(0);

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
    if (!open) return;
    let active = true;
    setQuotesLoading(true); setQuotesError(""); setQuotes([]);
    getQuotes().then(items => {
      if (!Array.isArray(items)) throw new Error("No se pudieron consultar las cotizaciones");
      if (active) setQuotes(items);
    }).catch(error => { if (active) setQuotesError(error.message || "No se pudieron consultar las cotizaciones"); })
      .finally(() => { if (active) setQuotesLoading(false); });
    return () => { active = false; };
  }, [open, quotesAttempt]);

  useEffect(() => {
    let active = true;
    setFinancialSummary(null); setSummaryError("");
    if (!open || !selectedQuoteId) { setLoadingSummary(false); return; }
    setLoadingSummary(true);
    getQuoteFinancialSummary(selectedQuoteId).then(summary => {
      if (active) setFinancialSummary(summary);
    }).catch(error => { if (active) setSummaryError(error.message || "No se pudo consultar el saldo"); })
      .finally(() => { if (active) setLoadingSummary(false); });
    return () => { active = false; };
  }, [open, selectedQuoteId, summaryAttempt]);

  function handleOpenChange(next) {
    if (isSubmitting) return;
    setOpen(next);
    setServerError("");
    if (!next) {
      reset(preselectedQuoteId ? { ...defaultValues, quoteId: preselectedQuoteId } : defaultValues);
      setFinancialSummary(null);
      setServerError("");
    }
  }

  async function onSubmit(data) {
    setServerError("");
    if (quotesLoading || quotesError || loadingSummary || summaryError || !financialSummary) return;
    try {
      const payload = {
        quoteId: data.quoteId,
        method: data.method,
        amount: Number(data.amount),
        reference: data.reference ? data.reference.trim() : null,
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
              value={selectedQuoteId || ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting || quotesLoading || Boolean(quotesError) || Boolean(preselectedQuoteId)}
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

          {quotesLoading && <p role="status">Consultando cotizaciones…</p>}
          {quotesError && <div><p role="alert">{quotesError}</p><Button type="button" onClick={() => setQuotesAttempt(value => value + 1)}>Reintentar cotizaciones</Button></div>}
          {summaryError && <div><p role="alert">{summaryError}</p><Button type="button" onClick={() => setSummaryAttempt(value => value + 1)}>Reintentar saldo</Button></div>}
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

          <p className="text-sm text-muted-foreground">El registro quedará asociado a tu cuenta.</p>

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
            <Button type="submit" disabled={isSubmitting || quotesLoading || Boolean(quotesError) || loadingSummary || Boolean(summaryError) || !financialSummary}>
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
