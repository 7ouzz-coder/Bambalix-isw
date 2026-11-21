"use client";

import { useEffect, useState } from "react";
import { getMaintenancePhoto, saveMaintenancePhoto } from "@/services/equipos";
import { Button } from "@/components/ui/button";

function Photo({ equipmentId, maintenanceId, stage, label }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let preview;
    getMaintenancePhoto(equipmentId, maintenanceId, stage, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      preview = blob ? URL.createObjectURL(blob) : "";
      setUrl(preview);
    }).catch(() => {
      if (!controller.signal.aborted) setError("No se pudo consultar la foto");
    });
    return () => { controller.abort(); if (preview) URL.revokeObjectURL(preview); };
  }, [equipmentId, maintenanceId, stage, revision]);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("photo");
    if (!file?.size || file.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(file.type)) {
      setError("Selecciona una imagen JPEG o PNG de hasta 2 MB");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await saveMaintenancePhoto(equipmentId, maintenanceId, stage, file);
      form.reset();
      setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="grid gap-2">
    <label>{label}<input className="block max-w-full" name="photo" type="file" accept="image/jpeg,image/png" required disabled={busy} /></label>
    {url && <img src={url} alt={label} className="max-h-48 max-w-full object-contain" />}
    {error && <p role="alert" className="field-error">{error}</p>}
    <Button type="submit" variant="outline" disabled={busy}>{busy ? "Subiendo…" : "Guardar foto"}</Button>
  </form>;
}

export function MaintenancePhotos(props) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <Photo {...props} stage="before" label="Foto de antes de la mantención" />
    <Photo {...props} stage="after" label="Foto de después de la mantención" />
  </div>;
}
