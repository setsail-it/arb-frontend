"use client"

import { useState, useEffect, useRef } from "react"
import type { Client, VersionedStrategy, StrategyVersion, DiscoveryCallResult } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StrategyChat } from "@/components/strategy-chat"
import { DiscoveryCallView } from "@/components/views/discovery-call-view"
import { GeneralContextForm } from "@/components/views/general-context-form"
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Phone,
  Search,
  Database,
  X,
  ChefHat,
  Utensils,
  Sparkles,
  Check,
  AlertCircle,
  Play,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Props {
  client: Client
  readOnly?: boolean
}

type ContextPopup = "discovery-call" | "deep-dive" | "general-context" | null
type AgentStatus = "idle" | "processing" | "complete" | "error"
type AgentPopup = "waiter" | "plater" | null

interface AgentOutput {
  id?: string | null
  model?: string | null
  output_text?: string | null
  reasoning_summary?: string | null
  tool_calls?: { name: string; output?: string | null }[]
  usage?: {
    input_tokens: number
    output_tokens: number
    reasoning_tokens: number
  } | null
  completed_at?: string | null
}

interface PipelineState {
  status: "idle" | "waiter_processing" | "plater_processing" | "complete" | "error"
  waiter: AgentStatus
  plater: AgentStatus
  error?: string
  waiterOutput?: AgentOutput | null
  platerOutput?: AgentOutput | null
}

export function StrategyEditorView({ client, readOnly = false }: Props) {
  const [versions, setVersions] = useState<StrategyVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [strategy, setStrategy] = useState<VersionedStrategy | null>(null)
  const [isLoadingVersions, setIsLoadingVersions] = useState(true)
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextExpanded, setContextExpanded] = useState(false)
  const [activePopup, setActivePopup] = useState<ContextPopup>(null)
  const [activeAgentPopup, setActiveAgentPopup] = useState<AgentPopup>(null)
  
  // Agent Pipeline State (2-agent pipeline: Waiter → Plater)
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    status: "idle",
    waiter: "idle",
    plater: "idle",
  })
  const [isPipelineStarting, setIsPipelineStarting] = useState(false)
  const pipelinePollingRef = useRef<NodeJS.Timeout | null>(null)

  // Chat is only enabled after pipeline completes
  const chatEnabled = pipelineState.status === "complete"

  // Load versions on mount
  useEffect(() => {
    loadVersions()
    return () => {
      if (pipelinePollingRef.current) clearInterval(pipelinePollingRef.current)
    }
  }, [client.id])

  // Load strategy when version changes
  useEffect(() => {
    if (selectedVersion !== null) {
      loadStrategy(selectedVersion)
      checkPipelineStatus(selectedVersion)
    }
  }, [selectedVersion])

  const loadVersions = async () => {
    setIsLoadingVersions(true)
    setError(null)
    try {
      const result = await api.getStrategyVersions(client.id)
      setVersions(result.versions)
      if (result.versions.length > 0 && selectedVersion === null) {
        setSelectedVersion(result.versions[0].version_number)
      }
    } catch (e: any) {
      console.error("Failed to load strategy versions:", e)
      setError(e.message || "Failed to load versions")
      setVersions([])
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const loadStrategy = async (versionNumber: number) => {
    setIsLoadingStrategy(true)
    try {
      const result = await api.getVersionedStrategy(client.id, versionNumber)
      setStrategy(result)
    } catch (e: any) {
      console.error("Failed to load strategy:", e)
      setStrategy(null)
    } finally {
      setIsLoadingStrategy(false)
    }
  }

  const checkPipelineStatus = async (versionNumber: number) => {
    try {
      const status = await api.getStrategyPipelineStatus(client.id, versionNumber)
      setPipelineState({
        status: status.status as PipelineState["status"],
        waiter: status.waiter_status as AgentStatus,
        plater: status.plater_status as AgentStatus,
        error: status.error || undefined,
        waiterOutput: status.waiter_output || null,
        platerOutput: status.plater_output || null,
      })
      
      // If pipeline is running, start polling
      if (status.status !== "idle" && status.status !== "complete" && status.status !== "error") {
        startPipelinePolling(versionNumber)
      }
    } catch (e) {
      console.log("No active pipeline")
    }
  }

  const startPipelinePolling = (versionNumber: number) => {
    if (pipelinePollingRef.current) clearInterval(pipelinePollingRef.current)
    
    pipelinePollingRef.current = setInterval(async () => {
      try {
        const status = await api.getStrategyPipelineStatus(client.id, versionNumber)
        setPipelineState({
          status: status.status as PipelineState["status"],
          waiter: status.waiter_status as AgentStatus,
          plater: status.plater_status as AgentStatus,
          error: status.error || undefined,
          waiterOutput: status.waiter_output || null,
          platerOutput: status.plater_output || null,
        })
        
        // Run agents sequentially: Waiter → Plater
        if (status.waiter_status === "processing") {
          // Trigger waiter completion
          setTimeout(async () => {
            try {
              await api.runWaiter(client.id, versionNumber)
            } catch (e) {
              console.error("Waiter error:", e)
            }
          }, 2000)
        } else if (status.waiter_status === "complete" && status.plater_status === "processing") {
          // Trigger plater (final step)
          setTimeout(async () => {
            try {
              await api.runPlater(client.id, versionNumber)
              // Reload strategy after plater completes
              loadStrategy(versionNumber)
            } catch (e) {
              console.error("Plater error:", e)
            }
          }, 2000)
        }
        
        // Stop polling when complete or error
        if (status.status === "complete" || status.status === "error") {
          if (pipelinePollingRef.current) {
            clearInterval(pipelinePollingRef.current)
            pipelinePollingRef.current = null
          }
          // Reload strategy on completion
          if (status.status === "complete") {
            loadStrategy(versionNumber)
          }
        }
      } catch (e) {
        console.error("Pipeline polling error:", e)
      }
    }, 3000)
  }

  const handleCreateVersion = async () => {
    setIsCreating(true)
    try {
      const copyFrom = versions.length > 0 ? versions[0].version_number : undefined
      const result = await api.createStrategyVersion(client.id, copyFrom)
      await loadVersions()
      setSelectedVersion(result.version_number)
    } catch (e: any) {
      console.error("Failed to create strategy version:", e)
      setError(e.message || "Failed to create version")
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartPipeline = async () => {
    if (selectedVersion === null) return
    
    setIsPipelineStarting(true)
    
    try {
      // Gather context data
      const [dcResult, ddResult] = await Promise.all([
        api.getDiscoveryCallResult(client.id.toString()).catch(() => null),
        api.getDeepDiveResult(client.id.toString()).catch(() => null),
      ])
      
      // Format the data
      const call1Notes = (dcResult as DiscoveryCallResult)?.factoids_summary || "No Call 1 notes available"
      const call2Notes = (ddResult as DiscoveryCallResult)?.factoids_summary || "No Call 2 notes available"
      
      // Format Q&A
      let call2QA = "No Q&A available"
      if ((ddResult as DiscoveryCallResult)?.answers_data) {
        call2QA = (ddResult as DiscoveryCallResult).answers_data!.map(a => {
          const certaintyLabel = a.certainty === 1 ? "Verified" : a.certainty === 2 ? "Likely" : "Unknown"
          return `Q${a.question_number}: ${a.question}\nA: ${a.answer || "No answer"}\nCertainty: ${certaintyLabel}`
        }).join("\n\n---\n\n")
      }
      
      // Start the pipeline
      await api.startStrategyPipeline(client.id, selectedVersion, call1Notes, call2Notes, call2QA)
      
      // Update state and start polling
      setPipelineState({
        status: "waiter_processing",
        waiter: "processing",
        plater: "idle",
      })
      
      startPipelinePolling(selectedVersion)
      
    } catch (e: any) {
      console.error("Failed to start pipeline:", e)
      setPipelineState(prev => ({ ...prev, status: "error", error: e.message }))
    } finally {
      setIsPipelineStarting(false)
    }
  }

  const handleStrategyUpdated = () => {
    if (selectedVersion !== null) {
      loadStrategy(selectedVersion)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown"
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  if (isLoadingVersions) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative">
      {/* Context Dropdown Bar */}
      <div className="flex-shrink-0 border-b border-zinc-800">
        <button
          onClick={() => setContextExpanded(!contextExpanded)}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-zinc-300">Context Reference</span>
          </div>
          {contextExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </button>
        
        {/* Expanded Context Buttons */}
        {contextExpanded && (
          <div className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800/50 flex gap-3">
            <button
              onClick={() => setActivePopup("discovery-call")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-emerald-600/50 transition-all text-zinc-300 hover:text-white"
            >
              <Phone className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Discovery Call Results</span>
            </button>
            <button
              onClick={() => setActivePopup("deep-dive")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-600/50 transition-all text-zinc-300 hover:text-white"
            >
              <Search className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Deep Dive Results</span>
            </button>
            <button
              onClick={() => setActivePopup("general-context")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-blue-600/50 transition-all text-zinc-300 hover:text-white"
            >
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">General Context</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Version Sidebar */}
        <div className="w-52 flex-shrink-0 bg-zinc-900/80 border-r border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-zinc-200 text-sm tracking-wide">Versions</h3>
              {!readOnly && (
                <Button
                  onClick={handleCreateVersion}
                  disabled={isCreating}
                  size="sm"
                  className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {isCreating ? <Spinner className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </Button>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {versions.length} version{versions.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {versions.length === 0 ? (
              <div className="p-4 text-center">
                <FileText className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                <p className="text-sm text-zinc-500">No versions yet</p>
                {!readOnly && (
                  <Button
                    onClick={handleCreateVersion}
                    disabled={isCreating}
                    size="sm"
                    className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create First
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {versions.map((v) => (
                  <button
                    key={v.version_number}
                    onClick={() => setSelectedVersion(v.version_number)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                      selectedVersion === v.version_number
                        ? "bg-emerald-600/20 border border-emerald-500/40"
                        : "hover:bg-zinc-800 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedVersion === v.version_number ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-zinc-600" />
                      )}
                      <span className={`font-medium text-sm ${
                        selectedVersion === v.version_number ? "text-emerald-300" : "text-zinc-400"
                      }`}>
                        v{v.version_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 ml-6">
                      <Clock className="h-3 w-3 text-zinc-600" />
                      <span className="text-xs text-zinc-600">
                        {formatDate(v.updated_at || v.created_at)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Strategy Document */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {selectedVersion === null ? (
            <div className="flex-1 flex items-center justify-center text-zinc-600">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
                <p>Select a version to view</p>
              </div>
            </div>
          ) : isLoadingStrategy ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner className="h-8 w-8 text-emerald-500" />
            </div>
          ) : strategy ? (
            <>
              <div className="px-8 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-zinc-100 text-lg">
                    Strategy v{strategy.version_number}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Updated {formatDate(strategy.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pipelineState.status === "idle" && !strategy.full_document && (
                    <Button
                      onClick={handleStartPipeline}
                      disabled={isPipelineStarting}
                      size="sm"
                      className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white"
                    >
                      {isPipelineStarting ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Generate Strategy
                    </Button>
                  )}
                  <Button
                    onClick={() => loadStrategy(selectedVersion)}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-8 py-8">
                  {strategy.full_document ? (
                    <article className="prose-custom">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-3xl font-bold text-zinc-100 mb-4 pb-4 border-b border-zinc-800">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-bold text-emerald-400 mt-10 mb-4">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-semibold text-zinc-200 mt-6 mb-3">
                              {children}
                            </h3>
                          ),
                          h4: ({ children }) => (
                            <h4 className="text-base font-semibold text-zinc-300 mt-4 mb-2">
                              {children}
                            </h4>
                          ),
                          p: ({ children }) => (
                            <p className="text-zinc-400 leading-relaxed mb-4 text-[15px]">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-outside ml-5 space-y-2 text-zinc-400 mb-5">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-outside ml-5 space-y-2 text-zinc-400 mb-5">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-zinc-400 text-[15px] leading-relaxed">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="text-zinc-200 font-semibold">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="text-zinc-300 italic">{children}</em>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-400/30 hover:decoration-emerald-300/50 transition-colors"
                            >
                              {children}
                            </a>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-6 rounded-lg border border-zinc-800">
                              <table className="w-full">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-zinc-800/80">{children}</thead>
                          ),
                          th: ({ children }) => (
                            <th className="px-4 py-3 text-left text-zinc-300 font-semibold text-sm border-b border-zinc-700">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-4 py-3 text-zinc-400 text-sm border-b border-zinc-800/50">
                              {children}
                            </td>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-emerald-500/50 pl-4 my-4 text-zinc-400 italic bg-zinc-900/50 py-3 pr-4 rounded-r-lg">
                              {children}
                            </blockquote>
                          ),
                          hr: () => <hr className="border-zinc-800 my-8" />,
                          code: ({ className, children }) => {
                            const isInline = !className
                            if (isInline) {
                              return (
                                <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm text-emerald-300 font-mono">
                                  {children}
                                </code>
                              )
                            }
                            return (
                              <code className="block bg-zinc-900 border border-zinc-800 p-4 rounded-lg overflow-x-auto text-sm text-zinc-300 font-mono my-4">
                                {children}
                              </code>
                            )
                          },
                          pre: ({ children }) => <>{children}</>,
                        }}
                      >
                        {strategy.full_document}
                      </ReactMarkdown>
                    </article>
                  ) : (
                    <div className="text-center py-16 text-zinc-600">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
                      <p>This strategy version is empty</p>
                      <p className="text-sm mt-1 text-zinc-600">
                        {pipelineState.status === "idle" 
                          ? "Click 'Generate Strategy' to create content"
                          : "Strategy generation in progress..."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-600">
              <p>Failed to load strategy</p>
            </div>
          )}
        </div>

        {/* Chat Copilot - Only enabled after pipeline complete */}
        {selectedVersion !== null && !readOnly && (
          <div className="w-80 flex-shrink-0 border-l border-zinc-800 relative">
            {chatEnabled ? (
              <StrategyChat
                clientId={client.id}
                versionNumber={selectedVersion}
                onStrategyUpdated={handleStrategyUpdated}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-zinc-600" />
                </div>
                <h3 className="font-semibold text-zinc-400 mb-2">Chat Locked</h3>
                <p className="text-sm text-zinc-600">
                  {pipelineState.status === "idle" 
                    ? "Generate a strategy first to unlock the chat"
                    : "Chat will unlock once strategy generation completes"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent Pipeline Status - Bottom Left */}
      {pipelineState.status !== "idle" && (
        <div className="absolute bottom-4 left-4 z-40">
          <AgentPipelineStatus 
            pipelineState={pipelineState} 
            onAgentClick={(agent) => setActiveAgentPopup(agent)}
          />
        </div>
      )}

      {/* Agent Output Modal */}
      {activeAgentPopup && (
        <AgentOutputModal
          agent={activeAgentPopup}
          pipelineState={pipelineState}
          onClose={() => setActiveAgentPopup(null)}
        />
      )}

      {/* Context Popups */}
      {activePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setActivePopup(null)}
          />
          
          <div className="relative w-full max-w-5xl h-[85vh] mx-4 bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-3">
                {activePopup === "discovery-call" && (
                  <>
                    <Phone className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-lg font-semibold text-zinc-100">Discovery Call Results</h2>
                  </>
                )}
                {activePopup === "deep-dive" && (
                  <>
                    <Search className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-zinc-100">Deep Dive Results</h2>
                  </>
                )}
                {activePopup === "general-context" && (
                  <>
                    <Database className="h-5 w-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-zinc-100">General Context</h2>
                  </>
                )}
              </div>
              <button
                onClick={() => setActivePopup(null)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {activePopup === "discovery-call" && (
                <DiscoveryCallView client={client} />
              )}
              {activePopup === "deep-dive" && (
                <DiscoveryCallView client={client} isDeepDive />
              )}
              {activePopup === "general-context" && (
                <GeneralContextForm client={client} readOnly />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Agent Pipeline Status Component
function AgentPipelineStatus({ 
  pipelineState, 
  onAgentClick 
}: { 
  pipelineState: PipelineState
  onAgentClick: (agent: AgentPopup) => void
}) {
  const agents = [
    { 
      key: "waiter" as const, 
      name: "The Waiter", 
      status: pipelineState.waiter,
      icon: Utensils,
      description: "Analyzing context...",
      completedDescription: "Service stack identified",
      color: "violet"
    },
    { 
      key: "plater" as const, 
      name: "The Plater", 
      status: pipelineState.plater,
      icon: ChefHat,
      description: "Building strategy...",
      completedDescription: "Strategy complete",
      color: "emerald"
    },
  ]

  const colorClasses = {
    violet: {
      bg: "bg-violet-500/20",
      border: "border-violet-500/30",
      text: "text-violet-400",
      glow: "shadow-violet-500/20",
      hoverBg: "hover:bg-violet-500/30",
    },
    orange: {
      bg: "bg-orange-500/20",
      border: "border-orange-500/30",
      text: "text-orange-400",
      glow: "shadow-orange-500/20",
      hoverBg: "hover:bg-orange-500/30",
    },
    emerald: {
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/20",
      hoverBg: "hover:bg-emerald-500/30",
    },
  }

  const activeAgent = agents.find(a => a.status === "processing")
  const isComplete = pipelineState.status === "complete"

  return (
    <div className={`
      rounded-xl border border-zinc-700/50 bg-zinc-900/90
      backdrop-blur-sm shadow-lg
      p-3 min-w-[220px]
      ${!isComplete ? "animate-pulse" : ""}
    `}>
      {/* Agent buttons */}
      <div className="space-y-2">
        {agents.map((agent) => {
          const colors = colorClasses[agent.color as keyof typeof colorClasses]
          const Icon = agent.icon
          const isActive = agent.status === "processing"
          const isClickable = agent.status === "complete"
          
          return (
            <button
              key={agent.key}
              onClick={() => isClickable && onAgentClick(agent.key)}
              disabled={!isClickable}
              className={`
                w-full flex items-center gap-3 p-2.5 rounded-lg transition-all
                ${isActive ? `${colors.bg} ${colors.border} border` : ""}
                ${isClickable ? `${colors.hoverBg} cursor-pointer` : "cursor-default"}
                ${agent.status === "idle" ? "opacity-40" : ""}
              `}
            >
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center
                ${agent.status !== "idle" ? colors.bg : "bg-zinc-800"}
              `}>
                <Icon className={`h-4 w-4 ${agent.status !== "idle" ? colors.text : "text-zinc-600"}`} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${agent.status !== "idle" ? colors.text : "text-zinc-600"}`}>
                    {agent.name}
                  </span>
                  {isActive && <Spinner className={`h-3 w-3 ${colors.text}`} />}
                  {agent.status === "complete" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                </div>
                <p className="text-xs text-zinc-500">
                  {isActive ? agent.description : agent.status === "complete" ? agent.completedDescription : "Waiting..."}
                </p>
              </div>
            </button>
          )
        })}
      </div>
      
      {/* Progress bar */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-zinc-800/50">
        {agents.map((agent, idx) => (
          <div key={agent.key} className="flex-1 flex items-center gap-1">
            <div className={`
              flex-1 h-1 rounded-full transition-all duration-300
              ${agent.status === "complete" ? "bg-emerald-500" : 
                agent.status === "processing" ? "bg-blue-400 animate-pulse" : 
                "bg-zinc-800"}
            `} />
          </div>
        ))}
      </div>
      
      {isComplete && (
        <p className="text-xs text-zinc-500 mt-2 text-center">Click an agent to view its output</p>
      )}
    </div>
  )
}

// Agent Output Modal
function AgentOutputModal({ 
  agent, 
  pipelineState, 
  onClose 
}: { 
  agent: AgentPopup
  pipelineState: PipelineState
  onClose: () => void
}) {
  const agentConfig = {
    waiter: {
      name: "The Waiter",
      icon: Utensils,
      color: "violet",
      output: pipelineState.waiterOutput,
    },
    plater: {
      name: "The Plater",
      icon: ChefHat,
      color: "emerald",
      output: pipelineState.platerOutput,
    },
  }

  if (!agent) return null

  const config = agentConfig[agent]
  const Icon = config.icon
  const output = config.output

  const colorClasses = {
    violet: { text: "text-violet-400", bg: "bg-violet-500/20", border: "border-violet-500/30" },
    orange: { text: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" },
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
  }

  const colors = colorClasses[config.color as keyof typeof colorClasses]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${colors.border} ${colors.bg}`}>
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${colors.text}`} />
            <h2 className={`text-lg font-semibold ${colors.text}`}>{config.name} Output</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {output ? (
            <>
              {/* Reasoning Summary */}
              {output.reasoning_summary && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Reasoning
                  </h3>
                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {output.reasoning_summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Output Text */}
              {output.output_text && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Output
                  </h3>
                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 max-h-64 overflow-y-auto">
                    <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-mono">
                      {output.output_text}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tool Calls */}
              {output.tool_calls && output.tool_calls.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Tool Calls ({output.tool_calls.length})
                  </h3>
                  <div className="space-y-2">
                    {output.tool_calls.map((tool, idx) => (
                      <div 
                        key={idx}
                        className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50"
                      >
                        <span className="text-amber-400 font-mono text-sm">{tool.name}</span>
                        {tool.output && (
                          <p className="text-zinc-500 text-xs mt-1 truncate">{tool.output}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage Stats */}
              {output.usage && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Token Usage
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 text-center">
                      <p className="text-lg font-semibold text-zinc-200">
                        {output.usage.input_tokens.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">Input Tokens</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 text-center">
                      <p className="text-lg font-semibold text-zinc-200">
                        {output.usage.output_tokens.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">Output Tokens</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 text-center">
                      <p className="text-lg font-semibold text-blue-400">
                        {output.usage.reasoning_tokens.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">Reasoning Tokens</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
                {output.model && <span>Model: <span className="text-zinc-400">{output.model}</span></span>}
                {output.id && <span>ID: <span className="text-zinc-400 font-mono">{output.id}</span></span>}
                {output.completed_at && (
                  <span>
                    Completed: <span className="text-zinc-400">
                      {new Date(output.completed_at).toLocaleString()}
                    </span>
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <p>No output data available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
