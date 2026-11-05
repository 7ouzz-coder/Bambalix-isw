CREATE INDEX "quotes_client_id_idx" ON "quotes"("client_id");
CREATE INDEX "quotes_event_id_idx" ON "quotes"("event_id");
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items"("quote_id");
CREATE INDEX "payments_quote_id_idx" ON "payments"("quote_id");
