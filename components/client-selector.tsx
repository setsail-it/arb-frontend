"use client"

import { useState, useEffect } from "react"
import type { Client, User } from "@/types"
import { api } from "@/lib/api"
import { Plus, ChevronDown, AlertCircle, Trash2, Pencil, UserPlus, User as UserIcon } from "lucide-react"
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
import { canModifyClient, canAssignClient } from "@/lib/auth"

interface ClientSelectorProps {
  selectedClient: Client | null
  onSelectClient: (client: Client) => void
  onClientDeleted?: () => void
  currentUser: User | null
}

export function ClientSelector({ selectedClient, onSelectClient, onClientDeleted, currentUser }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newClientName, setNewClientName] = useState("")
  const [newClientDomain, setNewClientDomain] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [clientToRename, setClientToRename] = useState<Client | null>(null)
  const [renameClientName, setRenameClientName] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  const [clientToAssign, setClientToAssign] = useState<Client | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

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

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch (e) {
      console.error("Failed to fetch users", e)
    }
  }

  useEffect(() => {
    fetchClients()
    fetchUsers()
  }, [])

  const handleAddClient = async () => {
    if (!newClientName.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      // Auto-assign to current user
      const newClient = await api.createClient(newClientName, newClientDomain.trim() || undefined, currentUser?.id)
      setClients([...clients, newClient])
      onSelectClient(newClient)
      setNewClientName("")
      setNewClientDomain("")
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

  const handleRenameClient = async () => {
    if (!clientToRename || !renameClientName.trim()) return

    setIsRenaming(true)
    setError(null)
    try {
      const updatedClient = await api.renameClient(clientToRename.id, renameClientName.trim())
      // Update clients list
      const updatedClients = clients.map((c) => (c.id === updatedClient.id ? updatedClient : c))
      setClients(updatedClients)

      // If the renamed client was selected, update selection
      if (selectedClient?.id === updatedClient.id) {
        onSelectClient(updatedClient)
      }

      setClientToRename(null)
      setRenameClientName("")
    } catch (e) {
      console.error("Failed to rename client", e)
      setError(e instanceof Error ? e.message : "Failed to rename client. Check backend connection.")
    } finally {
      setIsRenaming(false)
    }
  }

  const handleAssignClient = async (userId: number | null) => {
    if (!clientToAssign) return

    setIsAssigning(true)
    setError(null)
    try {
      const updatedClient = await api.assignClient(clientToAssign.id, userId)
      // Update clients list
      const updatedClients = clients.map((c) => (c.id === updatedClient.id ? updatedClient : c))
      setClients(updatedClients)

      // If the assigned client was selected, update selection
      if (selectedClient?.id === updatedClient.id) {
        onSelectClient(updatedClient)
      }

      setClientToAssign(null)
    } catch (e) {
      console.error("Failed to assign client", e)
      setError(e instanceof Error ? e.message : "Failed to assign client.")
    } finally {
      setIsAssigning(false)
    }
  }

  // Sort clients: user's own clients first, then others
  const sortedClients = [...clients].sort((a, b) => {
    const aIsOwn = a.owner_id === currentUser?.id
    const bIsOwn = b.owner_id === currentUser?.id
    if (aIsOwn && !bIsOwn) return -1
    if (!aIsOwn && bIsOwn) return 1
    return a.name.localeCompare(b.name)
  })

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
            <span className="flex items-center gap-2">
              {selectedClient ? (
                <>
                  {selectedClient.name}
                  {selectedClient.owner_id !== currentUser?.id && selectedClient.owner_username && (
                    <span className="text-xs text-muted-foreground">({selectedClient.owner_username})</span>
                  )}
                </>
              ) : (
                "Select a client..."
              )}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[280px]">
          {sortedClients.map((client) => {
            const isOwn = client.owner_id === currentUser?.id
            const canModify = canModifyClient(currentUser, client.owner_id ?? null)
            
            return (
              <DropdownMenuItem
                key={client.id}
                onSelect={() => onSelectClient(client)}
                className="flex items-center justify-between group"
              >
                <span className="flex items-center gap-2 flex-1">
                  <span className={isOwn ? "font-medium" : ""}>{client.name}</span>
                  {client.owner_username && !isOwn && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {client.owner_username}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Assign button - visible if user can assign */}
                  {canAssignClient(currentUser, client.owner_id ?? null) && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setClientToAssign(client)
                      }}
                      className="p-1 hover:bg-muted rounded text-foreground transition-colors"
                      title="Assign client"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* Rename button - only if can modify */}
                  {canModify && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setClientToRename(client)
                        setRenameClientName(client.name)
                      }}
                      className="p-1 hover:bg-muted rounded text-foreground transition-colors"
                      title="Rename client"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* Delete button - only if can modify */}
                  {canModify && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setClientToDelete(client)
                      }}
                      className="p-1 hover:bg-destructive/10 rounded text-destructive transition-colors"
                      title="Delete client"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          setNewClientName("")
          setNewClientDomain("")
        }
      }}>
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
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Name *</label>
              <Input 
                placeholder="e.g. Acme Corp" 
                value={newClientName} 
                onChange={(e) => setNewClientName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain (optional)</label>
              <Input 
                placeholder="e.g. acme.com" 
                value={newClientDomain} 
                onChange={(e) => setNewClientDomain(e.target.value)} 
              />
              <p className="text-xs text-muted-foreground">
                This will be saved to the Discovery Document
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              This client will be assigned to you ({currentUser?.username})
            </p>
            <div className="flex justify-end">
              <Button onClick={handleAddClient} disabled={isLoading || !newClientName.trim()}>
                {isLoading ? "Adding..." : "Add Client"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={clientToRename !== null} onOpenChange={(open) => !open && setClientToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Client</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Client Name"
              value={renameClientName}
              onChange={(e) => setRenameClientName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameClientName.trim()) {
                  handleRenameClient()
                }
              }}
            />
            <Button onClick={handleRenameClient} disabled={isRenaming || !renameClientName.trim()}>
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={clientToAssign !== null} onOpenChange={(open) => !open && setClientToAssign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Client</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Assign "{clientToAssign?.name}" to:
            </p>
            <div className="space-y-2">
              {users.map((user) => (
                <Button
                  key={user.id}
                  variant={clientToAssign?.owner_id === user.id ? "secondary" : "outline"}
                  className="w-full justify-start"
                  disabled={isAssigning}
                  onClick={() => handleAssignClient(user.id)}
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  {user.username}
                  {user.is_admin && <span className="ml-2 text-xs text-amber-500">(admin)</span>}
                  {clientToAssign?.owner_id === user.id && <span className="ml-auto text-xs">Current</span>}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                disabled={isAssigning}
                onClick={() => handleAssignClient(null)}
              >
                Unassign (no owner)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
