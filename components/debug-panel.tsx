"use client"

import { useEffect, useState } from "react"
import type { Client, BlogIdea, BlogIdeaDebug } from "@/types"
import { api } from "@/lib/api"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText } from "lucide-react"

interface Props {
  client: Client
  idea: BlogIdea | null
  onClose: () => void
}

export function DebugPanel({ client, idea, onClose }: Props) {
  const [details, setDetails] = useState<BlogIdeaDebug | null>(null)
  const [loading, setLoading] = useState(false)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [loadingHtml, setLoadingHtml] = useState(false)

  useEffect(() => {
    if (idea && client) {
      setLoading(true)
      setHtmlContent(null) // Reset HTML content when idea changes
      api
        .getBlogIdeaDebug(client.id, String(idea.id))
        .then(setDetails)
        .catch(console.error)
        .finally(() => setLoading(false))
      
      // Auto-load HTML for completed projects
      if (idea.state === "complete") {
        setLoadingHtml(true)
        api
          .getBlogIdeaHtml(client.id, idea.id)
          .then((result) => setHtmlContent(result.html))
          .catch((e) => {
            console.error("Failed to load HTML", e)
            setHtmlContent(null)
          })
          .finally(() => setLoadingHtml(false))
      }
    } else {
      setDetails(null)
      setHtmlContent(null)
    }
  }, [client, idea])

  return (
    <Sheet open={!!idea} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-auto">
        <SheetHeader>
          <SheetTitle>Debug: {idea?.topic}</SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="p-8 flex justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {!loading && details && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">ID:</span> {details.id}
              </div>
              <div>
                <span className="font-semibold">State:</span> {details.state}
              </div>
              <div>
                <span className="font-semibold">Created:</span> {details.created_at}
              </div>
              <div>
                <span className="font-semibold">Updated:</span> {details.updated_at}
              </div>
              {details.error_message && (
                <div className="col-span-2 text-red-500">
                  <span className="font-semibold">Error:</span> {details.error_message}
                </div>
              )}
            </div>

            {/* Keywords Section */}
            {details.brief && (
              <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded border border-purple-200 dark:border-purple-900">
                <h3 className="font-bold text-purple-800 dark:text-purple-400 mb-3">Keywords</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">Primary Keyword</span>
                    <div className="mt-1 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 rounded text-sm font-medium">
                      {details.brief.primary_keyword || "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400">Secondary Keywords</span>
                    <div className="mt-1 space-y-1">
                      {details.brief.secondary_keywords && details.brief.secondary_keywords.length > 0 ? (
                        details.brief.secondary_keywords.map((kw: string, i: number) => (
                          <div key={i} className="px-3 py-1.5 bg-purple-100/50 dark:bg-purple-900/20 rounded text-sm">
                            {kw}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground italic">No secondary keywords</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {details.final_post && (
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded border border-green-200 dark:border-green-900">
                <h3 className="font-bold text-green-800 dark:text-green-400 mb-2">Final Post Generated</h3>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-semibold">Title:</span> {details.final_post.title}
                  </div>
                  <div>
                    <span className="font-semibold">Slug:</span> {details.final_post.slug}
                  </div>
                  <div>
                    <span className="font-semibold">SEO Score:</span> {details.final_post.seo_score}
                  </div>
                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(api.getXmlUrl(details.id), "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" /> Open XML
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* HTML Content Section - Show for completed items */}
            {idea && idea.state === "complete" && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded border border-blue-200 dark:border-blue-900">
                <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-2">Source HTML</h3>
                <div className="text-sm space-y-2">
                  {htmlContent ? (
                    <div className="space-y-2">
                      <div className="border rounded bg-white dark:bg-slate-900 p-2 max-h-[400px] overflow-auto">
                        <iframe
                          srcDoc={htmlContent}
                          className="w-full h-full min-h-[300px] border-0"
                          title="Blog Post HTML Preview"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase">Raw HTML Source</label>
                        <textarea
                          className="w-full h-60 font-mono text-xs p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
                          readOnly
                          value={htmlContent}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const blob = new Blob([htmlContent], { type: "text/html" })
                          const url = URL.createObjectURL(blob)
                          window.open(url, "_blank")
                        }}
                      >
                        <FileText className="w-3 h-3 mr-2" /> Open HTML in New Tab
                      </Button>
                    </div>
                  ) : (
                    <div>
                      {loadingHtml ? (
                        <div className="flex items-center gap-2">
                          <Spinner className="h-4 w-4" />
                          <span>Loading HTML...</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={async () => {
                            if (!idea) return
                            setLoadingHtml(true)
                            try {
                              const result = await api.getBlogIdeaHtml(client.id, idea.id)
                              setHtmlContent(result.html)
                            } catch (e) {
                              console.error("Failed to load HTML", e)
                              setHtmlContent("<p>Failed to load HTML content</p>")
                            } finally {
                              setLoadingHtml(false)
                            }
                          }}
                        >
                          <FileText className="w-3 h-3 mr-2" /> Load HTML Content
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html">Draft HTML</TabsTrigger>
                <TabsTrigger value="brief">Brief</TabsTrigger>
                <TabsTrigger value="sq">SQ Report</TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="space-y-4">
                {details.draft_html ? (
                  <>
                    <div
                      className="p-4 border rounded bg-muted/10 text-sm font-serif prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: details.draft_html }}
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase">Raw HTML</label>
                      <textarea
                        className="w-full h-40 font-mono text-xs p-2 border rounded"
                        readOnly
                        value={details.draft_html}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground italic">No HTML generated yet.</div>
                )}
              </TabsContent>

              <TabsContent value="brief">
                <pre className="bg-slate-950 text-slate-50 p-4 rounded text-xs overflow-auto max-h-[500px]">
                  {JSON.stringify(details.brief, null, 2)}
                </pre>
              </TabsContent>

              <TabsContent value="sq">
                <pre className="bg-slate-950 text-slate-50 p-4 rounded text-xs overflow-auto max-h-[500px]">
                  {JSON.stringify(details.latest_sq_report, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
