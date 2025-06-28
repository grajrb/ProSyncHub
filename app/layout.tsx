import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import { Toaster } from "@/components/ui/sonner";
import { WebSocketProvider } from "./context/WebSocketContext";
<<<<<<< HEAD
import dynamic from 'next/dynamic';

// Dynamically import the monitoring to avoid SSR issues
const MonitoringInitializer = dynamic(
  () => import('./components/MonitoringInitializer'),
  { ssr: false }
);
=======
import ClientMonitoringWrapper from './components/ClientMonitoringWrapper';
>>>>>>> 368efa71b6c2eec7564d7f16accc1e3f5a43c8b1

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: "ProSync Hub - Industrial Asset Management",
  description: "Real-time collaborative industrial asset management & predictive maintenance platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} bg-industrial-deep text-white font-sans antialiased`}>
        {/* Initialize monitoring */}
<<<<<<< HEAD
        <MonitoringInitializer />
=======
        <ClientMonitoringWrapper />
>>>>>>> 368efa71b6c2eec7564d7f16accc1e3f5a43c8b1
        
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto p-6 bg-industrial-deep">
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}