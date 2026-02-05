"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { flushSync } from "react-dom"
import type { Client, BlogIdea, KeywordIdea, KeywordCluster, KeywordSet, BestAlternateResult, StrategyVersionList } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { KeywordGenerationProgress } from "@/components/keyword-generation-progress"
import { Trash2, Pencil, Check, ChevronRight, ChevronLeft, Link2, X } from "lucide-react"

interface Props {
  client: Client
  readOnly?: boolean
}

// Arrow button component for between columns
function ArrowButton({
  onClick,
  disabled,
  loading,
  count,
  label,
}: {
  onClick: () => void
  disabled: boolean
  loading: boolean
  count: number
  label: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-0.5 shrink-0">
      <Button
        size="sm"
        onClick={onClick}
        disabled={disabled || count === 0}
        className="h-7 px-2 text-xs flex items-center gap-0.5"
      >
        {loading ? <Spinner className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{label}({count})</span>
      </Button>
    </div>
  )
}

export function BlogFactoryView({ client, readOnly = false }: Props) {
  // ==================== KEYWORD EXPLORER STATE ====================
  const [config, setConfig] = useState({
    max_num_kws_per_seed: 600,
    sv_min: 200,
    kd_max: 20,
    sim_threshold: 0.7,
    intent_min: 1,
    intent_max: 2,
  })

  // Keyword data state
  const [keywordIdeas, setKeywordIdeas] = useState<KeywordIdea[]>([])
  const [clusters, setClusters] = useState<KeywordCluster[]>([])
  const [sets, setSets] = useState<KeywordSet[]>([])
  const [bestAlternates, setBestAlternates] = useState<Map<number, BestAlternateResult>>(new Map())

  // Keyword selection state
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<number>>(new Set())
  const [selectedBestAlternateIds, setSelectedBestAlternateIds] = useState<Set<number>>(new Set())
  const [selectedSetIds, setSelectedSetIds] = useState<Set<number>>(new Set())

  // Blog idea selection state
  const [selectedBlogIdeaIds, setSelectedBlogIdeaIds] = useState<Set<number>>(new Set())

  // Keyword deleting state
  const [deletingIdeas, setDeletingIdeas] = useState(false)
  const [deletingAlternates, setDeletingAlternates] = useState(false)
  const [deletingSets, setDeletingSets] = useState(false)

  // Keyword loading state
  const [loadingKeywordIdeas, setLoadingKeywordIdeas] = useState(false)
  const [loadingClusters, setLoadingClusters] = useState(false)
  const [loadingSets, setLoadingSets] = useState(false)
  const [loadingBestAlternates, setLoadingBestAlternates] = useState(false)

  // Keyword streaming progress state
  const [generatingIdeas, setGeneratingIdeas] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ message: "", step: 0 })

  // Manual keyword addition state
  const [newKeyword, setNewKeyword] = useState("")
  const [addingKeyword, setAddingKeyword] = useState(false)

  // ==================== BLOGGER AUTOMATION STATE ====================
  const [blogIdeas, setBlogIdeas] = useState<BlogIdea[]>([])
  const [loadingBlogIdeas, setLoadingBlogIdeas] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [generatingBlogIdeas, setGeneratingBlogIdeas] = useState(false)
  const [queuingIdeas, setQueuingIdeas] = useState(false)

  // Debugging state
  const [selectedIdea, setSelectedIdea] = useState<BlogIdea | null>(null)

  // Process streaming state
  const [streamingIdea, setStreamingIdea] = useState<BlogIdea | null>(null)
  const [streamProgress, setStreamProgress] = useState<Array<{ message: string; step: number }>>([])
  const [streamAbortController, setStreamAbortController] = useState<AbortController | null>(null)
  const [backgroundPipelines, setBackgroundPipelines] = useState<Set<number>>(new Set())

  // HTML viewer state
  const [htmlViewerIdea, setHtmlViewerIdea] = useState<BlogIdea | null>(null)
  const [htmlContent, setHtmlContent] = useState<string>("")

  // Strategy association state
  const [associatedStrategyVersion, setAssociatedStrategyVersion] = useState<number | null>(null)
  const [strategyVersions, setStrategyVersions] = useState<StrategyVersionList | null>(null)
  const [loadingStrategy, setLoadingStrategy] = useState(false)
  const [savingStrategy, setSavingStrategy] = useState(false)
  const [loadingHtml, setLoadingHtml] = useState(false)

  // ==================== KEYWORD EXPLORER FUNCTIONS ====================
  const refreshKeywordIdeas = async () => {
    const data = await api.getKeywordIdeas(client.id)
    setKeywordIdeas(data || [])
  }

  const refreshClusters = async () => {
    const data = await api.getClusters(client.id)
    setClusters(data || [])
  }

  const refreshSets = async () => {
    const data = await api.getSets(client.id)
    setSets(data || [])
  }

  const refreshBestAlternates = async () => {
    try {
      const data = await api.getBestAlternates(client.id)
      const alternatesMap = new Map<number, BestAlternateResult>()
      data.forEach((alt) => {
        alternatesMap.set(alt.original_keyword_id, alt)
      })
      setBestAlternates(alternatesMap)
    } catch (error) {
      console.error("Failed to fetch best alternates:", error)
    }
  }

  const handleAddKeyword = async () => {
    const keyword = newKeyword.trim()
    if (!keyword) return

    setAddingKeyword(true)
    try {
      await api.addKeywordIdea(client.id, keyword)
      setNewKeyword("")
      await refreshKeywordIdeas()
    } catch (error: any) {
      console.error("Failed to add keyword:", error)
      alert(error.message || "Failed to add keyword. It may already exist.")
    } finally {
      setAddingKeyword(false)
    }
  }

  const handleToggleKeywordSelection = (keywordId: number) => {
    setSelectedKeywordIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(keywordId)) {
        newSet.delete(keywordId)
      } else {
        newSet.add(keywordId)
      }
      return newSet
    })
  }

  const handleFindBestAlternates = async () => {
    if (selectedKeywordIds.size === 0) return

    setLoadingBestAlternates(true)
    try {
      const results = new Map<number, BestAlternateResult>()
      const promises = Array.from(selectedKeywordIds).map(async (keywordId) => {
        try {
          const result = await api.bestAlternate(client.id, keywordId, {
            sim_threshold: config.sim_threshold,
            limit_per_seed: config.max_num_kws_per_seed,
          })
          results.set(keywordId, result)
        } catch (error) {
          console.error(`Failed to find best alternate for keyword ${keywordId}:`, error)
        }
      })

      await Promise.all(promises)
      setBestAlternates(results)
      await refreshBestAlternates()
    } catch (error) {
      console.error("Failed to find best alternates:", error)
    } finally {
      setLoadingBestAlternates(false)
    }
  }

  const handleGenerateKeywordIdeas = async () => {
    setGeneratingIdeas(true)
    setGenerationProgress({ message: "Starting keyword generation...", step: 0 })

    await api.generateKeywordIdeasStream(
      client.id,
      { min_sv: config.sv_min, max_kd: config.kd_max },
      (message, step) => {
        flushSync(() => {
          setGenerationProgress({ message, step })
        })
      },
      async (data) => {
        await refreshKeywordIdeas()
        setGeneratingIdeas(false)
        setGenerationProgress({ message: "", step: 0 })
      },
      (error) => {
        console.error("Keyword generation error:", error)
        setGeneratingIdeas(false)
        setGenerationProgress({ message: "", step: 0 })
      },
    )
  }

  const handleToggleBestAlternateSelection = (keywordId: number) => {
    setSelectedBestAlternateIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(keywordId)) {
        newSet.delete(keywordId)
      } else {
        newSet.add(keywordId)
      }
      return newSet
    })
  }

  const handleDevelopSets = async () => {
    if (selectedBestAlternateIds.size === 0) return

    setLoadingSets(true)
    try {
      await api.developSets(client.id, {
        keyword_ids: Array.from(selectedBestAlternateIds),
        min_sv: config.sv_min,
      })
      await refreshSets()
    } finally {
      setLoadingSets(false)
    }
  }

  const handleToggleSetSelection = (setId: number) => {
    setSelectedSetIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(setId)) {
        newSet.delete(setId)
      } else {
        newSet.add(setId)
      }
      return newSet
    })
  }

  const handleDeleteSelectedKeywordIdeas = async () => {
    if (selectedKeywordIds.size === 0) return
    if (!confirm(`Delete ${selectedKeywordIds.size} keyword idea(s)?`)) return

    setDeletingIdeas(true)
    try {
      await api.deleteKeywordIdeas(client.id, Array.from(selectedKeywordIds))
      setSelectedKeywordIds(new Set())
      await refreshKeywordIdeas()
    } catch (error) {
      console.error("Failed to delete keyword ideas:", error)
    } finally {
      setDeletingIdeas(false)
    }
  }

  const handleDeleteSelectedAlternates = async () => {
    if (selectedBestAlternateIds.size === 0) return
    if (!confirm(`Delete ${selectedBestAlternateIds.size} best alternate(s)?`)) return

    setDeletingAlternates(true)
    try {
      const alternateIds = Array.from(selectedBestAlternateIds)
        .map((keywordId) => bestAlternates.get(keywordId)?.id)
        .filter((id): id is number => id !== undefined)

      await api.deleteBestAlternates(client.id, alternateIds)
      setSelectedBestAlternateIds(new Set())
      await refreshBestAlternates()
    } catch (error) {
      console.error("Failed to delete best alternates:", error)
    } finally {
      setDeletingAlternates(false)
    }
  }

  const handleDeleteSelectedSets = async () => {
    if (selectedSetIds.size === 0) return
    if (!confirm(`Delete ${selectedSetIds.size} keyword set(s)?`)) return

    setDeletingSets(true)
    try {
      await api.deleteKeywordSets(client.id, Array.from(selectedSetIds))
      setSelectedSetIds(new Set())
      await refreshSets()
    } catch (error) {
      console.error("Failed to delete keyword sets:", error)
    } finally {
      setDeletingSets(false)
    }
  }

  // ==================== BLOGGER AUTOMATION FUNCTIONS ====================
  const refreshBlogIdeas = async () => {
    setLoadingBlogIdeas(true)
    try {
      const data = await api.getBlogIdeas(client.id)
      setBlogIdeas(data || [])
    } finally {
      setLoadingBlogIdeas(false)
    }
  }

  const handleToggleBlogIdeaSelection = (ideaId: number) => {
    setSelectedBlogIdeaIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId)
      } else {
        newSet.add(ideaId)
      }
      return newSet
    })
  }

  const handleQueueSelectedIdeas = async () => {
    if (selectedBlogIdeaIds.size === 0) return

    setQueuingIdeas(true)
    try {
      for (const id of selectedBlogIdeaIds) {
        await api.queueBlogIdea(client.id, String(id))
      }
      setSelectedBlogIdeaIds(new Set())
      await refreshBlogIdeas()
    } catch (e) {
      console.error("Failed to queue blog ideas", e)
    } finally {
      setQueuingIdeas(false)
    }
  }

  const handleDequeueIdea = async (ideaId: number) => {
    try {
      await api.resetBlogIdea(client.id, ideaId)
      await refreshBlogIdeas()
    } catch (e) {
      console.error("Failed to dequeue blog idea", e)
    }
  }

  const handleGenerateBlogIdeas = async () => {
    if (selectedSetIds.size === 0) return

    setGeneratingBlogIdeas(true)
    try {
      // Generate blog ideas from selected sets only
      const ideasData = await api.generateBlogIdeas(client.id, Array.from(selectedSetIds))
      // Merge new ideas with existing ones
      setBlogIdeas((prev) => {
        const existingIds = new Set(prev.map((i) => i.id))
        const newIdeas = ideasData.filter((i) => !existingIds.has(i.id))
        return [...prev, ...newIdeas]
      })
      setSelectedSetIds(new Set())
    } catch (e) {
      console.error("Failed to generate blog ideas", e)
    } finally {
      setGeneratingBlogIdeas(false)
    }
  }

  const handleTopicUpdate = async (ideaId: number, newTopic: string) => {
    try {
      await api.updateBlogIdeaTopic(client.id, String(ideaId), newTopic)
      setBlogIdeas((prev) => prev.map((i) => (i.id === ideaId ? { ...i, topic: newTopic } : i)))
    } catch (e) {
      console.error("Failed to update topic", e)
      await refreshBlogIdeas()
    }
  }

  const handleDeleteBlogIdea = async (ideaId: number) => {
    try {
      await api.deleteBlogIdea(client.id, ideaId)
      setBlogIdeas((prev) => prev.filter((i) => i.id !== ideaId))
    } catch (e) {
      console.error("Failed to delete blog idea", e)
      await refreshBlogIdeas()
    }
  }

  const startPipelineInBackground = (idea: BlogIdea) => {
    setBackgroundPipelines((prev) => new Set(prev).add(idea.id))
    const abortController = new AbortController()

    api.getBlogIdeaProcessStream(
      client.id,
      idea.id,
      () => {},
      (data) => {
        setBackgroundPipelines((prev) => {
          const next = new Set(prev)
          next.delete(idea.id)
          return next
        })
        refreshBlogIdeas()
      },
      (data) => {
        setBackgroundPipelines((prev) => {
          const next = new Set(prev)
          next.delete(idea.id)
          return next
        })
        refreshBlogIdeas()
      },
      abortController.signal,
    ).catch((error) => {
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
      const results = await api.processQueued(client.id)
      const refreshedIdeas = await api.getBlogIdeas(client.id)
      setBlogIdeas(refreshedIdeas || [])

      results.forEach((result) => {
        const processedIdea = refreshedIdeas?.find((i) => i.id === result.blog_idea_id)
        if (processedIdea) {
          startPipelineInBackground(processedIdea)
        }
      })

      if (results.length === 1) {
        const processedIdea = refreshedIdeas?.find((i) => i.id === results[0].blog_idea_id)
        if (processedIdea) {
          handleViewProcess(processedIdea)
        }
      }
    } catch (error) {
      console.error("Failed to process queued items:", error)
      await refreshBlogIdeas()
    } finally {
      setProcessing(false)
    }
  }

  const handleViewProcess = (idea: BlogIdea) => {
    if (backgroundPipelines.has(idea.id)) return

    setStreamingIdea(idea)
    setStreamProgress([])

    const abortController = new AbortController()
    setStreamAbortController(abortController)

    api.getBlogIdeaProcessStream(
      client.id,
      idea.id,
      (message, step) => {
        flushSync(() => {
          setStreamProgress((prev) => [...prev, { message, step }])
        })
      },
      (data) => {
        setStreamingIdea(null)
        setStreamProgress([])
        setStreamAbortController(null)
        setBackgroundPipelines((prev) => {
          const next = new Set(prev)
          next.delete(idea.id)
          return next
        })
        refreshBlogIdeas()
      },
      (data) => {
        if (data.message?.includes("409")) {
          setStreamingIdea(null)
          setStreamProgress([])
          setStreamAbortController(null)
          refreshBlogIdeas()
          return
        }
        setStreamProgress((prev) => [...prev, { message: `Error: ${data.message}`, step: prev.length + 1 }])
        setTimeout(() => {
          setStreamingIdea(null)
          setStreamProgress([])
          setStreamAbortController(null)
          setBackgroundPipelines((prev) => {
            const next = new Set(prev)
            next.delete(idea.id)
            return next
          })
          refreshBlogIdeas()
        }, 2000)
      },
      abortController.signal,
    ).catch((error) => {
      if (!error.message?.includes("409")) {
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
    setBlogIdeas((prevIdeas) =>
      prevIdeas.map((i) =>
        i.id === idea.id ? { ...i, state: "failed" as const, error_message: "Pipeline aborted by user" } : i
      )
    )

    handleCloseStream()

    try {
      await api.abortBlogIdeaProcessing(client.id, idea.id)
      await refreshBlogIdeas()
    } catch (e) {
      console.error("Failed to abort pipeline", e)
      await refreshBlogIdeas()
    }
  }

  const handleResetBlogIdea = async (idea: BlogIdea) => {
    if (
      !confirm(
        `Are you sure you want to reset "${idea.topic}"? This will delete all HTML artifacts and reset the blog idea to unqueued state.`
      )
    ) {
      return
    }
    try {
      const result = await api.resetBlogIdea(client.id, idea.id)
      alert(result.message)
      await refreshBlogIdeas()
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

  const handleDownloadHtml = (idea: BlogIdea) => {
    api.downloadHtml(client.id, idea.id)
  }

  const handleViewMonitor = async (idea: BlogIdea) => {
    try {
      const result = await api.getAbsPipelineMonitorUrl(client.id, idea.id)
      window.open(result.gui_url, "_blank")
    } catch (e) {
      console.error("Failed to get monitor URL", e)
      alert("Failed to open pipeline monitor")
    }
  }

  // ==================== STRATEGY ASSOCIATION ====================
  const loadStrategyAssociation = async () => {
    try {
      setLoadingStrategy(true)
      const [association, versions] = await Promise.all([
        api.getBlogFactoryStrategy(client.id),
        api.getStrategyVersions(client.id),
      ])
      setAssociatedStrategyVersion(association.version_number)
      setStrategyVersions(versions)
    } catch (e) {
      console.error("Failed to load strategy association", e)
    } finally {
      setLoadingStrategy(false)
    }
  }

  const handleSetStrategy = async (versionNumber: number | null) => {
    try {
      setSavingStrategy(true)
      await api.setBlogFactoryStrategy(client.id, versionNumber)
      setAssociatedStrategyVersion(versionNumber)
    } catch (e) {
      console.error("Failed to set strategy association", e)
      alert("Failed to associate strategy")
    } finally {
      setSavingStrategy(false)
    }
  }

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    // Clear state when client changes
    setBestAlternates(new Map())
    setSelectedKeywordIds(new Set())
    setSelectedBestAlternateIds(new Set())
    setSelectedSetIds(new Set())
    setSelectedBlogIdeaIds(new Set())
    // Refresh all data
    refreshKeywordIdeas()
    refreshClusters()
    refreshSets()
    refreshBestAlternates()
    refreshBlogIdeas()
    loadStrategyAssociation()

    // Poll blog ideas every 10 seconds
    const interval = setInterval(() => {
      api.getBlogIdeas(client.id).then(setBlogIdeas).catch(console.error)
    }, 10000)
    return () => clearInterval(interval)
  }, [client.id])

  // Categorize blog ideas
  const unqueued = blogIdeas.filter((i) => i.state === "unqueued")
  const queued = blogIdeas.filter((i) => i.state === "queued")
  const inProgress = blogIdeas.filter((i) => i.state === "in_progress")
  const done = blogIdeas.filter((i) => i.state === "complete" || i.state === "failed")

  return (
    <div className="h-full flex flex-col gap-4">
      {generatingIdeas && (
        <div className="mb-2">
          <KeywordGenerationProgress message={generationProgress.message} />
        </div>
      )}

      {/* Horizontal scrollable container for all columns */}
      <div className="flex-1 overflow-x-auto min-h-0">
        <div className="flex h-full gap-1" style={{ minWidth: "1900px" }}>
          {/* ==================== KEYWORD COLUMNS SECTION ==================== */}
          <div className="flex flex-col gap-1 shrink-0" style={{ width: "280px" }}>
            {/* Strategy Association */}
            <div className="bg-background border rounded p-2 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <label className="text-xs font-medium">Associate strategy?</label>
              </div>
              {loadingStrategy ? (
                <div className="text-xs text-muted-foreground">Loading...</div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={associatedStrategyVersion ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : parseInt(e.target.value)
                      handleSetStrategy(value)
                    }}
                    disabled={savingStrategy || readOnly}
                    className="flex-1 text-xs border rounded px-2 py-1 bg-background"
                  >
                    <option value="">None</option>
                    {strategyVersions?.versions.map((v) => (
                      <option key={v.version_number} value={v.version_number}>
                        {v.name ? `${v.name} (v${v.version_number})` : `Version ${v.version_number}`}
                      </option>
                    ))}
                  </select>
                  {associatedStrategyVersion && !readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetStrategy(null)}
                      disabled={savingStrategy}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              {associatedStrategyVersion && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Strategy will guide keyword ideation
                </div>
              )}
            </div>

            {/* Config bar */}
            <div className="bg-background border rounded p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">Max KWs/Seed</label>
                  <Input type="number" value={config.max_num_kws_per_seed} onChange={(e) => setConfig({ ...config, max_num_kws_per_seed: +e.target.value })} className="h-7 text-sm" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">Min Volume</label>
                  <Input type="number" value={config.sv_min} onChange={(e) => setConfig({ ...config, sv_min: +e.target.value })} className="h-7 text-sm" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">Max KD</label>
                  <Input type="number" value={config.kd_max} onChange={(e) => setConfig({ ...config, kd_max: +e.target.value })} className="h-7 text-sm" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">Similarity</label>
                  <Input type="number" step="0.01" value={config.sim_threshold} onChange={(e) => setConfig({ ...config, sim_threshold: +e.target.value })} className="h-7 text-sm" />
                </div>
              </div>
            </div>

            {/* Column 1: Keyword Ideas */}
            <Card className="flex flex-col flex-1 min-h-0">
              <CardHeader className="pb-1 pt-2 px-2 space-y-1">
                <div className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Ideas ({keywordIdeas.length})</CardTitle>
                  <div className="flex gap-1">
                    {selectedKeywordIds.size > 0 && !readOnly && (
                      <Button size="sm" variant="destructive" onClick={handleDeleteSelectedKeywordIdeas} disabled={deletingIdeas} className="h-6 px-1.5">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" onClick={handleGenerateKeywordIdeas} disabled={generatingIdeas || loadingKeywordIdeas || readOnly} className="h-6 text-xs px-2">
                      {(generatingIdeas || loadingKeywordIdeas) && <Spinner className="mr-1 h-3 w-3" />}
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Input placeholder="Add keyword..." value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !addingKeyword && newKeyword.trim()) handleAddKeyword() }} className="flex-1 h-6 text-xs" disabled={addingKeyword} />
                  <Button size="sm" onClick={handleAddKeyword} disabled={addingKeyword || !newKeyword.trim()} variant="outline" className="h-6 text-xs px-2">
                    {addingKeyword ? <Spinner className="h-3 w-3" /> : "Add"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0">
                <div className="border-t">
                  <table className="w-full text-xs text-left table-fixed">
                    <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-1.5 py-1 w-6">
                          <input type="checkbox" checked={selectedKeywordIds.size === keywordIdeas.length && keywordIdeas.length > 0} onChange={(e) => { if (e.target.checked) { setSelectedKeywordIds(new Set(keywordIdeas.map((i) => i.id))) } else { setSelectedKeywordIds(new Set()) } }} className="cursor-pointer" />
                        </th>
                        <th className="px-1.5 py-1">Keyword</th>
                        <th className="px-1.5 py-1 text-right w-14">Vol</th>
                        <th className="px-1.5 py-1 text-right w-8">KD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {keywordIdeas.map((idea) => (
                        <tr key={idea.id} className={selectedKeywordIds.has(idea.id) ? "bg-muted/30" : ""}>
                          <td className="px-1.5 py-1 align-top"><input type="checkbox" checked={selectedKeywordIds.has(idea.id)} onChange={() => handleToggleKeywordSelection(idea.id)} className="cursor-pointer" /></td>
                          <td className="px-1.5 py-1 break-words">{idea.keyword}</td>
                          <td className="px-1.5 py-1 text-right text-muted-foreground whitespace-nowrap align-top">{idea.search_volume?.toLocaleString() ?? "-"}</td>
                          <td className="px-1.5 py-1 text-right text-muted-foreground whitespace-nowrap align-top">{idea.keyword_difficulty ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Arrow: Ideas -> Best Alternate */}
          <ArrowButton onClick={handleFindBestAlternates} disabled={loadingBestAlternates || readOnly} loading={loadingBestAlternates} count={selectedKeywordIds.size} label="Find" />

          {/* Column 2: Best Alternate */}
          <Card className="flex flex-col shrink-0 min-h-0" style={{ width: "240px" }}>
            <CardHeader className="pb-1 pt-2 px-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Best Alternate</CardTitle>
              {selectedBestAlternateIds.size > 0 && !readOnly && (
                <Button size="sm" variant="destructive" onClick={handleDeleteSelectedAlternates} disabled={deletingAlternates} className="h-6 px-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-1.5 space-y-1.5">
              {bestAlternates.size === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">Select keywords and click Find →</div>
              ) : (
                Array.from(bestAlternates.entries()).map(([keywordId, result]) => {
                  const isSelected = selectedBestAlternateIds.has(keywordId)
                  return (
                    <div key={keywordId} className={`border rounded p-2 cursor-pointer transition-colors text-xs ${isSelected ? "bg-muted/30 border-primary" : "hover:bg-muted/10"}`} onClick={() => handleToggleBestAlternateSelection(keywordId)}>
                      <div className="flex items-start gap-1.5">
                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleBestAlternateSelection(keywordId)} onClick={(e) => e.stopPropagation()} className="mt-0.5 cursor-pointer" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium break-words">{result.keyword}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Vol: {result.search_volume?.toLocaleString() || "-"} | KD: {result.keyword_difficulty ?? "-"}{result.is_original && <span className="text-blue-500 ml-1">(Orig)</span>}</div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Arrow: Best Alternate -> Sets */}
          <ArrowButton onClick={handleDevelopSets} disabled={loadingSets || readOnly} loading={loadingSets} count={selectedBestAlternateIds.size} label="Develop" />

          {/* Column 3: Sets */}
          <Card className="flex flex-col shrink-0 min-h-0" style={{ width: "220px" }}>
            <CardHeader className="pb-1 pt-2 px-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs">Sets ({sets.length})</CardTitle>
              {selectedSetIds.size > 0 && !readOnly && (
                <Button size="sm" variant="destructive" onClick={handleDeleteSelectedSets} disabled={deletingSets} className="h-5 text-[10px] px-1">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-1 space-y-1">
              {sets.length > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground pb-1 border-b">
                  <input type="checkbox" checked={selectedSetIds.size === sets.length && sets.length > 0} onChange={(e) => { if (e.target.checked) { setSelectedSetIds(new Set(sets.map((s) => s.id))) } else { setSelectedSetIds(new Set()) } }} className="cursor-pointer" />
                  <span>Select all</span>
                </div>
              )}
              {sets.map((set) => {
                const isSelected = selectedSetIds.has(set.id)
                return (
                  <div key={set.id} className={`border rounded p-1.5 cursor-pointer transition-colors text-[10px] ${isSelected ? "bg-muted/30 border-primary" : "hover:bg-muted/10"}`} onClick={() => handleToggleSetSelection(set.id)}>
                    <div className="flex items-start gap-1">
                      <input type="checkbox" checked={isSelected} onChange={() => handleToggleSetSelection(set.id)} onClick={(e) => e.stopPropagation()} className="mt-0.5 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium break-words">{set.primary_keyword}</div>
                        <div className="text-[9px] text-muted-foreground">Vol: {set.primary_search_volume} | KD: {set.primary_keyword_difficulty}</div>
                        <div className="pl-2 border-l border-muted mt-0.5 text-[9px] text-muted-foreground">
                          {set.secondaries && set.secondaries.length > 0 ? set.secondaries.map((sec, j) => <div key={j} className="truncate">{sec.keyword}</div>) : <div className="italic">No secondaries</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Arrow: Sets -> Blog Ideas */}
          <ArrowButton onClick={handleGenerateBlogIdeas} disabled={generatingBlogIdeas || readOnly} loading={generatingBlogIdeas} count={selectedSetIds.size} label="Generate" />

          {/* Column 4: Blog Ideas (Unqueued) */}
          <Card className="flex flex-col shrink-0 min-h-0" style={{ width: "220px" }}>
            <CardHeader className="pb-1 pt-2 px-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs">Blog Ideas ({unqueued.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-1 space-y-1">
              {unqueued.length > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground pb-1 border-b">
                  <input type="checkbox" checked={selectedBlogIdeaIds.size === unqueued.length && unqueued.length > 0} onChange={(e) => { if (e.target.checked) { setSelectedBlogIdeaIds(new Set(unqueued.map((i) => i.id))) } else { setSelectedBlogIdeaIds(new Set()) } }} className="cursor-pointer" />
                  <span>Select all</span>
                </div>
              )}
              {unqueued.map((idea) => (
                <BlogIdeaCard key={idea.id} idea={idea} isSelected={selectedBlogIdeaIds.has(idea.id)} onToggleSelect={() => handleToggleBlogIdeaSelection(idea.id)} onView={() => setSelectedIdea(idea)} onUpdateTopic={(topic) => handleTopicUpdate(idea.id, topic)} onDelete={() => handleDeleteBlogIdea(idea.id)} isEditable={!readOnly} showCheckbox />
              ))}
            </CardContent>
          </Card>

          {/* Arrow: Blog Ideas -> Queued */}
          <ArrowButton onClick={handleQueueSelectedIdeas} disabled={queuingIdeas || readOnly} loading={queuingIdeas} count={selectedBlogIdeaIds.size} label="Queue" />

          {/* Column 5: Queued */}
          <Card className="flex flex-col shrink-0 min-h-0" style={{ width: "220px" }}>
            <CardHeader className="pb-1 pt-2 px-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs">Queued ({queued.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-1 space-y-1">
              {queued.map((idea) => (
                <BlogIdeaCard key={idea.id} idea={idea} onView={() => setSelectedIdea(idea)} onDequeue={() => handleDequeueIdea(idea.id)} />
              ))}
            </CardContent>
          </Card>

          {/* Arrow: Queued -> In Progress */}
          <ArrowButton onClick={handleProcessQueued} disabled={processing || queued.length === 0 || readOnly} loading={processing} count={queued.length} label="Process" />

          {/* Column 6: In Progress */}
          <Card className="flex flex-col shrink-0 min-h-0" style={{ width: "220px" }}>
            <CardHeader className="pb-1 pt-2 px-2">
              <CardTitle className="text-xs">In Progress ({inProgress.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-1 space-y-1">
              {inProgress.map((idea) => (
                <BlogIdeaCard key={idea.id} idea={idea} onView={() => setSelectedIdea(idea)} onViewProcess={() => handleViewProcess(idea)} onViewMonitor={() => handleViewMonitor(idea)} onAbort={() => handleAbortPipeline(idea)} isInProgress />
              ))}
            </CardContent>
          </Card>

          {/* Column 7: Done */}
          <Card className="flex flex-col shrink-0 min-h-0 ml-2" style={{ width: "240px" }}>
            <CardHeader className="pb-1 pt-2 px-2">
              <CardTitle className="text-xs">Done ({done.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-1 space-y-1">
              {done.map((idea) => (
                <BlogIdeaCard key={idea.id} idea={idea} onView={() => setSelectedIdea(idea)} onViewPost={() => handleViewPost(idea)} onDownload={() => handleDownloadHtml(idea)} onReset={() => handleResetBlogIdea(idea)} />
              ))}
            </CardContent>
          </Card>
        </div>
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
              <iframe srcDoc={htmlContent} className="w-full h-full min-h-[600px] border-0" title="Blog Post HTML" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BlogIdeaCard({
  idea,
  isSelected,
  onToggleSelect,
  onView,
  onViewProcess,
  onViewPost,
  onDownload,
  onViewMonitor,
  onAbort,
  onReset,
  onUpdateTopic,
  onDelete,
  onDequeue,
  isInProgress,
  isEditable,
  showCheckbox,
}: {
  idea: BlogIdea
  isSelected?: boolean
  onToggleSelect?: () => void
  onView: () => void
  onViewProcess?: () => void
  onViewPost?: () => void
  onDownload?: () => void
  onViewMonitor?: () => void
  onAbort?: () => void
  onReset?: () => void
  onUpdateTopic?: (topic: string) => void
  onDelete?: () => void
  onDequeue?: () => void
  isInProgress?: boolean
  isEditable?: boolean
  showCheckbox?: boolean
}) {
  const [topic, setTopic] = useState(idea.topic)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async () => {
    if (!onUpdateTopic || topic === idea.topic) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onUpdateTopic(topic)
      setIsEditing(false)
    } catch (e) {
      console.error("Failed to update topic", e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setTopic(idea.topic)
    setIsEditing(false)
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
    <div className={`p-1.5 rounded border text-[10px] space-y-1 ${isInProgress ? "bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800" : isSelected ? "bg-muted/30 border-primary" : "bg-background"}`}>
      {showCheckbox && onToggleSelect ? (
        isEditing ? (
          <div className="flex gap-1 items-start">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancelEdit() }} className="h-5 text-[10px] font-medium flex-1" autoFocus />
            <button onClick={handleSave} disabled={isSaving} className="p-0.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400 transition-colors shrink-0" title="Save">
              <Check className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1 items-start">
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="mt-0.5 cursor-pointer shrink-0" />
            <div className="font-medium leading-tight flex-1 break-words">{idea.topic}</div>
            {isEditable && (
              <>
                <button onClick={() => setIsEditing(true)} className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Edit title">
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                <button onClick={() => setShowDeleteDialog(true)} className="p-0.5 hover:bg-destructive/10 rounded text-destructive transition-colors shrink-0" title="Delete blog idea">
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </>
            )}
          </div>
        )
      ) : (
        <div className="flex gap-1 items-start">
          {onDequeue && (
            <button onClick={onDequeue} className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Remove from queue">
              <ChevronLeft className="h-3 w-3" />
            </button>
          )}
          <div className="font-medium leading-tight flex-1 break-words">{idea.topic}</div>
        </div>
      )}
      <div className="flex justify-between items-center text-[9px] text-muted-foreground">
        <Badge variant={idea.state === "failed" ? "destructive" : "outline"} className="text-[8px] h-3.5 px-1">{idea.state}</Badge>
        <button onClick={onView} className="hover:underline text-primary">Details</button>
      </div>
      {isInProgress && onViewProcess && <Button size="sm" variant="outline" className="w-full h-5 text-[9px]" onClick={onViewProcess}>View process</Button>}
      {isInProgress && onViewMonitor && <Button size="sm" variant="default" className="w-full h-5 text-[9px]" onClick={onViewMonitor}>Open Monitor</Button>}
      {isInProgress && onAbort && <Button size="sm" variant="destructive" className="w-full h-5 text-[9px]" onClick={onAbort}>Abort</Button>}
      {idea.state === "complete" && onViewPost && <Button size="sm" variant="default" className="w-full h-5 text-[9px]" onClick={onViewPost}>View post</Button>}
      {idea.state === "complete" && onDownload && <Button size="sm" variant="outline" className="w-full h-5 text-[9px]" onClick={onDownload}>Download HTML</Button>}
      {onReset && <Button size="sm" variant="outline" className="w-full h-5 text-[9px]" onClick={onReset}>Reset</Button>}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Idea</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete &quot;{idea.topic}&quot;? This will permanently delete the blog idea and all associated artifacts. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClick} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
