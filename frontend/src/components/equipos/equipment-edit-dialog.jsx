"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { equipmentUpdateSchema } from "@/schemas/equipos.schema";
import { updateEquipment } from "@/services/equipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

function EditForm({ equipment, onSaved, close, busy }) {
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(equipmentUpdateSchema), mode: "onTouched",
    defaultValues: { name: equipment.name, category: equipment.category, code: equipment.code || "", revision: equipment.revision },
  });
  async function submit(data) {
    if (busy.current) return;
    busy.current = true; setError("");
    try { onSaved(await updateEquipment(equipment.id, data)); close(); }
    catch (failure) {
      if (failure.status === 409 && failure.message.includes("código")) setFieldError("code", { message: failure.message }, { shouldFocus: true });
      for (const field of ["name", "category", "code"]) if (failure.fields?.[field]) setFieldError(field, { message: failure.fields[field] }, { shouldFocus: true });
      setError(failure.message);
    } finally { busy.current = false; }
  }
  return <form noValidate className="equipment-form" onSubmit={handleSubmit(submit)}>
    {[["name", "Nombre del equipo", 120], ["category", "Categoría", 80], ["code", "Código interno", 60]].map(([key, label, max]) => <div className="field" key={key}>
      <Label htmlFor={`edit-${key}`}>{label} *</Label>
      <Input id={`edit-${key}`} {...register(key)} maxLength={max} required disabled={isSubmitting} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `edit-${key}-error` : undefined} />
      {errors[key] && <p className="field-error" id={`edit-${key}-error`}>{errors[key].message}</p>}
    </div>)}
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="form-actions"><Button type="button" variant="outline" disabled={isSubmitting} onClick={close}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar cambios"}</Button></div>
  </form>;
}

export function EquipmentEditDialog({ equipment, onSaved }) {
  const [open, setOpen] = useState(false);
  const busy = useRef(false);
  return <Dialog open={open} onOpenChange={value => { if (!busy.current) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline" aria-label={`Editar ${equipment.name}`}>Editar</Button></DialogTrigger>
    <DialogContent className="equipment-dialog" showCloseButton={false} onEscapeKeyDown={event => { if (busy.current) event.preventDefault(); }} onPointerDownOutside={event => { if (busy.current) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Editar equipo</DialogTitle><DialogDescription>Modifica la ficha de {equipment.name}.</DialogDescription></DialogHeader>
      {open && <EditForm equipment={equipment} onSaved={onSaved} close={() => setOpen(false)} busy={busy} />}
    </DialogContent>
  </Dialog>;
}
