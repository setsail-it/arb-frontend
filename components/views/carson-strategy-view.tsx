"use client"

import { useState, useEffect, useRef } from "react"
import type { Client, StrategyDocument } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  ArrowLeft,
  ArrowRight,
  ChefHat,
  Utensils,
  Palette,
  Languages,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileStack,
  RefreshCw,
  Download,
  ExternalLink,
  Presentation,
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
  iconBg: string
  iconColor: string
}

const SUB_MODULES: SubModule[] = [
  {
    id: "waiter",
    name: "The Waiter",
    description: "Chooses services & allocates budget",
    icon: <Utensils className="h-5 w-5" />,
    iconBg: "bg-amber-600",
    iconColor: "text-amber-400",
  },
  {
    id: "cook",
    name: "The Cook",
    description: "Writes implementation descriptions",
    icon: <ChefHat className="h-5 w-5" />,
    iconBg: "bg-orange-600",
    iconColor: "text-orange-400",
  },
  {
    id: "plater",
    name: "The Plater",
    description: "Structures the final format",
    icon: <Palette className="h-5 w-5" />,
    iconBg: "bg-rose-600",
    iconColor: "text-rose-400",
  },
  {
    id: "translator",
    name: "The Translator",
    description: "Converts to client language",
    icon: <Languages className="h-5 w-5" />,
    iconBg: "bg-violet-600",
    iconColor: "text-violet-400",
  },
]

function formatTime(seconds: number): string {
  const isNegative = seconds < 0
  const absSeconds = Math.abs(seconds)
  const mins = Math.floor(absSeconds / 60)
  const secs = absSeconds % 60
  const formatted = `${mins}:${secs.toString().padStart(2, "0")}`
  return isNegative ? `-${formatted}` : formatted
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
            // Simulate stage progression
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
    // Start with waiter
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
    const stageIntervals = [15, 30, 45, 60] // Approximate seconds per stage

    pollingRef.current = setInterval(async () => {
      pollCount++
      try {
        const jobStatus = await api.getStrategyGenerationStatus(client.id)

        // Progress through stages based on elapsed time
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

          // Mark all stages complete
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

    // Start polling and simulation
    startPolling()
    simulateStageProgression()

    try {
      const response = await api.generateStrategyDocument(client.id)
      console.log("[Carson] Generation started:", response)
    } catch (e: any) {
      console.error("Failed to start strategy generation:", e)
      // Don't set error - let polling determine actual status
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

  const renderModuleCard = (module: SubModule, index: number) => {
    const status = moduleStatuses[module.id]
    const timer = moduleTimers[module.id]
    const isActive = activeModule === module.id
    const isComplete = status === "complete"
    const isClickable = isComplete

    return (
      <div key={module.id} className="flex items-center">
        <Card
          onClick={() => isClickable && setSelectedModuleView(module.id)}
          className={`
            w-56 transition-all duration-300 cursor-pointer
            ${isActive ? "ring-2 ring-violet-500 animate-pulse" : ""}
            ${isComplete ? "border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-400" : "border-slate-700 bg-slate-800/50"}
            ${status === "error" ? "border-red-500/50 bg-red-950/20" : ""}
            ${!isClickable && !isActive ? "opacity-60" : ""}
          `}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${isComplete ? "bg-emerald-600" : module.iconBg}`}>
                {isComplete ? <CheckCircle2 className="h-5 w-5 text-white" /> : module.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm truncate">{module.name}</h3>
                <p className="text-xs text-slate-400 truncate">{module.description}</p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
              {isActive ? (
                <>
                  <div className="flex items-center gap-2">
                    <Spinner className="h-3 w-3 text-violet-400" />
                    <span className="text-xs text-violet-400">Processing</span>
                  </div>
                  <span className="text-xs font-mono text-violet-400">{formatTime(timer)}</span>
                </>
              ) : isComplete ? (
                <>
                  <span className="text-xs text-emerald-400">Complete</span>
                  <span className="text-xs font-mono text-emerald-400">{formatTime(timer)}</span>
                </>
              ) : status === "error" ? (
                <span className="text-xs text-red-400">Error</span>
              ) : (
                <span className="text-xs text-slate-500">Waiting...</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Arrow connector */}
        {index < SUB_MODULES.length - 1 && (
          <div className="px-2">
            <ArrowRight className={`h-5 w-5 ${isComplete ? "text-emerald-500" : "text-slate-600"}`} />
          </div>
        )}
      </div>
    )
  }

  // Module output view
  if (selectedModuleView) {
    const module = SUB_MODULES.find((m) => m.id === selectedModuleView)
    if (!module) return null

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedModuleView(null)}
            className="gap-2 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pipeline
          </Button>
        </div>

        <Card className="border-slate-700 bg-slate-900">
          <CardHeader className="border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${module.iconBg}`}>{module.icon}</div>
              <div>
                <CardTitle className="text-white">{module.name} Output</CardTitle>
                <p className="text-sm text-slate-400">{module.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Show relevant portion of strategy doc based on module */}
            {strategyDoc?.content ? (
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300">
                  {module.id === "waiter" && "Service selection and budget allocation completed."}
                  {module.id === "cook" && "Implementation descriptions written for each service."}
                  {module.id === "plater" && "Document structured according to standard format."}
                  {module.id === "translator" && "Translated to use client's pain point language."}
                </p>
                <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-400 italic">
                    Full output is integrated into the final strategy document below.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No output available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-violet-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-lg">
              <ChefHat className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Carson Strategy System</h1>
              <p className="text-slate-400">4-stage AI strategy generation pipeline</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {overallStatus === "complete" && strategyDoc?.content && (
            <>
              <Button
                onClick={handleGenerateGamma}
                disabled={gammaStatus === "processing"}
                variant="outline"
                className="gap-2 border-teal-600 text-teal-400 hover:bg-teal-900/30"
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
              <Button onClick={handleDownloadPdf} variant="outline" className="gap-2 border-slate-600 hover:bg-slate-800">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </>
          )}

          <Button
            onClick={handleGenerate}
            disabled={overallStatus === "processing"}
            className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
          >
            {overallStatus === "processing" ? (
              <>
                <Spinner className="h-4 w-4" />
                Processing...
              </>
            ) : overallStatus === "complete" ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </>
            ) : (
              <>
                <ChefHat className="h-4 w-4" />
                Start Pipeline
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Pipeline Flow */}
      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="text-white flex items-center gap-2">
            <FileStack className="h-5 w-5 text-amber-400" />
            Strategy Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-0 overflow-x-auto pb-4">
            {SUB_MODULES.map((module, index) => renderModuleCard(module, index))}
          </div>

          {/* Overall progress */}
          {overallStatus === "processing" && (
            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-violet-400" />
                  <span className="text-sm text-slate-400">Total time:</span>
                </div>
                <span className="font-mono text-violet-400">
                  {formatTime(
                    moduleTimers.waiter + moduleTimers.cook + moduleTimers.plater + moduleTimers.translator
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Banner */}
      {overallStatus === "error" && (
        <Card className="border-red-500/50 bg-red-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-red-600">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Generation Failed</p>
                <p className="text-sm text-red-300">{errorMessage}</p>
              </div>
              <Button onClick={handleGenerate} variant="outline" className="border-red-500/50 hover:bg-red-900/30">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gamma Status */}
      {gammaStatus === "complete" && gammaUrl && (
        <Card className="border-teal-500/50 bg-teal-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-teal-600">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Presentation Ready!</p>
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
                  variant="outline"
                  className="border-teal-500/50 hover:bg-teal-900/30 text-teal-300"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Slides
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Document Content */}
      {strategyDoc?.content && overallStatus === "complete" && (
        <Card className="border-slate-700 bg-slate-900">
          <CardHeader className="border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-white">Final Strategy Document</CardTitle>
              </div>
              {strategyDoc.updated_at && (
                <span className="text-sm text-slate-400">
                  Last updated: {new Date(strategyDoc.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="py-8 px-8">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-white border-b border-amber-500/30 pb-3 mb-6">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-amber-400 mt-10 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => <h3 className="text-lg font-medium text-white mt-6 mb-3">{children}</h3>,
                  p: ({ children }) => <p className="text-gray-200 leading-relaxed mb-4">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="list-disc list-outside ml-5 space-y-2 text-gray-200 mb-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside ml-5 space-y-2 text-gray-200 mb-4">{children}</ol>
                  ),
                  li: ({ children }) => <li className="text-gray-200 pl-1">{children}</li>,
                  strong: ({ children }) => <strong className="text-amber-300 font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1"
                    >
                      {children}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6 rounded-lg border border-slate-600">
                      <table className="w-full border-collapse">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-slate-800">{children}</thead>,
                  tbody: ({ children }) => <tbody className="bg-slate-900/50">{children}</tbody>,
                  tr: ({ children }) => <tr className="border-b border-slate-700 last:border-0">{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left text-amber-400 font-semibold text-sm uppercase tracking-wide">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => <td className="px-4 py-3 text-gray-200">{children}</td>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-amber-500 pl-4 py-2 bg-amber-950/30 rounded-r-lg italic text-gray-300 my-4">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="border-slate-700 my-8" />,
                  code: ({ className, children }) => {
                    const isInline = !className
                    if (isInline) {
                      return (
                        <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm text-amber-300">{children}</code>
                      )
                    }
                    return (
                      <code className="block bg-slate-950 p-4 rounded-lg overflow-x-auto text-sm text-gray-200 border border-slate-700">
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
              <div className="mt-10 pt-6 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
                  Sources
                </h3>
                <ul className="space-y-2 bg-slate-800/50 rounded-lg p-4">
                  {strategyDoc.perplexity_citations.map((url, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <span className="text-amber-500 font-mono">[{index + 1}]</span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-amber-400 underline flex items-center gap-1 break-all transition-colors"
                      >
                        {url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!strategyDoc?.content && overallStatus === "idle" && (
        <Card className="border-slate-700 bg-slate-800/40">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white">
              <ChefHat className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Ready to Cook Up a Strategy</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              The Carson Strategy System will process your client data through 4 specialized stages to create a
              comprehensive GTM strategy.
            </p>
            <Button
              onClick={handleGenerate}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
            >
              <ChefHat className="h-4 w-4 mr-2" />
              Start Pipeline
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

