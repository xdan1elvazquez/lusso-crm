/**
 * CONFIGURACIÓN CENTRAL DE SUCURSALES
 * Define aquí los colores, logos y datos fiscales de cada unidad de negocio.
 */

export const BRANCHES_CONFIG = {
  lusso_main: {
    id: "lusso_main",
    name: "Lusso Visual",
    // Asegúrate de que estos archivos existan en tu carpeta /public
    logo: "/lusso-logo.png", 
    colors: {
      primary: "bg-[#050b1d]", // Azul oscuro original
      sidebar: "bg-[#050b1d]",
      accent: "text-blue-500",
      button: "bg-blue-600 hover:bg-blue-700",
      text: "text-slate-900"
    },
    address: "Matriz - Av. Principal 123",
    phone: "55 1234 5678",

    whatsappConfig: {
        statusWebhook: "https://n8n.nubeweb.studio/webhook/lusso-crm", 
        ticketWebhook: "https://n8n.nubeweb.studio/webhook/lusso-crm"
    }

  },
  mundo_main: {
    id: "mundo_main",
    name: "Mundo Visual",
    logo: "/mundo-logo.png",
    colors: {
      primary: "bg-emerald-900", // Verde oscuro
      sidebar: "bg-emerald-950",
      accent: "text-emerald-500",
      button: "bg-emerald-600 hover:bg-emerald-700",
      text: "text-emerald-900"
    },
    address: "Sucursal Norte - Calle 45",
    phone: "55 9876 5432",

    whatsappConfig: {
        statusWebhook: "https://tu-n8n-mundo.com/webhook/cambio-estado",
        ticketWebhook: "https://tu-n8n-mundo.com/webhook/enviar-ticket"
    }
  }
};

export const DEFAULT_BRANCH_ID = "lusso_main";

export const getBranchConfig = (branchId) => {
  return BRANCHES_CONFIG[branchId] || BRANCHES_CONFIG[DEFAULT_BRANCH_ID];
};