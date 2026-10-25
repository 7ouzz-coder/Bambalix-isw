"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { replacementFormSchema } from "@/schemas/reemplazos.schema";
import { createEquipmentReplacement } from "@/services/equipos";
import { ReplacementEquipmentPicker } from "./replacement-equipment-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReplacementRequestForm({ equipmentId, assignmentId, busy, onSaved, onCancel }) {
  const id = useId();
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(replacementFormSchema), mode: "onTouched",
    defaultValues: { alternative: "REGISTERED", proposedResourceId: "", externalAlternative: "", reason: "", estimatedCost: "" },
  });
  const alternative = watch("alternative");
  const proposedId = watch("proposedResourceId");
  async function submit(data) {
    if (busy.current) return;
    busy.current = true; setError("");
    try {
      await createEquipmentReplacement(equipmentId, assignmentId, {
        proposedResourceId: data.alternative === "REGISTERED" ? data.proposedResourceId : null,
        externalAlternative: data.alternative === "EXTERNAL" ? data.externalAlternative : null,
        reason: data.reason, estimatedCost: data.estimatedCost || null,
      });
      onSaved("Solicitud registrada y pendiente de decisión del gerente.");
    } catch (failure) { setError(failure.message); }
    finally { busy.current = false; }
  }
  return <form className="equipment-form" noValidate onSubmit={handleSubmit(submit)}>
    <Label htmlFor={`${id}-alternative`}>Alternativa *</Label>
    <select id={`${id}-alternative`} className="equipment-category-filter" {...register("alternative", { onChange: () => setValue("proposedResourceId", "") })} disabled={isSubmitting}>
      <option value="REGISTERED">Equipo del inventario</option><option value="EXTERNAL">Alternativa externa</option>
    </select>
    {alternative === "REGISTERED" ? <ReplacementEquipmentPicker equipmentId={equipmentId} value={proposedId} disabled={isSubmitting} error={errors.proposedResourceId?.message}
      onChange={value => setValue("proposedResourceId", value, { shouldValidate: true })} /> : <div className="field">
      <Label htmlFor={`${id}-external`}>Descripción de la alternativa externa *</Label>
      <textarea id={`${id}-external`} className="equipment-status-reason" rows={3} maxLength={240} {...register("externalAlternative")} disabled={isSubmitting}
        aria-invalid={Boolean(errors.externalAlternative)} aria-describedby={errors.externalAlternative ? `${id}-external-error` : undefined} />
      {errors.externalAlternative && <p id={`${id}-external-error`} className="field-error">{errors.externalAlternative.message}</p>}
    </div>}
    <div className="field">
      <Label htmlFor={`${id}-reason`}>Motivo del reemplazo *</Label>
      <textarea id={`${id}-reason`} className="equipment-status-reason" rows={3} maxLength={500} required {...register("reason")} disabled={isSubmitting}
        aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? `${id}-reason-error` : undefined} />
      {errors.reason && <p id={`${id}-reason-error`} className="field-error">{errors.reason.message}</p>}
    </div>
    <div className="field">
      <Label htmlFor={`${id}-cost`}>Costo estimado (opcional)</Label>
      <Input id={`${id}-cost`} type="text" inputMode="decimal" maxLength={13} {...register("estimatedCost")} disabled={isSubmitting}
        aria-invalid={Boolean(errors.estimatedCost)} aria-describedby={`${id}-cost-help${errors.estimatedCost ? ` ${id}-cost-error` : ""}`} />
      <p id={`${id}-cost-help`} className="form-note">Sin separadores de miles; usa punto para los decimales. No modifica la cotización.</p>
      {errors.estimatedCost && <p id={`${id}-cost-error`} className="field-error">{errors.estimatedCost.message}</p>}
    </div>
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="form-actions flex-wrap"><Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Solicitar reemplazo"}</Button></div>
  </form>;
}
