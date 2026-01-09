"use client"

import { useState, useEffect, useRef } from "react"
import type { Client, StrategyDocument, DiscoveryCallResult, ClientContext } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Utensils,
  ChefHat,
  Palette,
  Languages,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  ExternalLink,
  Presentation,
  Play,
  FileInput,
  ArrowLeft,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Props {
  client: Client
  onBack?: () => void
}

type ModuleStatus = "idle" | "processing" | "complete" | "error"
type ViewMode = "pipeline" | "input" | "document"

interface SubModule {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  stubbed?: boolean
}

const SUB_MODULES: SubModule[] = [
  {
    id: "waiter",
    name: "The Waiter",
    description: "Selects services & budget",
    icon: <Utensils className="h-5 w-5" />,
    stubbed: true,
  },
  {
    id: "cook",
    name: "The Cook",
    description: "Writes implementations",
    icon: <ChefHat className="h-5 w-5" />,
    stubbed: true,
  },
  {
    id: "plater",
    name: "The Plater",
    description: "Polishes formatting",
    icon: <Palette className="h-5 w-5" />,
    stubbed: true,
  },
  {
    id: "translator",
    name: "The Translator",
    description: "Pain point messaging",
    icon: <Languages className="h-5 w-5" />,
    stubbed: false,
  },
]

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function CarsonStrategyView({ client, onBack }: Props) {
  const [strategyDoc, setStrategyDoc] = useState<StrategyDocument | null>(null)
  const [overallStatus, setOverallStatus] = useState<ModuleStatus>("idle")
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline")
  const [moduleStatuses, setModuleStatuses] = useState<Record<string, ModuleStatus>>({
    waiter: "idle",
    cook: "idle",
    plater: "idle",
    translator: "idle",
  })
  const [moduleTimers, setModuleTimers] = useState<Record<string, number>>({
    waiter: 0,
    cook: 0,
    plater: 0,
    translator: 0,
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // CaSS Input data
  const [inputData, setInputData] = useState<{
    callResults: DiscoveryCallResult | null
    callSource: "DDR" | "DCR" | null
    generalContext: ClientContext | null
  }>({ callResults: null, callSource: null, generalContext: null })

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Gamma presentation state
  const [gammaStatus, setGammaStatus] = useState<ModuleStatus>("idle")
  const [gammaUrl, setGammaUrl] = useState<string | null>(null)
  const [gammaPdfUrl, setGammaPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // Timer effect for active module
  useEffect(() => {
    if (activeModule) {
      timerIntervalRef.current = setInterval(() => {
        setModuleTimers((prev) => ({
          ...prev,
          [activeModule]: (prev[activeModule] || 0) + 1,
        }))
      }, 1000)
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [activeModule])

  // Load existing strategy document and input data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Load CaSS Input data
        try {
          // Try DDR first
          const ddr = await api.getDeepDiveResult(String(client.id))
          if (ddr && ddr.answers_data) {
            setInputData(prev => ({ ...prev, callResults: ddr as DiscoveryCallResult, callSource: "DDR" }))
          } else {
            // Fall back to DCR
            const dcr = await api.getDiscoveryCallResult(String(client.id))
            if (dcr && dcr.answers_data) {
              setInputData(prev => ({ ...prev, callResults: dcr as DiscoveryCallResult, callSource: "DCR" }))
            }
          }
        } catch (e) {
          // Try DCR as fallback
          try {
            const dcr = await api.getDiscoveryCallResult(String(client.id))
            if (dcr && dcr.answers_data) {
              setInputData(prev => ({ ...prev, callResults: dcr as DiscoveryCallResult, callSource: "DCR" }))
            }
          } catch (e2) {
            console.log("No call results available")
          }
        }

        // Load GC
        try {
          const gc = await api.getContext(client.id)
          setInputData(prev => ({ ...prev, generalContext: gc }))
        } catch (e) {
          console.log("No general context available")
        }

        // Check job status first
        try {
          const jobStatus = await api.getStrategyGenerationStatus(client.id)
          if (jobStatus.status === "running" || jobStatus.status === "pending") {
            setOverallStatus("processing")
            simulateStageProgression()
            startPolling()
          } else if (jobStatus.status === "error") {
            setOverallStatus("error")
            setErrorMessage(jobStatus.error_message || "Unknown error")
          } else if (jobStatus.status === "complete") {
            setOverallStatus("complete")
            setModuleStatuses({
              waiter: "complete",
              cook: "complete",
              plater: "complete",
              translator: "complete",
            })
          }
        } catch (e) {
          // No job found - check if doc exists
        }

        // Load existing document
        const doc = await api.getStrategyDocument(client.id)
        if (doc && doc.content) {
          setStrategyDoc(doc)
          if (overallStatus === "idle") {
            setOverallStatus("complete")
            setModuleStatuses({
              waiter: "complete",
              cook: "complete",
              plater: "complete",
              translator: "complete",
            })
          }
        }
      } catch (e) {
        console.error("Error loading strategy document:", e)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [client.id])

  const simulateStageProgression = () => {
    setActiveModule("waiter")
    setModuleStatuses((prev) => ({ ...prev, waiter: "processing" }))
  }

  const progressToNextStage = () => {
    const stages = ["waiter", "cook", "plater", "translator"]
    const currentIndex = stages.indexOf(activeModule || "")

    if (currentIndex >= 0 && currentIndex < stages.length - 1) {
      const currentStage = stages[currentIndex]
      const nextStage = stages[currentIndex + 1]

      setModuleStatuses((prev) => ({
        ...prev,
        [currentStage]: "complete",
        [nextStage]: "processing",
      }))
      setActiveModule(nextStage)
      setModuleTimers((prev) => ({ ...prev, [nextStage]: 0 }))
    }
  }

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    const stageIntervals = [15, 30, 45, 60]

    pollingRef.current = setInterval(async () => {
      try {
        const jobStatus = await api.getStrategyGenerationStatus(client.id)

        const totalTime = moduleTimers.waiter + moduleTimers.cook + moduleTimers.plater + moduleTimers.translator
        const stages = ["waiter", "cook", "plater", "translator"]
        let cumulativeTime = 0

        for (let i = 0; i < stages.length; i++) {
          cumulativeTime += stageIntervals[i]
          if (totalTime < cumulativeTime && moduleStatuses[stages[i]] !== "complete") {
            if (i > 0 && moduleStatuses[stages[i - 1]] === "processing") {
              progressToNextStage()
            }
            break
          }
        }

        if (jobStatus.status === "complete") {
          clearInterval(pollingRef.current!)
          pollingRef.current = null

          setModuleStatuses({
            waiter: "complete",
            cook: "complete",
            plater: "complete",
            translator: "complete",
          })
          setActiveModule(null)

          const doc = await api.getStrategyDocument(client.id)
          if (doc && doc.content) {
            setStrategyDoc(doc)
          }
          setOverallStatus("complete")
        } else if (jobStatus.status === "error") {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setOverallStatus("error")
          setActiveModule(null)
          setErrorMessage(jobStatus.error_message || "Unknown error")
        }
      } catch (e) {
        console.error("Strategy poll error:", e)
      }
    }, 3000)
  }

  const handleRunAll = async () => {
    setOverallStatus("processing")
    setErrorMessage(null)
    setModuleStatuses({
      waiter: "idle",
      cook: "idle",
      plater: "idle",
      translator: "idle",
    })
    setModuleTimers({
      waiter: 0,
      cook: 0,
      plater: 0,
      translator: 0,
    })

    startPolling()
    simulateStageProgression()

    try {
      const response = await api.generateStrategyDocument(client.id)
      console.log("[Carson] Generation started:", response)
    } catch (e: any) {
      console.error("Failed to start strategy generation:", e)
    }
  }

  const handleRunModule = async (moduleId: string) => {
    // For now, running any module runs the full pipeline
    // TODO: Implement individual module endpoints
    console.log(`[Carson] Running module: ${moduleId}`)
    handleRunAll()
  }

  const handleDownloadPdf = () => {
    const pdfUrl = api.getStrategyDocumentPdfUrl(client.id)
    window.open(pdfUrl, "_blank")
  }

  const handleGenerateGamma = async () => {
    setGammaStatus("processing")

    try {
      const response = await api.generateGammaPresentation(client.id)

      if (response.success && response.presentation_url) {
        setGammaUrl(response.presentation_url)
        setGammaPdfUrl(response.pdf_url)
        setGammaStatus("complete")
        window.open(response.presentation_url, "_blank")
      } else {
        setGammaStatus("error")
      }
    } catch (e: any) {
      console.error("Gamma generation error:", e)
      setGammaStatus("error")
    }
  }

  const getTotalTime = () => {
    return moduleTimers.waiter + moduleTimers.cook + moduleTimers.plater + moduleTimers.translator
  }

  const getCardClasses = (status: ModuleStatus, isActive: boolean) => {
    if (isActive) return "border-violet-500 bg-slate-800 animate-pulse"
    if (status === "complete") return "border-emerald-500 bg-slate-800"
    if (status === "error") return "border-red-500 bg-slate-800"
    return "border-slate-700 bg-slate-800"
  }

  const getIconClasses = (status: ModuleStatus, isActive: boolean) => {
    if (isActive) return "bg-violet-500 text-white"
    if (status === "complete") return "bg-emerald-500 text-white"
    if (status === "error") return "bg-red-500 text-white"
    return "bg-slate-700 text-slate-400"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-violet-500" />
      </div>
    )
  }

  // CaSS Input View
  if (viewMode === "input") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode("pipeline")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pipeline
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">CaSS Input</h1>
          <p className="text-slate-400 mt-1">
            Raw data fed into The Waiter: {inputData.callSource || "None"} + General Context
          </p>
        </div>

        {/* Call Q&A (Parsed JSON) */}
        <div className="rounded-lg border border-cyan-500/50 bg-slate-900/50 overflow-hidden">
          <div className="border-b border-cyan-500/30 px-4 py-3 bg-cyan-950/30">
            <h2 className="font-semibold text-cyan-300">
              Parsed Q&A ({inputData.callSource || "None"}) - {inputData.callResults?.answers_data?.length || 0} answers
            </h2>
          </div>
          <div className="p-4 max-h-[400px] overflow-auto">
            {inputData.callResults?.answers_data ? (
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(inputData.callResults.answers_data, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-500 italic">No parsed Q&A available</p>
            )}
          </div>
        </div>

        {/* General Context - Full dump */}
        <div className="rounded-lg border border-cyan-500/50 bg-slate-900/50 overflow-hidden">
          <div className="border-b border-cyan-500/30 px-4 py-3 bg-cyan-950/30">
            <h2 className="font-semibold text-cyan-300">General Context (GC) - Complete</h2>
          </div>
          <div className="p-4 max-h-[600px] overflow-auto">
            {inputData.generalContext ? (
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(inputData.generalContext, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-500 italic">No general context available</p>
            )}
          </div>
        </div>
        
        {/* Note about Ground Truth */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-300">
            <strong>Note:</strong> Ground Truth Enhancement only updates these GC fields: 
            <span className="text-amber-200"> about, brand_pov, ideal_target_market, call_to_action, competitors</span>. 
            Other fields (writing style, brand safety, company details, assets) come from Scout-2 web scraping.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Carson Strategy System</h1>
        <div className="flex items-center gap-3">
          {overallStatus === "complete" && strategyDoc?.content && (
            <>
              <Button
                onClick={handleGenerateGamma}
                disabled={gammaStatus === "processing"}
                className="gap-2 bg-teal-600 hover:bg-teal-500"
              >
                {gammaStatus === "processing" ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Presentation className="h-4 w-4" />
                    Generate Slides
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownloadPdf}
                variant="outline"
                className="gap-2 border-slate-600 hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </>
          )}

          <Button
            onClick={handleRunAll}
            disabled={overallStatus === "processing"}
            className="gap-2 bg-violet-600 hover:bg-violet-500"
          >
            {overallStatus === "processing" ? (
              <>
                <Spinner className="h-4 w-4" />
                Processing...
              </>
            ) : overallStatus === "complete" ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate All
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Timer when processing */}
      {overallStatus === "processing" && (
        <div className="flex items-center gap-2 text-violet-400">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-mono">{formatTime(getTotalTime())}</span>
          <span className="text-slate-500 text-sm">(may take 2-3 minutes)</span>
        </div>
      )}

      {/* Pipeline Cards - Input + 4 modules */}
      <div className="grid grid-cols-5 gap-4">
        {/* CaSS Input - Special cyan card */}
        <div
          onClick={() => setViewMode("input")}
          className="rounded-lg border-2 border-cyan-500 bg-slate-800 p-4 cursor-pointer hover:border-cyan-400 hover:bg-slate-700 transition-all"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-cyan-500 text-white">
            <FileInput className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm text-cyan-300">CaSS Input</h3>
          <p className="text-xs text-slate-300 mt-1">
            {inputData.callSource || "No data"} + GC
          </p>
          <div className="mt-3 pt-3 border-t border-slate-600">
            <span className="text-xs text-cyan-400">Click to view</span>
          </div>
        </div>

        {/* 4 Processing Modules */}
        {SUB_MODULES.map((module) => {
          const status = moduleStatuses[module.id]
          const timer = moduleTimers[module.id]
          const isActive = activeModule === module.id
          const canRun = overallStatus !== "processing"

          return (
            <div
              key={module.id}
              className={`rounded-lg border-2 p-4 transition-all ${getCardClasses(status, isActive)}`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${getIconClasses(status, isActive)}`}>
                {status === "complete" ? <CheckCircle2 className="h-5 w-5" /> : module.icon}
              </div>

              {/* Text */}
              <h3 className={`font-semibold text-sm ${status === "complete" ? "text-emerald-300" : isActive ? "text-violet-300" : "text-white"}`}>
                {module.name}
              </h3>
              <p className="text-xs text-slate-300 mt-1">{module.description}</p>
              {module.stubbed && (
                <span className="inline-block mt-1 text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                  Stubbed
                </span>
              )}

              {/* Status + Run Button */}
              <div className="mt-3 pt-3 border-t border-slate-600">
                {isActive ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-violet-400 flex items-center gap-1">
                      <Spinner className="h-3 w-3" />
                      Processing
                    </span>
                    <span className="text-xs font-mono text-violet-400">{formatTime(timer)}</span>
                  </div>
                ) : status === "complete" ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400">Complete</span>
                    {timer > 0 && <span className="text-xs font-mono text-slate-500">{formatTime(timer)}</span>}
                  </div>
                ) : status === "error" ? (
                  <span className="text-xs text-red-400">Error</span>
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRunModule(module.id)
                    }}
                    disabled={!canRun}
                    size="sm"
                    className="w-full h-7 text-xs bg-violet-600 hover:bg-violet-500"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Run
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Error Banner */}
      {overallStatus === "error" && (
        <div className="rounded-lg border border-red-500/50 bg-red-950/20 p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">Generation Failed</p>
            <p className="text-sm text-red-300/80">{errorMessage}</p>
          </div>
          <Button onClick={handleRunAll} variant="outline" className="border-red-500/50 hover:bg-red-900/30 text-red-300">
            Retry
          </Button>
        </div>
      )}

      {/* Gamma Success */}
      {gammaStatus === "complete" && gammaUrl && (
        <div className="rounded-lg border border-teal-500/50 bg-teal-950/20 p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-teal-500 text-white">
            <Presentation className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">Presentation Ready</p>
            <a href={gammaUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-300 hover:text-teal-200 flex items-center gap-1">
              Open in Gamma <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {gammaPdfUrl && (
            <Button onClick={() => window.open(gammaPdfUrl, "_blank")} variant="outline" className="border-slate-600 hover:bg-slate-800">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          )}
        </div>
      )}

      {/* Strategy Document Content */}
      {strategyDoc?.content && overallStatus === "complete" && (
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
          <div className="border-b border-slate-700 px-6 py-4 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Strategy Document</h2>
              </div>
              {strategyDoc.updated_at && (
                <span className="text-sm text-slate-500">
                  Updated {new Date(strategyDoc.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="prose prose-invert max-w-none prose-headings:font-bold">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-white mb-2 pb-3 border-b border-slate-700">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold text-violet-300 mt-8 mb-3">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-white mt-6 mb-2">{children}</h3>
                  ),
                  p: ({ children }) => <p className="text-slate-300 leading-relaxed mb-3">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-slate-300 mb-4">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-slate-300 mb-4">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-300">{children}</li>,
                  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline">
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full border-collapse border border-slate-700">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-slate-800">{children}</thead>,
                  th: ({ children }) => <th className="px-4 py-2 text-left text-slate-300 font-semibold border border-slate-700">{children}</th>,
                  td: ({ children }) => <td className="px-4 py-2 text-slate-300 border border-slate-700">{children}</td>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-violet-500 pl-4 italic text-slate-400 my-4">{children}</blockquote>
                  ),
                  hr: () => <hr className="border-slate-700 my-6" />,
                  code: ({ className, children }) => {
                    const isInline = !className
                    if (isInline) {
                      return <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-violet-300">{children}</code>
                    }
                    return <code className="block bg-slate-950 p-4 rounded overflow-x-auto text-sm text-slate-300">{children}</code>
                  },
                }}
              >
                {strategyDoc.content}
              </ReactMarkdown>
            </div>

            {strategyDoc.perplexity_citations && strategyDoc.perplexity_citations.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-white mb-3">Sources</h3>
                <div className="space-y-1">
                  {strategyDoc.perplexity_citations.map((url, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-slate-500">[{index + 1}]</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-violet-400 break-all">
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!strategyDoc?.content && overallStatus === "idle" && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-12 text-center">
          <p className="text-slate-400 mb-4">No strategy document generated yet</p>
          <Button onClick={handleRunAll} className="bg-violet-600 hover:bg-violet-500">
            <Play className="h-4 w-4 mr-2" />
            Run All Modules
          </Button>
        </div>
      )}
    </div>
  )
}
