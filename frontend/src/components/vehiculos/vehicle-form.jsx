"use client";

import { useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vehicleSchema, vehicleUpdateSchema } from "@/schemas/vehiculos.schema";
import { createVehicle, updateVehicle } from "@/services/vehiculos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export function VehicleForm({ onSaved, vehicle }) {
  const formId = useId();
  const editing = Boolean(vehicle);
  const defaults = vehicle ? { name: vehicle.name, type: vehicle.type, plate: vehicle.plate, revision: vehicle.revision } : { name: "", type: "", plate: "" };
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const busy = useRef(false);
  const { register, handleSubmit, reset, setError: setFieldError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(editing ? vehicleUpdateSchema : vehicleSchema), mode: "onTouched", defaultValues: defaults,
  });
  function changeOpen(value) {
    if (busy.current) return;
    reset(defaults); setError(""); setStale(false); setOpen(value);
  }
  async function submit(data) {
    if (busy.current || stale) return;
    busy.current = true; setError("");
    try {
      const saved = editing ? await updateVehicle(vehicle.id, data) : await createVehicle(data);
      onSaved(saved); setOpen(false); reset(defaults);
    }
    catch (failure) {
      if (failure.code === "VEHICLE_REVISION_CONFLICT") setStale(true);
      else if (failure.status === 409 && failure.message.includes("patente")) setFieldError("plate", { message: failure.message }, { shouldFocus: true });
      for (const key of ["name", "type", "plate"]) if (failure.fields?.[key]?.[0]) setFieldError(key, { message: failure.fields[key][0] }, { shouldFocus: true });
      setError(failure.message);
    } finally { busy.current = false; }
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button variant={editing ? "outline" : "default"} className={editing ? undefined : "primary-action"} aria-label={editing ? `Editar ${vehicle.name}` : undefined}>{editing ? "Editar" : "Registrar vehículo"}</Button></DialogTrigger>
    <DialogContent className="equipment-dialog" showCloseButton={false} onEscapeKeyDown={event => { if (busy.current) event.preventDefault(); }} onPointerDownOutside={event => { if (busy.current) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>{editing ? "Editar vehículo" : "Registrar vehículo"}</DialogTitle><DialogDescription>Ficha de un vehículo propio. Los campos con * son obligatorios.</DialogDescription></DialogHeader>
      <form noValidate className="equipment-form" onSubmit={handleSubmit(submit)}>
        {[["name", "Nombre del vehículo", 120], ["type", "Tipo de vehículo", 80], ["plate", "Patente", 20]].map(([key, label, max]) => <div className="field" key={key}>
          <Label htmlFor={`${formId}-${key}`}>{label} *</Label><Input id={`${formId}-${key}`} {...register(key)} maxLength={max} required disabled={isSubmitting} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${formId}-${key}-error` : undefined} />
          {errors[key] && <p className="field-error" id={`${formId}-${key}-error`}>{errors[key].message}</p>}
        </div>)}
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="form-actions"><Button type="button" variant="outline" onClick={() => changeOpen(false)} disabled={isSubmitting}>Cancelar</Button><Button type="submit" disabled={isSubmitting || stale}>{isSubmitting ? "Guardando…" : editing ? "Guardar cambios" : "Guardar vehículo"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
