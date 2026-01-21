"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Client, ClientFile } from "@/types"
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
  Paperclip,
  Upload,
  FileText,
  Trash2,
  Download,
} from "lucide-react"

interface Props {
  client: Client
  readOnly?: boolean
}

type ComponentStatus = "idle" | "processing" | "complete" | "error"
type ActiveView = "admin" | "discovery-call" | "deep-dive" | "general" | "files"

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

  // Files state (Additional Context)
  const [files, setFiles] = useState<ClientFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Ref to store pipeline continuation functions (survives re-renders)
  const pipelineContinuationRef = useRef<{
    afterDC?: () => Promise<void>
    afterDD?: () => Promise<void>
  }>({})

  // Polling functions
  const pollDCStatus = (onComplete?: () => Promise<void> | void) => {
    // Store the callback so it survives component re-renders
    if (onComplete) {
      pipelineContinuationRef.current.afterDC = onComplete as () => Promise<void>
    }
    
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
          
          // Use stored callback or the one passed
          const callback = pipelineContinuationRef.current.afterDC || onComplete
          console.log("[DC Poll] Complete! Calling continuation...", !!callback)
          try {
            await callback?.()
            console.log("[DC Poll] Continuation finished")
          } catch (callbackError) {
            console.error("[DC Poll] Continuation error:", callbackError)
          }
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

  const pollDeepDiveStatus = (onComplete?: () => Promise<void> | void) => {
    // Store the callback so it survives component re-renders
    if (onComplete) {
      pipelineContinuationRef.current.afterDD = onComplete as () => Promise<void>
    }
    
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
          
          // Use stored callback or the one passed
          const callback = pipelineContinuationRef.current.afterDD || onComplete
          console.log("[DD Poll] Complete! Calling continuation...", !!callback)
          try {
            await callback?.()
            console.log("[DD Poll] Continuation finished")
          } catch (callbackError) {
            console.error("[DD Poll] Continuation error:", callbackError)
          }
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
            // Set up continuation to run DD (if URL) or GC after DC completes
            pipelineContinuationRef.current.afterDC = async () => {
              console.log("[Resume] DC complete, checking next step...")
              try {
                const ctx = await api.getContext(client.id)
                const ddUrl = ctx?.deep_dive_url
                const domain = ctx?.domain || domainInput.trim()
                
                if (ddUrl) {
                  // Start Deep Dive
                  console.log("[Resume] Starting Deep Dive...")
                  setFlowState(prev => ({ ...prev, deepDive: "processing" }))
                  // Set up DD -> GC continuation
                  pipelineContinuationRef.current.afterDD = async () => {
                    console.log("[Resume] DD complete, starting General Context...")
                    setFlowState(prev => ({ ...prev, generalContext: "processing" }))
                    if (domain) {
                      await api.fetchContextFromSiteAsync(client.id, domain)
                      pollGCStatus()
                    }
                  }
                  await api.processDeepDive(client.id, ddUrl)
                  pollDeepDiveStatus()
                } else if (domain) {
                  // No DD URL, go straight to GC
                  console.log("[Resume] No DD URL, starting General Context...")
                  setFlowState(prev => ({ ...prev, generalContext: "processing" }))
                  await api.fetchContextFromSiteAsync(client.id, domain)
                  pollGCStatus()
                }
              } catch (e) {
                console.error("[Resume] Continuation error:", e)
              }
            }
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
            // Set up continuation to run GC after DD completes
            pipelineContinuationRef.current.afterDD = async () => {
              console.log("[Resume] DD complete, starting General Context...")
              setFlowState(prev => ({ ...prev, generalContext: "processing" }))
              try {
                const ctx = await api.getContext(client.id)
                const domain = ctx?.domain || domainInput.trim()
                if (domain) {
                  await api.fetchContextFromSiteAsync(client.id, domain)
                  pollGCStatus()
                }
              } catch (e) {
                console.error("[Resume] Failed to start GC:", e)
                setFlowState(prev => ({ ...prev, generalContext: "error" }))
              }
            }
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
        
        // Load files
        try {
          const filesResponse = await api.getClientFiles(client.id)
          setFiles(filesResponse.files)
        } catch {}
        
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

  // Sequential pipeline: DC (optional) -> DD (optional) -> GC (always)
  // We capture URL values at activation time to avoid closure issues
  // Smart resume: skip steps that already completed successfully
  const handleActivate = async () => {
    if (!canActivate) return
    
    // Capture values at activation time - these won't change during the pipeline
    const capturedDomain = domainInput.trim()
    const capturedDcUrl = discoveryCallUrl.trim()
    const capturedDdUrl = deepDiveUrl.trim()
    
    // Check what's already complete - we can skip these
    const dcAlreadyComplete = flowState.discoveryCall === "complete"
    const ddAlreadyComplete = flowState.deepDive === "complete"
    const gcAlreadyComplete = flowState.generalContext === "complete"
    
    // Determine what needs to run (URL provided AND not already complete)
    const needsDc = !!capturedDcUrl && !dcAlreadyComplete
    const needsDd = !!capturedDdUrl && !ddAlreadyComplete
    const needsGc = !gcAlreadyComplete
    
    console.log("[Pipeline] Starting with:", { 
      domain: capturedDomain, 
      dcUrl: capturedDcUrl ? "provided" : "empty", 
      ddUrl: capturedDdUrl ? "provided" : "empty",
      dcAlreadyComplete,
      ddAlreadyComplete,
      gcAlreadyComplete,
      needsDc,
      needsDd,
      needsGc
    })
    
    // If everything is already complete, nothing to do
    if (!needsDc && !needsDd && !needsGc) {
      console.log("[Pipeline] All steps already complete, nothing to do")
      return
    }
    
    setIsActivating(true)
    
    // Helper to start General Context (final step)
    const runGeneralContext = async () => {
      if (!needsGc) {
        console.log("[Pipeline] Skipping General Context (already complete)")
        return
      }
      console.log("[Pipeline] Starting General Context...")
      setFlowState(prev => ({ ...prev, generalContext: "processing" }))
      try {
        await api.fetchContextFromSiteAsync(client.id, capturedDomain)
        pollGCStatus()
      } catch (e) {
        console.error("[Pipeline] Failed to start GC:", e)
        setFlowState(prev => ({ ...prev, generalContext: "error" }))
      }
    }

    // Helper to start Deep Dive, then General Context
    const runDeepDive = async () => {
      if (!needsDd) {
        console.log("[Pipeline] Skipping Deep Dive (already complete or no URL)")
        await runGeneralContext()
        return
      }
      console.log("[Pipeline] Starting Deep Dive...")
      setFlowState(prev => ({ ...prev, deepDive: "processing" }))
      try {
        await api.processDeepDive(client.id, capturedDdUrl)
        pollDeepDiveStatus(runGeneralContext)
      } catch (e) {
        console.error("[Pipeline] Failed to start DD:", e)
        setFlowState(prev => ({ ...prev, deepDive: "error" }))
      }
    }
    
    // Save inputs
    try {
      await api.saveDiscoveryDocument(client.id, { domain: capturedDomain })
      await api.saveContext(client.id, { 
        domain: capturedDomain,
        discovery_call_url: capturedDcUrl || null,
        deep_dive_url: capturedDdUrl || null
      })
    } catch (e) {
      console.error("[Pipeline] Failed to save inputs:", e)
    }

    // Determine pipeline flow - skip completed steps
    if (needsDc) {
      // Start with Discovery Call
      console.log("[Pipeline] Starting Discovery Call...")
      setFlowState(prev => ({ ...prev, discoveryCall: "processing" }))
      try {
        await api.processDiscoveryCall(client.id, capturedDcUrl)
        pollDCStatus(async () => {
          // After DC: run DD if needed, otherwise go to GC
          console.log("[Pipeline] DC complete. needsDd =", needsDd)
          await runDeepDive()
        })
      } catch (e) {
        console.error("[Pipeline] Failed to start DC:", e)
        setFlowState(prev => ({ ...prev, discoveryCall: "error" }))
      }
    } else if (needsDd || (!!capturedDdUrl && !ddAlreadyComplete)) {
      // DC already complete or no DC URL, but need DD
      await runDeepDive()
    } else {
      // DC and DD are done (or not needed), just run GC
      await runGeneralContext()
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

  // File management functions
  const loadFiles = useCallback(async () => {
    setFilesLoading(true)
    try {
      const response = await api.getClientFiles(client.id)
      setFiles(response.files)
    } catch (e) {
      console.error("Failed to load files:", e)
    } finally {
      setFilesLoading(false)
    }
  }, [client.id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      await api.uploadClientFile(client.id, file)
      await loadFiles()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed"
      alert(message)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDeleteFile = async (fileId: number, filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return
    try {
      await api.deleteClientFile(client.id, fileId)
      await loadFiles()
    } catch {
      alert("Failed to delete file")
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
        {activeView === "files" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Additional Context</h2>
                <p className="text-slate-400 mt-1">Upload documents, images, and other reference files</p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.jpg,.jpeg,.png,.gif,.webp"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="gap-2 bg-violet-600 hover:bg-violet-500"
                >
                  {uploadingFile ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                  Upload File
                </Button>
              </div>
            </div>

            {filesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8 text-violet-500" />
              </div>
            ) : files.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-700 bg-slate-800/30">
                <CardContent className="py-12 text-center">
                  <Paperclip className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">No files uploaded yet</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload PDFs, documents, images, or other reference materials
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <Card key={file.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-700 rounded-lg">
                          <FileText className="h-5 w-5 text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{file.filename}</p>
                          <p className="text-xs text-slate-400">
                            {formatFileSize(file.file_size)} • {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={api.downloadClientFile(client.id, file.id)}
                            download={file.filename}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4 text-slate-400 hover:text-white" />
                          </a>
                          <button
                            onClick={() => handleDeleteFile(file.id, file.filename)}
                            className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <p className="text-xs text-slate-500 text-right mt-2">
                  Total: {formatFileSize(files.reduce((sum, f) => sum + f.file_size, 0))} / 50 MB
                </p>
              </div>
            )}
          </div>
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
                  {readOnly ? "View Only" : (
                    // Show "Resume" if some steps complete but GC failed/idle
                    (flowState.discoveryCall === "complete" || flowState.deepDive === "complete") && 
                    flowState.generalContext !== "complete" 
                      ? "Resume Pipeline" 
                      : "Activate Pipeline"
                  )}
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
              <ResultCard
                title="Additional Context"
                icon={<Paperclip className="h-5 w-5" />}
                status={files.length > 0 ? "complete" : "idle"}
                onClick={() => { loadFiles(); setActiveView("files") }}
                filesCount={files.length}
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
  filesCount?: number  // For Additional Context card
}

function ResultCard({ title, icon, status, onClick, skipped, progressSteps = [], progressStepsConfig = [], filesCount }: ResultCardProps) {
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
  
  // Files card is always clickable
  const isFilesCard = filesCount !== undefined
  const isClickable = config.clickable || isFilesCard

  return (
    <Card 
      className={`
        w-64 transition-all duration-200
        ${config.border} ${config.bg} ${config.glow}
        ${isClickable ? "cursor-pointer hover:brightness-110 hover:border-opacity-100" : ""}
        ${skipped && status === "idle" ? "opacity-50" : ""}
      `}
      onClick={isClickable ? onClick : undefined}
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
                {isFilesCard && filesCount === 0 && "Click to upload"}
                {isFilesCard && filesCount! > 0 && `${filesCount} file${filesCount === 1 ? "" : "s"}`}
                {!isFilesCard && skipped && status === "idle" && "Skipped (no URL)"}
                {!isFilesCard && !skipped && status === "idle" && "Not started"}
                {!isFilesCard && status === "processing" && "Processing..."}
                {!isFilesCard && status === "complete" && "Click to view"}
                {!isFilesCard && status === "error" && "Error occurred"}
              </p>
            )}
          </div>
          {isClickable && (
            <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0 mt-1" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
