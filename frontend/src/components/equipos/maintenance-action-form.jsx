"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { maintenanceNoteFormSchema, maintenanceCloseFormSchema } from "@/schemas/mantenciones.schema";
import { addMaintenanceNote, closeEquipmentMaintenance } from "@/services/equipos";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function MaintenanceActionForm({ equipmentId, maintenanceId, closing, busy, onSaved, onCancel }) {
  const id = useId();
  const [error, setError] = useState("");
  const field = closing ? "closingNotes" : "content";
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(closing ? maintenanceCloseFormSchema : maintenanceNoteFormSchema),
    defaultValues: { [field]: "" }, mode: "onTouched",
  });
  async function submit(data) {
    if (busy.current) return;
    busy.current = true;
    setError("");
    try {
      const save = closing ? closeEquipmentMaintenance : addMaintenanceNote;
      await save(equipmentId, maintenanceId, data[field]);
      reset();
      onSaved(closing ? "Mantención cerrada." : "Observación registrada.");
    } catch (failure) { setError(failure.message); }
    finally { busy.current = false; }
  }
  return <form className="equipment-form" noValidate onSubmit={handleSubmit(submit)}>
    {closing && <p className="form-note">El cierre conserva el periodo reservado y el estado operativo del equipo. El resultado y la fecha de cierre quedan en el historial.</p>}
    <Label htmlFor={id}>{closing ? "Resultado de la mantención" : "Observación de seguimiento"} *</Label>
    <textarea id={id} rows={3} className="equipment-status-reason" maxLength={500} required disabled={isSubmitting}
      {...register(field)} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${id}-error` : undefined} />
    {errors[field] && <p id={`${id}-error`} className="field-error">{errors[field].message}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="form-actions flex-wrap">
      <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>Cancelar</Button>
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : closing ? "Confirmar cierre" : "Guardar observación"}</Button>
    </div>
  </form>;
}
