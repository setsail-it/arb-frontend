"use client"

import { useState, useEffect, useRef } from "react"
import type { Client, StrategyDocument } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  ArrowLeft,
  ChefHat,
  Utensils,
  Palette,
  Languages,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  ExternalLink,
  Presentation,
  Sparkles,
  Play,
  Zap,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Props {
  client: Client
  onBack?: () => void
}

type ModuleStatus = "idle" | "processing" | "complete" | "error"

interface SubModule {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  gradient: string
  glowColor: string
}

const SUB_MODULES: SubModule[] = [
  {
    id: "waiter",
    name: "The Waiter",
    description: "Selects services & budget",
    icon: <Utensils className="h-6 w-6" />,
    gradient: "from-amber-500 to-yellow-600",
    glowColor: "shadow-amber-500/30",
  },
  {
    id: "cook",
    name: "The Cook",
    description: "Writes implementations",
    icon: <ChefHat className="h-6 w-6" />,
    gradient: "from-orange-500 to-red-500",
    glowColor: "shadow-orange-500/30",
  },
  {
    id: "plater",
    name: "The Plater",
    description: "Polishes formatting",
    icon: <Palette className="h-6 w-6" />,
    gradient: "from-rose-500 to-pink-600",
    glowColor: "shadow-rose-500/30",
  },
  {
    id: "translator",
    name: "The Translator",
    description: "Pain point messaging",
    icon: <Languages className="h-6 w-6" />,
    gradient: "from-violet-500 to-purple-600",
    glowColor: "shadow-violet-500/30",
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
  const [selectedModuleView, setSelectedModuleView] = useState<string | null>(null)

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

  // Load existing strategy document
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
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
          }
        } catch (e) {
          // No job found
        }

        // Load existing document
        const doc = await api.getStrategyDocument(client.id)
        if (doc && doc.content) {
          setStrategyDoc(doc)
          if (overallStatus !== "processing") {
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

    let pollCount = 0
    const stageIntervals = [15, 30, 45, 60]

    pollingRef.current = setInterval(async () => {
      pollCount++
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

  const handleGenerate = async () => {
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

  // Module output view
  if (selectedModuleView) {
    const module = SUB_MODULES.find((m) => m.id === selectedModuleView)
    if (!module) return null

    return (
      <div className="min-h-screen bg-[#0a0a0f] p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedModuleView(null)}
            className="gap-2 text-slate-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pipeline
          </Button>

          <div className={`p-[1px] rounded-2xl bg-gradient-to-r ${module.gradient}`}>
            <div className="bg-[#0f0f18] rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${module.gradient} text-white`}>
                  {module.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{module.name}</h2>
                  <p className="text-slate-400">{module.description}</p>
                </div>
              </div>

              <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-slate-300">
                  {module.id === "waiter" && "✅ Service selection and budget allocation completed."}
                  {module.id === "cook" && "✅ Implementation descriptions written for each service."}
                  {module.id === "plater" && "✅ Document polished and formatted for presentation."}
                  {module.id === "translator" && "✅ Rewritten using client's own pain point language from discovery calls."}
                </p>
                <p className="text-sm text-slate-500 mt-4">
                  Output is integrated into the final strategy document.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" />
            <Spinner className="absolute inset-0 m-auto h-8 w-8 text-white" />
          </div>
          <p className="text-slate-400 mt-4">Loading strategy system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="gap-2 text-slate-400 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur-lg opacity-50" />
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-2xl">
                  <ChefHat className="h-8 w-8" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-orange-200 to-amber-200 bg-clip-text text-transparent">
                  Carson Strategy System
                </h1>
                <p className="text-slate-500 mt-1">4-stage AI strategy generation pipeline</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {overallStatus === "complete" && strategyDoc?.content && (
              <>
                <Button
                  onClick={handleGenerateGamma}
                  disabled={gammaStatus === "processing"}
                  className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 border-0 shadow-lg shadow-teal-500/20"
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
                  className="gap-2 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              </>
            )}

            <Button
              onClick={handleGenerate}
              disabled={overallStatus === "processing"}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-0 shadow-lg shadow-orange-500/25 px-6"
            >
              {overallStatus === "processing" ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Cooking...
                </>
              ) : overallStatus === "complete" ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Pipeline Cards */}
        <div className="p-[1px] rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800">
          <div className="bg-[#0f0f18] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Strategy Pipeline</h2>
              {overallStatus === "processing" && (
                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-mono text-amber-400">{formatTime(getTotalTime())}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4">
              {SUB_MODULES.map((module, index) => {
                const status = moduleStatuses[module.id]
                const timer = moduleTimers[module.id]
                const isActive = activeModule === module.id
                const isComplete = status === "complete"
                const isPending = status === "idle" && overallStatus === "processing"

                return (
                  <div
                    key={module.id}
                    onClick={() => isComplete && setSelectedModuleView(module.id)}
                    className={`
                      relative group transition-all duration-500 cursor-pointer
                      ${isActive ? "scale-105" : ""}
                      ${!isComplete && !isActive ? "opacity-50" : ""}
                    `}
                  >
                    {/* Card glow effect */}
                    {(isActive || isComplete) && (
                      <div className={`absolute -inset-[1px] bg-gradient-to-r ${module.gradient} rounded-xl ${isActive ? "animate-pulse" : ""} opacity-${isActive ? "100" : "50"}`} />
                    )}
                    
                    <div className={`
                      relative bg-[#13131d] rounded-xl p-5 border transition-all duration-300
                      ${isActive ? "border-transparent" : isComplete ? "border-transparent" : "border-slate-800"}
                      ${isComplete ? "hover:scale-[1.02]" : ""}
                    `}>
                      {/* Step number */}
                      <div className="absolute -top-3 -left-2 w-7 h-7 rounded-full bg-[#0f0f18] border border-slate-700 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-500">{index + 1}</span>
                      </div>

                      {/* Icon */}
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-500
                        ${isComplete ? `bg-gradient-to-br ${module.gradient} text-white shadow-lg ${module.glowColor}` : 
                          isActive ? `bg-gradient-to-br ${module.gradient} text-white animate-pulse shadow-lg ${module.glowColor}` : 
                          "bg-slate-800/50 text-slate-600"}
                      `}>
                        {isComplete ? <CheckCircle2 className="h-6 w-6" /> : module.icon}
                      </div>

                      {/* Text */}
                      <h3 className={`font-semibold mb-1 transition-colors ${isComplete || isActive ? "text-white" : "text-slate-500"}`}>
                        {module.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">{module.description}</p>

                      {/* Status */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                        {isActive ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-gradient-to-r ${module.gradient} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r ${module.gradient}`}></span>
                              </span>
                              <span className="text-xs text-amber-400">Processing</span>
                            </div>
                            <span className="text-xs font-mono text-amber-400">{formatTime(timer)}</span>
                          </>
                        ) : isComplete ? (
                          <>
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </span>
                            <span className="text-xs font-mono text-slate-500">{formatTime(timer)}</span>
                          </>
                        ) : isPending ? (
                          <span className="text-xs text-slate-600">Queued...</span>
                        ) : (
                          <span className="text-xs text-slate-600">Ready</span>
                        )}
                      </div>
                    </div>

                    {/* Connector line */}
                    {index < SUB_MODULES.length - 1 && (
                      <div className={`
                        absolute top-1/2 -right-2 w-4 h-0.5 transition-all duration-500
                        ${isComplete ? `bg-gradient-to-r ${module.gradient}` : "bg-slate-800"}
                      `}>
                        <div className={`
                          absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-all duration-500
                          ${isComplete ? `bg-gradient-to-r ${SUB_MODULES[index + 1].gradient}` : "bg-slate-700"}
                        `} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {overallStatus === "error" && (
          <div className="p-[1px] rounded-xl bg-gradient-to-r from-red-500/50 to-red-600/50">
            <div className="bg-red-950/30 rounded-xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/20 text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">Generation Failed</p>
                <p className="text-sm text-red-300/80">{errorMessage}</p>
              </div>
              <Button
                onClick={handleGenerate}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Gamma Success Banner */}
        {gammaStatus === "complete" && gammaUrl && (
          <div className="p-[1px] rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500">
            <div className="bg-teal-950/50 rounded-xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
                <Presentation className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">Presentation Ready!</p>
                <a
                  href={gammaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-teal-300 hover:text-teal-200 flex items-center gap-1"
                >
                  Open in Gamma <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                {gammaPdfUrl && (
                  <Button
                    onClick={() => window.open(gammaPdfUrl, "_blank")}
                    variant="outline"
                    className="border-slate-600 hover:bg-slate-800 text-slate-300"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                )}
                <Button
                  onClick={() => window.open(gammaUrl, "_blank")}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Slides
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Strategy Document Content */}
        {strategyDoc?.content && overallStatus === "complete" && (
          <div className="p-[1px] rounded-2xl bg-gradient-to-b from-amber-500/20 via-slate-800 to-slate-800">
            <div className="bg-[#0c0c14] rounded-2xl overflow-hidden">
              {/* Document Header */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/10 px-8 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Final Strategy Document</h2>
                      <p className="text-sm text-slate-500">Generated for {client.name}</p>
                    </div>
                  </div>
                  {strategyDoc.updated_at && (
                    <span className="text-sm text-slate-500">
                      Updated {new Date(strategyDoc.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Document Content */}
              <div className="px-8 py-10">
                <div className="prose prose-invert max-w-none prose-headings:font-bold">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-3xl font-bold text-white mb-2 pb-4 border-b border-amber-500/30">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-bold text-amber-300 mt-12 mb-4 flex items-center gap-3">
                          <span className="w-1 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></span>
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold text-white mt-8 mb-3">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-slate-300 leading-relaxed mb-4">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-none space-y-2 text-slate-300 mb-6 ml-0">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-outside ml-5 space-y-2 text-slate-300 mb-6">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-slate-300 pl-0 flex items-start gap-2">
                          <span className="text-amber-500 mt-1.5">•</span>
                          <span>{children}</span>
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-amber-200 font-semibold">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-slate-400 italic">{children}</em>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 underline decoration-amber-500/30 underline-offset-2 inline-flex items-center gap-1"
                        >
                          {children}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-8 rounded-xl border border-slate-700/50 shadow-xl">
                          <table className="w-full border-collapse">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="bg-slate-900/30">{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors">
                          {children}
                        </tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-5 py-4 text-left text-amber-300 font-semibold text-sm">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-5 py-4 text-slate-300">{children}</td>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-amber-500 pl-5 py-3 bg-amber-500/5 rounded-r-xl italic text-slate-400 my-6">
                          {children}
                        </blockquote>
                      ),
                      hr: () => <hr className="border-slate-800 my-10" />,
                      code: ({ className, children }) => {
                        const isInline = !className
                        if (isInline) {
                          return (
                            <code className="bg-slate-800 px-2 py-1 rounded text-sm text-amber-300 font-mono">
                              {children}
                            </code>
                          )
                        }
                        return (
                          <code className="block bg-slate-950 p-5 rounded-xl overflow-x-auto text-sm text-slate-300 border border-slate-800 font-mono">
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {strategyDoc.content}
                  </ReactMarkdown>
                </div>

                {/* Citations */}
                {strategyDoc.perplexity_citations && strategyDoc.perplexity_citations.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span className="w-1 h-5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></span>
                      Sources
                    </h3>
                    <div className="bg-slate-900/50 rounded-xl p-5 space-y-2 border border-slate-800">
                      {strategyDoc.perplexity_citations.map((url, index) => (
                        <div key={index} className="flex items-start gap-3 text-sm">
                          <span className="text-amber-500 font-mono text-xs bg-amber-500/10 px-2 py-0.5 rounded">
                            {index + 1}
                          </span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-amber-400 break-all transition-colors flex items-center gap-1"
                          >
                            {url}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!strategyDoc?.content && overallStatus === "idle" && (
          <div className="p-[1px] rounded-2xl bg-gradient-to-r from-slate-800 via-amber-500/20 to-slate-800">
            <div className="bg-[#0f0f18] rounded-2xl py-20 text-center">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl blur-2xl opacity-30" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-2xl">
                  <ChefHat className="h-12 w-12" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Ready to Cook Up a Strategy</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                The Carson Strategy System will process your client data through 4 specialized stages to create a comprehensive GTM strategy.
              </p>
              <Button
                onClick={handleGenerate}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border-0 shadow-lg shadow-orange-500/25 px-8 py-6 text-lg"
              >
                <Zap className="h-5 w-5" />
                Start Pipeline
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
