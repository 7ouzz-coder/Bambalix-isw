import { Layers3, ArrowUpRight } from "lucide-react";
import { PublicContact } from "@/components/publico/event-request";
import "./publico.css";
const services = [
 ["01", "Encuentros que conectan", "Seminarios y congresos con apoyo técnico y logístico."],
 ["02", "Momentos que se celebran", "Licenciaturas, ceremonias y celebraciones sociales."],
 ["03", "Escenarios que se sienten", "Shows, conciertos y producción técnica para cada espectáculo."],
 ["04", "El apoyo que necesitas", "Banquetería, arriendo de escenarios y mobiliario, y asesoría de producción."],
];
export default function PublicHome() {
 return <div className="public-home">
  <header className="public-header"><a href="/" className="public-brand" aria-label="Bambalix, inicio"><Layers3 aria-hidden="true"/>Bambalix</a><nav aria-label="Navegación pública"><a href="#servicios">Servicios</a><a href="#agenda">Agenda</a><a className="public-staff" href="/colaboradores">Acceso colaboradores <ArrowUpRight size={16} aria-hidden="true"/></a></nav></header>
  <main><section className="public-hero"><div><p className="public-eyebrow">PRODUCCIÓN · TÉCNICA · COORDINACIÓN</p><h1>Tu evento,<br/>en buenas manos.</h1><p className="public-lead">De la primera idea al último aplauso. Coordinamos los servicios que tu evento necesita, a tu medida.</p><a className="public-cta" href="#solicitar">Conversemos sobre tu evento <ArrowUpRight size={20} aria-hidden="true"/></a></div><div className="public-stage" aria-hidden="true"><span className="public-stage-number">B.</span><span className="public-stage-line"/><span className="public-stage-caption">DETRÁS DE CADA EVENTO,<br/>TODO EN SU LUGAR.</span></div></section>
  <section id="servicios" className="public-services" aria-labelledby="services-heading"><div className="public-section-intro"><p className="public-eyebrow">LO QUE HACEMOS</p><h2 id="services-heading">Cada ocasión tiene<br/>su propia forma.</h2><p>Eventos corporativos, sociales y artísticos. Combinamos los servicios según lo que necesitas, sin limitar tu idea a un paquete fijo.</p></div><div>{services.map(([number,title,description])=><article key={number} className="public-service"><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>
  <PublicContact/></main>
  <footer className="public-footer"><span>Bambalix</span><p>Producción que acompaña tus ideas.</p><a href="/colaboradores">Acceso colaboradores</a></footer>
 </div>;
}
