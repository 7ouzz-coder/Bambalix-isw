"use client";

import { useEffect, useState } from "react";
import { Banknote, CheckCircle, CreditCard, DollarSign, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPayments, verifyPayment } from "@/services/pagos";

export function PaymentList({ revision, onPaymentVerified }) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  const [verifyingId, setVerifyingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: "" }));

    getPayments()
      .then((items) => {
        if (!Array.isArray(items)) throw new Error("El servidor respondió con un listado inválido");
        if (!controller.signal.aborted) setState({ loading: false, items, error: "" });
      })
      .catch((err) => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], error: err.message });
      });

    return () => controller.abort();
  }, [revision, attempt]);

  async function handleVerify(paymentId) {
    if (verifyingId) return;
    setVerifyingId(paymentId);
    try {
      const updated = await verifyPayment(paymentId, { name: "Gabriel García (Finanzas)" });
      setState((prev) => ({
        ...prev,
        items: prev.items.map((p) => (p.id === paymentId ? { ...p, ...updated } : p)),
      }));
      if (onPaymentVerified) {
        onPaymentVerified(`Pago de $${Number(updated.amount).toLocaleString("es-CL")} verificado correctamente.`);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <section className="equipment-ledger" aria-labelledby="payments-list-heading" aria-busy={state.loading}>
      <div className="ledger-header">
        <div>
          <h2 id="payments-list-heading">Registro y control de pagos</h2>
          <p>
            {state.loading
              ? "Consultando registros de pago…"
              : state.error
              ? "No se pudo consultar el listado"
              : `${state.items.length} ${
                  state.items.length === 1 ? "pago registrado" : "pagos registrados"
                }`}
          </p>
        </div>
        <Button variant="outline" disabled={state.loading} onClick={() => setAttempt((prev) => prev + 1)}>
          <RefreshCw aria-hidden="true" />
          Actualizar
        </Button>
      </div>

      {state.loading ? (
        <div className="list-loading" role="status">
          Cargando pagos…
          <div />
          <div />
          <div />
        </div>
      ) : state.error ? (
        <div className="list-state">
          <p className="error-message" role="alert">
            {state.error}
          </p>
          <Button variant="outline" onClick={() => setAttempt((prev) => prev + 1)}>
            Intentar nuevamente
          </Button>
        </div>
      ) : state.items.length === 0 ? (
        <div className="list-state">
          <div className="empty-icon">
            <DollarSign aria-hidden="true" />
          </div>
          <h3>Aún no hay pagos registrados</h3>
          <p>Registra la recepción del primer abono en efectivo o transferencia.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cotización</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Monto ($)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.items.map((payment) => {
              const isVerified = payment.status === "VERIFICADO";
              const isTransfer = payment.method === "TRANSFERENCIA";

              return (
                <TableRow key={payment.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(payment.createdAt).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">
                    {payment.quote?.code || payment.quoteId}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.quote?.client?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs">
                      {isTransfer ? (
                        <>
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          Transferencia
                        </>
                      ) : (
                        <>
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          Efectivo
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {payment.reference || "—"}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${Number(payment.amount).toLocaleString("es-CL")}
                  </TableCell>
                  <TableCell>
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Pendiente verif.
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isVerified ? (
                      <span className="text-xs text-muted-foreground" title={`Verificado por ${payment.verifiedBy || "Tesorería"}`}>
                        {payment.verifiedBy || "Verificado"}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={verifyingId === payment.id}
                        onClick={() => handleVerify(payment.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2.5"
                        title="Verificar y confirmar abono en cuenta"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Verificar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
