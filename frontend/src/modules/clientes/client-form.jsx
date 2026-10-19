"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientFormSchema, createClient, updateClient } from "@/services/clientes";

const defaultValues = {
  name: "",
  email: "",
  rut: "",
  phone: "",
  address: "",
  clientType: "persona",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  contactPosition: "",
};

export function ClientForm({ clientToEdit = null, onSaved, trigger = null, open: controlledOpen, onOpenChange: setControlledOpen }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [serverError, setServerError] = useState("");
  const isEditing = Boolean(clientToEdit && clientToEdit.id);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(clientFormSchema),
    defaultValues: clientToEdit
      ? {
          name: clientToEdit.name || "",
          email: clientToEdit.email || "",
          rut: clientToEdit.rut || "",
          phone: clientToEdit.phone || "",
          address: clientToEdit.address || "",
          clientType: clientToEdit.clientType || "persona",
          contactName: clientToEdit.contactName || "",
          contactPhone: clientToEdit.contactPhone || "",
          contactEmail: clientToEdit.contactEmail || "",
          contactPosition: clientToEdit.contactPosition || "",
        }
      : defaultValues,
  });

  const selectedType = watch("clientType");

  useEffect(() => {
    if (clientToEdit) {
      reset({
        name: clientToEdit.name || "",
        email: clientToEdit.email || "",
        rut: clientToEdit.rut || "",
        phone: clientToEdit.phone || "",
        address: clientToEdit.address || "",
        clientType: clientToEdit.clientType || "persona",
        contactName: clientToEdit.contactName || "",
        contactPhone: clientToEdit.contactPhone || "",
        contactEmail: clientToEdit.contactEmail || "",
        contactPosition: clientToEdit.contactPosition || "",
      });
    } else {
      reset(defaultValues);
    }
    setServerError("");
  }, [clientToEdit, open, reset]);

  function handleOpenChange(next) {
    if (isSubmitting) return;
    setOpen(next);
    if (!next) {
      setServerError("");
      if (!clientToEdit) reset(defaultValues);
    }
  }

  async function onSubmit(data) {
    setServerError("");
    try {
      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        rut: data.rut ? data.rut.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        address: data.address ? data.address.trim() : null,
        clientType: data.clientType,
        contactName: data.clientType === "empresa" && data.contactName ? data.contactName.trim() : null,
        contactPhone: data.clientType === "empresa" && data.contactPhone ? data.contactPhone.trim() : null,
        contactEmail: data.clientType === "empresa" && data.contactEmail ? data.contactEmail.trim() : null,
        contactPosition: data.clientType === "empresa" && data.contactPosition ? data.contactPosition.trim() : null,
      };

      let result;
      if (isEditing) {
        result = await updateClient(clientToEdit.id, payload);
      } else {
        result = await createClient(payload);
      }

      handleOpenChange(false);
      if (onSaved) onSaved(result, isEditing);
    } catch (failure) {
      setServerError(failure.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : isEditing ? (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="action-btn">
            <Pencil className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Editar
          </Button>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="primary-action">
            <Plus aria-hidden="true" />
            Registrar cliente
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="equipment-dialog max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Actualizar cliente" : "Registrar cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Edita la información del cliente. Los cambios se actualizarán mediante PATCH."
              : "Ingresa los datos del cliente. Puedes registrar tanto personas como empresas."}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="equipment-form">
          <div className="field">
            <Label htmlFor="client-type-select">Tipo de cliente *</Label>
            <div className="flex gap-4 pt-1" id="client-type-select">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="radio"
                  value="persona"
                  {...register("clientType")}
                  disabled={isSubmitting}
                />
                Persona natural
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="radio"
                  value="empresa"
                  {...register("clientType")}
                  disabled={isSubmitting}
                />
                Empresa / Institución
              </label>
            </div>
          </div>

          <div className="field">
            <Label htmlFor="client-name">
              {selectedType === "empresa" ? "Razón Social o Nombre de Empresa *" : "Nombre completo *"}
            </Label>
            <Input
              id="client-name"
              type="text"
              placeholder={selectedType === "empresa" ? "Ej. Eventos y Producciones SpA" : "Ej. María López"}
              maxLength={120}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name ? <p className="field-error">{errors.name.message}</p> : null}
          </div>

          <div className="field">
            <Label htmlFor="client-email">Correo electrónico principal *</Label>
            <Input
              id="client-email"
              type="email"
              placeholder="nombre@ejemplo.cl"
              maxLength={254}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email ? <p className="field-error">{errors.email.message}</p> : null}
          </div>

          <div className="field">
            <Label htmlFor="client-rut">RUT (opcional)</Label>
            <Input
              id="client-rut"
              type="text"
              placeholder="Ej. 12.345.678-9"
              maxLength={20}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.rut)}
              {...register("rut")}
            />
            {errors.rut ? <p className="field-error">{errors.rut.message}</p> : null}
          </div>

          <div className="field">
            <Label htmlFor="client-phone">Teléfono (opcional)</Label>
            <Input
              id="client-phone"
              type="tel"
              placeholder="Ej. +56 9 1234 5678"
              maxLength={40}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
            {errors.phone ? <p className="field-error">{errors.phone.message}</p> : null}
          </div>

          <div className="field">
            <Label htmlFor="client-address">Dirección (opcional)</Label>
            <Input
              id="client-address"
              type="text"
              placeholder="Calle, número, comuna o ciudad"
              maxLength={240}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.address)}
              {...register("address")}
            />
            {errors.address ? <p className="field-error">{errors.address.message}</p> : null}
          </div>

          {selectedType === "empresa" && (
            <div className="border-t pt-4 mt-2 grid gap-4 bg-muted/20 p-3 rounded-md">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Encargado de contacto de la empresa
              </p>

              <div className="field">
                <Label htmlFor="client-contactName">Nombre del encargado *</Label>
                <Input
                  id="client-contactName"
                  type="text"
                  placeholder="Ej. Carlos Gómez"
                  maxLength={120}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.contactName)}
                  {...register("contactName")}
                />
                {errors.contactName ? <p className="field-error">{errors.contactName.message}</p> : null}
              </div>

              <div className="field">
                <Label htmlFor="client-contactPosition">Cargo o función (opcional)</Label>
                <Input
                  id="client-contactPosition"
                  type="text"
                  placeholder="Ej. Coordinador de eventos"
                  maxLength={120}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.contactPosition)}
                  {...register("contactPosition")}
                />
                {errors.contactPosition ? <p className="field-error">{errors.contactPosition.message}</p> : null}
              </div>

              <div className="field">
                <Label htmlFor="client-contactPhone">Teléfono del encargado (opcional)</Label>
                <Input
                  id="client-contactPhone"
                  type="tel"
                  placeholder="Ej. +56 9 8765 4321"
                  maxLength={40}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.contactPhone)}
                  {...register("contactPhone")}
                />
                {errors.contactPhone ? <p className="field-error">{errors.contactPhone.message}</p> : null}
              </div>

              <div className="field">
                <Label htmlFor="client-contactEmail">Correo del encargado (opcional)</Label>
                <Input
                  id="client-contactEmail"
                  type="email"
                  placeholder="contacto.empresa@ejemplo.cl"
                  maxLength={254}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.contactEmail)}
                  {...register("contactEmail")}
                />
                {errors.contactEmail ? <p className="field-error">{errors.contactEmail.message}</p> : null}
              </div>
            </div>
          )}

          {serverError ? (
            <p role="alert" className="error-message">
              {serverError}
            </p>
          ) : null}

          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="spin" aria-hidden="true" />
                  Guardando…
                </>
              ) : isEditing ? (
                "Guardar cambios"
              ) : (
                "Guardar cliente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}