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
  Lock,
  Unlock,
  Download,
  Copy,
  Wand2,
  Wrench,
  RotateCcw,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Props {
  client: Client
  readOnly?: boolean
}

type ContextPopup = "discovery-call" | "deep-dive" | "general-context" | null
type AgentStatus = "idle" | "processing" | "complete" | "error"
type AgentPopup = "waiter" | "plater" | "wizard" | "fixer" | null

interface AgentOutput {
  id?: string | null
  model?: string | null
  output_text?: string | null
  reasoning_summary?: string | null
  tool_calls?: { name: string; output?: string | null }[]
  usage?: {
    input_tokens: number
    output_tokens: number
    reasoning_tokens?: number
  } | null
  completed_at?: string | null
}

interface PipelineState {
  status: "idle" | "waiter_processing" | "plater_processing" | "wizard_processing" | "fixer_processing" | "complete" | "error"
  waiter: AgentStatus
  plater: AgentStatus
  wizard: AgentStatus
  fixer: AgentStatus
  error?: string
  waiterOutput?: AgentOutput | null
  platerOutput?: AgentOutput | null
  wizardOutput?: AgentOutput | null
  fixerOutput?: AgentOutput | null
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
  const [justRefreshed, setJustRefreshed] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  
  // Agent Pipeline State (4-agent pipeline: Waiter → Plater → Wizard → Fixer)
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    status: "idle",
    waiter: "idle",
    plater: "idle",
    wizard: "idle",
    fixer: "idle",
  })
  const [isPipelineStarting, setIsPipelineStarting] = useState(false)
  const pipelinePollingRef = useRef<NodeJS.Timeout | null>(null)

  // Chat is enabled if pipeline completed OR strategy already has content
  const strategyHasContent = !!(strategy?.full_document)
  const chatEnabled = pipelineState.status === "complete" || strategyHasContent

  // Load versions on mount and when client changes
  useEffect(() => {
    // Reset state when client changes
    setVersions([])
    setSelectedVersion(null)
    setStrategy(null)
    setPipelineState({
      status: "idle",
      waiter: "idle",
      plater: "idle",
    })
    setError(null)
    setContextExpanded(false)
    setActivePopup(null)
    setActiveAgentPopup(null)
    
    // Clear any existing polling
    if (pipelinePollingRef.current) {
      clearInterval(pipelinePollingRef.current)
      pipelinePollingRef.current = null
    }
    
    // Load versions for the new client
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

  const loadStrategy = async (versionNumber: number, isRefresh = false) => {
    setIsLoadingStrategy(true)
    try {
      const result = await api.getVersionedStrategy(client.id, versionNumber)
      setStrategy(result)
      
      // Show refresh indicator if this was a refresh (not initial load)
      if (isRefresh) {
        setJustRefreshed(true)
        setTimeout(() => setJustRefreshed(false), 2000)
      }
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
        wizard: status.wizard_status as AgentStatus,
        fixer: status.fixer_status as AgentStatus,
        error: status.error || undefined,
        waiterOutput: status.waiter_output || null,
        platerOutput: status.plater_output || null,
        wizardOutput: status.wizard_output || null,
        fixerOutput: status.fixer_output || null,
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
    
    // Poll every 5 seconds - agents run in background and take 5-10 min each
    pipelinePollingRef.current = setInterval(async () => {
      try {
        const status = await api.getStrategyPipelineStatus(client.id, versionNumber)
        setPipelineState({
          status: status.status as PipelineState["status"],
          waiter: status.waiter_status as AgentStatus,
          plater: status.plater_status as AgentStatus,
          wizard: status.wizard_status as AgentStatus,
          fixer: status.fixer_status as AgentStatus,
          error: status.error || undefined,
          waiterOutput: status.waiter_output || null,
          platerOutput: status.plater_output || null,
          wizardOutput: status.wizard_output || null,
          fixerOutput: status.fixer_output || null,
        })
        
        // Stop polling when complete or error
        if (status.status === "complete" || status.status === "error") {
          if (pipelinePollingRef.current) {
            clearInterval(pipelinePollingRef.current)
            pipelinePollingRef.current = null
          }
          // Reload strategy on completion
          if (status.status === "complete") {
            loadStrategy(versionNumber, true)
          }
        }
      } catch (e) {
        console.error("Pipeline polling error:", e)
      }
    }, 5000) // Poll every 5 seconds
  }

  const handleCreateVersion = async (triggerPipeline = false, fromScratch = false) => {
    setIsCreating(true)
    try {
      const isFirstVersion = versions.length === 0
      const copyFrom = fromScratch ? undefined : (versions.length > 0 ? versions[0].version_number : undefined)
      const result = await api.createStrategyVersion(client.id, copyFrom)
      await loadVersions()
      setSelectedVersion(result.version_number)
      
      // If this is the first version OR explicitly requested, trigger the pipeline
      if (isFirstVersion || triggerPipeline) {
        // Gather context data and start pipeline
        const [dcResult, ddResult] = await Promise.all([
          api.getDiscoveryCallResult(client.id.toString()).catch(() => null),
          api.getDeepDiveResult(client.id.toString()).catch(() => null),
        ])
        
        const call1Notes = (dcResult as DiscoveryCallResult)?.factoids_summary || "No Call 1 notes available"
        const call2Notes = (ddResult as DiscoveryCallResult)?.factoids_summary || "No Call 2 notes available"
        
        let call2QA = "No Q&A available"
        if ((ddResult as DiscoveryCallResult)?.answers_data) {
          call2QA = (ddResult as DiscoveryCallResult).answers_data!.map(a => {
            const certaintyLabel = a.certainty === "1" ? "Verified" : a.certainty === "2" ? "Likely" : "Unknown"
            return `Q${a.question_number}: ${a.question}\nA: ${a.answer || "No answer"}\nCertainty: ${certaintyLabel}`
          }).join("\n\n---\n\n")
        }
        
        await api.startStrategyPipeline(client.id, result.version_number, call1Notes, call2Notes, call2QA)
        
        setPipelineState({
          status: "waiter_processing",
          waiter: "processing",
          plater: "idle",
          wizard: "idle",
          fixer: "idle",
        })
        
        startPipelinePolling(result.version_number)
      }
    } catch (e: any) {
      console.error("Failed to create strategy version:", e)
      setError(e.message || "Failed to create version")
    } finally {
      setIsCreating(false)
    }
  }

  const handleLockVersion = async () => {
    if (selectedVersion === null) return
    
    if (!confirm(`Lock version ${selectedVersion}? This will prevent further edits until unlocked.`)) {
      return
    }
    
    try {
      await api.lockStrategyVersion(client.id, selectedVersion)
      // Refresh the strategy to get the updated lock status
      await loadStrategy(selectedVersion, true)
      // Refresh versions list to update lock indicators
      await loadVersions()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to lock version"
      alert(message)
    }
  }

  const handleUnlockVersion = async () => {
    if (selectedVersion === null) return
    
    if (!confirm(`Unlock version ${selectedVersion}? This will allow edits again.`)) {
      return
    }
    
    try {
      await api.unlockStrategyVersion(client.id, selectedVersion)
      // Refresh the strategy to get the updated lock status
      await loadStrategy(selectedVersion, true)
      // Refresh versions list to update lock indicators
      await loadVersions()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to unlock version"
      alert(message)
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
          const certaintyLabel = a.certainty === "1" ? "Verified" : a.certainty === "2" ? "Likely" : "Unknown"
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
      loadStrategy(selectedVersion, true)
    }
  }

  const handleCopyStrategy = async () => {
    if (!strategy?.full_document) return
    
    try {
      await navigator.clipboard.writeText(strategy.full_document)
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy strategy:", err)
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
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => handleCreateVersion(false, true)}
                    disabled={isCreating}
                    size="sm"
                    className="h-7 px-2 bg-zinc-700 hover:bg-zinc-600 text-white"
                    title="Create new version from scratch"
                  >
                    {isCreating ? <Spinner className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                  </Button>
                  <Button
                    onClick={() => handleCreateVersion()}
                    disabled={isCreating}
                    size="sm"
                    className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                    title="Create new version (copy from latest)"
                  >
                    {isCreating ? <Spinner className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </Button>
                </div>
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
                    onClick={() => handleCreateVersion()}
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
                        ? "bg-blue-600/20 border border-blue-500/40"
                        : "hover:bg-zinc-800 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {v.is_locked ? (
                        <Lock className="h-4 w-4 text-amber-400" />
                      ) : selectedVersion === v.version_number ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-blue-600" />
                      )}
                      <span className={`font-medium text-sm ${
                        selectedVersion === v.version_number ? "text-blue-300" : "text-blue-400"
                      }`}>
                        v{v.version_number}
                      </span>
                      {v.is_locked && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded ml-auto">
                          LOCKED
                        </span>
                      )}
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

          {/* Agent Pipeline Status - Compact Icons */}
          {pipelineState.status !== "idle" && (
            <div className="border-t border-zinc-800 p-2">
              <div className="flex items-center gap-1">
                <CompactAgentStatus
                  agentKey="waiter"
                  status={pipelineState.waiter}
                  icon={Utensils}
                  color="violet"
                  onClick={() => setActiveAgentPopup("waiter")}
                />
                <CompactAgentStatus
                  agentKey="plater"
                  status={pipelineState.plater}
                  icon={ChefHat}
                  color="emerald"
                  onClick={() => setActiveAgentPopup("plater")}
                />
                <CompactAgentStatus
                  agentKey="wizard"
                  status={pipelineState.wizard}
                  icon={Wand2}
                  color="orange"
                  onClick={() => setActiveAgentPopup("wizard")}
                />
                <CompactAgentStatus
                  agentKey="fixer"
                  status={pipelineState.fixer}
                  icon={Wrench}
                  color="orange"
                  onClick={() => setActiveAgentPopup("fixer")}
                />
              </div>
            </div>
          )}
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
                  {strategy.full_document && (
                    <>
                      <button
                        onClick={handleCopyStrategy}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        {justCopied ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy All
                          </>
                        )}
                      </button>
                      <a
                        href={api.getStrategyPdfUrl(client.id, strategy.version_number)}
                        download
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Export PDF
                      </a>
                    </>
                  )}
                  {strategy.is_locked ? (
                    <Button
                      onClick={handleUnlockVersion}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-amber-700 hover:bg-amber-900/30 text-amber-400 hover:text-amber-300"
                    >
                      <Unlock className="h-4 w-4" />
                      Unlock
                    </Button>
                  ) : strategy.full_document && (
                    <Button
                      onClick={handleLockVersion}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    >
                      <Lock className="h-4 w-4" />
                      Lock
                    </Button>
                  )}
                  <Button
                    onClick={() => loadStrategy(selectedVersion, true)}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
                
                {/* Refresh indicator */}
                {justRefreshed && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-sm text-emerald-400 animate-pulse">
                    <CheckCircle2 className="h-4 w-4" />
                    Strategy updated
                  </div>
                )}
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
                isLocked={strategy?.is_locked}
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

// Compact Agent Status Component (for sidebar)
function CompactAgentStatus({
  agentKey,
  status,
  icon: Icon,
  color,
  onClick,
}: {
  agentKey: AgentPopup
  status: AgentStatus
  icon: any
  color: "violet" | "emerald" | "orange"
  onClick: () => void
}) {
  const colorClasses = {
    violet: {
      bg: "bg-violet-500/20",
      border: "border-violet-500/30",
      text: "text-violet-400",
      hoverBg: "hover:bg-violet-500/30",
    },
    orange: {
      bg: "bg-orange-500/20",
      border: "border-orange-500/30",
      text: "text-orange-400",
      hoverBg: "hover:bg-orange-500/30",
    },
    emerald: {
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      hoverBg: "hover:bg-emerald-500/30",
    },
  }

  const colors = colorClasses[color]
  const isProcessing = status === "processing"
  const isComplete = status === "complete"
  const isIdle = status === "idle"
  const isError = status === "error"

  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center p-1.5 rounded transition-all
        ${isProcessing ? `${colors.bg} ${colors.border} border animate-pulse` : ""}
        ${isComplete ? `${colors.bg} ${colors.border} border` : ""}
        ${isIdle ? "opacity-30" : ""}
        ${isError ? "bg-red-500/20 border border-red-500/30" : ""}
        ${colors.hoverBg} cursor-pointer
      `}
      title={
        isProcessing ? "In progress - click to view status" :
        isComplete ? "Complete - click to view output" :
        isIdle ? "Not started - click to view status" :
        isError ? "Error - click to view details" :
        "Click to view status"
      }
    >
      <Icon className={`h-4 w-4 ${isIdle ? "text-zinc-600" : colors.text}`} />
      {isProcessing && <Spinner className={`h-3 w-3 ml-1 ${colors.text}`} />}
      {isComplete && <CheckCircle2 className="h-3 w-3 ml-1 text-emerald-500" />}
    </button>
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
    wizard: {
      name: "The Wizard",
      icon: Wand2,
      color: "orange",
      output: pipelineState.wizardOutput,
    },
    fixer: {
      name: "The Fixer",
      icon: Wrench,
      color: "orange",
      output: pipelineState.fixerOutput,
    },
  }

  if (!agent) return null

  const config = agentConfig[agent]
  const Icon = config.icon
  const output = config.output

  // Get agent status
  const agentStatus = 
    agent === "waiter" ? pipelineState.waiter :
    agent === "plater" ? pipelineState.plater :
    agent === "wizard" ? pipelineState.wizard :
    agent === "fixer" ? pipelineState.fixer :
    "idle"

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
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-600"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {agentStatus === "processing" ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner className="h-8 w-8 mb-4 text-zinc-400" />
              <p className="text-zinc-400 text-sm">In progress...</p>
            </div>
          ) : agentStatus === "idle" ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icon className={`h-8 w-8 mb-4 ${colors.text} opacity-50`} />
              <p className="text-zinc-400 text-sm">Not started</p>
            </div>
          ) : agentStatus === "error" ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 mb-4 text-red-400" />
              <p className="text-red-400 text-sm">Error occurred</p>
              {pipelineState.error && (
                <p className="text-zinc-500 text-xs mt-2">{pipelineState.error}</p>
              )}
            </div>
          ) : output ? (
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
                        {(output.usage.reasoning_tokens ?? 0).toLocaleString()}
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
