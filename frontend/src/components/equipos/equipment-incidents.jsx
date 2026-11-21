"use client";

import { useEffect, useState } from "react";
import { createEquipmentIncident, getEquipmentIncidents } from "@/services/equipos";
import { Button } from "@/components/ui/button";

export function EquipmentIncidents({ equipmentId, assignmentId, onBack }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getEquipmentIncidents(equipmentId, assignmentId, controller.signal)
      .then(result => { if (!controller.signal.aborted) setItems(result); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [equipmentId, assignmentId]);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const description = String(new FormData(form).get("description")).trim();
    if (description.length < 3) { setError("Escribe al menos 3 caracteres"); return; }
    setError("");
    setBusy(true);
    try {
      const item = await createEquipmentIncident(equipmentId, assignmentId, description);
      setItems(previous => [item, ...(previous || [])]);
      form.reset();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <section className="grid gap-3">
    <h3>Incidencias de la asignación</h3>
    <form onSubmit={submit} className="grid gap-2">
      <label>Qué ocurrió<textarea className="equipment-status-reason" name="description" required minLength={3} maxLength={500} disabled={busy} /></label>
      <Button type="submit" disabled={busy || !items}>Registrar incidencia</Button>
    </form>
    {error && <p role="alert" className="field-error">{error}</p>}
    {items?.length ? <ul>{items.map(item => <li key={item.id}>
      <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("es-CL")}</time>
      <p>{item.description}</p>
    </li>)}</ul> : items && <p>Sin incidencias registradas.</p>}
    <Button variant="outline" type="button" disabled={busy} onClick={onBack}>Volver a asignaciones</Button>
  </section>;
}
