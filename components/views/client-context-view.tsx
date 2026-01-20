"use client"

import { useState, useEffect, useRef } from "react"
import type { Client } from "@/types"
import { api } from "@/lib/api"
import { GeneralContextForm } from "@/components/views/general-context-form"
import { DiscoveryCallView } from "@/components/views/discovery-call-view"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  ArrowLeft,
  Globe,
  Zap,
  ChevronRight,
  Clock,
  Phone,
  Search,
  Database,
  X,
  CheckCircle,
} from "lucide-react"

interface Props {
  client: Client
  readOnly?: boolean
}

type ComponentStatus = "idle" | "processing" | "complete" | "error"
type ActiveView = "admin" | "discovery-call" | "deep-dive" | "general"

interface FlowState {
  discoveryCall: ComponentStatus
  deepDive: ComponentStatus
  generalContext: ComponentStatus
}

function formatTime(seconds: number): string {
  const isNegative = seconds < 0
  const absSeconds = Math.abs(seconds)
  const mins = Math.floor(absSeconds / 60)
  const secs = absSeconds % 60
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`
  return isNegative ? `-${formatted}` : formatted
}

export function ClientContextView({ client, readOnly = false }: Props) {
  const [activeView, setActiveView] = useState<ActiveView>("admin")
  const [domainInput, setDomainInput] = useState("")
  const [discoveryCallUrl, setDiscoveryCallUrl] = useState("")
  const [deepDiveUrl, setDeepDiveUrl] = useState("")
  const [isActivating, setIsActivating] = useState(false)
  const [flowState, setFlowState] = useState<FlowState>({
    discoveryCall: "idle",
    deepDive: "idle",
    generalContext: "idle",
  })
  
  // Progress tracking for Discovery Call and Deep Dive
  const [dcProgressSteps, setDcProgressSteps] = useState<string[]>([])
  const [ddProgressSteps, setDdProgressSteps] = useState<string[]>([])
  
  // Timer state - tracks elapsed seconds since pipeline started
  const [pipelineTimer, setPipelineTimer] = useState<number | null>(null)
  const [pipelineStartTime, setPipelineStartTime] = useState<Date | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const PIPELINE_TIMEOUT_SECONDS = 1800 // 30 minutes
  
  // Polling interval refs
  const dcPollingRef = useRef<NodeJS.Timeout | null>(null)
  const ddPollingRef = useRef<NodeJS.Timeout | null>(null)
  const gcPollingRef = useRef<NodeJS.Timeout | null>(null)

  // Pipeline is still running if any job is processing
  const isPipelineRunning = flowState.discoveryCall === "processing" || 
                            flowState.deepDive === "processing" || 
                            flowState.generalContext === "processing"

  // Start/stop timer based on pipeline status
  useEffect(() => {
    if (isPipelineRunning && !timerIntervalRef.current) {
      const startTime = pipelineStartTime || new Date()
      if (!pipelineStartTime) {
        setPipelineStartTime(startTime)
      }
      
      const initialElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
      setPipelineTimer(initialElapsed)
      
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
        setPipelineTimer(elapsed)
        
        if (elapsed >= PIPELINE_TIMEOUT_SECONDS) {
          handleAbortPipeline()
        }
      }, 1000)
    } else if (!isPipelineRunning && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
      setPipelineTimer(null)
      setPipelineStartTime(null)
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [isPipelineRunning, pipelineStartTime])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (dcPollingRef.current) clearInterval(dcPollingRef.current)
      if (ddPollingRef.current) clearInterval(ddPollingRef.current)
      if (gcPollingRef.current) clearInterval(gcPollingRef.current)
    }
  }, [])
  
  // Auto-save domain when user types (debounced)
  const domainLoadedRef = useRef(false)
  const domainSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (!domainLoadedRef.current || !domainInput.trim() || readOnly) return
    
    if (domainSaveTimeoutRef.current) clearTimeout(domainSaveTimeoutRef.current)
    
    domainSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.saveDiscoveryDocument(client.id, { domain: domainInput.trim() })
      } catch (e) {
        console.error("[Domain] Failed to auto-save:", e)
      }
    }, 1000)
    
    return () => {
      if (domainSaveTimeoutRef.current) clearTimeout(domainSaveTimeoutRef.current)
    }
  }, [domainInput, client.id, readOnly])

  // Polling functions
  const pollDCStatus = (onComplete?: () => void) => {
    if (dcPollingRef.current) clearInterval(dcPollingRef.current)
    dcPollingRef.current = setInterval(async () => {
      try {
        const status = await api.getDiscoveryCallProcessStatus(client.id)
        console.log("[DC Poll] Status:", status.status)
        
        if (status.progress_steps) setDcProgressSteps(status.progress_steps)
        
        if (status.status === "complete") {
          clearInterval(dcPollingRef.current!)
          dcPollingRef.current = null
          setFlowState(prev => ({ ...prev, discoveryCall: "complete" }))
          setDcProgressSteps([])
          onComplete?.()
        } else if (status.status === "error" || status.status === "cancelled") {
          clearInterval(dcPollingRef.current!)
          dcPollingRef.current = null
          setFlowState(prev => ({ ...prev, discoveryCall: status.status === "error" ? "error" : "idle" }))
          setDcProgressSteps([])
        }
      } catch (e) {
        console.error("DC poll error:", e)
      }
    }, 5000)
  }

  const pollDeepDiveStatus = (onComplete?: () => void) => {
    if (ddPollingRef.current) clearInterval(ddPollingRef.current)
    ddPollingRef.current = setInterval(async () => {
      try {
        const status = await api.getDeepDiveProcessStatus(client.id)
        console.log("[DD Poll] Status:", status.status)
        
        if (status.progress_steps) setDdProgressSteps(status.progress_steps)
        
        if (status.status === "complete") {
          clearInterval(ddPollingRef.current!)
          ddPollingRef.current = null
          setFlowState(prev => ({ ...prev, deepDive: "complete" }))
          setDdProgressSteps([])
          onComplete?.()
        } else if (status.status === "error" || status.status === "cancelled") {
          clearInterval(ddPollingRef.current!)
          ddPollingRef.current = null
          setFlowState(prev => ({ ...prev, deepDive: status.status === "error" ? "error" : "idle" }))
          setDdProgressSteps([])
        }
      } catch (e) {
        console.error("DD poll error:", e)
      }
    }, 5000)
  }

  const pollGCStatus = () => {
    if (gcPollingRef.current) clearInterval(gcPollingRef.current)
    gcPollingRef.current = setInterval(async () => {
      try {
        const status = await api.getContextFetchStatus(client.id)
        console.log("[GC Poll] Status:", status.status)
        
        if (status.status === "complete") {
          clearInterval(gcPollingRef.current!)
          gcPollingRef.current = null
          setFlowState(prev => ({ ...prev, generalContext: "complete" }))
        } else if (status.status === "error" || status.status === "cancelled") {
          clearInterval(gcPollingRef.current!)
          gcPollingRef.current = null
          setFlowState(prev => ({ ...prev, generalContext: status.status === "error" ? "error" : "idle" }))
        }
      } catch (e) {
        console.error("GC poll error:", e)
      }
    }, 3000)
  }

  // Load existing data on mount
  useEffect(() => {
    domainLoadedRef.current = false
    setDomainInput("")
    setDiscoveryCallUrl("")
    setDeepDiveUrl("")
    setIsActivating(false)
    setDcProgressSteps([])
    setDdProgressSteps([])
    setPipelineTimer(null)
    setPipelineStartTime(null)
    setActiveView("admin")
    setFlowState({ discoveryCall: "idle", deepDive: "idle", generalContext: "idle" })
    
    // Clear polling
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null }
    if (dcPollingRef.current) { clearInterval(dcPollingRef.current); dcPollingRef.current = null }
    if (ddPollingRef.current) { clearInterval(ddPollingRef.current); ddPollingRef.current = null }
    if (gcPollingRef.current) { clearInterval(gcPollingRef.current); gcPollingRef.current = null }

    const loadData = async () => {
      try {
        // Load domain
        try {
          const doc = await api.getDiscoveryDocument(client.id)
          if (doc?.domain) setDomainInput(doc.domain)
        } catch {}
        domainLoadedRef.current = true
        
        // Load discovery call URL and deep dive URL from context
        try {
          const ctx = await api.getContext(client.id)
          if (ctx?.discovery_call_url) setDiscoveryCallUrl(ctx.discovery_call_url)
          if (ctx?.deep_dive_url) setDeepDiveUrl(ctx.deep_dive_url)
        } catch {}
        
        // Check job statuses
        let dcState: ComponentStatus = "idle"
        let ddState: ComponentStatus = "idle"
        let gcState: ComponentStatus = "idle"
        let earliestStart: Date | null = null
        
        // DC status
        try {
          const dcStatus = await api.getDiscoveryCallProcessStatus(client.id)
          if (dcStatus.status === "running" || dcStatus.status === "pending") {
            dcState = "processing"
            pollDCStatus()
            if (dcStatus.started_at) earliestStart = new Date(dcStatus.started_at)
          } else if (dcStatus.status === "complete") {
            dcState = "complete"
          } else if (dcStatus.status === "error") {
            dcState = "error"
          } else {
            // Check if results exist
            try {
              const dcResult = await api.getDiscoveryCallResult(client.id)
              if (dcResult?.answers_data) dcState = "complete"
            } catch {}
          }
        } catch {}
        
        // DD status
        try {
          const ddStatus = await api.getDeepDiveProcessStatus(client.id)
          if (ddStatus.status === "running" || ddStatus.status === "pending") {
            ddState = "processing"
            pollDeepDiveStatus()
            if (ddStatus.started_at && (!earliestStart || new Date(ddStatus.started_at) < earliestStart)) {
              earliestStart = new Date(ddStatus.started_at)
            }
          } else if (ddStatus.status === "complete") {
            ddState = "complete"
          } else if (ddStatus.status === "error") {
            ddState = "error"
          } else {
            try {
              const ddResult = await api.getDeepDiveResult(client.id)
              if (ddResult?.answers_data) ddState = "complete"
            } catch {}
          }
        } catch {}
        
        // GC status
        try {
          const gcStatus = await api.getContextFetchStatus(client.id)
          if (gcStatus.status === "running" || gcStatus.status === "pending") {
            gcState = "processing"
            pollGCStatus()
            if (gcStatus.started_at && (!earliestStart || new Date(gcStatus.started_at) < earliestStart)) {
              earliestStart = new Date(gcStatus.started_at)
            }
          } else if (gcStatus.status === "complete") {
            gcState = "complete"
          } else if (gcStatus.status === "error") {
            gcState = "error"
          } else {
            try {
              const ctx = await api.getContext(client.id)
              if (ctx?.about || ctx?.author_tone) gcState = "complete"
            } catch {}
          }
        } catch {}
        
        setFlowState({ discoveryCall: dcState, deepDive: ddState, generalContext: gcState })
        
        if (earliestStart) {
          setPipelineStartTime(earliestStart)
          setIsActivating(true)
        }
      } catch (e) {
        console.error("Error loading data:", e)
      }
    }
    
    loadData()
  }, [client.id])

  // Only domain is required - URLs are optional
  const canActivate = !!domainInput.trim()
  const hasDiscoveryCall = !!discoveryCallUrl.trim()
  const hasDeepDive = !!deepDiveUrl.trim()

  // Helper to start General Context (final step)
  const startGeneralContext = async () => {
    setFlowState(prev => ({ ...prev, generalContext: "processing" }))
    try {
      await api.fetchContextFromSiteAsync(client.id, domainInput.trim())
      pollGCStatus()
    } catch (e) {
      console.error("Failed to start GC:", e)
      setFlowState(prev => ({ ...prev, generalContext: "error" }))
    }
  }

  // Helper to start Deep Dive, then General Context
  const startDeepDive = async () => {
    setFlowState(prev => ({ ...prev, deepDive: "processing" }))
    try {
      await api.processDeepDive(client.id, deepDiveUrl.trim())
      pollDeepDiveStatus(startGeneralContext)
    } catch (e) {
      console.error("Failed to start DD:", e)
      setFlowState(prev => ({ ...prev, deepDive: "error" }))
    }
  }

  // Sequential pipeline: DC (optional) -> DD (optional) -> GC (always)
  const handleActivate = async () => {
    if (!canActivate) return
    
    setIsActivating(true)
    
    // Save inputs
    try {
      await api.saveDiscoveryDocument(client.id, { domain: domainInput.trim() })
      await api.saveContext(client.id, { 
        domain: domainInput.trim(),
        discovery_call_url: discoveryCallUrl.trim() || null,
        deep_dive_url: deepDiveUrl.trim() || null
      })
    } catch (e) {
      console.error("Failed to save inputs:", e)
    }

    // Determine pipeline flow based on which URLs are provided
    if (hasDiscoveryCall) {
      // Start with Discovery Call
      setFlowState(prev => ({ ...prev, discoveryCall: "processing" }))
      try {
        await api.processDiscoveryCall(client.id, discoveryCallUrl.trim())
        pollDCStatus(async () => {
          // After DC: run DD if provided, otherwise go to GC
          if (hasDeepDive) {
            await startDeepDive()
          } else {
            await startGeneralContext()
          }
        })
      } catch (e) {
        console.error("Failed to start DC:", e)
        setFlowState(prev => ({ ...prev, discoveryCall: "error" }))
      }
    } else if (hasDeepDive) {
      // No DC, but has DD - start with Deep Dive
      await startDeepDive()
    } else {
      // No DC, no DD - go straight to General Context
      await startGeneralContext()
    }
  }

  const handleAbortPipeline = async () => {
    try {
      await api.cancelJobs(client.id, ["discovery_call", "deep_dive", "general_context"])
    } catch (e) {
      console.error("Failed to cancel jobs:", e)
    }
    
    // Stop polling
    if (dcPollingRef.current) { clearInterval(dcPollingRef.current); dcPollingRef.current = null }
    if (ddPollingRef.current) { clearInterval(ddPollingRef.current); ddPollingRef.current = null }
    if (gcPollingRef.current) { clearInterval(gcPollingRef.current); gcPollingRef.current = null }
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null }
    
    setPipelineTimer(null)
    setPipelineStartTime(null)
    
    setFlowState(prev => ({
      discoveryCall: prev.discoveryCall === "processing" ? "idle" : prev.discoveryCall,
      deepDive: prev.deepDive === "processing" ? "idle" : prev.deepDive,
      generalContext: prev.generalContext === "processing" ? "idle" : prev.generalContext,
    }))
    
    setIsActivating(false)
  }

  // Detail views
  if (activeView !== "admin") {
    return (
      <div className="h-full overflow-auto">
        <Button 
          variant="ghost" 
          onClick={() => setActiveView("admin")}
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </Button>
        
        {activeView === "discovery-call" && <DiscoveryCallView client={client} />}
        {activeView === "deep-dive" && <DiscoveryCallView client={client} isDeepDive />}
        {activeView === "general" && <GeneralContextForm client={client} readOnly={readOnly} />}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Client Data Pipeline</h1>
          <p className="text-slate-400">Orchestrate your client onboarding workflow</p>
        </div>
        {/* Legend */}
        <div className="flex gap-6 text-sm">
          <LegendItem color="bg-slate-600" label="Not Started" />
          <LegendItem color="bg-violet-500" pulse label="Processing" />
          <LegendItem color="bg-emerald-500" label="Complete" />
          <LegendItem color="bg-red-500" label="Error" />
        </div>
      </div>

      {/* Main Pipeline Flow */}
      <div className="space-y-8">
        
        {/* Input Section */}
        <div className="relative rounded-xl border-2 border-dashed border-slate-700 p-6 pt-10">
          <div className="absolute -top-3 left-6 bg-slate-950 px-3">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Inputs</span>
          </div>
          
          <div className="space-y-6">
            {/* Input Row */}
            <div className="flex items-start gap-6">
              <StageLabel number={1} label="Input" />
              <div className="flex gap-4 flex-wrap">
                <InputCard
                  title="Domain / Company Info"
                  icon={<Globe className="h-5 w-5" />}
                  filled={!!domainInput.trim()}
                >
                  <Textarea
                    placeholder="https://example.com/"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none"
                    disabled={isPipelineRunning}
                  />
                </InputCard>
                <InputCard
                  title="Discovery Call URL"
                  icon={<Phone className="h-5 w-5" />}
                  filled={!!discoveryCallUrl.trim()}
                  optional
                >
                  <Textarea
                    placeholder="Fathom URL (e.g., https://fathom.video/calls/...)"
                    value={discoveryCallUrl}
                    onChange={(e) => setDiscoveryCallUrl(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none"
                    disabled={isPipelineRunning}
                  />
                </InputCard>
                <InputCard
                  title="Deep Dive URL"
                  icon={<Search className="h-5 w-5" />}
                  filled={!!deepDiveUrl.trim()}
                  optional
                >
                  <Textarea
                    placeholder="Deep Dive Fathom URL (e.g., https://fathom.video/calls/...)"
                    value={deepDiveUrl}
                    onChange={(e) => setDeepDiveUrl(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none"
                    disabled={isPipelineRunning}
                  />
                </InputCard>
              </div>
            </div>
            
            {/* Activate Button */}
            <div className="flex items-center gap-6">
              <div className="w-20" />
              {isPipelineRunning ? (
                <div className="flex items-center gap-2">
                  <Button
                    disabled
                    className="px-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 cursor-not-allowed"
                  >
                    <Spinner className="h-4 w-4 mr-2" />
                    Pipeline Running...
                  </Button>
                  <Button
                    onClick={handleAbortPipeline}
                    variant="outline"
                    className="px-4 border-red-500/50 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Abort
                  </Button>
                  {pipelineTimer !== null && (
                    <div className="flex items-center gap-2 text-sm text-violet-400 ml-4">
                      <Clock className="h-4 w-4 animate-pulse" />
                      <span className="font-mono">{formatTime(pipelineTimer)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleActivate}
                  disabled={!canActivate || readOnly}
                  className="px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 disabled:opacity-50"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {readOnly ? "View Only" : "Activate Pipeline"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Connection Line */}
        <ConnectionLine active={flowState.discoveryCall !== "idle" || flowState.deepDive !== "idle" || flowState.generalContext !== "idle"} />

        {/* Results Section */}
        <div className="relative rounded-xl border-2 border-dashed border-slate-700 p-6 pt-10">
          <div className="absolute -top-3 left-6 bg-slate-950 px-3">
            <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Results</span>
          </div>
          
          <div className="flex items-start gap-6">
            <StageLabel number={2} label="Output" />
            <div className="flex gap-4 flex-wrap">
              <ResultCard
                title="Discovery Call Results"
                icon={<Phone className="h-5 w-5" />}
                status={flowState.discoveryCall}
                onClick={() => setActiveView("discovery-call")}
                skipped={!hasDiscoveryCall}
                progressSteps={dcProgressSteps}
                progressStepsConfig={DC_PROGRESS_STEPS}
              />
              <ResultCard
                title="Deep Dive Results"
                icon={<Search className="h-5 w-5" />}
                status={flowState.deepDive}
                onClick={() => setActiveView("deep-dive")}
                skipped={!hasDeepDive}
                progressSteps={ddProgressSteps}
                progressStepsConfig={DD_PROGRESS_STEPS}
              />
              <ResultCard
                title="General Context Results"
                icon={<Database className="h-5 w-5" />}
                status={flowState.generalContext}
                onClick={() => setActiveView("general")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Components

function StageLabel({ number, label }: { number: number; label: string }) {
  return (
    <div className="w-20 flex-shrink-0 text-center">
      <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 font-mono text-sm mb-1">
        {number}
      </div>
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

function ConnectionLine({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-6">
      <div className="w-20 flex justify-center">
        <div className={`w-0.5 h-8 ${active ? "bg-gradient-to-b from-emerald-500 to-emerald-500/20" : "bg-slate-700"}`} />
      </div>
      <ChevronRight className={`h-4 w-4 ${active ? "text-emerald-500" : "text-slate-700"}`} />
    </div>
  )
}

function LegendItem({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <div className={`w-2.5 h-2.5 rounded-full ${color} ${pulse ? "animate-pulse" : ""}`} />
      <span>{label}</span>
    </div>
  )
}

interface InputCardProps {
  title: string
  icon: React.ReactNode
  filled: boolean
  optional?: boolean
  children: React.ReactNode
}

function InputCard({ title, icon, filled, optional, children }: InputCardProps) {
  return (
    <Card className={`
      w-80 transition-all duration-200
      ${filled 
        ? "border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/10" 
        : "border-slate-700 bg-slate-800/40"
      }
    `}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${filled ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white text-sm">{title}</h3>
              {optional && !filled && <span className="text-xs text-slate-500">(Optional)</span>}
              {filled && <CheckCircle className="h-4 w-4 text-emerald-500" />}
            </div>
            <div className="mt-3">{children}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Progress step definitions
const DC_PROGRESS_STEPS = [
  { key: "meetings_fetched", label: "Meetings" },
  { key: "recording_found", label: "Recording" },
  { key: "transcript_fetched", label: "Transcript" },
  { key: "agents_started", label: "Started" },
  { key: "agent_factoids_complete", label: "Factoids" },
  { key: "agent_rv_complete", label: "Analysis" },
  { key: "agent_vamp_complete", label: "JSON" },
  { key: "parsing_complete", label: "Parse" },
]

const DD_PROGRESS_STEPS = [
  { key: "meetings_fetched", label: "Meetings" },
  { key: "recording_found", label: "Recording" },
  { key: "transcript_fetched", label: "Transcript" },
  { key: "agents_started", label: "Started" },
  { key: "agent_factoids_complete", label: "Factoids" },
  { key: "agent_deep_dive_complete", label: "Analysis" },
  { key: "agent_vamp_complete", label: "JSON" },
  { key: "parsing_complete", label: "Parse" },
]

interface ResultCardProps {
  title: string
  icon: React.ReactNode
  status: ComponentStatus
  onClick: () => void
  skipped?: boolean
  progressSteps?: string[]
  progressStepsConfig?: { key: string; label: string }[]
}

function ResultCard({ title, icon, status, onClick, skipped, progressSteps = [], progressStepsConfig = [] }: ResultCardProps) {
  const statusConfig = {
    idle: {
      border: "border-slate-700",
      bg: "bg-slate-800/40",
      iconBg: "bg-slate-700",
      iconColor: "text-slate-400",
      glow: "",
      clickable: false,
    },
    processing: {
      border: "border-violet-500/50",
      bg: "bg-violet-950/20",
      iconBg: "bg-violet-600",
      iconColor: "text-white",
      glow: "shadow-lg shadow-violet-500/20 animate-pulse",
      clickable: false,
    },
    complete: {
      border: "border-emerald-500/50",
      bg: "bg-emerald-950/20",
      iconBg: "bg-emerald-600",
      iconColor: "text-white",
      glow: "shadow-lg shadow-emerald-500/10",
      clickable: true,
    },
    error: {
      border: "border-red-500/50",
      bg: "bg-red-950/20",
      iconBg: "bg-red-600",
      iconColor: "text-white",
      glow: "shadow-lg shadow-red-500/20",
      clickable: false,
    },
  }

  // Use skipped styling if skipped and idle
  const effectiveStatus = skipped && status === "idle" ? "idle" : status
  const config = statusConfig[effectiveStatus]
  const showProgress = status === "processing" && progressSteps.length > 0 && progressStepsConfig.length > 0

  return (
    <Card 
      className={`
        w-64 transition-all duration-200
        ${config.border} ${config.bg} ${config.glow}
        ${config.clickable ? "cursor-pointer hover:brightness-110 hover:border-opacity-100" : ""}
        ${skipped && status === "idle" ? "opacity-50" : ""}
      `}
      onClick={config.clickable ? onClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`${config.iconBg} ${config.iconColor} p-2 rounded-lg flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm">{title}</h3>
            {/* Progress dots */}
            {showProgress && (
              <div className="flex items-center gap-1.5 mt-2">
                {progressStepsConfig.map((step, idx) => {
                  const isComplete = progressSteps.includes(step.key)
                  const isActive = !isComplete && idx === progressSteps.length
                  return (
                    <div
                      key={step.key}
                      className={`
                        w-2 h-2 rounded-full transition-all duration-300
                        ${isComplete ? "bg-emerald-500" : isActive ? "bg-blue-400 animate-pulse" : "bg-slate-600"}
                      `}
                      title={step.label}
                    />
                  )
                })}
              </div>
            )}
            {/* Status text */}
            {!showProgress && (
              <p className="text-xs text-slate-400 mt-1">
                {skipped && status === "idle" && "Skipped (no URL)"}
                {!skipped && status === "idle" && "Not started"}
                {status === "processing" && "Processing..."}
                {status === "complete" && "Click to view"}
                {status === "error" && "Error occurred"}
              </p>
            )}
          </div>
          {config.clickable && (
            <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0 mt-1" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
