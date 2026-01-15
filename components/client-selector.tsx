"use client"

import { useState, useEffect } from "react"
import type { Client, User } from "@/types"
import { api } from "@/lib/api"
import { Plus, AlertCircle, Trash2, Pencil, UserPlus, User as UserIcon, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { canModifyClient, canAssignClient } from "@/lib/auth"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ClientSelectorProps {
  selectedClient: Client | null
  onSelectClient: (client: Client) => void
  onClientDeleted?: () => void
  currentUser: User | null
}

// Color palette for different users
const USER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  admin: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  user1: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  user2: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  user3: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  user4: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" },
  user5: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
  user6: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" },
  default: { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-400" },
}

function getUserColor(userId: number | null, userIndex: number): typeof USER_COLORS.default {
  if (userId === null) return USER_COLORS.admin // null = admin
  const colorKeys = Object.keys(USER_COLORS).filter(k => k.startsWith("user"))
  const key = colorKeys[userIndex % colorKeys.length] || "default"
  return USER_COLORS[key]
}

export function ClientSelector({ selectedClient, onSelectClient, onClientDeleted, currentUser }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newClientName, setNewClientName] = useState("")
  const [newClientDomain, setNewClientDomain] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [clientToRename, setClientToRename] = useState<Client | null>(null)
  const [renameClientName, setRenameClientName] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  const [clientToAssign, setClientToAssign] = useState<Client | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

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
      setIsAddDialogOpen(false)
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

  // Build user index map for consistent colors
  const userIndexMap = new Map<number | null, number>()
  users.forEach((user, idx) => {
    userIndexMap.set(user.id, idx)
  })
  userIndexMap.set(null, -1) // null = admin

  // Group and sort clients by owner
  const groupedClients = new Map<number | null, Client[]>()
  clients.forEach(client => {
    const ownerId = client.owner_id ?? null
    if (!groupedClients.has(ownerId)) {
      groupedClients.set(ownerId, [])
    }
    groupedClients.get(ownerId)!.push(client)
  })

  // Filter clients by search query
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.owner_username?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Sort: current user's clients first, then by owner name
  const sortedClients = [...filteredClients].sort((a, b) => {
    const aIsOwn = a.owner_id === currentUser?.id
    const bIsOwn = b.owner_id === currentUser?.id
    if (aIsOwn && !bIsOwn) return -1
    if (!aIsOwn && bIsOwn) return 1
    // Then by owner (null/admin first)
    if (a.owner_id === null && b.owner_id !== null) return -1
    if (a.owner_id !== null && b.owner_id === null) return 1
    return a.name.localeCompare(b.name)
  })

  const getOwnerName = (client: Client) => {
    if (client.owner_id === null) return "admin"
    return client.owner_username || "Unknown"
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
      
      {/* Main button to open selector */}
      <Button 
        variant="outline" 
        className="w-full justify-between bg-transparent"
        onClick={() => setIsDialogOpen(true)}
      >
        <span className="flex items-center gap-2">
          {selectedClient ? (
            <>
              {selectedClient.name}
              <span className="text-xs text-muted-foreground">
                ({selectedClient.owner_id === null ? "admin" : selectedClient.owner_username || "Unassigned"})
              </span>
            </>
          ) : (
            "Select a client..."
          )}
        </span>
      </Button>

      {/* Client Selector Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Select Client</span>
              <Button
                size="sm"
                onClick={() => {
                  setIsAddDialogOpen(true)
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground">Assignees:</span>
            <span className={`px-2 py-0.5 rounded ${USER_COLORS.admin.bg} ${USER_COLORS.admin.text}`}>
              admin (unassigned)
            </span>
            {users.map((user, idx) => {
              const color = getUserColor(user.id, idx)
              return (
                <span key={user.id} className={`px-2 py-0.5 rounded ${color.bg} ${color.text}`}>
                  {user.username}
                </span>
              )
            })}
          </div>

          {/* Client List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 pb-4">
              {sortedClients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchQuery ? "No clients match your search" : "No clients yet"}
                </p>
              ) : (
                sortedClients.map((client) => {
                  const isOwn = client.owner_id === currentUser?.id
                  const canModify = canModifyClient(currentUser, client.owner_id ?? null)
                  const userIdx = userIndexMap.get(client.owner_id ?? null) ?? 0
                  const color = client.owner_id === null 
                    ? USER_COLORS.admin 
                    : getUserColor(client.owner_id, userIdx)
                  const isSelected = selectedClient?.id === client.id

                  return (
                    <div
                      key={client.id}
                      onClick={() => {
                        onSelectClient(client)
                        setIsDialogOpen(false)
                      }}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border cursor-pointer
                        transition-all duration-150
                        ${color.bg} ${color.border}
                        ${isSelected ? "ring-2 ring-primary" : "hover:border-foreground/30"}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${color.text.replace("text-", "bg-")}`} />
                        <div>
                          <span className={`font-medium ${isOwn ? "text-foreground" : "text-foreground/80"}`}>
                            {client.name}
                          </span>
                          <span className={`ml-2 text-xs ${color.text}`}>
                            {getOwnerName(client)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* Assign button */}
                        {canAssignClient(currentUser, client.owner_id ?? null) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setClientToAssign(client)
                            }}
                            className="p-1.5 hover:bg-foreground/10 rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Assign client"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                        {/* Rename button */}
                        {canModify && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setClientToRename(client)
                              setRenameClientName(client.name)
                            }}
                            className="p-1.5 hover:bg-foreground/10 rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Rename client"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {/* Delete button */}
                        {canModify && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setClientToDelete(client)
                            }}
                            className="p-1.5 hover:bg-destructive/20 rounded text-destructive/70 hover:text-destructive transition-colors"
                            title="Delete client"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        if (!open) {
          setNewClientName("")
          setNewClientDomain("")
        }
      }}>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newClientName.trim()) {
                    handleAddClient()
                  }
                }}
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
              {/* Admin option (null) */}
              <Button
                variant={clientToAssign?.owner_id === null ? "secondary" : "outline"}
                className="w-full justify-start"
                disabled={isAssigning}
                onClick={() => handleAssignClient(null)}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                admin (unassigned)
                <span className="ml-2 text-xs text-amber-500">(admin)</span>
                {clientToAssign?.owner_id === null && <span className="ml-auto text-xs">Current</span>}
              </Button>
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
