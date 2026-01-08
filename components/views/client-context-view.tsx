"use client"

import { useState, useEffect, useRef } from "react"
import type { Client } from "@/types"
import { api } from "@/lib/api"
import { DiscoveryDocumentForm } from "@/components/views/discovery-document-form"
import { GeneralContextForm } from "@/components/views/general-context-form"
import { StrategyDocumentView } from "@/components/views/strategy-document-view"
import { DiscoveryCallView } from "@/components/views/discovery-call-view"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  ArrowLeft,
  FileText, 
  Database, 
  Shield,
  Presentation,
  FileStack,
  Globe,
  Zap,
  ChevronRight,
  Clock,
  Phone,
  Search
} from "lucide-react"

interface Props {
  client: Client
}

type ComponentStatus = "idle" | "processing" | "complete" | "error"
type ActiveView = "admin" | "discovery" | "discovery-call" | "deep-dive" | "general" | "ground-truth" | "strategy" | "gamma" | "service-docs"

interface FlowState {
  domain: ComponentStatus
  discoveryCall: ComponentStatus
  discoveryDoc: ComponentStatus
  generalContext: ComponentStatus
  deepDive: ComponentStatus
  strategyDoc: ComponentStatus
  gamma: ComponentStatus
  serviceDocs: ComponentStatus
}

function formatTime(seconds: number): string {
  const isNegative = seconds < 0
  const absSeconds = Math.abs(seconds)
  const mins = Math.floor(absSeconds / 60)
  const secs = absSeconds % 60
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`
  return isNegative ? `-${formatted}` : formatted
}

export function ClientContextView({ client }: Props) {
  const [activeView, setActiveView] = useState<ActiveView>("admin")
  const [domainInput, setDomainInput] = useState("")
  const [discoveryCallUrl, setDiscoveryCallUrl] = useState("")
  const [isActivating, setIsActivating] = useState(false)
  const [flowState, setFlowState] = useState<FlowState>({
    domain: "idle",
    discoveryCall: "idle",
    discoveryDoc: "idle",
    generalContext: "idle",
    deepDive: "idle",
    strategyDoc: "idle",
    gamma: "idle",
    serviceDocs: "idle",
  })
  const [deepDiveUrl, setDeepDiveUrl] = useState("")
  
  // Timer state for research phase (3 minutes = 180 seconds)
  const [researchTimer, setResearchTimer] = useState<number | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Polling interval for discovery call and deep dive
  const dcPollingRef = useRef<NodeJS.Timeout | null>(null)
  const ddivePollingRef = useRef<NodeJS.Timeout | null>(null)

  // Start/stop timer based on research status
  useEffect(() => {
    const isResearching = flowState.discoveryCall === "processing" || flowState.discoveryDoc === "processing" || flowState.generalContext === "processing"
    const isDone = flowState.discoveryCall !== "processing" && flowState.discoveryDoc !== "processing" && flowState.generalContext !== "processing"
    
    if (isResearching && researchTimer === null) {
      // Start timer at 3 minutes (180 seconds)
      setResearchTimer(180)
      timerIntervalRef.current = setInterval(() => {
        setResearchTimer(prev => prev !== null ? prev - 1 : null)
      }, 1000)
    } else if (isDone && timerIntervalRef.current) {
      // Stop timer when both are complete or errored
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
      setResearchTimer(null)
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [flowState.discoveryCall, flowState.discoveryDoc, flowState.generalContext])

  // Polling interval refs
  const ddPollingRef = useRef<NodeJS.Timeout | null>(null)
  const gcPollingRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (ddPollingRef.current) clearInterval(ddPollingRef.current)
      if (gcPollingRef.current) clearInterval(gcPollingRef.current)
      if (dcPollingRef.current) clearInterval(dcPollingRef.current)
      if (ddivePollingRef.current) clearInterval(ddivePollingRef.current)
    }
  }, [])

  // Define polling functions first so they can be used in useEffect
  const pollDDStatus = () => {
    // Clear any existing polling first
    if (ddPollingRef.current) {
      clearInterval(ddPollingRef.current)
    }
    ddPollingRef.current = setInterval(async () => {
      try {
        const status = await api.getInitialDraftStatus(client.id)
        console.log("[DD Poll] Status:", status.status)
        
        if (status.status === "complete") {
          clearInterval(ddPollingRef.current!)
          ddPollingRef.current = null
          setFlowState(prev => ({ ...prev, discoveryDoc: "complete" }))
        } else if (status.status === "error") {
          clearInterval(ddPollingRef.current!)
          ddPollingRef.current = null
          console.error("DD job error:", status.error_message)
          setFlowState(prev => ({ ...prev, discoveryDoc: "error" }))
        }
      } catch (e) {
        console.error("DD poll error:", e)
      }
    }, 3000) // Poll every 3 seconds
  }

  const pollGCStatus = () => {
    // Clear any existing polling first
    if (gcPollingRef.current) {
      clearInterval(gcPollingRef.current)
    }
    gcPollingRef.current = setInterval(async () => {
      try {
        const status = await api.getContextFetchStatus(client.id)
        console.log("[GC Poll] Status:", status.status)
        
        if (status.status === "complete") {
          clearInterval(gcPollingRef.current!)
          gcPollingRef.current = null
          setFlowState(prev => ({ ...prev, generalContext: "complete" }))
        } else if (status.status === "error") {
          clearInterval(gcPollingRef.current!)
          gcPollingRef.current = null
          console.error("GC job error:", status.error_message)
          setFlowState(prev => ({ ...prev, generalContext: "error" }))
        }
      } catch (e) {
        console.error("GC poll error:", e)
      }
    }, 3000) // Poll every 3 seconds
  }

  const pollDCStatus = () => {
    // Clear any existing polling first
    if (dcPollingRef.current) {
      clearInterval(dcPollingRef.current)
    }
    dcPollingRef.current = setInterval(async () => {
      try {
        const status = await api.getDiscoveryCallProcessStatus(client.id)
        console.log("[DC Poll] Status:", status.status)
        
        if (status.status === "complete") {
          clearInterval(dcPollingRef.current!)
          dcPollingRef.current = null
          setFlowState(prev => ({ ...prev, discoveryCall: "complete" }))
        } else if (status.status === "error") {
          clearInterval(dcPollingRef.current!)
          dcPollingRef.current = null
          console.error("DC job error:", status.error_message)
          setFlowState(prev => ({ ...prev, discoveryCall: "error" }))
        }
      } catch (e) {
        console.error("DC poll error:", e)
      }
    }, 5000) // Poll every 5 seconds (this job takes longer)
  }

  const pollDeepDiveStatus = () => {
    // Clear any existing polling first
    if (ddivePollingRef.current) {
      clearInterval(ddivePollingRef.current)
    }
    ddivePollingRef.current = setInterval(async () => {
      try {
        const status = await api.getDeepDiveProcessStatus(client.id)
        console.log("[DeepDive Poll] Status:", status.status)
        
        if (status.status === "complete") {
          clearInterval(ddivePollingRef.current!)
          ddivePollingRef.current = null
          setFlowState(prev => ({ ...prev, deepDive: "complete" }))
        } else if (status.status === "error") {
          clearInterval(ddivePollingRef.current!)
          ddivePollingRef.current = null
          console.error("DeepDive job error:", status.error_message)
          setFlowState(prev => ({ ...prev, deepDive: "error" }))
        }
      } catch (e) {
        console.error("DeepDive poll error:", e)
      }
    }, 5000)
  }

  // Load existing data AND check for in-progress jobs on mount
  useEffect(() => {
    const loadExistingDataAndJobStatus = async () => {
      try {
        // First check job statuses
        let ddJobStatus: string | null = null
        let gcJobStatus: string | null = null
        
        try {
          const ddStatus = await api.getInitialDraftStatus(client.id)
          ddJobStatus = ddStatus.status
          console.log("[Load] DD job status:", ddJobStatus)
        } catch (e) {
          // No DD job found
        }
        
        try {
          const gcStatus = await api.getContextFetchStatus(client.id)
          gcJobStatus = gcStatus.status
          console.log("[Load] GC job status:", gcJobStatus)
        } catch (e) {
          // No GC job found
        }
        
        // Load document data
        let doc: any = null
        try {
          doc = await api.getDiscoveryDocument(client.id)
          if (doc && doc.domain) {
            setDomainInput(doc.domain)
          }
        } catch (e) {
          // No document
        }
        
        // Determine DD state based on job status first, then data
        let ddState: ComponentStatus = "idle"
        if (ddJobStatus === "running" || ddJobStatus === "pending") {
          ddState = "processing"
          // Resume polling for this job
          pollDDStatus()
        } else if (ddJobStatus === "error") {
          ddState = "error"
        } else if (ddJobStatus === "complete" || (doc && doc.client_name)) {
          ddState = "complete"
        }
        
        // Check discovery call status
        let dcJobStatus: string | null = null
        let dcState: ComponentStatus = "idle"
        try {
          const dcStatus = await api.getDiscoveryCallProcessStatus(client.id)
          dcJobStatus = dcStatus.status
          console.log("[Load] DC job status:", dcJobStatus)
        } catch (e) {
          // No DC job found
        }
        
        if (dcJobStatus === "running" || dcJobStatus === "pending") {
          dcState = "processing"
          pollDCStatus()
        } else if (dcJobStatus === "error") {
          dcState = "error"
        } else if (dcJobStatus === "complete") {
          dcState = "complete"
        } else {
          // Check if results exist
          try {
            const dcResult = await api.getDiscoveryCallResult(client.id)
            if (dcResult && dcResult.id) {
              dcState = "complete"
            }
          } catch (e) {
            // No results
          }
        }
        
        // Determine GC state based on job status first, then data
        let gcState: ComponentStatus = "idle"
        let contextData: any = null
        try {
          contextData = await api.getContext(client.id)
        } catch (e) {
          // No context data
        }
        
        if (gcJobStatus === "running" || gcJobStatus === "pending") {
          gcState = "processing"
          // Resume polling for this job
          pollGCStatus()
        } else if (gcJobStatus === "error") {
          gcState = "error"
        } else if (gcJobStatus === "complete" || (contextData && (contextData.about || contextData.author_tone))) {
          gcState = "complete"
        }
        
        // Check strategy document status
        let strategyState: ComponentStatus = "idle"
        try {
          const strategyStatus = await api.getStrategyGenerationStatus(client.id)
          if (strategyStatus.status === "running" || strategyStatus.status === "pending") {
            strategyState = "processing"
          } else if (strategyStatus.status === "error") {
            strategyState = "error"
          } else if (strategyStatus.status === "complete") {
            strategyState = "complete"
          }
        } catch (e) {
          // No job found, check if document exists
          try {
            const strategyDoc = await api.getStrategyDocument(client.id)
            if (strategyDoc && strategyDoc.content) {
              strategyState = "complete"
            }
          } catch (e2) {
            // No document
          }
        }
        
        setFlowState(prev => ({
          ...prev,
          domain: doc?.domain ? "complete" : "idle",
          discoveryCall: dcState,
          discoveryDoc: ddState,
          generalContext: gcState,
          strategyDoc: strategyState,
        }))
        
      } catch (e) {
        console.error("Error loading existing data:", e)
      }
    }
    loadExistingDataAndJobStatus()
  }, [client.id])

  const handleActivate = async () => {
    if (!domainInput.trim()) return
    
    setIsActivating(true)
    
    // Determine which jobs to start
    const hasDiscoveryCallUrl = discoveryCallUrl.trim().length > 0
    
    setFlowState(prev => ({
      ...prev,
      domain: "complete",
      discoveryCall: hasDiscoveryCallUrl ? "processing" : prev.discoveryCall,
      discoveryDoc: "processing",
      generalContext: "processing",
    }))

    // Start all 3 jobs in parallel (they return immediately now)
    try {
      const promises: Promise<any>[] = [
        api.fetchContextFromSiteAsync(client.id, domainInput.trim()),
        api.generateInitialDraft(client.id, domainInput.trim()),
      ]
      
      if (hasDiscoveryCallUrl) {
        promises.push(api.processDiscoveryCall(client.id, discoveryCallUrl.trim()))
      }
      
      const results = await Promise.all(promises)
      
      console.log("[Activate] GC job started:", results[0])
      console.log("[Activate] DD job started:", results[1])
      if (hasDiscoveryCallUrl) {
        console.log("[Activate] DC job started:", results[2])
      }
      
      // Start polling for all
      pollGCStatus()
      pollDDStatus()
      if (hasDiscoveryCallUrl) {
        pollDCStatus()
      }
      
    } catch (e) {
      console.error("Failed to start jobs:", e)
      setFlowState(prev => ({
        ...prev,
        discoveryCall: hasDiscoveryCallUrl ? "error" : prev.discoveryCall,
        discoveryDoc: "error",
        generalContext: "error",
      }))
    }
    
    setIsActivating(false)
  }

  const handleDeepDive = async () => {
    if (!deepDiveUrl.trim()) return
    if (flowState.discoveryCall !== "complete") {
      alert("Discovery Call Results must be completed first")
      return
    }
    
    setFlowState(prev => ({ ...prev, deepDive: "processing" }))
    
    try {
      const result = await api.processDeepDive(client.id, deepDiveUrl.trim())
      console.log("[DeepDive] Job started:", result)
      pollDeepDiveStatus()
    } catch (e) {
      console.error("Failed to start deep dive:", e)
      setFlowState(prev => ({ ...prev, deepDive: "error" }))
    }
  }

  const handleStrategyGenerate = async () => {
    setFlowState(prev => ({ ...prev, strategyDoc: "processing" }))
    await new Promise(resolve => setTimeout(resolve, 2000))
    setFlowState(prev => ({ ...prev, strategyDoc: "complete" }))
  }

  const handleGammaGenerate = async () => {
    setFlowState(prev => ({ ...prev, gamma: "processing" }))
    await new Promise(resolve => setTimeout(resolve, 2000))
    setFlowState(prev => ({ ...prev, gamma: "complete" }))
  }

  const handleServiceDocsGenerate = async () => {
    setFlowState(prev => ({ ...prev, serviceDocs: "processing" }))
    await new Promise(resolve => setTimeout(resolve, 2000))
    setFlowState(prev => ({ ...prev, serviceDocs: "complete" }))
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
        
        {activeView === "discovery" && (
          <DiscoveryDocumentForm client={client} initialDomain={domainInput} />
        )}
        {activeView === "discovery-call" && (
          <DiscoveryCallView client={client} />
        )}
        {activeView === "deep-dive" && (
          <DiscoveryCallView client={client} isDeepDive />
        )}
        {activeView === "general" && (
          <GeneralContextForm client={client} />
        )}
        {activeView === "ground-truth" && (
          <StubView 
            title="Ground Truth" 
            description="Manual override and verification of AI-generated content"
            icon={<Shield className="h-8 w-8" />}
          />
        )}
        {activeView === "strategy" && (
          <StrategyDocumentView client={client} />
        )}
        {activeView === "gamma" && (
          <StubView 
            title="Gamma Presentation" 
            description="Auto-generated slide deck presentation"
            icon={<Presentation className="h-8 w-8" />}
            onGenerate={handleGammaGenerate}
            status={flowState.gamma}
          />
        )}
        {activeView === "service-docs" && (
          <StubView 
            title="Service Documents" 
            description="Client deliverable documents"
            icon={<FileStack className="h-8 w-8" />}
            onGenerate={handleServiceDocsGenerate}
            status={flowState.serviceDocs}
          />
        )}
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
        
        {/* Stage 1: Input */}
        <div className="flex items-start gap-6">
          <StageLabel number={1} label="Input" />
          <div className="flex gap-4">
            <PipelineCard
              title="Domain / Company Info"
              icon={<Globe className="h-5 w-5" />}
              status={flowState.domain}
              className="w-80"
            >
              <Textarea
                placeholder="Enter domain (e.g., acme.com) or company description..."
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none"
              />
            </PipelineCard>
            <PipelineCard
              title="Discovery Call URL"
              icon={<Phone className="h-5 w-5" />}
              status={discoveryCallUrl.trim() ? (flowState.discoveryCall === "complete" ? "complete" : "idle") : "idle"}
              className="w-80"
            >
              <Textarea
                placeholder="Fathom URL (e.g., https://fathom.video/calls/...)"
                value={discoveryCallUrl}
                onChange={(e) => setDiscoveryCallUrl(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none"
              />
            </PipelineCard>
          </div>
        </div>
        
        {/* Activate Button */}
        <div className="flex items-center gap-6">
          <div className="w-20" />
          <Button
            onClick={handleActivate}
            disabled={!domainInput.trim() || isActivating || flowState.discoveryCall === "processing" || flowState.discoveryDoc === "processing" || flowState.generalContext === "processing"}
            className="px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0"
          >
            {(isActivating || flowState.discoveryCall === "processing" || flowState.discoveryDoc === "processing" || flowState.generalContext === "processing") ? (
              <Spinner className="h-4 w-4 mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {(isActivating || flowState.discoveryCall === "processing" || flowState.discoveryDoc === "processing" || flowState.generalContext === "processing") ? "Processing..." : "Activate Pipeline"}
          </Button>
        </div>

        {/* Connection Line */}
        <ConnectionLine active={flowState.domain === "complete"} />

        {/* Stage 2: Research */}
        <div className="flex items-start gap-6">
          <StageLabel number={2} label="Research" />
          <div className="space-y-3">
            <div className="flex gap-4">
              <PipelineCard
                title="Discovery Call Results"
                subtitle="Fathom transcript analysis"
                icon={<Phone className="h-5 w-5" />}
                status={flowState.discoveryCall}
                onClick={() => setActiveView("discovery-call")}
                clickable
              />
              <PipelineCard
                title="Auto Discovery Document"
                subtitle="AI client research"
                icon={<FileText className="h-5 w-5" />}
                status={flowState.discoveryDoc}
                onClick={() => setActiveView("discovery")}
                clickable
              />
              <PipelineCard
                title="General Context"
                subtitle="Writing rules & overview"
                icon={<Database className="h-5 w-5" />}
                status={flowState.generalContext}
                onClick={() => setActiveView("general")}
                clickable
              />
            </div>
            {/* Research Timer */}
            {researchTimer !== null && (
              <div className={`flex items-center gap-2 text-sm ${researchTimer < 0 ? 'text-amber-400' : 'text-violet-400'}`}>
                <Clock className="h-4 w-4 animate-pulse" />
                <span className="font-mono">
                  Loading: {formatTime(researchTimer)}
                </span>
            </div>
            )}
          </div>
        </div>

        {/* Connection Line */}
        <ConnectionLine active={flowState.discoveryCall === "complete" || flowState.discoveryDoc === "complete" || flowState.generalContext === "complete"} />

        {/* Stage 2.5: Deep Dive (Optional) */}
        <div className="flex items-start gap-6">
          <div className="w-20 flex-shrink-0 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 font-mono text-xs mb-1">
              2.5
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Optional</span>
          </div>
          <PipelineCard
            title="Deep Dive"
            subtitle="Additional call analysis"
            icon={<Search className="h-5 w-5" />}
            status={flowState.deepDive}
            onClick={() => setActiveView("deep-dive")}
            clickable={flowState.deepDive === "complete"}
            floating
            className="w-80"
          >
            <Textarea
              placeholder="Deep Dive Fathom URL (optional)"
              value={deepDiveUrl}
              onChange={(e) => setDeepDiveUrl(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[40px] resize-none text-sm"
              disabled={flowState.discoveryCall !== "complete"}
            />
            <Button
              onClick={handleDeepDive}
              disabled={!deepDiveUrl.trim() || flowState.discoveryCall !== "complete" || flowState.deepDive === "processing"}
              size="sm"
              className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-white border-0"
            >
              {flowState.deepDive === "processing" ? (
                <Spinner className="h-3 w-3 mr-2" />
              ) : (
                <Search className="h-3 w-3 mr-2" />
              )}
              {flowState.deepDive === "processing" ? "Processing..." : "Run Deep Dive"}
            </Button>
          </PipelineCard>
        </div>

        {/* Connection Line */}
        <ConnectionLine active={flowState.discoveryCall === "complete" || flowState.deepDive === "complete"} />

        {/* Stage 3: Strategy */}
        <div className="flex items-center gap-6">
          <StageLabel number={3} label="Strategy" />
          <PipelineCard
            title="Strategy Document"
            subtitle="Perplexity AI analysis"
            icon={<FileStack className="h-5 w-5" />}
            status={flowState.strategyDoc}
            onClick={() => setActiveView("strategy")}
            clickable
            />
          </div>

        {/* Connection Line */}
        <ConnectionLine active={flowState.strategyDoc === "complete"} />

        {/* Stage 4: Output */}
        <div className="flex items-start gap-6">
          <StageLabel number={4} label="Output" />
          <div className="flex gap-4">
            <PipelineCard
              title="Gamma Presentation"
              subtitle="Slide deck"
              icon={<Presentation className="h-5 w-5" />}
              status={flowState.gamma}
              onClick={() => setActiveView("gamma")}
              clickable
            />
            <PipelineCard
              title="Service Documents"
              subtitle="Deliverables"
              icon={<FileStack className="h-5 w-5" />}
              status={flowState.serviceDocs}
              onClick={() => setActiveView("service-docs")}
              clickable
            />
          </div>
          </div>
      </div>

      {/* Ground Truth - Standalone Section */}
      <div className="mt-12 pt-8 border-t border-slate-800">
        <div className="flex items-center gap-6">
          <div className="w-20 flex-shrink-0 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider mt-1 block">Manual</span>
          </div>
          <PipelineCard
            title="Ground Truth"
            subtitle="Manual override & verification"
            icon={<Shield className="h-5 w-5" />}
            status="idle"
            onClick={() => setActiveView("ground-truth")}
            clickable
            floating
              />
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

interface PipelineCardProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  status: ComponentStatus
  onClick?: () => void
  clickable?: boolean
  children?: React.ReactNode
  className?: string
  floating?: boolean
}

function PipelineCard({ 
  title, 
  subtitle,
  icon, 
  status, 
  onClick, 
  clickable, 
  children,
  className = "",
  floating
}: PipelineCardProps) {
  const statusConfig = {
    idle: {
      border: "border-slate-700",
      bg: "bg-slate-800/40",
      iconBg: "bg-slate-700",
      iconColor: "text-slate-400",
      glow: "",
    },
    processing: {
      border: "border-violet-500/50",
      bg: "bg-violet-950/20",
      iconBg: "bg-violet-600",
      iconColor: "text-white",
      glow: "shadow-lg shadow-violet-500/20 animate-pulse",
    },
    complete: {
      border: "border-emerald-500/50",
      bg: "bg-emerald-950/20",
      iconBg: "bg-emerald-600",
      iconColor: "text-white",
      glow: "shadow-lg shadow-emerald-500/10",
    },
    error: {
      border: "border-red-500/50",
      bg: "bg-red-950/20",
      iconBg: "bg-red-600",
      iconColor: "text-white",
      glow: "shadow-lg shadow-red-500/20",
    },
  }

  const config = statusConfig[status]

  return (
    <Card 
      className={`
        ${config.border} ${config.bg} ${config.glow}
        ${clickable ? "cursor-pointer hover:scale-[1.02] hover:border-opacity-100" : ""}
        ${floating ? "border-dashed" : ""}
        transition-all duration-200 backdrop-blur-sm
        ${className}
      `}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`${config.iconBg} ${config.iconColor} p-2 rounded-lg flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
            {children && <div className="mt-3">{children}</div>}
          </div>
          {clickable && (
            <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0 mt-1" />
            )}
          </div>
        </CardContent>
      </Card>
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

interface StubViewProps {
  title: string
  description: string
  icon: React.ReactNode
  onGenerate?: () => void
  status?: ComponentStatus
}

function StubView({ title, description, icon, onGenerate, status }: StubViewProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-slate-700 bg-slate-800/40">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-700 flex items-center justify-center text-slate-400">
            {icon}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-400 mb-8">{description}</p>
          {onGenerate && (
                  <Button
              onClick={onGenerate}
              disabled={status === "processing"}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
            >
              {status === "processing" ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Generating...
                </>
              ) : status === "complete" ? (
                "Regenerate"
              ) : (
                "Generate"
              )}
                  </Button>
          )}
          {status === "complete" && (
            <p className="mt-4 text-sm text-emerald-400">✓ Generated successfully (stub)</p>
          )}
          {!onGenerate && (
            <p className="text-sm text-slate-500">Coming soon</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
