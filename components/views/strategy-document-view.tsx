"use client"

import { useState, useEffect, useRef } from "react"
import type { Client, StrategyDocument } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  FileStack,
  RefreshCw,
  Download,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Props {
  client: Client
}

type GenerationStatus = "idle" | "generating" | "complete" | "error"

function formatTime(seconds: number): string {
  const isNegative = seconds < 0
  const absSeconds = Math.abs(seconds)
  const mins = Math.floor(absSeconds / 60)
  const secs = absSeconds % 60
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`
  return isNegative ? `-${formatted}` : formatted
}

export function StrategyDocumentView({ client }: Props) {
  const [strategyDoc, setStrategyDoc] = useState<StrategyDocument | null>(null)
  const [status, setStatus] = useState<GenerationStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Timer for generation (2 minutes)
  const [timer, setTimer] = useState<number | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // Timer effect
  useEffect(() => {
    if (status === "generating" && timer === null) {
      // Start timer at 2 minutes (120 seconds)
      setTimer(120)
      timerIntervalRef.current = setInterval(() => {
        setTimer(prev => prev !== null ? prev - 1 : null)
      }, 1000)
    } else if (status !== "generating" && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
      setTimer(null)
    }
  }, [status])

  // Load existing strategy document and check for in-progress jobs
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Check job status first
        try {
          const jobStatus = await api.getStrategyGenerationStatus(client.id)
          if (jobStatus.status === "running" || jobStatus.status === "pending") {
            setStatus("generating")
            startPolling()
          } else if (jobStatus.status === "error") {
            setStatus("error")
            setErrorMessage(jobStatus.error_message || "Unknown error")
          }
        } catch (e) {
          // No job found, that's fine
        }

        // Load existing document
        const doc = await api.getStrategyDocument(client.id)
        if (doc && doc.content) {
          setStrategyDoc(doc)
          if (status !== "generating") {
            setStatus("complete")
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

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    
    pollingRef.current = setInterval(async () => {
      try {
        const jobStatus = await api.getStrategyGenerationStatus(client.id)
        console.log("[Strategy Poll] Status:", jobStatus.status)
        
        if (jobStatus.status === "complete") {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          
          // Fetch the generated document
          const doc = await api.getStrategyDocument(client.id)
          if (doc && doc.content) {
            setStrategyDoc(doc)
          }
          setStatus("complete")
        } else if (jobStatus.status === "error") {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setStatus("error")
          setErrorMessage(jobStatus.error_message || "Unknown error")
        }
      } catch (e) {
        console.error("Strategy poll error:", e)
      }
    }, 3000)
  }

  const handleGenerate = async () => {
    setStatus("generating")
    setErrorMessage(null)
    
    try {
      const response = await api.generateStrategyDocument(client.id)
      console.log("[Strategy] Generation started:", response)
      startPolling()
    } catch (e: any) {
      console.error("Failed to start strategy generation:", e)
      setStatus("error")
      setErrorMessage(e.message || "Failed to start generation")
    }
  }

  const handleDownloadPdf = () => {
    const pdfUrl = api.getStrategyDocumentPdfUrl(client.id)
    window.open(pdfUrl, "_blank")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-violet-500" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600 text-white">
            <FileStack className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Strategy Document</h1>
            <p className="text-slate-400">AI-powered GTM strategy using Perplexity Pro Search</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {status === "complete" && strategyDoc?.content && (
            <Button
              onClick={handleDownloadPdf}
              variant="outline"
              className="gap-2 border-slate-600 hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          )}
          
          <Button
            onClick={handleGenerate}
            disabled={status === "generating"}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
          >
            {status === "generating" ? (
              <>
                <Spinner className="h-4 w-4" />
                Generating...
              </>
            ) : status === "complete" ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </>
            ) : (
              <>
                <FileStack className="h-4 w-4" />
                Generate Strategy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {status === "generating" && (
        <Card className="border-violet-500/50 bg-violet-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-violet-600 animate-pulse">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Generating Strategy Document...</p>
                <p className="text-sm text-violet-300">
                  Perplexity Pro Search is researching and analyzing your client data
                </p>
              </div>
              {timer !== null && (
                <div className={`font-mono text-lg ${timer < 0 ? 'text-amber-400' : 'text-violet-400'}`}>
                  {formatTime(timer)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {status === "error" && (
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
              <Button
                onClick={handleGenerate}
                variant="outline"
                className="border-red-500/50 hover:bg-red-900/30"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {strategyDoc?.content ? (
        <Card className="border-slate-700 bg-slate-900">
          <CardHeader className="border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-white">Generated Strategy</CardTitle>
              </div>
              {strategyDoc.updated_at && (
                <span className="text-sm text-slate-400">
                  Last updated: {new Date(strategyDoc.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="py-8 px-8">
            {/* Markdown Content */}
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-white border-b border-emerald-500/30 pb-3 mb-6">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-emerald-400 mt-10 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium text-white mt-6 mb-3">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-200 leading-relaxed mb-4">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-outside ml-5 space-y-2 text-gray-200 mb-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside ml-5 space-y-2 text-gray-200 mb-4">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-200 pl-1">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-emerald-300 font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-gray-300 italic">{children}</em>
                  ),
                  a: ({ href, children }) => (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1"
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
                  thead: ({ children }) => (
                    <thead className="bg-slate-800">{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="bg-slate-900/50">{children}</tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="border-b border-slate-700 last:border-0">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left text-emerald-400 font-semibold text-sm uppercase tracking-wide">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 text-gray-200">{children}</td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-emerald-500 pl-4 py-2 bg-emerald-950/30 rounded-r-lg italic text-gray-300 my-4">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="border-slate-700 my-8" />
                  ),
                  code: ({ className, children }) => {
                    const isInline = !className
                    if (isInline) {
                      return (
                        <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm text-emerald-300">
                          {children}
                        </code>
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
                  <span className="w-1.5 h-5 bg-emerald-500 rounded-full"></span>
                  Sources
                </h3>
                <ul className="space-y-2 bg-slate-800/50 rounded-lg p-4">
                  {strategyDoc.perplexity_citations.map((url, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <span className="text-emerald-500 font-mono">[{index + 1}]</span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-emerald-400 underline flex items-center gap-1 break-all transition-colors"
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
      ) : status === "idle" ? (
        <Card className="border-slate-700 bg-slate-800/40">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-700 flex items-center justify-center text-slate-400">
              <FileStack className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Strategy Document Yet</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Generate a comprehensive GTM strategy based on your Discovery Document and General Context.
            </p>
            <Button
              onClick={handleGenerate}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
            >
              <FileStack className="h-4 w-4 mr-2" />
              Generate Strategy
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

