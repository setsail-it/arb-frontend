"use client"

import { useState } from "react"
import type { Client } from "@/types"
import { ClientSelector } from "@/components/client-selector"
import { ClientContextView } from "@/components/views/client-context-view"
import { BlogFactoryView } from "@/components/views/blog-factory-view"

export default function ABSControlPanel() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState("context")

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div className="w-64 border-r bg-muted/10 flex flex-col p-4 space-y-6">
        <div className="font-bold text-xl tracking-tight">ABS Control Panel</div>

        <ClientSelector
          selectedClient={selectedClient}
          onSelectClient={setSelectedClient}
          onClientDeleted={() => setSelectedClient(null)}
        />

        <div className="space-y-1">
          <NavButton label="Client Context" active={activeTab === "context"} onClick={() => setActiveTab("context")} />
          <NavButton
            label="Blog Factory"
            active={activeTab === "factory"}
            onClick={() => setActiveTab("factory")}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {!selectedClient ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a client from the sidebar to get started.
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-hidden">
            {activeTab === "context" && <ClientContextView client={selectedClient} />}
            {activeTab === "factory" && <BlogFactoryView client={selectedClient} />}
          </div>
        )}
      </main>
    </div>
  )
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors
        ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}
      `}
    >
      {label}
    </button>
  )
}
