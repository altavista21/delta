export const roles = [
  { id: "accountant", label: "Akuntan", description: "Laporan, transaksi, dan kepatuhan keuangan", modules: ["Overview", "General Ledger", "Financial Reports", "Tax & Compliance", "AI Data Analytics"] },
  { id: "hr", label: "Profesional SDM", description: "Rekrutmen, karyawan, dan kebijakan", modules: ["HR Metrics", "Recruitment (ATS)", "Employee Experience", "Policy Generator"] },
  { id: "sales", label: "Manajer Penjualan", description: "Pipeline, target, dan tindak lanjut", modules: ["Sales Pipeline", "Team Performance", "Smart Follow-ups", "Forecasting & Insights"] },
  { id: "office", label: "Manajer Kantor", description: "Operasional, inventaris, dan jadwal", modules: ["Daily Operations", "Facility & Inventory", "Visitor Management", "Schedules & Announcements"] },
  { id: "designer", label: "Desainer", description: "Ide kreatif, aset, dan persetujuan klien", modules: ["Creative Workspace", "AI Idea Generator", "Asset Library", "Client Approvals"] },
  { id: "financier", label: "Ahli Keuangan / Investor", description: "Portofolio, skenario, dan penilaian risiko", modules: ["Market Data & Portfolio", "Scenario Modeling", "Risk Assessment", "Data-Driven Decisions"] },
  { id: "teacher", label: "Guru / Pengajar", description: "Kelas, RPP, tugas, dan materi belajar", modules: ["Classes & Students", "Lesson Plan Creator", "Assignments & Grading", "Interactive Resources"] },
  { id: "consultant", label: "Konsultan", description: "Klien, riset industri, dan laporan strategi", modules: ["Client & Engagement", "Industry Knowledge Base", "Time & Invoicing", "Strategic Reports"] },
  { id: "property", label: "Agen Properti", description: "Listing, calon klien, kunjungan, dan dokumen", modules: ["Property Listings", "Client CRM & Leads", "Showings Calendar", "Contracts & Documents"] },
] as const;

export type RoleId = (typeof roles)[number]["id"];
export function isRoleId(value: unknown): value is RoleId {
  return typeof value === "string" && roles.some((role) => role.id === value);
}
