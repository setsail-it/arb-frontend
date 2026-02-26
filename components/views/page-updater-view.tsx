"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Client, ChatMessage } from "@/types"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { RefreshCw, Bot, User, Wrench, Send } from "lucide-react"

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
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasAutoStartedChatRef = useRef(false)

  const fetchSites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getWebflowSites()
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
  const chatUnlocked = Boolean(client?.id && effectiveSiteId && pages.length > 0)

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
      const data = await api.getWebflowPages(effectiveSiteId)
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // When chat unlocks and is empty, send an initial message so the agent asks the scope question (client_id/site_id are in the backend developer prompt).
  const prevClientSiteRef = useRef<string>("")
  useEffect(() => {
    const key = `${client?.id ?? ""}:${effectiveSiteId ?? ""}`
    if (prevClientSiteRef.current !== key) {
      prevClientSiteRef.current = key
      hasAutoStartedChatRef.current = false
    }
    if (!chatUnlocked || chatMessages.length > 0 || chatLoading || hasAutoStartedChatRef.current) return
    hasAutoStartedChatRef.current = true
    handleChatSend("Start.")
  }, [chatUnlocked, chatMessages.length, chatLoading, client?.id, effectiveSiteId])

  const handleChatSend = async (initialMessage?: string) => {
    const text = (initialMessage ?? chatInput).trim()
    if (!text || chatLoading || !client?.id || !effectiveSiteId) return
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    }
    const history = chatMessages.map((m) => ({ role: m.role, content: m.content }))
    setChatMessages((prev) => [...prev, userMessage])
    if (!initialMessage) setChatInput("")
    setChatLoading(true)
    const assistantId = `assistant-${Date.now()}`
    setChatMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", reasoning: "", timestamp: new Date().toISOString(), toolCalls: [] },
    ])
    let currentReasoning = ""
    let currentContent = ""
    const toolCalls: { name: string; arguments: Record<string, unknown> }[] = []
    try {
      for await (const event of api.streamWebflowChatMessage(
        client.id,
        effectiveSiteId,
        userMessage.content,
        history
      )) {
        if (event.type === "reasoning") {
          currentReasoning += event.content ?? ""
          setChatMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, reasoning: currentReasoning } : msg))
          )
        } else if (event.type === "text") {
          currentContent += event.content ?? ""
          setChatMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, content: currentContent } : msg))
          )
        } else if (event.type === "tool_call") {
          toolCalls.push({ name: event.name ?? "", arguments: event.arguments ?? {} })
          setChatMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, toolCalls: [...toolCalls] } : msg))
          )
        } else if (event.type === "done") {
          const finalToolCalls = (event.tool_calls ?? toolCalls).map((tc) => ({
            name: tc.name,
            arguments: tc.arguments ?? {},
          }))
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: currentContent, reasoning: currentReasoning, toolCalls: finalToolCalls }
                : msg
            )
          )
        } else if (event.type === "error") {
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: `Error: ${event.message ?? "Unknown error"}` } : msg
            )
          )
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Request failed"
      setChatMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: `Error: ${errMsg}` } : m))
      )
    } finally {
      setChatLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!effectiveSiteId) return
    setPublishLoading(true)
    setPublishError(null)
    try {
      await api.publishWebflowSite(effectiveSiteId, {
        customDomains: selectedSite?.customDomains ?? [],
        publishToWebflowSubdomain: true,
      })
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Publish failed")
    } finally {
      setPublishLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Keyword Enhanced Sitemap at top */}
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

      {/* SEO-updater chatbot: unlocked after Get all pages */}
      <Card>
        <CardHeader>
          <CardTitle>SEO-updater Chat</CardTitle>
          <CardDescription>
            {chatUnlocked
              ? "Update page metadata (SEO title, meta description, OpenGraph) using the keyword sitemap. Ask one page or all pages."
              : "Confirm the site and click “Get all pages” to unlock the chat."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          <div className="min-h-[280px] max-h-[420px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/50 p-3 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-sm">
                <Bot className="h-8 w-8 mb-2 opacity-60" />
                <p>No messages yet.</p>
                <p className="mt-1 text-xs">e.g. “Update all pages with a kw_sitemap entry”</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === "user" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-slate-600/50 flex items-center gap-1.5 text-xs text-amber-400">
                        <Wrench className="h-3 w-3" />
                        {msg.toolCalls.map((tc, i) => (
                          <span key={i} className="font-mono">
                            {tc.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" && msg.reasoning && (
                      <div className="mb-2 pb-2 border-b border-slate-600/30">
                        <p className="text-xs text-slate-400 italic whitespace-pre-wrap">{msg.reasoning}</p>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content || (chatLoading && msg.role === "assistant" ? "…" : "")}</p>
                    {msg.role === "assistant" && !msg.content && !msg.reasoning && chatLoading && (
                      <div className="flex items-center gap-2 mt-1">
                        <Spinner className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs text-slate-400">Thinking…</span>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2 mt-3">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleChatSend()
                }
              }}
              placeholder={chatUnlocked ? "Ask to update one page or all pages…" : "Unlock chat by loading pages."}
              disabled={!chatUnlocked || chatLoading}
              className="flex-1 min-h-[44px] max-h-[100px] resize-none bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 text-sm rounded-xl"
            />
            <Button
              onClick={handleChatSend}
              disabled={!chatUnlocked || !chatInput.trim() || chatLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white h-[44px] w-[44px] p-0 rounded-xl"
            >
              {chatLoading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Publish button at bottom of page */}
      {siteConfirmed && (
        <div className="pt-4 border-t border-border">
          {publishError && (
            <p className="text-sm text-destructive mb-2">{publishError}</p>
          )}
          <Button
            variant="destructive"
            disabled={publishLoading}
            onClick={handlePublish}
          >
            {publishLoading ? "Publishing…" : "Publish changes"}
          </Button>
        </div>
      )}
    </div>
  )
}
