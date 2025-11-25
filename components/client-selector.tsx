"use client"

import { useState, useEffect } from "react"
import type { Client } from "@/types"
import { api } from "@/lib/api"
import { Plus, ChevronDown, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ClientSelectorProps {
  selectedClient: Client | null
  onSelectClient: (client: Client) => void
  onClientDeleted?: () => void
}

export function ClientSelector({ selectedClient, onSelectClient, onClientDeleted }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newClientName, setNewClientName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDeleteClient = async () => {
    if (!clientToDelete) return

    setIsDeleting(true)
    setError(null)
    try {
      await api.deleteClient(clientToDelete.id)
      // Remove from clients list
      const updatedClients = clients.filter((c) => c.id !== clientToDelete.id)
      setClients(updatedClients)

      // If the deleted client was selected, clear selection
      if (selectedClient?.id === clientToDelete.id) {
        if (updatedClients.length > 0) {
          onSelectClient(updatedClients[0])
        } else {
          // No clients left, clear selection
          if (onClientDeleted) {
            onClientDeleted()
          }
        }
      }

      setClientToDelete(null)
    } catch (e) {
      console.error("Failed to delete client", e)
      setError(e instanceof Error ? e.message : "Failed to delete client. Check backend connection.")
    } finally {
      setIsDeleting(false)
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
            <DropdownMenuItem
              key={client.id}
              onSelect={() => onSelectClient(client)}
              className="flex items-center justify-between group"
            >
              <span className="flex-1">{client.name}</span>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setClientToDelete(client)
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive transition-opacity"
                title="Delete client"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
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

      <AlertDialog open={clientToDelete !== null} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{clientToDelete?.name}"? This will permanently delete the client and all
              associated data including keyword ideas, clusters, sets, blog ideas, and context. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
