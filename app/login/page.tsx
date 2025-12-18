"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Lock, AlertCircle } from "lucide-react"

function LoginForm() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expired, setExpired] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/"
  
  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setExpired(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      
      if (res.ok) {
        // Redirect to the original page
        router.push(redirect)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || "Invalid password")
      }
    } catch (e) {
      setError("Failed to authenticate. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-slate-700 bg-slate-900/50 backdrop-blur">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <CardTitle className="text-2xl text-slate-100">Setsail AI Panel</CardTitle>
        <CardDescription className="text-slate-400">
          Enter the password to access the control panel
        </CardDescription>
      </CardHeader>
      <CardContent>
        {expired && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-200">
              Your session has expired. Please log in again.
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
              autoFocus
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading || !password}
          >
            {loading && <Spinner className="mr-2 h-4 w-4" />}
            {loading ? "Authenticating..." : "Access Control Panel"}
          </Button>
        </form>
        
        <p className="mt-4 text-xs text-center text-slate-500">
          Session expires after 1 hour of inactivity
        </p>
      </CardContent>
    </Card>
  )
}

function LoginFormFallback() {
  return (
    <Card className="w-full max-w-md border-slate-700 bg-slate-900/50 backdrop-blur">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <CardTitle className="text-2xl text-slate-100">Setsail AI Panel</CardTitle>
        <CardDescription className="text-slate-400">
          Enter the password to access the control panel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center py-8">
          <Spinner className="h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
