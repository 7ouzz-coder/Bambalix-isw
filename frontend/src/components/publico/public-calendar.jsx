"use client";
import { useEffect, useState } from "react";

const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const pad = value => String(value).padStart(2, "0");

export function PublicCalendar({ selectedDate, onSelect, occupiedDates = [] }) {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
    const [year, month] = selectedDate.split("-").map(Number);
    if (month >= 1 && month <= 12) setMonth(new Date(year, month - 1, 1));
  }, [selectedDate]);
  const year = month.getFullYear(), index = month.getMonth();
  const leading = (new Date(year, index, 1).getDay() + 6) % 7;
  const days = new Date(year, index + 1, 0).getDate();
  const monthName = month.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  function move(offset) { setMonth(new Date(year, index + offset, 1)); }
  return <div className="public-calendar" aria-label="Calendario de fechas">
    <div className="public-calendar-header">
      <button type="button" onClick={() => move(-1)} aria-label="Mes anterior">‹</button>
      <h3 aria-live="polite">{monthName}</h3>
      <button type="button" onClick={() => move(1)} aria-label="Mes siguiente">›</button>
    </div>
    <div className="public-calendar-grid" aria-label="Días de la semana">
      {weekdays.map(day => <span className="public-calendar-weekday" key={day}>{day}</span>)}
      {Array.from({ length: leading }, (_, i) => <span aria-hidden="true" key={`blank-${i}`} />)}
      {Array.from({ length: days }, (_, i) => {
        const day = i + 1, date = `${year}-${pad(index + 1)}-${pad(day)}`;
        const label = new Date(year, index, day).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const occupied = occupiedDates.includes(date);
        return <button type="button" key={date} aria-label={occupied ? `${label}, ocupado` : label} aria-pressed={selectedDate === date}
          className={occupied ? "public-calendar-occupied" : undefined}
          onClick={() => onSelect(date)}>{day}</button>;
      })}
    </div>
  </div>;
}
