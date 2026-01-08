/**
 * Authentication utilities for the frontend.
 */

export interface User {
  id: number
  username: string
  is_admin: boolean
}

export interface AuthSession {
  authenticated: boolean
  timestamp: number
  user: User
  token: string
}

/**
 * Check if the current user can perform write operations on a client.
 * 
 * Rules:
 * - Admin can do anything
 * - Owner can modify their own clients
 * - Non-owners can only view (read-only)
 */
export function canModifyClient(user: User | null, clientOwnerId: number | null): boolean {
  if (!user) return false
  if (user.is_admin) return true
  if (clientOwnerId === null) return true // Unassigned clients can be modified by anyone
  return user.id === clientOwnerId
}

/**
 * Check if the current user can assign a client to another user.
 * 
 * Rules:
 * - Admin can assign any client to anyone
 * - Non-admin can only assign their own clients to others
 */
export function canAssignClient(user: User | null, clientOwnerId: number | null): boolean {
  if (!user) return false
  if (user.is_admin) return true
  // Non-admin can assign their own clients
  return clientOwnerId === user.id
}

/**
 * Check if the current user can create new clients.
 * All authenticated users can create clients.
 */
export function canCreateClient(user: User | null): boolean {
  return user !== null
}

