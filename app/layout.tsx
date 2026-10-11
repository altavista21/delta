import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delta Workspace | Ruang Kerja Cerdas",
  description: "Satu ruang kerja AI untuk sembilan profesi. Kelola pekerjaan dengan alur yang lebih rapi dan insight yang relevan.",
  applicationName: "Delta Workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
