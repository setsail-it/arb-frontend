"use client"

import { useState } from "react"
import type { Client } from "@/types"
import { ClientSelector } from "@/components/client-selector"
import { ClientContextView } from "@/components/views/client-context-view"
import { BlogFactoryView } from "@/components/views/blog-factory-view"
import { StrategyEditorView } from "@/components/views/strategy-editor-view"
import { PageUpdaterView } from "@/components/views/page-updater-view"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { LogOut, User, Shield } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { canModifyClient } from "@/lib/auth"

export default function ABSControlPanel() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState("context")
  const { user, loading, logout } = useAuth()

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  // Should not happen as AuthProvider redirects, but just in case
  if (!user) {
    return null
  }

  // Check if user can modify the selected client
  const canModify = selectedClient ? canModifyClient(user, selectedClient.owner_id ?? null) : true

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div className="w-64 border-r bg-muted/10 flex flex-col p-4">
        <div className="font-bold text-xl tracking-tight mb-4">Setsail AI Panel</div>

        {/* User Info */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 mb-4">
          {user.is_admin ? (
            <Shield className="h-4 w-4 text-amber-500" />
          ) : (
            <User className="h-4 w-4 text-slate-400" />
          )}
          <span className="text-sm font-medium flex-1">{user.username}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-100"
            onClick={logout}
            title="Sign out"
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>

        <ClientSelector
          selectedClient={selectedClient}
          onSelectClient={setSelectedClient}
          onClientDeleted={() => setSelectedClient(null)}
          currentUser={user}
        />

        <div className="space-y-1 mt-4">
          <NavButton label="Client Context" active={activeTab === "context"} onClick={() => setActiveTab("context")} />
          <NavButton
            label="Strategy"
            active={activeTab === "strategy"}
            onClick={() => setActiveTab("strategy")}
          />
          <NavButton
            label="Blog Factory"
            active={activeTab === "factory"}
            onClick={() => setActiveTab("factory")}
          />
          <NavButton
            label="Page Updater"
            active={activeTab === "page-updater"}
            onClick={() => setActiveTab("page-updater")}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "page-updater" ? (
          <div className="flex-1 p-6 overflow-auto">
            <PageUpdaterView />
          </div>
        ) : !selectedClient ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a client from the sidebar to get started.
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-hidden">
            {/* Read-only banner for non-owners */}
            {!canModify && (
              <div className="mb-4 px-4 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                <strong>Read-only view</strong> — This client belongs to {selectedClient.owner_username || "another user"}. You can view but not modify.
              </div>
            )}
            {activeTab === "context" && <ClientContextView client={selectedClient} readOnly={!canModify} />}
            {activeTab === "strategy" && <StrategyEditorView client={selectedClient} readOnly={!canModify} />}
            {activeTab === "factory" && <BlogFactoryView client={selectedClient} readOnly={!canModify} />}
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
