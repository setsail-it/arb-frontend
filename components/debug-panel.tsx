"use client"

import { useEffect, useState } from "react"
import type { Client, BlogIdea, BlogIdeaDebug } from "@/types"
import { api } from "@/lib/api"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

interface Props {
  client: Client
  idea: BlogIdea | null
  onClose: () => void
}

export function DebugPanel({ client, idea, onClose }: Props) {
  const [details, setDetails] = useState<BlogIdeaDebug | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (idea && client) {
      setLoading(true)
      api
        .getBlogIdeaDebug(client.id, String(idea.id))
        .then(setDetails)
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setDetails(null)
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
