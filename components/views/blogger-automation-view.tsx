"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { flushSync } from "react-dom"
import type { Client, BlogIdea } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
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
import { DebugPanel } from "@/components/debug-panel"
import { Trash2 } from "lucide-react"

interface Props {
  client: Client
}

export function BloggerAutomationView({ client }: Props) {
  const [ideas, setIdeas] = useState<BlogIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Debugging state
  const [selectedIdea, setSelectedIdea] = useState<BlogIdea | null>(null)

  // Process streaming state
  const [streamingIdea, setStreamingIdea] = useState<BlogIdea | null>(null)
  const [streamProgress, setStreamProgress] = useState<Array<{ message: string; step: number }>>([])
  const [streamAbortController, setStreamAbortController] = useState<AbortController | null>(null)
  // Track pipelines running in background (without stream view open)
  const [backgroundPipelines, setBackgroundPipelines] = useState<Set<number>>(new Set())

  // HTML viewer state
  const [htmlViewerIdea, setHtmlViewerIdea] = useState<BlogIdea | null>(null)
  const [htmlContent, setHtmlContent] = useState<string>("")
  const [loadingHtml, setLoadingHtml] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await api.getBlogIdeas(client.id)
      setIdeas(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // Optional: Poll every 10 seconds
    const interval = setInterval(() => {
      api.getBlogIdeas(client.id).then(setIdeas).catch(console.error)
    }, 10000)
    return () => clearInterval(interval)
  }, [client.id])

  const handleQueue = async (id: number) => {
    await api.queueBlogIdea(client.id, String(id))
    refresh()
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const ideasData = await api.generateBlogIdeas(client.id)
      setIdeas(ideasData || [])
    } catch (e) {
      console.error("Failed to generate blog ideas", e)
    } finally {
      setGenerating(false)
    }
  }

  const handleTopicUpdate = async (ideaId: number, newTopic: string) => {
    try {
      await api.updateBlogIdeaTopic(client.id, String(ideaId), newTopic)
      // Optimistic update
      setIdeas((prev) => prev.map((i) => (i.id === ideaId ? { ...i, topic: newTopic } : i)))
    } catch (e) {
      console.error("Failed to update topic", e)
      await refresh()
    }
  }

  const handleDeleteIdea = async (ideaId: number) => {
    try {
      await api.deleteBlogIdea(client.id, ideaId)
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId))
    } catch (e) {
      console.error("Failed to delete blog idea", e)
      await refresh()
    }
  }

  const startPipelineInBackground = (idea: BlogIdea) => {
    // Start pipeline processing in background without opening stream view
    // This allows pipelines to run while user can still click "View process" to monitor
    setBackgroundPipelines((prev) => new Set(prev).add(idea.id))
    const abortController = new AbortController()
    
    api.getBlogIdeaProcessStream(
      client.id,
      idea.id,
      () => {
        // Progress callback - silently update, don't show in UI
        // The polling refresh will show updates
      },
      (data) => {
        // Pipeline completed successfully - refresh to move to "Done"
        setBackgroundPipelines((prev) => {
          const next = new Set(prev)
          next.delete(idea.id)
          return next
        })
        refresh()
      },
      (data) => {
        // Pipeline failed - refresh to show failed state
        setBackgroundPipelines((prev) => {
          const next = new Set(prev)
          next.delete(idea.id)
          return next
        })
        refresh()
      },
      abortController.signal,
    ).catch((error) => {
      // If stream connection fails (e.g., pipeline already running), remove from background set
      setBackgroundPipelines((prev) => {
        const next = new Set(prev)
        next.delete(idea.id)
        return next
      })
    })
  }

  const handleProcessQueued = async () => {
    setProcessing(true)
    try {
      // Process all queued items and get their blog_idea_ids
      const results = await api.processQueued(client.id)
      
      // Refresh to see all items move to "In Progress"
      const refreshedIdeas = await api.getBlogIdeas(client.id)
      setIdeas(refreshedIdeas || [])
      
      // Start all pipelines in the background automatically
      results.forEach((result) => {
        const processedIdea = refreshedIdeas?.find((i) => i.id === result.blog_idea_id)
        if (processedIdea) {
          startPipelineInBackground(processedIdea)
        }
      })
      
      // If only one item was processed, also open its stream view for monitoring
      if (results.length === 1) {
        const processedIdea = refreshedIdeas?.find((i) => i.id === results[0].blog_idea_id)
        if (processedIdea) {
          handleViewProcess(processedIdea)
        }
      }
    } catch (error) {
      console.error("Failed to process queued items:", error)
      await refresh()
    } finally {
      setProcessing(false)
    }
  }

  const handleViewProcess = (idea: BlogIdea) => {
    // If pipeline is already running in background, we can't connect another stream
    // The backend prevents multiple connections. The pipeline will continue in background.
    // We'll try to connect anyway - if it fails, the catch block will handle it gracefully.
    if (backgroundPipelines.has(idea.id)) {
      // Pipeline is already running in background - backend will reject the connection
      // Just return silently - the pipeline will continue processing in background
      return
    }

    setStreamingIdea(idea)
    setStreamProgress([])

    // Create abort controller for this stream
    const abortController = new AbortController()
    setStreamAbortController(abortController)

    // Start streaming
    api.getBlogIdeaProcessStream(
      client.id,
      idea.id,
      (message, step) => {
        // Use flushSync to ensure immediate UI updates
        flushSync(() => {
          setStreamProgress((prev) => [...prev, { message, step }])
        })
      },
      (data) => {
        // Pipeline completed successfully
        setStreamingIdea(null)
        setStreamProgress([])
        setStreamAbortController(null)
        setBackgroundPipelines((prev) => {
          const next = new Set(prev)
          next.delete(idea.id)
          return next
        })
        // Refresh to move item to "Done"
        refresh()
      },
      (data) => {
        // Pipeline failed - but don't show popup for 409 errors (pipeline already running)
        if (data.message?.includes("409")) {
          // Silently close the dialog for 409 errors
          setStreamingIdea(null)
          setStreamProgress([])
          setStreamAbortController(null)
          refresh()
          return
        }
        // For other errors, show them briefly then close
        setStreamProgress((prev) => [
          ...prev,
          { message: `Error: ${data.message}`, step: prev.length + 1 },
        ])
        // Refresh to show failed state
        setTimeout(() => {
          setStreamingIdea(null)
          setStreamProgress([])
          setStreamAbortController(null)
          setBackgroundPipelines((prev) => {
            const next = new Set(prev)
            next.delete(idea.id)
            return next
          })
          refresh()
        }, 2000)
      },
      abortController.signal,
    ).catch((error) => {
      // Handle case where pipeline might already be running - silently close for 409 errors
      if (error.message?.includes("409")) {
        console.log("Pipeline already running (409), closing dialog silently")
      } else {
        console.error("Failed to start stream:", error)
      }
      setStreamingIdea(null)
      setStreamProgress([])
      setStreamAbortController(null)
    })
  }

  const handleCloseStream = () => {
    if (streamAbortController) {
      streamAbortController.abort()
      setStreamAbortController(null)
    }
    setStreamingIdea(null)
    setStreamProgress([])
  }

  const handleAbortPipeline = async (idea: BlogIdea) => {
    // Optimistically update UI: immediately move card to "Done (Failed)"
    setIdeas((prevIdeas) =>
      prevIdeas.map((i) =>
        i.id === idea.id ? { ...i, state: "failed" as const, error_message: "Pipeline aborted by user" } : i
      )
    )
    
    // Close the stream view
    handleCloseStream()
    
    // Make API call in background
    try {
      await api.abortBlogIdeaProcessing(client.id, idea.id)
      // Refresh to sync with backend
      await refresh()
    } catch (e) {
      console.error("Failed to abort pipeline", e)
      // Keep optimistic update - backend will mark it as failed anyway
      // Still refresh to sync state
      await refresh()
    }
  }

  const handleResetBlogIdea = async (idea: BlogIdea) => {
    if (!confirm(`Are you sure you want to reset "${idea.topic}"? This will delete all HTML artifacts and reset the blog idea to unqueued state.`)) {
      return
    }
    try {
      const result = await api.resetBlogIdea(client.id, idea.id)
      alert(result.message)
      // Refresh to update state
      await refresh()
    } catch (e: any) {
      console.error("Failed to reset blog idea", e)
      alert(e.message || "Failed to reset blog idea. It may be currently processing.")
    }
  }

  const handleViewPost = async (idea: BlogIdea) => {
    setHtmlViewerIdea(idea)
    setLoadingHtml(true)
    setHtmlContent("")
    try {
      const result = await api.getBlogIdeaHtml(client.id, idea.id)
      setHtmlContent(result.html)
    } catch (e) {
      console.error("Failed to load HTML", e)
      setHtmlContent("<p>Failed to load HTML content</p>")
    } finally {
      setLoadingHtml(false)
    }
  }

  const handleDownloadRtf = (idea: BlogIdea) => {
    api.downloadRtf(client.id, idea.id)
  }

  const handleViewMonitor = async (idea: BlogIdea) => {
    try {
      const result = await api.getAbsPipelineMonitorUrl(client.id, idea.id)
      // Open the GUI viewer URL in a new window/tab (relative path, so same origin)
      window.open(result.gui_url, "_blank")
    } catch (e) {
      console.error("Failed to get monitor URL", e)
      alert("Failed to open pipeline monitor")
    }
  }

  const unqueued = ideas.filter((i) => i.state === "unqueued")
  const queued = ideas.filter((i) => i.state === "queued")
  const inProgress = ideas.filter((i) => i.state === "in_progress")
  const done = ideas.filter((i) => i.state === "complete" || i.state === "failed")

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
        {/* Column 1: Blog Ideas */}
        <KanbanColumn
          title={`Blog Ideas (${unqueued.length})`}
          action={
            <Button
              size="sm"
              className="w-full mb-2"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating && <Spinner className="mr-2" />}
              Generate
            </Button>
          }
        >
          {unqueued.map((idea) => (
            <KanbanCard
              key={idea.id}
              idea={idea}
              onView={() => setSelectedIdea(idea)}
              onUpdateTopic={(topic) => handleTopicUpdate(idea.id, topic)}
              onDelete={() => handleDeleteIdea(idea.id)}
              isEditable={true}
            >
              <Button
                size="sm"
                variant="secondary"
                className="w-full mt-2 h-7 text-xs"
                onClick={() => handleQueue(idea.id)}
              >
                Queue
              </Button>
            </KanbanCard>
          ))}
        </KanbanColumn>

        {/* Column 2: Queued */}
        <KanbanColumn
          title={`Queued (${queued.length})`}
          action={
            <Button
              size="sm"
              className="w-full mb-2"
              onClick={handleProcessQueued}
              disabled={processing || queued.length === 0}
            >
              {processing && <Spinner className="mr-2" />}
              Process Queued
            </Button>
          }
        >
          {queued.map((idea) => (
            <KanbanCard key={idea.id} idea={idea} onView={() => setSelectedIdea(idea)} />
          ))}
        </KanbanColumn>

        {/* Column 3: In Progress */}
        <KanbanColumn title={`In Progress (${inProgress.length})`}>
          {inProgress.map((idea) => (
            <KanbanCard
              key={idea.id}
              idea={idea}
              onView={() => setSelectedIdea(idea)}
              onViewProcess={() => handleViewProcess(idea)}
              onViewMonitor={() => handleViewMonitor(idea)}
              onAbort={() => handleAbortPipeline(idea)}
              isInProgress={true}
            />
          ))}
        </KanbanColumn>

        {/* Column 4: Complete/Failed */}
        <KanbanColumn title={`Done (${done.length})`}>
          {done.map((idea) => (
            <KanbanCard
              key={idea.id}
              idea={idea}
              onView={() => setSelectedIdea(idea)}
              onViewPost={() => handleViewPost(idea)}
              onDownloadRtf={() => handleDownloadRtf(idea)}
              onReset={() => handleResetBlogIdea(idea)}
            />
          ))}
        </KanbanColumn>
      </div>

      <DebugPanel client={client} idea={selectedIdea} onClose={() => setSelectedIdea(null)} />

      {/* Process Stream Dialog */}
      <Dialog open={streamingIdea !== null} onOpenChange={(open) => !open && handleCloseStream()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Processing: {streamingIdea?.topic}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-2 p-4 bg-muted/30 rounded-md">
            {streamProgress.length === 0 ? (
              <div className="text-sm text-muted-foreground">Waiting for progress updates...</div>
            ) : (
              streamProgress.map((progress, idx) => (
                <div key={idx} className="text-sm font-mono">
                  <span className="text-muted-foreground">[{progress.step}]</span> {progress.message}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* HTML Viewer Dialog */}
      <Dialog open={htmlViewerIdea !== null} onOpenChange={(open) => !open && setHtmlViewerIdea(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>View Post: {htmlViewerIdea?.topic}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-md">
            {loadingHtml ? (
              <div className="flex items-center justify-center p-8">
                <Spinner className="mr-2" />
                Loading HTML...
              </div>
            ) : (
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full min-h-[600px] border-0"
                title="Blog Post HTML"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KanbanColumn({
  title,
  children,
  action,
}: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-muted/10 rounded-lg border flex flex-col h-full max-h-full">
      <div className="p-3 border-b bg-muted/20 font-semibold text-sm">{title}</div>
      <div className="p-2 overflow-auto flex-1 space-y-2">
        {action}
        {children}
      </div>
    </div>
  )
}

function KanbanCard({
  idea,
  children,
  onView,
  onViewProcess,
  onViewPost,
  onDownloadRtf,
  onViewMonitor,
  onAbort,
  onReset,
  onUpdateTopic,
  onDelete,
  isInProgress,
  isEditable,
}: {
  idea: BlogIdea
  children?: React.ReactNode
  onView: () => void
  onViewProcess?: () => void
  onViewPost?: () => void
  onDownloadRtf?: () => void
  onViewMonitor?: () => void
  onAbort?: () => void
  onReset?: () => void
  onUpdateTopic?: (topic: string) => void
  onDelete?: () => void
  isInProgress?: boolean
  isEditable?: boolean
}) {
  const [topic, setTopic] = useState(idea.topic)
  const [isDirty, setIsDirty] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleBlur = () => {
    if (isDirty && onUpdateTopic) {
      onUpdateTopic(topic)
      setIsDirty(false)
    }
  }

  const handleDeleteClick = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
      setShowDeleteDialog(false)
    } catch (e) {
      console.error("Failed to delete blog idea", e)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={`p-3 rounded border shadow-sm text-sm space-y-2 ${
        isInProgress ? "bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800" : "bg-background"
      }`}
    >
      {isEditable ? (
        <div className="flex gap-2 items-start">
          <Input
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value)
              setIsDirty(true)
            }}
            onBlur={handleBlur}
            className="h-8 text-sm font-medium flex-1"
          />
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition-colors shrink-0"
            title="Delete blog idea"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="font-medium leading-tight">{idea.topic}</div>
      )}
      <div className="text-xs text-muted-foreground">Blog Project ID: {idea.id}</div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <Badge variant={idea.state === "failed" ? "destructive" : "outline"} className="text-[10px] h-5 px-1">
          {idea.state}
        </Badge>
        <button onClick={onView} className="hover:underline text-primary">
          View details
        </button>
      </div>
      {isInProgress && onViewProcess && (
        <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={onViewProcess}>
          View process
        </Button>
      )}
      {isInProgress && onViewMonitor && (
        <Button size="sm" variant="default" className="w-full h-7 text-xs mt-1" onClick={onViewMonitor}>
          Open Monitor
        </Button>
      )}
      {isInProgress && onAbort && (
        <Button size="sm" variant="destructive" className="w-full h-7 text-xs mt-1" onClick={onAbort}>
          Abort
        </Button>
      )}
      {idea.state === "complete" && onViewPost && (
        <Button size="sm" variant="default" className="w-full h-7 text-xs" onClick={onViewPost}>
          View post
        </Button>
      )}
      {idea.state === "complete" && onDownloadRtf && (
        <Button size="sm" variant="outline" className="w-full h-7 text-xs mt-1" onClick={onDownloadRtf}>
          Download
        </Button>
      )}
      {onReset && (
        <Button size="sm" variant="outline" className="w-full h-7 text-xs mt-1" onClick={onReset}>
          Reset
        </Button>
      )}
      {children}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Idea</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{idea.topic}&quot;? This will permanently delete the blog idea and
              all associated artifacts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
