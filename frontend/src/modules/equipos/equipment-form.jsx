"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { equipmentRequest, getEquipmentCategories } from "@/services/equipos";
import { equipmentCreateSchema } from "@/schemas/equipos.schema";

const blank = { name: "", category: "", code: "" };
const fields = [
  { key: "name", label: "Nombre del equipo", placeholder: "Ej. Consola de sonido", max: 120 },
  { key: "category", label: "Categoría", placeholder: "Ej. Sonido", max: 80 },
  { key: "code", label: "Código interno", placeholder: "Ej. SON-001", max: 60 },
];

export function EquipmentForm({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [focusField, setFocusField] = useState("");
  const busy = useRef(false);
  const formId = useId();
  const { register, handleSubmit, reset, setError: setFieldError, setFocus, formState: { errors, isSubmitting: saving } } = useForm({
    resolver: zodResolver(equipmentCreateSchema), mode: "onTouched", defaultValues: blank,
  });

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setCategoryError("");
    getEquipmentCategories({ signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(items => {
        if (!Array.isArray(items) || !items.every(item => typeof item === "string")) throw new Error("Listado inválido");
        if (!controller.signal.aborted) setCategories(items);
      }).catch(() => {
        if (!controller.signal.aborted) setCategoryError("No se pudieron cargar las sugerencias. Puedes escribir la categoría.");
      });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (focusField && !saving) {
      setFocus(focusField);
      setFocusField("");
    }
  }, [focusField, saving, setFocus]);

  function changeOpen(next) {
    if (busy.current) return;
    setOpen(next);
    reset(blank); setError("");
    setFocusField("");
  }

  async function submit(data) {
    if (busy.current) return;
    busy.current = true; setError("");
    try {
      const equipment = await equipmentRequest({ method: "POST", body: JSON.stringify({
        ...data, mode: "UNIT", quantity: 1,
      }) });
      setOpen(false); reset(blank);
      onSaved(equipment);
    } catch (failure) {
      const fieldErrors = failure.status === 409 ? { code: failure.message } : failure.fields || {};
      for (const field of fields) {
        if (fieldErrors[field.key]) setFieldError(field.key, { type: "server", message: fieldErrors[field.key] });
      }
      const first = fields.find(field => fieldErrors[field.key]);
      if (first) setFocusField(first.key);
      else setError(failure.message);
    }
    finally { busy.current = false; }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button className="primary-action"><Plus aria-hidden="true" />Registrar equipo</Button></DialogTrigger>
    <DialogContent className="equipment-dialog">
      <DialogHeader><DialogTitle>Registrar equipo</DialogTitle><DialogDescription>Agrega una unidad al inventario. Los campos con * son obligatorios.</DialogDescription></DialogHeader>
      <form noValidate onSubmit={handleSubmit(submit)} onChange={() => setError("")} className="equipment-form">
        {fields.map(field => <div className="field" key={field.key}>
          <Label htmlFor={`${formId}-${field.key}`}>{field.label} *</Label>
          <Input id={`${formId}-${field.key}`} {...register(field.key)} placeholder={field.placeholder} maxLength={field.max}
            list={field.key === "category" ? `${formId}-categories` : undefined}
            disabled={saving} required aria-invalid={Boolean(errors[field.key])}
            aria-describedby={errors[field.key] ? `${formId}-${field.key}-error` : undefined} />
          {errors[field.key] ? <p className="field-error" id={`${formId}-${field.key}-error`}>{errors[field.key].message}</p> : null}
        </div>)}
        <datalist id={`${formId}-categories`}>{categories.map(category => <option key={category} value={category} />)}</datalist>
        {categoryError ? <p className="field-error" role="status">{categoryError}</p> : null}
        <p className="form-note">Cada registro corresponde a un equipo individual y debe tener un código único.</p>
        {error ? <p role="alert" className="error-message">{error}</p> : null}
        <div className="form-actions"><Button type="button" variant="outline" disabled={saving} onClick={() => changeOpen(false)}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? <><LoaderCircle className="spin" aria-hidden="true" />Guardando…</> : "Guardar equipo"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
