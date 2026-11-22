"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { z } from "zod";
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
import { createQuote, updateQuote, getQuoteResources, quoteFormSchema } from "@/services/cotizaciones";
import { getEventos } from "@/services/eventos";
import { getQuotePreview } from "@/lib/cotizaciones";

// Esquemas de validación para registros recibidos de la API (Paso 1)
// Passthrough para permitir campos adicionales legítimos sin rechazarlos
export const clientRecordSchema = z
  .object({
    id: z.string().trim().min(1, "El identificador del cliente es obligatorio"),
    name: z.string().trim().min(2, "El nombre del cliente debe tener al menos 2 caracteres").max(120),
  })
  .passthrough();

export const eventRecordSchema = z
  .object({
    id: z.number().int().positive("El identificador del evento debe ser un número entero positivo"),
    clientId: z.string().trim().min(1, "El evento debe estar asociado a un cliente"),
    title: z.string().trim().min(1, "El título del evento es obligatorio"),
    startsAt: z.union([z.string(), z.date()]).refine((val) => !isNaN(new Date(val).getTime()), {
      message: "La fecha de inicio del evento debe ser válida",
    }),
  })
  .passthrough();

function normalizeClientSearch(value) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

const defaultValues = {
  clientId: "",
  eventId: "",
  notes: "",
  items: [{ concept: "", quantity: 1, unitPrice: 0 }],
};

export function QuoteForm({ onSaved, quote }) {
  const [open, setOpen] = useState(false);
  const [resources, setResources] = useState({ equipos: [], vehiculos: [] });
  const [resourceError, setResourceError] = useState("");
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [hasLoadedValidData, setHasLoadedValidData] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [events, setEvents] = useState([]);
  const [serverError, setServerError] = useState("");
  const loadRequestIdRef = useRef(0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
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
  const selectedEventId = watch("eventId");
  const watchedItems = watch("items") || [];
  useEffect(() => {
    if (!open || !selectedEventId) {
      setResources({ equipos: [], vehiculos: [] });
      setResourcesLoading(false);
      setResourceError("");
      return;
    }
    const controller = new AbortController();
    let timer;
    let firstLoad = true;
    setResourceError("");
    setResources({ equipos: [], vehiculos: [] });
    setResourcesLoading(true);

    async function refreshResources() {
      try {
        const result = await getQuoteResources(selectedEventId, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        });
        if (controller.signal.aborted) return;
        if (!Array.isArray(result?.equipos) || !Array.isArray(result?.vehiculos)) {
          throw new Error("El servidor entregó una lista de recursos inválida");
        }
        setResources(result);
        setResourceError("");
      } catch (error) {
        if (!controller.signal.aborted) setResourceError("No se pudo actualizar la disponibilidad. Reintentaremos automáticamente.");
      } finally {
        if (!controller.signal.aborted) {
          if (firstLoad) setResourcesLoading(false);
          firstLoad = false;
          timer = setTimeout(refreshResources, 15000);
        }
      }
    }
    refreshResources();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [open, selectedEventId]);

  const unavailableResource = Boolean(selectedEventId && !resourcesLoading && !resourceError && watchedItems.some(item =>
    (item.equipmentId && !resources.equipos.some(resource => resource.id === item.equipmentId)) ||
    (item.vehicleId && !resources.vehiculos.some(resource => resource.id === item.vehicleId))
  ));

  const preview = getQuotePreview(watchedItems);

  const fetchData = useCallback(async () => {
    const currentRequestId = ++loadRequestIdRef.current;
    setLoadingData(true);
    setDataError("");
    setHasLoadedValidData(false);

    try {
      const [loadedClients, loadedEvents] = await Promise.all([
        clientRequest(),
        getEventos(),
      ]);

      if (currentRequestId !== loadRequestIdRef.current) return;

      if (!Array.isArray(loadedClients) || !Array.isArray(loadedEvents)) {
        throw new Error("El servidor respondió con un formato de datos inválido.");
      }

      const parsedClients = z.array(clientRecordSchema).safeParse(loadedClients);
      const parsedEvents = z.array(eventRecordSchema).safeParse(loadedEvents);
      if (!parsedClients.success) {
        throw new Error("Se recibieron datos de cliente con formato inválido.");
      }
      if (!parsedEvents.success) {
        throw new Error("Se recibieron datos de evento con formato inválido.");
      }
      const clients = parsedClients.data;
      const events = parsedEvents.data;
      setClients(clients);
      setEvents(events);
      setHasLoadedValidData(true);

      // Limpiar selecciones previas si ya no existen en la lista de datos válidos
      const currentClientId = getValues("clientId");
      const clientExists = clients.some((c) => c.id === currentClientId);
      if (currentClientId && !clientExists) {
        setValue("clientId", "");
        setValue("eventId", "");
      } else {
        const currentEventId = getValues("eventId");
        const eventExists = events.some(
          (ev) => String(ev.id) === String(currentEventId) && ev.clientId === currentClientId
        );
        if (currentEventId && !eventExists) {
          setValue("eventId", "");
        }
      }
    } catch (err) {
      if (currentRequestId !== loadRequestIdRef.current) return;
      setDataError(err.message || "Error al cargar clientes o eventos desde el servidor.");
      setHasLoadedValidData(false);
    } finally {
      if (currentRequestId === loadRequestIdRef.current) {
        setLoadingData(false);
      }
    }
  }, [getValues, setValue]);

  useEffect(() => {
    if (open) {
      fetchData();
      setServerError("");
    } else {
      // Invalidar cualquier petición en vuelo si se cierra el diálogo
      loadRequestIdRef.current++;
    }
  }, [open, fetchData]);

  // Filtrar eventos por el cliente seleccionado
  const search = normalizeClientSearch(clientSearch);
  const matchingClients = clients.filter(client =>
    normalizeClientSearch(client.name).includes(search)
  );
  const visibleClients = matchingClients.some(client => client.id === selectedClientId)
    ? matchingClients
    : [...clients.filter(client => client.id === selectedClientId), ...matchingClients];
  const availableEvents = events.filter((ev) => ev.clientId === selectedClientId);

  function handleOpenChange(next) {
    if (isSubmitting) return;
    if (next && quote) {
      reset({
        clientId: quote.clientId,
        eventId: String(quote.eventId),
        notes: quote.notes ?? "",
        items: quote.items.map(({ concept, quantity, unitPrice, equipmentId, vehicleId }) => ({
          equipmentId: equipmentId || null, vehicleId: vehicleId || null,
          concept,
          quantity,
          unitPrice: Number(unitPrice),
        })),
      });
    }
    setOpen(next);
    if (!next) {
      setClientSearch("");
      reset(defaultValues);
      setServerError("");
      setDataError("");
      setHasLoadedValidData(false);
      setClients([]);
      setEvents([]);
    }
  }

  async function onSubmit(data) {
    // Bloquear si está enviando, cargando, hay error o aún no terminó una carga válida
    if (isSubmitting || loadingData || !!dataError || !hasLoadedValidData || resourcesLoading || resourceError || unavailableResource) return;

    // Validación estricta: asegurar que cliente y evento correspondan a la carga activa válida
    const clientExists = clients.some((c) => c.id === data.clientId);
    const eventExists = events.some(
      (ev) => String(ev.id) === String(data.eventId) && ev.clientId === data.clientId
    );
    if (!clientExists || !eventExists) {
      setServerError("El cliente o evento seleccionado ya no es válido en el sistema.");
      return;
    }

    setServerError("");
    try {
      const payload = {
        clientId: data.clientId,
        eventId: Number(data.eventId),
        notes: data.notes ? data.notes.trim() : null,
        items: data.items.map((it) => ({
          ...(it.equipmentId ? { equipmentId: it.equipmentId } : {}),
          ...(it.vehicleId ? { vehicleId: it.vehicleId } : {}),
          concept: it.concept.trim(),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      };

      const result = quote ? await updateQuote(quote.id, payload) : await createQuote(payload);
      setOpen(false);
      setClientSearch("");
      reset(defaultValues);
      if (onSaved) onSaved(result);
    } catch (failure) {
      // Prevención de pérdida de datos: el formulario no se resetea si falla el guardado
      setServerError(failure.message || "Error al guardar la cotización");
    }
  }

  const isFormBlocked = isSubmitting || loadingData || !!dataError || !hasLoadedValidData || resourcesLoading || !!resourceError || unavailableResource;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className={quote ? undefined : "primary-action"} variant={quote ? "outline" : "default"} size={quote ? "sm" : "default"}>
          {!quote && <Plus aria-hidden="true" />}
          {quote ? "Editar" : "Nueva cotización"}
        </Button>
      </DialogTrigger>

      <DialogContent className="equipment-dialog max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quote ? "Editar cotización en borrador" : "Nueva cotización comercial"}</DialogTitle>
          <DialogDescription>
            Selecciona el cliente y el evento asociado. Agrega los ítems con sus precios.
          </DialogDescription>
        </DialogHeader>

        {dataError ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-sm space-y-2 mb-2">
            <p role="alert">No se pudieron cargar los datos necesarios: {dataError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loadingData}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingData ? "animate-spin" : ""}`} />
              Reintentar carga
            </Button>
          </div>
        ) : null}

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="equipment-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="field">
              <Label htmlFor="quote-client-search">Buscar cliente por nombre</Label>
              <Input
                id="quote-client-search"
                type="search"
                maxLength={120}
                value={clientSearch}
                onChange={event => setClientSearch(event.target.value)}
                disabled={isSubmitting || loadingData || !hasLoadedValidData}
              />
              {search && hasLoadedValidData && !matchingClients.length && (
                <p role="status" className="text-sm text-muted-foreground">No hay clientes que coincidan con la búsqueda.</p>
              )}
              <Label htmlFor="quote-client">Cliente *</Label>
              <select
                id="quote-client"
                value={selectedClientId}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || loadingData || !hasLoadedValidData}
                {...register("clientId", {
                  onChange: () => setValue("eventId", ""), // Reset event when client changes
                })}
              >
                <option value="">
                  {loadingData
                    ? "Cargando clientes…"
                    : dataError
                    ? "Error al cargar clientes"
                    : clients.length === 0
                    ? "No hay clientes registrados"
                    : "Selecciona un cliente…"}
                </option>
                {visibleClients.map((c) => (
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
                value={selectedEventId}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting || loadingData || !hasLoadedValidData || !selectedClientId}
                {...register("eventId")}
              >
                <option value="">
                  {loadingData
                    ? "Cargando eventos…"
                    : dataError
                    ? "Error al cargar eventos"
                    : !selectedClientId
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
                <p className="text-xs text-muted-foreground">Precios unitarios con hasta dos decimales.</p>
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

            {resourceError && <p role="alert" className="field-error">{resourceError}</p>}
            {unavailableResource && <p role="alert" className="field-error">Un recurso seleccionado ya no está disponible. Selecciona otro para guardar.</p>}
            {fields.map((field, index) => {
              const subtotal = preview.subtotals[index] ?? null;

              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start bg-muted/20 p-2.5 rounded-md border">
                  <div className="col-span-12 field">
                    <Label htmlFor={`quote-resource-${index}`}>Equipo o vehículo disponible</Label>
                    <select id={`quote-resource-${index}`} value={watchedItems[index]?.equipmentId ? `equipment:${watchedItems[index].equipmentId}` : watchedItems[index]?.vehicleId ? `vehicle:${watchedItems[index].vehicleId}` : ""}
                      onChange={event => {
                        setServerError("");
                        const [kind, id] = event.target.value.split(":");
                        setValue(`items.${index}.equipmentId`, kind === "equipment" ? id : null);
                        setValue(`items.${index}.vehicleId`, kind === "vehicle" ? id : null);
                      }}>
                      <option value="">Servicio sin recurso asociado</option>
                      {watchedItems[index]?.equipmentId && !resources.equipos.some(item => item.id === watchedItems[index].equipmentId) &&
                        <option value={`equipment:${watchedItems[index].equipmentId}`}>Equipo ya no disponible — selecciona otro</option>}
                      {watchedItems[index]?.vehicleId && !resources.vehiculos.some(item => item.id === watchedItems[index].vehicleId) &&
                        <option value={`vehicle:${watchedItems[index].vehicleId}`}>Vehículo ya no disponible — selecciona otro</option>}
                      <optgroup label="Equipos">{resources.equipos.map(item => <option key={item.id} value={`equipment:${item.id}`}>{item.name} · {item.code}</option>)}</optgroup>
                      <optgroup label="Vehículos">{resources.vehiculos.map(item => <option key={item.id} value={`vehicle:${item.id}`}>{item.name} · {item.plate}</option>)}</optgroup>
                    </select>
                  </div>
                  <div className="col-span-6 field">
                    <Label htmlFor={`quote-concept-${index}`} className="text-xs">Concepto / Servicio</Label>
                    <Input
                      id={`quote-concept-${index}`}
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
                    <Label htmlFor={`quote-quantity-${index}`} className="text-xs">Cant.</Label>
                    <Input
                      id={`quote-quantity-${index}`}
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
                    <Label htmlFor={`quote-price-${index}`} className="text-xs">Precio Unit. ($)</Label>
                    <Input
                      id={`quote-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
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
                    Subtotal: {subtotal === null ? "—" : `$${subtotal.toLocaleString("es-CL")}`}
                  </div>
                </div>
              );
            })}
            {errors.items?.root ? <p className="field-error">{errors.items.root.message}</p> : null}
          </div>

          <div className="flex justify-between items-center bg-muted/40 p-3 rounded-md border">
            <span className="font-semibold text-sm">Total estimado:</span>
            <span className="text-lg font-bold">{preview.total === null ? "Revisa los importes" : `$${preview.total.toLocaleString("es-CL")}`}</span>
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
            <Button type="submit" disabled={isFormBlocked}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="spin" aria-hidden="true" />
                  Guardando cotización…
                </>
              ) : loadingData ? (
                <>
                  <LoaderCircle className="spin" aria-hidden="true" />
                  Cargando datos…
                </>
              ) : (
                quote ? "Guardar cambios" : "Guardar como Borrador"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
