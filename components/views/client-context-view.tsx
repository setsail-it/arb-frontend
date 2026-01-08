"use client"

import { useState, useEffect, useRef } from "react"
import type { Client } from "@/types"
import { api } from "@/lib/api"
import { DiscoveryDocumentForm } from "@/components/views/discovery-document-form"
import { GeneralContextForm } from "@/components/views/general-context-form"
import { StrategyDocumentView } from "@/components/views/strategy-document-view"
import { PainPointStrategyView } from "@/components/views/pain-point-strategy-view"
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
  Search,
  RefreshCw,
  Sparkles,
  X
} from "lucide-react"

interface Props {
  client: Client
}

type ComponentStatus = "idle" | "processing" | "complete" | "error"
type ActiveView = "admin" | "discovery" | "discovery-call" | "deep-dive" | "general" | "ground-truth" | "strategy" | "pain-point" | "gamma" | "service-docs"

interface FlowState {
  domain: ComponentStatus
  discoveryCall: ComponentStatus
  discoveryDoc: ComponentStatus
  generalContext: ComponentStatus
  deepDive: ComponentStatus
  strategyDoc: ComponentStatus
  painPointStrategy: ComponentStatus
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
  // Input states are session-only (reset on refresh), modules poll database
  const [inputsActivated, setInputsActivated] = useState(false)
  const [flowState, setFlowState] = useState<FlowState>({
    domain: "idle",
    discoveryCall: "idle",
    discoveryDoc: "idle",
    generalContext: "idle",
    deepDive: "idle",
    strategyDoc: "idle",
    painPointStrategy: "idle",
    gamma: "idle",
    serviceDocs: "idle",
  })
  const [deepDiveUrl, setDeepDiveUrl] = useState("")
  const [gammaUrl, setGammaUrl] = useState<string | null>(null)
  
  // Timer state for research phase (7 minutes = 420 seconds)
  const [researchTimer, setResearchTimer] = useState<number | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const RESEARCH_TIMEOUT_SECONDS = 420 // 7 minutes
  
  // Polling interval for discovery call and deep dive
  const dcPollingRef = useRef<NodeJS.Timeout | null>(null)
  const ddivePollingRef = useRef<NodeJS.Timeout | null>(null)

  // Start/stop timer based on research status
  useEffect(() => {
    const isResearching = flowState.discoveryCall === "processing" || flowState.discoveryDoc === "processing" || flowState.generalContext === "processing"
    const isDone = flowState.discoveryCall !== "processing" && flowState.discoveryDoc !== "processing" && flowState.generalContext !== "processing"
    
    if (isResearching && researchTimer === null) {
      // Start timer at 7 minutes (420 seconds)
      setResearchTimer(RESEARCH_TIMEOUT_SECONDS)
      timerIntervalRef.current = setInterval(() => {
        setResearchTimer(prev => {
          if (prev !== null && prev <= -60) {
            // Auto-abort after 1 minute past timeout (8 minutes total)
            handleAbortResearch()
            return null
          }
          return prev !== null ? prev - 1 : null
        })
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

  // Polling ref for strategy (defined early so cleanup can reference it)
  const stratPollingRef = useRef<NodeJS.Timeout | null>(null)
  const painPointPollingRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (ddPollingRef.current) clearInterval(ddPollingRef.current)
      if (gcPollingRef.current) clearInterval(gcPollingRef.current)
      if (dcPollingRef.current) clearInterval(dcPollingRef.current)
      if (ddivePollingRef.current) clearInterval(ddivePollingRef.current)
      if (stratPollingRef.current) clearInterval(stratPollingRef.current)
      if (painPointPollingRef.current) clearInterval(painPointPollingRef.current)
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
        } else if (status.status === "cancelled") {
          clearInterval(ddPollingRef.current!)
          ddPollingRef.current = null
          console.log("DD job cancelled")
          setFlowState(prev => ({ ...prev, discoveryDoc: "idle" }))
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
        } else if (status.status === "cancelled") {
          clearInterval(gcPollingRef.current!)
          gcPollingRef.current = null
          console.log("GC job cancelled")
          setFlowState(prev => ({ ...prev, generalContext: "idle" }))
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
        } else if (status.status === "cancelled") {
          clearInterval(dcPollingRef.current!)
          dcPollingRef.current = null
          console.log("DC job cancelled")
          setFlowState(prev => ({ ...prev, discoveryCall: "idle" }))
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
    // Reset all state when client changes
    setDomainInput("")
    setDiscoveryCallUrl("")
    setIsActivating(false)
    setInputsActivated(false)
    setDeepDiveUrl("")
    setGammaUrl(null)
    setResearchTimer(null)
    setActiveView("admin")
    setFlowState({
      domain: "idle",
      discoveryCall: "idle",
      discoveryDoc: "idle",
      generalContext: "idle",
      deepDive: "idle",
      strategyDoc: "idle",
      painPointStrategy: "idle",
      gamma: "idle",
      serviceDocs: "idle",
    })
    
    // Clear any existing polling intervals
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (dcPollingRef.current) {
      clearInterval(dcPollingRef.current)
      dcPollingRef.current = null
    }
    if (ddPollingRef.current) {
      clearInterval(ddPollingRef.current)
      ddPollingRef.current = null
    }
    if (gcPollingRef.current) {
      clearInterval(gcPollingRef.current)
      gcPollingRef.current = null
    }
    if (ddivePollingRef.current) {
      clearInterval(ddivePollingRef.current)
      ddivePollingRef.current = null
    }
    if (stratPollingRef.current) {
      clearInterval(stratPollingRef.current)
      stratPollingRef.current = null
    }
    if (painPointPollingRef.current) {
      clearInterval(painPointPollingRef.current)
      painPointPollingRef.current = null
    }
    
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
        } else if (ddJobStatus === "cancelled") {
          ddState = "idle"  // Cancelled jobs show as idle, allowing restart
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
        } else if (dcJobStatus === "cancelled") {
          dcState = "idle"  // Cancelled jobs show as idle, allowing restart
        } else {
          // Check if results actually exist (job status "complete" doesn't guarantee data was saved)
          try {
            const dcResult = await api.getDiscoveryCallResult(client.id)
            if (dcResult && dcResult.id && dcResult.answers_data) {
              dcState = "complete"
            }
          } catch (e) {
            // No results - stay idle
          }
        }
        
        // Determine GC state based on job status first, then data
        let gcState: ComponentStatus = "idle"
        let contextData: any = null
        try {
          contextData = await api.getContext(client.id)
          // Load persisted discovery call URL
          if (contextData && contextData.discovery_call_url) {
            setDiscoveryCallUrl(contextData.discovery_call_url)
          }
        } catch (e) {
          // No context data
        }
        
        if (gcJobStatus === "running" || gcJobStatus === "pending") {
          gcState = "processing"
          // Resume polling for this job
          pollGCStatus()
        } else if (gcJobStatus === "error") {
          gcState = "error"
        } else if (gcJobStatus === "cancelled") {
          gcState = "idle"  // Cancelled jobs show as idle, allowing restart
        } else if (gcJobStatus === "complete" || (contextData && (contextData.about || contextData.author_tone))) {
          gcState = "complete"
        }
        
        // Check deep dive status
        let deepDiveState: ComponentStatus = "idle"
        try {
          const ddiveStatus = await api.getDeepDiveProcessStatus(client.id)
          console.log("[Load] Deep dive job status:", ddiveStatus.status)
          if (ddiveStatus.status === "running" || ddiveStatus.status === "pending") {
            deepDiveState = "processing"
            pollDeepDiveStatus()
          } else if (ddiveStatus.status === "error") {
            deepDiveState = "error"
          } else {
            // Check if results exist
            try {
              const ddiveResult = await api.getDeepDiveResult(client.id)
              if (ddiveResult && ddiveResult.id && ddiveResult.answers_data) {
                deepDiveState = "complete"
              }
            } catch (e2) {
              // No results
            }
          }
        } catch (e) {
          // No job found, check if results exist
          try {
            const ddiveResult = await api.getDeepDiveResult(client.id)
            if (ddiveResult && ddiveResult.id && ddiveResult.answers_data) {
              deepDiveState = "complete"
            }
          } catch (e2) {
            // No results
          }
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

        // Check pain point strategy status
        let painPointState: ComponentStatus = "idle"
        try {
          const painPointStatus = await api.getPainPointStrategyStatus(client.id)
          if (painPointStatus.status === "running" || painPointStatus.status === "pending") {
            painPointState = "processing"
            pollPainPointStatus()
          } else if (painPointStatus.status === "error") {
            painPointState = "error"
          } else if (painPointStatus.status === "complete") {
            painPointState = "complete"
          }
        } catch (e) {
          // No job found, check if document exists
          try {
            const painPointDoc = await api.getPainPointStrategy(client.id)
            if (painPointDoc && painPointDoc.content) {
              painPointState = "complete"
            }
          } catch (e2) {
            // No document
          }
        }

        // Note: domain/inputs are session-only (don't persist green on refresh)
        // Only research modules check database for status
        setFlowState(prev => ({
          ...prev,
          discoveryCall: dcState,
          discoveryDoc: ddState,
          generalContext: gcState,
          deepDive: deepDiveState,
          strategyDoc: strategyState,
          painPointStrategy: painPointState,
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
    setInputsActivated(true) // Mark inputs as activated (session-only, resets on refresh)
    
    // Determine which jobs to start
    const hasDiscoveryCallUrl = discoveryCallUrl.trim().length > 0
    
    setFlowState(prev => ({
      ...prev,
      discoveryCall: hasDiscoveryCallUrl ? "processing" : prev.discoveryCall,
      discoveryDoc: "processing",
      generalContext: "processing",
    }))

    // Save discovery call URL to context if provided
    if (hasDiscoveryCallUrl) {
      try {
        await api.saveContext(client.id, { 
          domain: domainInput.trim(),
          discovery_call_url: discoveryCallUrl.trim() 
        })
        console.log("[Activate] Discovery call URL saved to context")
      } catch (e) {
        console.error("Failed to save discovery call URL:", e)
      }
    }

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

  const handleAbortResearch = async () => {
    console.log("[Abort] Aborting research...")
    
    // Cancel jobs on the backend first
    try {
      const result = await api.cancelJobs(client.id, [
        "discovery_call",
        "discovery_document", 
        "general_context"
      ])
      console.log("[Abort] Backend cancel result:", result)
    } catch (e) {
      console.error("[Abort] Failed to cancel backend jobs:", e)
    }
    
    // Stop all polling
    if (dcPollingRef.current) {
      clearInterval(dcPollingRef.current)
      dcPollingRef.current = null
    }
    if (ddPollingRef.current) {
      clearInterval(ddPollingRef.current)
      ddPollingRef.current = null
    }
    if (gcPollingRef.current) {
      clearInterval(gcPollingRef.current)
      gcPollingRef.current = null
    }
    
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setResearchTimer(null)
    
    // Set all processing states to idle (cancelled)
    setFlowState(prev => ({
      ...prev,
      discoveryCall: prev.discoveryCall === "processing" ? "idle" : prev.discoveryCall,
      discoveryDoc: prev.discoveryDoc === "processing" ? "idle" : prev.discoveryDoc,
      generalContext: prev.generalContext === "processing" ? "idle" : prev.generalContext,
    }))
    
    setIsActivating(false)
    setInputsActivated(false)
  }

  const handleDeepDive = async () => {
    if (!deepDiveUrl.trim()) return
    if (flowState.discoveryCall !== "complete") {
      alert("Discovery Call must be completed first")
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

  const pollStrategyStatus = () => {
    if (stratPollingRef.current) clearInterval(stratPollingRef.current)
    stratPollingRef.current = setInterval(async () => {
      try {
        const status = await api.getStrategyGenerationStatus(client.id)
        console.log("[Strategy Poll] Status:", status.status)
        
        if (status.status === "complete") {
          clearInterval(stratPollingRef.current!)
          stratPollingRef.current = null
          setFlowState(prev => ({ ...prev, strategyDoc: "complete" }))
        } else if (status.status === "error") {
          clearInterval(stratPollingRef.current!)
          stratPollingRef.current = null
          console.error("Strategy job error:", status.error_message)
          setFlowState(prev => ({ ...prev, strategyDoc: "error" }))
        }
      } catch (e) {
        console.error("Strategy poll error:", e)
      }
    }, 5000)
  }

  const handleStrategyGenerate = async () => {
    setFlowState(prev => ({ ...prev, strategyDoc: "processing" }))
    
    try {
      const response = await api.generateStrategyDocument(client.id)
      console.log("[Strategy] Generation started:", response)
      pollStrategyStatus()
    } catch (e) {
      console.error("Failed to start strategy generation:", e)
      setFlowState(prev => ({ ...prev, strategyDoc: "error" }))
    }
  }

  const pollPainPointStatus = () => {
    if (painPointPollingRef.current) clearInterval(painPointPollingRef.current)
    painPointPollingRef.current = setInterval(async () => {
      try {
        const status = await api.getPainPointStrategyStatus(client.id)
        console.log("[PainPoint Poll] Status:", status.status)
        
        if (status.status === "complete") {
          clearInterval(painPointPollingRef.current!)
          painPointPollingRef.current = null
          setFlowState(prev => ({ ...prev, painPointStrategy: "complete" }))
        } else if (status.status === "error") {
          clearInterval(painPointPollingRef.current!)
          painPointPollingRef.current = null
          console.error("Pain point job error:", status.error_message)
          setFlowState(prev => ({ ...prev, painPointStrategy: "error" }))
        }
      } catch (e) {
        console.error("Pain point poll error:", e)
      }
    }, 5000)
  }

  const handlePainPointGenerate = async () => {
    if (flowState.strategyDoc !== "complete") {
      alert("Strategy Document must be completed first")
      return
    }
    if (flowState.discoveryCall !== "complete") {
      alert("Discovery Call must be completed first")
      return
    }
    
    setFlowState(prev => ({ ...prev, painPointStrategy: "processing" }))
    
    try {
      const response = await api.generatePainPointStrategy(client.id)
      console.log("[PainPoint] Generation started:", response)
      pollPainPointStatus()
    } catch (e) {
      console.error("Failed to start pain point rewrite:", e)
      setFlowState(prev => ({ ...prev, painPointStrategy: "error" }))
    }
  }

  const handleGammaGenerate = async () => {
    if (flowState.painPointStrategy !== "complete") {
      alert("Pain Point Rewriter must be completed first")
      return
    }
    
    setFlowState(prev => ({ ...prev, gamma: "processing" }))
    
    try {
      const response = await api.generateGammaPresentation(client.id)
      
      if (response.success && response.presentation_url) {
        setGammaUrl(response.presentation_url)
        setFlowState(prev => ({ ...prev, gamma: "complete" }))
        // Open the presentation in a new tab
        window.open(response.presentation_url, "_blank")
      } else {
        console.error("Gamma generation failed:", response.message)
        setFlowState(prev => ({ ...prev, gamma: "error" }))
      }
    } catch (e) {
      console.error("Failed to generate Gamma presentation:", e)
      setFlowState(prev => ({ ...prev, gamma: "error" }))
    }
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
        {activeView === "pain-point" && (
          <PainPointStrategyView client={client} />
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
              status={inputsActivated ? "complete" : "idle"}
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
              status={inputsActivated && discoveryCallUrl.trim() ? "complete" : "idle"}
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
          {(isActivating || flowState.discoveryCall === "processing" || flowState.discoveryDoc === "processing" || flowState.generalContext === "processing") ? (
            <div className="flex items-center gap-2">
              <Button
                disabled
                className="px-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 cursor-not-allowed"
              >
                <Spinner className="h-4 w-4 mr-2" />
                Processing...
              </Button>
              <Button
                onClick={handleAbortResearch}
                variant="outline"
                className="px-4 border-red-500/50 text-red-400 hover:bg-red-900/30 hover:text-red-300"
              >
                <X className="h-4 w-4 mr-1" />
                Abort
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleActivate}
              disabled={!domainInput.trim()}
              className="px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0"
            >
              <Zap className="h-4 w-4 mr-2" />
              Activate Pipeline
            </Button>
          )}
        </div>

        {/* Connection Line */}
        <ConnectionLine active={inputsActivated} />

        {/* Stage 2: Research */}
        <div className="flex items-start gap-6">
          <StageLabel number={2} label="Research" />
          <div className="space-y-3">
            <div className="flex gap-4">
              <PipelineCard
                title="Discovery Call"
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
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[40px] resize-none text-sm"
              disabled={flowState.discoveryCall !== "complete"}
            />
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleDeepDive()
              }}
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
            subtitle="GTM strategy generation"
            icon={<FileStack className="h-5 w-5" />}
            status={flowState.strategyDoc}
            onClick={() => flowState.strategyDoc === "complete" ? setActiveView("strategy") : undefined}
            clickable={flowState.strategyDoc === "complete"}
            className="w-80"
          >
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleStrategyGenerate()
              }}
              disabled={flowState.strategyDoc === "processing" || flowState.discoveryDoc !== "complete"}
              size="sm"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0"
            >
              {flowState.strategyDoc === "processing" ? (
                <>
                  <Spinner className="h-3 w-3 mr-2" />
                  Generating...
                </>
              ) : flowState.strategyDoc === "complete" ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Regenerate
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-2" />
                  Generate Strategy
                </>
              )}
            </Button>
          </PipelineCard>
        </div>

        {/* Connection Line */}
        <ConnectionLine active={flowState.strategyDoc === "complete"} />

        {/* Stage 3.5: Pain Point Rewriter */}
        <div className="flex items-start gap-6">
          <div className="w-20 flex-shrink-0 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 font-mono text-xs mb-1">
              3.5
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Refine</span>
          </div>
          <PipelineCard
            title="Pain Point Rewriter"
            subtitle="Refine strategy messaging"
            icon={<Sparkles className="h-5 w-5" />}
            status={flowState.painPointStrategy}
            onClick={() => flowState.painPointStrategy === "complete" ? setActiveView("pain-point") : undefined}
            clickable={flowState.painPointStrategy === "complete"}
            className="w-80"
          >
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handlePainPointGenerate()
              }}
              disabled={
                flowState.painPointStrategy === "processing" || 
                flowState.strategyDoc !== "complete" ||
                flowState.discoveryCall !== "complete"
              }
              size="sm"
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-0"
            >
              {flowState.painPointStrategy === "processing" ? (
                <>
                  <Spinner className="h-3 w-3 mr-2" />
                  Rewriting...
                </>
              ) : flowState.painPointStrategy === "complete" ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Re-run
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-2" />
                  Rewrite Strategy
                </>
              )}
            </Button>
          </PipelineCard>
        </div>

        {/* Connection Line */}
        <ConnectionLine active={flowState.painPointStrategy === "complete"} />

        {/* Stage 4: Output */}
        <div className="flex items-start gap-6">
          <StageLabel number={4} label="Output" />
          <div className="flex gap-4">
            <PipelineCard
              title="Gamma Presentation"
              subtitle="Slide deck"
              icon={<Presentation className="h-5 w-5" />}
              status={flowState.gamma}
              onClick={() => gammaUrl ? window.open(gammaUrl, "_blank") : undefined}
              clickable={flowState.gamma === "complete" && !!gammaUrl}
              className="w-64"
            >
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleGammaGenerate()
                }}
                disabled={flowState.painPointStrategy !== "complete" || flowState.gamma === "processing"}
                size="sm"
                className="w-full bg-teal-600 hover:bg-teal-500 text-white border-0"
              >
                {flowState.gamma === "processing" ? (
                  <>
                    <Spinner className="h-3 w-3 mr-2" />
                    Generating...
                  </>
                ) : flowState.gamma === "complete" ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Presentation className="h-3 w-3 mr-2" />
                    Create Slides
                  </>
                )}
              </Button>
            </PipelineCard>
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
