"use client";

import { useRef, useState } from "react";
import { Plus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { equipmentRequest, validateEquipment } from "@/services/equipos";

const blank = { name: "", category: "", code: "" };
const fields = [
  { key: "name", label: "Nombre del equipo", placeholder: "Ej. Consola de sonido", max: 120 },
  { key: "category", label: "Categoría", placeholder: "Ej. Sonido", max: 80 },
  { key: "code", label: "Código interno (opcional)", placeholder: "Ej. SON-001", max: 60 },
];

export function EquipmentForm({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(blank);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  function changeOpen(next) {
    if (busy.current) return;
    setOpen(next);
    setValues(blank); setErrors({}); setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    const validation = validateEquipment(values);
    setErrors(validation); setError("");
    if (Object.keys(validation).length) return;
    busy.current = true; setSaving(true);
    try {
      const equipment = await equipmentRequest({ method: "POST", body: JSON.stringify({
        name: values.name.trim(), category: values.category.trim(), code: values.code.trim(), mode: "UNIT", quantity: 1,
      }) });
      setOpen(false); setValues(blank);
      onSaved(equipment);
    } catch (failure) { setError(failure.message); }
    finally { busy.current = false; setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button className="primary-action"><Plus aria-hidden="true" />Registrar equipo</Button></DialogTrigger>
    <DialogContent className="equipment-dialog">
      <DialogHeader><DialogTitle>Registrar equipo</DialogTitle><DialogDescription>Agrega una unidad al inventario. Los campos con * son obligatorios.</DialogDescription></DialogHeader>
      <form noValidate onSubmit={submit} className="equipment-form">
        {fields.map(field => <div className="field" key={field.key}>
          <Label htmlFor={field.key}>{field.label}{field.key !== "code" ? " *" : ""}</Label>
          <Input id={field.key} value={values[field.key]} placeholder={field.placeholder} maxLength={field.max}
            disabled={saving} required={field.key !== "code"} aria-invalid={Boolean(errors[field.key])}
            aria-describedby={errors[field.key] ? `${field.key}-error` : undefined}
            onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))} />
          {errors[field.key] ? <p className="field-error" id={`${field.key}-error`}>{errors[field.key]}</p> : null}
        </div>)}
        <p className="form-note">Cada registro corresponde a un equipo individual. Si ingresas un código, debe ser único.</p>
        {error ? <p role="alert" className="error-message">{error}</p> : null}
        <div className="form-actions"><Button type="button" variant="outline" disabled={saving} onClick={() => changeOpen(false)}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? <><LoaderCircle className="spin" aria-hidden="true" />Guardando…</> : "Guardar equipo"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
