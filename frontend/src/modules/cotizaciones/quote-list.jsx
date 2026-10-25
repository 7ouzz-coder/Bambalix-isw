"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Eye, FileText, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approveQuote, getQuotes, submitQuoteForReview } from "@/services/cotizaciones";

export function QuoteList({ revision, onStatusChanged }) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: "" }));

    getQuotes()
      .then((items) => {
        if (!Array.isArray(items)) throw new Error("El servidor respondió con un listado inválido");
        if (!controller.signal.aborted) setState({ loading: false, items, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], error: error.message });
      });

    return () => controller.abort();
  }, [revision, attempt]);

  async function handleSendToReview(quoteId) {
    setActionLoading(quoteId);
    try {
      const updated = await submitQuoteForReview(quoteId);
      setState((prev) => ({
        ...prev,
        items: prev.items.map((q) => (q.id === quoteId ? { ...q, status: updated.status } : q)),
      }));
      if (onStatusChanged) onStatusChanged(`Cotización ${updated.code || quoteId} enviada a revisión.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprove(quoteId) {
    setActionLoading(quoteId);
    try {
      const updated = await approveQuote(quoteId);
      setState((prev) => ({
        ...prev,
        items: prev.items.map((q) => (q.id === quoteId ? { ...q, ...updated } : q)),
      }));
      if (onStatusChanged) onStatusChanged(`Cotización ${updated.code || quoteId} aprobada por Gerencia.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case "BORRADOR":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Borrador</span>;
      case "EN_REVISION":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">En revisión</span>;
      case "APROBADA":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Aprobada</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{status}</span>;
    }
  }

  return (
    <section className="equipment-ledger" aria-labelledby="quotes-list-heading" aria-busy={state.loading}>
      <div className="ledger-header">
        <div>
          <h2 id="quotes-list-heading">Cotizaciones comerciales</h2>
          <p>
            {state.loading
              ? "Consultando cotizaciones…"
              : state.error
              ? "No se pudo consultar el listado"
              : `${state.items.length} ${
                  state.items.length === 1 ? "cotización registrada" : "cotizaciones registradas"
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
          Cargando cotizaciones…
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
            <FileText aria-hidden="true" />
          </div>
          <h3>Aún no hay cotizaciones</h3>
          <p>Crea la primera cotización vinculada a un cliente y evento.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Total (IVA inc.)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.items.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-mono text-xs font-semibold">{quote.code}</TableCell>
                <TableCell className="font-medium">{quote.client?.name || quote.clientId}</TableCell>
                <TableCell>{quote.event?.title || `#${quote.eventId}`}</TableCell>
                <TableCell className="font-semibold">${Number(quote.total).toLocaleString("es-CL")}</TableCell>
                <TableCell>{getStatusBadge(quote.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedQuote(quote)}
                      title="Ver detalle e ítems"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Detalle
                    </Button>

                    {quote.status === "BORRADOR" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === quote.id}
                        onClick={() => handleSendToReview(quote.id)}
                        title="Enviar cotización a revisión gerencial"
                      >
                        <Send className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        Revisión
                      </Button>
                    )}

                    {quote.status !== "APROBADA" && (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={actionLoading === quote.id}
                        onClick={() => handleApprove(quote.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        title="Aprobar como Gerente mediante identidad autenticada"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Aprobar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {selectedQuote && (
        <Dialog open={Boolean(selectedQuote)} onOpenChange={(open) => !open && setSelectedQuote(null)}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center pr-6">
                <span>Cotización {selectedQuote.code}</span>
                {getStatusBadge(selectedQuote.status)}
              </DialogTitle>
              <DialogDescription>
                Cliente: <strong>{selectedQuote.client?.name}</strong> | Evento: <strong>{selectedQuote.event?.title}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {selectedQuote.notes ? (
                <div className="text-sm bg-muted/40 p-2.5 rounded-md">
                  <span className="font-semibold">Notas: </span> {selectedQuote.notes}
                </div>
              ) : null}

              <div>
                <h4 className="text-sm font-semibold mb-2">Ítems congelados históricamente:</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground uppercase border-b">
                      <tr>
                        <th className="p-2 text-left">Concepto</th>
                        <th className="p-2 text-center">Cant.</th>
                        <th className="p-2 text-right">Precio Unit.</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(selectedQuote.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="p-2 font-medium">{item.concept}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">${Number(item.unitPrice).toLocaleString("es-CL")}</td>
                          <td className="p-2 text-right font-semibold">${Number(item.subtotal).toLocaleString("es-CL")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50 font-bold border-t">
                      <tr>
                        <td colSpan={3} className="p-2 text-right">Total (IVA inc.):</td>
                        <td className="p-2 text-right text-base">${Number(selectedQuote.total).toLocaleString("es-CL")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selectedQuote.approvedBy ? (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  Aprobado comercialmente por: <strong>{selectedQuote.approvedBy}</strong>
                  {selectedQuote.approvedAt ? ` el ${new Date(selectedQuote.approvedAt).toLocaleString("es-CL")}` : ""}
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
