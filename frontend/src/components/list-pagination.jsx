"use client";

import { Button } from "@/components/ui/button";

export function ListPagination({ page, pages, disabled, onChange, label }) {
  return <nav className="list-pagination" aria-label={label}>
    <p role="status">Página {page} de {pages}</p>
    <div className="equipment-filter-actions">
      <Button type="button" variant="outline" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>Anterior</Button>
      <Button type="button" variant="outline" disabled={disabled || page >= pages} onClick={() => onChange(page + 1)}>Siguiente</Button>
    </div>
  </nav>;
}
