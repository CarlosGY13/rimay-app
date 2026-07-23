"use client";

import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-canvas flex min-h-screen flex-col md:flex-row">
      <div className="z-20 md:sticky md:top-0 md:h-screen md:shrink-0">
        <Sidebar />
      </div>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
