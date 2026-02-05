"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { User } from "@/lib/auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: ReactNode
}

// Pages that don't require authentication
const publicPaths = ["/login", "/public"]

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkSession()
  }, [pathname])

  const checkSession = async () => {
    // Skip auth check for public paths
    if (publicPaths.some(path => pathname?.startsWith(path))) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/session")
      const data = await res.json()

      if (data.authenticated && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
        // Redirect to login if not authenticated
        const redirect = encodeURIComponent(pathname || "/")
        const expiredParam = data.expired ? "&expired=true" : ""
        router.push(`/login?redirect=${redirect}${expiredParam}`)
      }
    } catch (e) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      setUser(null)
      router.push("/login")
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}












