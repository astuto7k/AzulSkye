export const SPECIALTIES = [
  "Motores",
  "Velas / asas",
  "Hélices",
  "Estruturas",
  "Seletes",
  "Elétrica",
  "Outros",
];
export function workshopSeed() {
  return {
    workshops: [
      {
        id: "oficina-demo",
        name: "Oficina de demonstração",
        owner: "Profissional demonstrativo",
        documentType: "CNPJ",
        email: "oficina@azulskye.demo",
        city: "Localização de demonstração",
        specialties: ["Motores", "Velas / asas"],
        serviceMode: "Presencial e envio de equipamento",
        description:
          "Perfil de demonstração para explorar a área de oficinas parceiras. Não representa uma oficina credenciada real.",
        status: "approved",
        isDemo: true,
      },
    ],
    serviceRequests: [],
  };
}
export function validateWorkshop(profile) {
  if (
    !profile.name?.trim() ||
    !profile.owner?.trim() ||
    !profile.city?.trim() ||
    !profile.description?.trim()
  )
    return "Preencha nome, responsável, cidade e apresentação.";
  if (!["CPF", "CNPJ"].includes(profile.documentType))
    return "Selecione profissional (CPF) ou empresa (CNPJ).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email || ""))
    return "Informe um email válido.";
  if (
    !profile.specialties?.length ||
    profile.specialties.some((s) => !SPECIALTIES.includes(s))
  )
    return "Escolha pelo menos uma especialidade válida.";
  return "";
}
export function visibleWorkshopRequests(requests, user) {
  return user?.role === "admin"
    ? requests
    : requests.filter((r) =>
        user?.role === "workshop"
          ? r.workshopId === user.workshopId
          : user?.role === "client" && r.customerId === user.email,
      );
}
export const SERVICE_STATUSES = [
  "Recebida",
  "Em análise",
  "Orçamento enviado",
  "Em manutenção",
  "Concluída",
  "Cancelada",
];
