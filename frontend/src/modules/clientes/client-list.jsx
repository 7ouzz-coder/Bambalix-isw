"use client";

import { useEffect, useState } from "react";
import { Building2, Pencil, RefreshCw, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientRequest } from "@/services/clientes";
import { ClientForm } from "./client-form";

export function ClientList({ revision, onClientUpdated }) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  const [editingClient, setEditingClient] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    clientRequest({ signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then((items) => {
        if (!Array.isArray(items)) throw new Error("El servidor respondió con un listado inválido");
        if (!controller.signal.aborted) setState({ loading: false, items, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], error: error.message });
      });
    return () => controller.abort();
  }, [revision, attempt]);

  function handleStartEdit(client) {
    setEditingClient(client);
    setEditDialogOpen(true);
  }

  function handleSaved(savedClient) {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((c) => (c.id === savedClient.id ? savedClient : c)),
    }));
    if (onClientUpdated) {
      onClientUpdated(savedClient);
    }
  }

  return (
    <section className="equipment-ledger" aria-labelledby="clients-list-heading" aria-busy={state.loading}>
      <div className="ledger-header">
        <div>
          <h2 id="clients-list-heading">Clientes registrados</h2>
          <p>
            {state.loading
              ? "Consultando clientes…"
              : state.error
              ? "No se pudo consultar el listado"
              : `${state.items.length} ${
                  state.items.length === 1 ? "cliente registrado" : "clientes registrados"
                }`}
          </p>
        </div>
        <Button variant="outline" disabled={state.loading} onClick={() => setAttempt((previous) => previous + 1)}>
          <RefreshCw aria-hidden="true" />
          Actualizar
        </Button>
      </div>

      {state.loading ? (
        <div className="list-loading" role="status">
          Cargando clientes…
          <div />
          <div />
          <div />
        </div>
      ) : state.error ? (
        <div className="list-state">
          <p className="error-message" role="alert">
            {state.error}
          </p>
          <Button variant="outline" onClick={() => setAttempt((previous) => previous + 1)}>
            Intentar nuevamente
          </Button>
        </div>
      ) : state.items.length === 0 ? (
        <div className="list-state">
          <div className="empty-icon">
            <Users aria-hidden="true" />
          </div>
          <h3>Aún no hay clientes</h3>
          <p>Registra el primer contacto para comenzar.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Nombre / Razón Social</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.items.map((client) => {
              const isEmpresa = client.clientType === "empresa";
              return (
                <TableRow key={client.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                      {isEmpresa ? (
                        <>
                          <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                          Empresa
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                          Persona
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="equipment-name font-medium">{client.name}</TableCell>
                  <TableCell>{client.rut || "—"}</TableCell>
                  <TableCell>
                    {isEmpresa ? (
                      <div>
                        <p className="text-sm font-medium">{client.contactName || "—"}</p>
                        {client.contactPosition ? (
                          <p className="text-xs text-muted-foreground">{client.contactPosition}</p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(client)}
                      className="h-8 px-2"
                      title="Editar cliente"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {editingClient && (
        <ClientForm
          clientToEdit={editingClient}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}