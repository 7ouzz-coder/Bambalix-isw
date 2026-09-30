import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = { title: "Bambalix · Equipos", description: "Registro de equipos para la producción de eventos" };

export default function RootLayout({ children }) {
  return <html lang="es" className={cn("font-sans", geist.variable)}><body>{children}</body></html>;
}
