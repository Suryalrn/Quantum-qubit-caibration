import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Quantum Calibration Intelligence | IBM Quantum Hardware & GNN Routing",
  description: "Scientific platform optimizing quantum circuit routing on physical IBM superconducting processors using real calibration telemetry and Graph Neural Networks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#141110] text-[#F4EFE6] min-h-screen flex flex-col antialiased quantum-grid-bg">
        <Navbar />
        <main className="flex-1 w-full">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
