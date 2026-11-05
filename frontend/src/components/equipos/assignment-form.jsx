"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assignmentFormSchema } from "@/schemas/asignaciones.schema";
import { createEquipmentAssignment } from "@/services/equipos";
import { AssignmentEventPicker } from "./assignment-event-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function localDateInput(value, roundUp = false) {
  const date = new Date(value);
  if (roundUp && (date.getSeconds() || date.getMilliseconds())) date.setMinutes(date.getMinutes() + 1);
  const pad = number => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AssignmentForm({ equipment, busy, onSaved, onClose }) {
  const id = useId();
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const { register, handleSubmit, setValue, setError: setFieldError, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(assignmentFormSchema), mode: "onTouched", defaultValues: { eventId: 0, startsAt: "", endsAt: "" },
  });
  async function submit(data) {
    if (busy.current) return;
    busy.current = true; setError("");
    try {
      await createEquipmentAssignment(equipment.id, { ...data, startsAt: new Date(data.startsAt).toISOString(), endsAt: new Date(data.endsAt).toISOString() });
      reset(); setSelected(null); onSaved("Equipo asignado al evento.");
    } catch (failure) {
      for (const field of ["eventId", "startsAt", "endsAt"]) if (failure.fields?.[field]) setFieldError(field, { message: failure.fields[field] });
      setError(failure.message);
    } finally { busy.current = false; }
  }
  return <form className="equipment-form" noValidate onSubmit={handleSubmit(submit)}>
    <AssignmentEventPicker selected={selected} disabled={isSubmitting} error={errors.eventId?.message} onSelect={event => {
      setSelected(event); setError("");
      setValue("eventId", event?.id || 0, { shouldValidate: true });
      setValue("startsAt", event ? localDateInput(event.startsAt) : "", { shouldValidate: true });
      setValue("endsAt", event ? localDateInput(event.endsAt, true) : "", { shouldValidate: true });
    }} />
    <p className="form-note">El periodo debe cubrir el evento e incluir los tiempos de traslado y montaje que correspondan. Horas locales de tu dispositivo.</p>
    {[{ key: "startsAt", label: "Inicio de ocupación" }, { key: "endsAt", label: "Término de ocupación" }].map(field => <div className="field" key={field.key}>
      <Label htmlFor={`${id}-${field.key}`}>{field.label} *</Label>
      <Input id={`${id}-${field.key}`} type="datetime-local" {...register(field.key)} required disabled={isSubmitting} aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `${id}-${field.key}-error` : undefined} />
      {errors[field.key] && <p id={`${id}-${field.key}-error`} className="field-error">{errors[field.key].message}</p>}
    </div>)}
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="form-actions"><Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Cerrar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Asignando…" : "Asignar equipo"}</Button></div>
  </form>;
}
