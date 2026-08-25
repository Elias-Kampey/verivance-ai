import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { HistoryProvider } from "@/lib/history";

export const metadata: Metadata = {
  title: "Verivance.ai",
  description: "A RAG search engine that shows its evidence and refuses to guess.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-page text-white">
        <HistoryProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </HistoryProvider>
      </body>
    </html>
  );
}
