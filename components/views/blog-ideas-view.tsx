"use client"

import { useState, useEffect } from "react"
import type { Client, BlogIdea } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

interface Props {
  client: Client
}

export function BlogIdeasView({ client }: Props) {
  const [existingTitles, setExistingTitles] = useState<string[]>([])
  const [blogIdeas, setBlogIdeas] = useState<BlogIdea[]>([])
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [generating, setGenerating] = useState(false)

  const refresh = async () => {
    setLoadingIdeas(true)
    try {
      const [contextData, ideasData] = await Promise.all([api.getContext(client.id), api.getBlogIdeas(client.id)])
      setExistingTitles(contextData.existing_blog_titles || [])
      setBlogIdeas(ideasData || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingIdeas(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [client.id])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const ideasData = await api.generateBlogIdeas(client.id)
      setBlogIdeas(ideasData || [])
    } catch (e) {
      console.error("Failed to generate blog ideas", e)
    } finally {
      setGenerating(false)
    }
  }

  const handleQueue = async (ideaId: number) => {
    await api.queueBlogIdea(client.id, String(ideaId))
    const ideasData = await api.getBlogIdeas(client.id)
    setBlogIdeas(ideasData || [])
  }

  const handleTopicUpdate = async (ideaId: number, newTopic: string) => {
    await api.updateBlogIdeaTopic(client.id, String(ideaId), newTopic)
    // Optimistic update locally if needed, or just refresh silently
  }

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Column: Existing Titles */}
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Existing Titles</span>
            <span className="text-sm font-normal text-muted-foreground">{existingTitles.length} titles</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <ul className="space-y-2 text-sm">
            {existingTitles.map((title, i) => (
              <li key={i} className="p-2 bg-muted/30 rounded border">
                {title}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Right Column: Future Ideas */}
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle>Future Ideas</CardTitle>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating && <Spinner className="mr-2" />}
            Generate Ideas
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <div className="border-t divide-y">
            {blogIdeas.map((idea) => (
              <BlogIdeaRow
                key={idea.id}
                idea={idea}
                onQueue={() => handleQueue(idea.id)}
                onUpdateTopic={(topic) => handleTopicUpdate(idea.id, topic)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BlogIdeaRow({
  idea,
  onQueue,
  onUpdateTopic,
}: {
  idea: BlogIdea
  onQueue: () => Promise<void>
  onUpdateTopic: (t: string) => void
}) {
  const [topic, setTopic] = useState(idea.topic)
  const [isDirty, setIsDirty] = useState(false)
  const [isQueueing, setIsQueueing] = useState(false)

  const handleBlur = () => {
    if (isDirty) {
      onUpdateTopic(topic)
      setIsDirty(false)
    }
  }

  const handleQueueClick = async () => {
    setIsQueueing(true)
    try {
      await onQueue()
    } finally {
      setIsQueueing(false)
    }
  }

  return (
    <div className="p-3 flex flex-col gap-2 hover:bg-muted/20">
      <div className="flex justify-between items-start gap-2">
        <Input
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value)
            setIsDirty(true)
          }}
          onBlur={handleBlur}
          className="h-8 font-medium"
        />
        <Badge
          variant={
            idea.state === "complete"
              ? "default"
              : idea.state === "failed"
                ? "destructive"
                : idea.state === "in_progress"
                  ? "secondary"
                  : "outline"
          }
        >
          {idea.state}
        </Badge>
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{idea.keyword_set_id ? `Set: ${idea.keyword_set_id}` : "No set"}</span>
        {idea.state === "unqueued" && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs bg-transparent"
            onClick={handleQueueClick}
            disabled={isQueueing}
          >
            {isQueueing ? <Spinner className="h-3 w-3" /> : "Queue"}
          </Button>
        )}
      </div>
    </div>
  )
}
