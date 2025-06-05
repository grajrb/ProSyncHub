import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import SkipToContent from "./ui/SkipToContent";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <SkipToContent />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main 
          id="main-content" 
          className="flex-1 overflow-y-auto p-6"
          tabIndex={-1} // Makes it focusable for skip link
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
