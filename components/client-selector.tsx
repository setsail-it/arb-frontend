"use client"

import { useState, useEffect } from "react"
import type { Client } from "@/types"
import { api } from "@/lib/api"
import { Plus, ChevronDown, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ClientSelectorProps {
  selectedClient: Client | null
  onSelectClient: (client: Client) => void
}

export function ClientSelector({ selectedClient, onSelectClient }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newClientName, setNewClientName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchClients = async () => {
    setError(null)
    try {
      const data = await api.getClients()
      setClients(data)
    } catch (e) {
      console.error("Failed to fetch clients", e)
      setError(e instanceof Error ? e.message : "Could not connect to backend")
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleAddClient = async () => {
    if (!newClientName.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const newClient = await api.createClient(newClientName)
      setClients([...clients, newClient])
      onSelectClient(newClient)
      setNewClientName("")
      setIsDialogOpen(false)
    } catch (e) {
      console.error("Failed to create client", e)
      setError("Failed to create client. Check backend connection.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground px-1">Select Client</div>
      {error && (
        <div className="bg-destructive/15 text-destructive text-xs p-2 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-transparent">
            {selectedClient ? selectedClient.name : "Select a client..."}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[240px]">
          {clients.map((client) => (
            <DropdownMenuItem key={client.id} onSelect={() => onSelectClient(client)}>
              {client.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Client
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Input placeholder="Client Name" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
            <Button onClick={handleAddClient} disabled={isLoading}>
              {isLoading ? "Adding..." : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
