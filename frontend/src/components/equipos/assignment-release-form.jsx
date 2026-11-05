"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assignmentReleaseSchema } from "@/schemas/asignaciones.schema";
import { releaseEquipmentAssignment } from "@/services/equipos";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AssignmentReleaseForm({ equipmentId, assignment, busy, onSaved, onCancel }) {
  const id = useId();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(assignmentReleaseSchema), defaultValues: { reason: "" }, mode: "onTouched",
  });
  async function submit({ reason }) {
    if (busy.current) return;
    busy.current = true; setError("");
    try { await releaseEquipmentAssignment(equipmentId, assignment.id, reason); onSaved("Asignación liberada."); }
    catch (failure) { setError(failure.message); }
    finally { busy.current = false; }
  }
  return <form className="equipment-form" noValidate onSubmit={handleSubmit(submit)}>
    <p>Liberar equipo de {assignment.event.title}.</p>
    <Label htmlFor={id}>Motivo de liberación *</Label>
    <textarea id={id} className="equipment-status-reason" rows={3} maxLength={500} {...register("reason")} required disabled={isSubmitting} aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? `${id}-error` : undefined} />
    {errors.reason && <p id={`${id}-error`} className="field-error">{errors.reason.message}</p>}
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="form-actions"><Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Liberando…" : "Confirmar liberación"}</Button></div>
  </form>;
}
