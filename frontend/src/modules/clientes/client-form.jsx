"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientRequest, validateClient } from "@/services/clientes";

const blank = { name: "", email: "", rut: "", phone: "", address: "" };
const fields = [
  { key: "name", label: "Nombre", placeholder: "Ej. María López", max: 120, type: "text", required: true },
  { key: "email", label: "Correo electrónico", placeholder: "nombre@ejemplo.cl", max: 254, type: "email", required: true },
  { key: "rut", label: "RUT (opcional)", placeholder: "Ej. 12.345.678-9", max: 20, type: "text" },
  { key: "phone", label: "Teléfono (opcional)", placeholder: "Ej. +56 9 1234 5678", max: 40, type: "tel" },
  { key: "address", label: "Dirección (opcional)", placeholder: "Calle y número", max: 240, type: "text" },
];

export function ClientForm({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(blank);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  function changeOpen(next) {
    if (busy.current) return;
    setOpen(next);
    if (!next) { setValues(blank); setErrors({}); setError(""); }
  }

  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    const validation = validateClient(values);
    setErrors(validation);
    setError("");
    if (Object.keys(validation).length) return;

    busy.current = true;
    setSaving(true);
    try {
      const client = await clientRequest({
        method: "POST",
        body: JSON.stringify(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]))),
      });
      setOpen(false);
      setValues(blank);
      onSaved(client);
    } catch (failure) {
      setError(failure.message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button className="primary-action"><Plus aria-hidden="true" />Registrar cliente</Button></DialogTrigger>
    <DialogContent className="equipment-dialog">
      <DialogHeader><DialogTitle>Registrar cliente</DialogTitle><DialogDescription>Ingresa los datos de contacto. Nombre y correo son obligatorios.</DialogDescription></DialogHeader>
      <form noValidate onSubmit={submit} className="equipment-form">
        {fields.map(field => <div className="field" key={field.key}>
          <Label htmlFor={`client-${field.key}`}>{field.label}{field.required ? " *" : ""}</Label>
          <Input id={`client-${field.key}`} type={field.type} value={values[field.key]} placeholder={field.placeholder} maxLength={field.max}
            disabled={saving} required={field.required} aria-invalid={Boolean(errors[field.key])}
            aria-describedby={errors[field.key] ? `client-${field.key}-error` : undefined}
            onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))} />
          {errors[field.key] ? <p className="field-error" id={`client-${field.key}-error`}>{errors[field.key]}</p> : null}
        </div>)}
        {error ? <p role="alert" className="error-message">{error}</p> : null}
        <div className="form-actions"><Button type="button" variant="outline" disabled={saving} onClick={() => changeOpen(false)}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? <><LoaderCircle className="spin" aria-hidden="true" />Guardando…</> : "Guardar cliente"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}