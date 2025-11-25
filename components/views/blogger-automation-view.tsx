"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { Client, BlogIdea } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { DebugPanel } from "@/components/debug-panel"

interface Props {
  client: Client
}

export function BloggerAutomationView({ client }: Props) {
  const [ideas, setIdeas] = useState<BlogIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Debugging state
  const [selectedIdea, setSelectedIdea] = useState<BlogIdea | null>(null)

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

  const handleProcessQueued = async () => {
    setProcessing(true)
    try {
      await api.processQueued(client.id)
      refresh()
    } finally {
      setProcessing(false)
    }
  }

  const unqueued = ideas.filter((i) => i.state === "unqueued")
  const queued = ideas.filter((i) => i.state === "queued")
  const inProgress = ideas.filter((i) => i.state === "in_progress")
  const done = ideas.filter((i) => i.state === "complete" || i.state === "failed")

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
        {/* Column 1: Unqueued */}
        <KanbanColumn title={`Unqueued (${unqueued.length})`}>
          {unqueued.map((idea) => (
            <KanbanCard key={idea.id} idea={idea} onView={() => setSelectedIdea(idea)}>
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
            <KanbanCard key={idea.id} idea={idea} onView={() => setSelectedIdea(idea)} />
          ))}
        </KanbanColumn>

        {/* Column 4: Complete/Failed */}
        <KanbanColumn title={`Done (${done.length})`}>
          {done.map((idea) => (
            <KanbanCard key={idea.id} idea={idea} onView={() => setSelectedIdea(idea)} />
          ))}
        </KanbanColumn>
      </div>

      <DebugPanel client={client} idea={selectedIdea} onClose={() => setSelectedIdea(null)} />
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

function KanbanCard({ idea, children, onView }: { idea: BlogIdea; children?: React.ReactNode; onView: () => void }) {
  return (
    <div className="bg-background p-3 rounded border shadow-sm text-sm space-y-2">
      <div className="font-medium leading-tight">{idea.topic}</div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <Badge variant={idea.state === "failed" ? "destructive" : "outline"} className="text-[10px] h-5 px-1">
          {idea.state}
        </Badge>
        <button onClick={onView} className="hover:underline text-primary">
          View details
        </button>
      </div>
      {children}
    </div>
  )
}
