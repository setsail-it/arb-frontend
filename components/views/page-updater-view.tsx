"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { RefreshCw } from "lucide-react"

export type WebflowSite = {
  name: string
  id: string
  shortName: string
  webflowUrl: string
  customDomains: string[]
}

export function PageUpdaterView() {
  const [sites, setSites] = useState<WebflowSite[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/webflow/sites")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load sites")
      }
      const list = data.sites ?? []
      setSites(list)
      setSelectedSiteId((prev) => (list.some((s: WebflowSite) => s.id === prev) ? prev : list[0]?.id ?? ""))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Webflow sites")
      setSites([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSites()
  }, [fetchSites])

  const selectedSite = sites.find((s) => s.id === selectedSiteId)

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Page Updater</CardTitle>
          <CardDescription>
            Select a Webflow site and update its pages automatically using the KW-sitemap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Webflow site</label>
            {loading ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Loading sites…</span>
              </div>
            ) : error ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
                <Button variant="outline" size="sm" className="mt-2" onClick={fetchSites}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            ) : sites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sites found.</p>
            ) : (
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a site…</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} — {site.webflowUrl} (ID: {site.id})
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button
            disabled={!selectedSite}
            onClick={() => {
              // TODO: wire to KW-sitemap update action
            }}
          >
            Update pages automatically with KW-sitemap
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
