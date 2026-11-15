// @vitest-environment happy-dom
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { PaymentForm } from "../src/modules/pagos/payment-form.jsx";
import * as quotes from "../src/services/cotizaciones";
import * as payments from "../src/services/pagos";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
const options = [{ id: "q1", code: "COT-1", total: 100 }, { id: "q2", code: "COT-2", total: 200 }];
const summary = total => ({ totalCotizacion: total, totalVerificado: 0, totalRegistradoPendiente: 0, saldoPendiente: total });
const button = text => [...document.body.querySelectorAll("button")].find(el => el.textContent.trim() === text);
const click = async text => { await act(async () => { button(text).click(); }); };
async function select(id) { await act(async () => { const el = document.querySelector("#payment-quote"); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, id); el.dispatchEvent(new Event("change", { bubbles: true })); }); }
async function open() { await act(async () => { root.render(<PaymentForm onSaved={vi.fn()} />); }); await click("Registrar pago"); }
beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); vi.spyOn(quotes, "getQuotes").mockResolvedValue(options); vi.spyOn(payments, "getQuoteFinancialSummary").mockResolvedValue(summary(100)); vi.spyOn(payments, "registerPayment").mockResolvedValue({ id: "p1" }); });
afterEach(async () => { await act(async () => { root.unmount(); }); container.remove(); vi.restoreAllMocks(); });
it("muestra error de cotizaciones y permite reintentar sin registrar pagos", async () => {
  quotes.getQuotes.mockRejectedValueOnce(new Error("Cotizaciones no disponibles")); await open();
  expect(document.body.textContent).toContain("Cotizaciones no disponibles"); expect(button("Registrar recepción").disabled).toBe(true);
  await click("Reintentar cotizaciones"); expect(document.querySelector("#payment-quote").options.length).toBe(3); expect(payments.registerPayment).not.toHaveBeenCalled();
});
it("descarta el saldo de una consulta anterior más lenta", async () => {
  let resolveOld; payments.getQuoteFinancialSummary.mockImplementation(id => id === "q1" ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve(summary(200)));
  await open(); await select("q1"); expect(button("Registrar recepción").disabled).toBe(true); await select("q2");
  expect(document.body.textContent).toContain("$200"); await act(async () => { resolveOld(summary(999)); });
  expect(document.body.textContent).not.toContain("$999"); expect(document.body.textContent).toContain("$200");
});
it("muestra fallo del saldo, bloquea envío y permite reintentar", async () => {
  payments.getQuoteFinancialSummary.mockRejectedValueOnce(new Error("Saldo no disponible")); await open(); await select("q1");
  expect(document.body.textContent).toContain("Saldo no disponible"); expect(button("Registrar recepción").disabled).toBe(true);
  await click("Reintentar saldo"); expect(document.body.textContent).not.toContain("Saldo no disponible"); expect(button("Registrar recepción").disabled).toBe(false);
});
it("descarta consultas del diálogo cerrado y reabre sin saldo ni autor editable", async () => {
  let resolveOld; payments.getQuoteFinancialSummary.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  await open(); await select("q1"); await click("Cancelar"); await act(async () => { resolveOld(summary(999)); }); await click("Registrar pago");
  expect(document.querySelector("#payment-quote").value).toBe(""); expect(document.body.textContent).not.toContain("$999"); expect(document.querySelector("#payment-registeredBy")).toBeNull(); expect(button("Registrar recepción").disabled).toBe(true);
});
it("conserva la cotización preseleccionada al cerrar y volver a abrir", async () => {
  await act(async () => { root.render(<PaymentForm onSaved={vi.fn()} preselectedQuoteId="q2" />); });
  await click("Registrar pago"); await click("Cancelar"); await click("Registrar pago");
  expect(document.querySelector("#payment-quote").value).toBe("q2");
  expect(document.querySelector("#payment-quote").disabled).toBe(true);
  expect(payments.getQuoteFinancialSummary).toHaveBeenLastCalledWith("q2");
});
