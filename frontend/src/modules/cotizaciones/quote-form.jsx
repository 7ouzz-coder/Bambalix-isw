"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
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
import { clientRequest } from "@/services/clientes";
import { createQuote, quoteFormSchema } from "@/services/cotizaciones";
import { getEventos } from "@/services/eventos";

const defaultValues = {
  clientId: "",
  eventId: "",
  notes: "",
  items: [{ concept: "", quantity: 1, unitPrice: 0 }],
};

export function QuoteForm({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [serverError, setServerError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(quoteFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const selectedClientId = watch("clientId");
  const watchedItems = watch("items") || [];

  // Calcular total y subtotales en tiempo real para feedback inmediato
  const totalPreview = watchedItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return acc + qty * price;
  }, 0);

  useEffect(() => {
    if (open) {
      Promise.all([
        clientRequest().catch(() => []),
        getEventos().catch(() => []),
      ]).then(([loadedClients, loadedEvents]) => {
        setClients(Array.isArray(loadedClients) ? loadedClients : []);
        setEvents(Array.isArray(loadedEvents) ? loadedEvents : []);
      });
      setServerError("");
    }
  }, [open]);

  // Filtrar eventos por el cliente seleccionado
  const availableEvents = events.filter((ev) => ev.clientId === selectedClientId);

  function handleOpenChange(next) {
    if (isSubmitting) return;
    setOpen(next);
    if (!next) {
      reset(defaultValues);
      setServerError("");
    }
  }

  async function onSubmit(data) {
    setServerError("");
    try {
      const payload = {
        clientId: data.clientId,
        eventId: Number(data.eventId),
        notes: data.notes ? data.notes.trim() : null,
        items: data.items.map((it) => ({
          concept: it.concept.trim(),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      };

      const result = await createQuote(payload);
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
          Nueva cotización
        </Button>
      </DialogTrigger>

      <DialogContent className="equipment-dialog max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva cotización comercial</DialogTitle>
          <DialogDescription>
            Selecciona el cliente y el evento asociado. Agrega los ítems con sus precios (IVA incluido).
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="equipment-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="field">
              <Label htmlFor="quote-client">Cliente *</Label>
              <select
                id="quote-client"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                {...register("clientId", {
                  onChange: () => setValue("eventId", ""), // Reset event when client changes
                })}
              >
                <option value="">Selecciona un cliente…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.clientType === "empresa" ? "(Empresa)" : ""}
                  </option>
                ))}
              </select>
              {errors.clientId ? <p className="field-error">{errors.clientId.message}</p> : null}
            </div>

            <div className="field">
              <Label htmlFor="quote-event">Evento asociado *</Label>
              <select
                id="quote-event"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || !selectedClientId}
                {...register("eventId")}
              >
                <option value="">
                  {!selectedClientId
                    ? "Primero elige un cliente"
                    : availableEvents.length === 0
                    ? "Este cliente no tiene eventos registrados"
                    : "Selecciona un evento…"}
                </option>
                {availableEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    #{ev.id} - {ev.title} ({new Date(ev.startsAt).toLocaleDateString("es-CL")})
                  </option>
                ))}
              </select>
              {errors.eventId ? <p className="field-error">{errors.eventId.message}</p> : null}
            </div>
          </div>

          <div className="field">
            <Label htmlFor="quote-notes">Notas / Observaciones comerciales (opcional)</Label>
            <Input
              id="quote-notes"
              type="text"
              placeholder="Ej. Descuento corporativo, condiciones de instalación, etc."
              maxLength={500}
              disabled={isSubmitting}
              {...register("notes")}
            />
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-base font-semibold">Ítems de la cotización *</Label>
                <p className="text-xs text-muted-foreground">Precios unitarios ya incluyen IVA (no sumar 19%)</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => append({ concept: "", quantity: 1, unitPrice: 0 })}
              >
                <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Agregar ítem
              </Button>
            </div>

            {fields.map((field, index) => {
              const qty = Number(watchedItems[index]?.quantity) || 0;
              const unitPrice = Number(watchedItems[index]?.unitPrice) || 0;
              const subtotal = qty * unitPrice;

              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start bg-muted/20 p-2.5 rounded-md border">
                  <div className="col-span-6 field">
                    <Label className="text-xs">Concepto / Servicio</Label>
                    <Input
                      type="text"
                      placeholder="Ej. Sonido para 100 personas"
                      disabled={isSubmitting}
                      {...register(`items.${index}.concept`)}
                    />
                    {errors.items?.[index]?.concept ? (
                      <p className="field-error text-xs">{errors.items[index].concept.message}</p>
                    ) : null}
                  </div>

                  <div className="col-span-2 field">
                    <Label className="text-xs">Cant.</Label>
                    <Input
                      type="number"
                      min="1"
                      disabled={isSubmitting}
                      {...register(`items.${index}.quantity`)}
                    />
                    {errors.items?.[index]?.quantity ? (
                      <p className="field-error text-xs">{errors.items[index].quantity.message}</p>
                    ) : null}
                  </div>

                  <div className="col-span-3 field">
                    <Label className="text-xs">Precio Unit. ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      disabled={isSubmitting}
                      {...register(`items.${index}.unitPrice`)}
                    />
                    {errors.items?.[index]?.unitPrice ? (
                      <p className="field-error text-xs">{errors.items[index].unitPrice.message}</p>
                    ) : null}
                  </div>

                  <div className="col-span-1 pt-6 flex justify-center">
                    {fields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        disabled={isSubmitting}
                        onClick={() => remove(index)}
                        title="Eliminar ítem"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="col-span-12 text-right text-xs text-muted-foreground pt-1 pr-2">
                    Subtotal: ${subtotal.toLocaleString("es-CL")}
                  </div>
                </div>
              );
            })}
            {errors.items?.root ? <p className="field-error">{errors.items.root.message}</p> : null}
          </div>

          <div className="flex justify-between items-center bg-muted/40 p-3 rounded-md border">
            <span className="font-semibold text-sm">Total estimado (calculado con IVA incluido):</span>
            <span className="text-lg font-bold">${totalPreview.toLocaleString("es-CL")}</span>
          </div>

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
                  Guardando cotización…
                </>
              ) : (
                "Guardar como Borrador"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
