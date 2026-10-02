import { ClientWorkspace } from "@/modules/clientes/client-workspace";
import { WorkspaceLayout } from "@/components/workspace-layout";

export default function ClientsPage() {
  return <WorkspaceLayout
    activeModule="clientes"
    breadcrumb={<>Recursos y operación <span className="crumb">/ Clientes</span></>}
    footer="Registro de clientes"
  >
    <ClientWorkspace />
  </WorkspaceLayout>;
}
