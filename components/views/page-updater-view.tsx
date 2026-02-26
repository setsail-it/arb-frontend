"use client"

import { useState, useEffect, useCallback } from "react"
import type { Client } from "@/types"
import { api } from "@/lib/api"
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

export type WebflowPageItem = {
  id: string
  title: string | null
  slug: string | null
  publishedPath: string | null
  collectionId: string | null
  type: string
}

export interface PageUpdaterViewProps {
  client: Client | null
  onClientUpdate?: (client: Client) => void
}

export function PageUpdaterView(props: PageUpdaterViewProps) {
  const { client, onClientUpdate } = props
  const [sites, setSites] = useState<WebflowSite[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kwSitemapJson, setKwSitemapJson] = useState<string | null>(null)
  const [kwSitemapLoading, setKwSitemapLoading] = useState(false)
  const [pages, setPages] = useState<WebflowPageItem[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [pagesError, setPagesError] = useState<string | null>(null)
  const [confirmingSite, setConfirmingSite] = useState(false)

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

  useEffect(() => {
    if (client?.site_id && sites.some((s) => s.id === client.site_id)) {
      setSelectedSiteId(client.site_id)
    }
  }, [client?.site_id, sites])

  useEffect(() => {
    if (!client?.id) {
      setKwSitemapJson(null)
      return
    }
    let cancelled = false
    setKwSitemapLoading(true)
    api.getContext(client.id).then((ctx) => {
      if (!cancelled && ctx?.keyword_enhanced_sitemap_json) {
        setKwSitemapJson(ctx.keyword_enhanced_sitemap_json)
      } else if (!cancelled) {
        setKwSitemapJson(null)
      }
    }).catch(() => {
      if (!cancelled) setKwSitemapJson(null)
    }).finally(() => {
      if (!cancelled) setKwSitemapLoading(false)
    })
    return () => { cancelled = true }
  }, [client?.id])

  const selectedSite = sites.find((s) => s.id === selectedSiteId)
  const siteConfirmed = Boolean(client?.site_id)
  const effectiveSiteId = client?.site_id ?? null

  const handleConfirmSite = async () => {
    if (!client || !selectedSiteId) return
    setConfirmingSite(true)
    try {
      const updated = await api.updateClientSiteId(client.id, selectedSiteId)
      onClientUpdate?.(updated)
    } finally {
      setConfirmingSite(false)
    }
  }

  const handleGetAllPages = async () => {
    if (!effectiveSiteId) return
    setPagesLoading(true)
    setPages([])
    setPagesError(null)
    try {
      const res = await fetch(`/api/webflow/sites/${effectiveSiteId}/pages`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch pages")
      const list = data.pages ?? []
      setPages(list)
      await api.saveWebflowPages(effectiveSiteId, list.map((p: WebflowPageItem) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        publishedPath: p.publishedPath,
        collectionId: p.collectionId,
        type: p.type,
      })))
    } catch (e) {
      setPagesError(e instanceof Error ? e.message : "Failed to load pages")
    } finally {
      setPagesLoading(false)
    }
  }

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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!client || !selectedSiteId || confirmingSite}
              onClick={handleConfirmSite}
            >
              {confirmingSite ? "Confirming…" : "Confirm site"}
            </Button>
            <Button
              disabled={!siteConfirmed || pagesLoading}
              onClick={handleGetAllPages}
            >
              {pagesLoading ? "Loading…" : "Get all pages"}
            </Button>
            <Button
              disabled={!selectedSite}
              onClick={() => {
                // TODO: wire to KW-sitemap update action
              }}
            >
              Update pages automatically with KW-sitemap
            </Button>
          </div>
          {siteConfirmed && (
            <div className="rounded-md border border-border bg-muted/20 p-2 text-sm text-muted-foreground">
              Confirmed site for this client: {effectiveSiteId}
            </div>
          )}
          {pagesError && (
            <p className="text-sm text-destructive">{pagesError}</p>
          )}
          {pages.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Pages ({pages.length})</label>
              <div className="max-h-[400px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-3">
                <ul className="space-y-2 text-sm text-slate-200">
                  {pages.map((p) => (
                    <li key={p.id} className="border-b border-slate-700/50 pb-2 last:border-0">
                      <span className="font-medium">{p.title ?? p.slug ?? p.id}</span>
                      {p.publishedPath && (
                        <span className="ml-2 text-slate-400">{p.publishedPath}</span>
                      )}
                      <span className="ml-2 text-slate-500">({p.type})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chatbot stub */}
      <Card>
        <CardHeader>
          <CardTitle>Chatbot</CardTitle>
          <CardDescription>Coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask something…"
              disabled
              className="flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
            />
            <Button disabled>Send</Button>
          </div>
        </CardContent>
      </Card>

      {/* Keyword Enhanced Sitemap (same as Client Context, dark code block for visibility) */}
      <Card>
        <CardHeader>
          <CardTitle>Keyword Enhanced Sitemap</CardTitle>
          <CardDescription>
            Raw KW sitemap for the selected client (same as in Client Context). Select a client in the sidebar to view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!client ? (
            <p className="text-sm text-muted-foreground">Select a client from the sidebar to view their keyword enhanced sitemap.</p>
          ) : kwSitemapLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Spinner className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Loading sitemap…</span>
            </div>
          ) : !kwSitemapJson || !kwSitemapJson.trim() ? (
            <p className="text-sm text-muted-foreground">No keyword enhanced sitemap for this client yet. Run Sitemap then Keyword Enhanced Sitemap in Client Context.</p>
          ) : (
            <div className="overflow-auto max-h-[70vh] rounded-xl border border-slate-700 bg-slate-900">
              <pre className="p-4 text-sm text-slate-200 whitespace-pre-wrap font-mono">{kwSitemapJson}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
