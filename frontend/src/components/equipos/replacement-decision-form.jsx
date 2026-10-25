"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { replacementDecisionFormSchema } from "@/schemas/reemplazos.schema";
import { decideEquipmentReplacement } from "@/services/equipos";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ReplacementDecisionForm({ equipmentId, assignmentId, replacement, status, busy, onSaved, onCancel }) {
  const id = useId();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(replacementDecisionFormSchema), defaultValues: { reason: "" }, mode: "onTouched",
  });
  async function submit(data) {
    if (busy.current) return;
    busy.current = true; setError("");
    try {
      const result = await decideEquipmentReplacement(equipmentId, assignmentId, replacement.id, { status, reason: data.reason });
      onSaved(status === "REJECTED" ? "Solicitud de reemplazo rechazada."
        : result.resultingAssignmentId ? "Reemplazo realizado. El equipo original quedó liberado y el sustituto asignado."
        : "Alternativa externa autorizada. El equipo original sigue asignado.", result);
    } catch (failure) { setError(failure.message); }
    finally { busy.current = false; }
  }
  return <form className="equipment-form" noValidate onSubmit={handleSubmit(submit)}>
    <p>{status === "APPROVED" ? "Aprobar" : "Rechazar"}: {replacement.proposedResource?.name || replacement.externalAlternative}.</p>
    <p className="form-note">{status === "REJECTED" ? "Rechazar conserva la asignación original."
      : replacement.proposedResourceId ? "Al aprobar, el sustituto ocupará el mismo periodo y el equipo original quedará liberado. Si hay un conflicto, no se guardará ningún cambio."
      : "Autorizar esta alternativa externa no crea un arriendo ni libera el equipo original."}</p>
    <Label htmlFor={id}>Motivo de la decisión *</Label>
    <textarea id={id} className="equipment-status-reason" rows={3} maxLength={500} required {...register("reason")} disabled={isSubmitting}
      aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? `${id}-error` : undefined} />
    {errors.reason && <p id={`${id}-error`} className="field-error">{errors.reason.message}</p>}
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="form-actions flex-wrap"><Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : status === "APPROVED" ? "Confirmar aprobación" : "Confirmar rechazo"}</Button></div>
  </form>;
}
