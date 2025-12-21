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
        <Card className="border-slate-700 bg-slate-800/40">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-white">Generated Strategy</CardTitle>
              </div>
              {strategyDoc.updated_at && (
                <span className="text-sm text-slate-400">
                  Last updated: {new Date(strategyDoc.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="py-6">
            {/* Markdown Content */}
            <div className="prose prose-invert prose-slate max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-white border-b border-slate-700 pb-3 mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-white mt-8 mb-4">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium text-slate-200 mt-6 mb-3">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-slate-300 leading-relaxed mb-4">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-2 text-slate-300 mb-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-2 text-slate-300 mb-4">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-slate-300">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-white font-semibold">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 underline inline-flex items-center gap-1"
                    >
                      {children}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full border-collapse border border-slate-700">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-slate-800">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="border border-slate-700 px-4 py-2 text-left text-white font-semibold">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-slate-700 px-4 py-2 text-slate-300">{children}</td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-violet-500 pl-4 italic text-slate-400 my-4">
                      {children}
                    </blockquote>
                  ),
                  code: ({ className, children }) => {
                    const isInline = !className
                    if (isInline) {
                      return (
                        <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm text-violet-300">
                          {children}
                        </code>
                      )
                    }
                    return (
                      <code className="block bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm text-slate-300">
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
              <div className="mt-8 pt-6 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Sources</h3>
                <ul className="space-y-2">
                  {strategyDoc.perplexity_citations.map((citation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-slate-500">[{index + 1}]</span>
                      {citation.url ? (
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:text-violet-300 underline flex items-center gap-1"
                        >
                          {citation.title || citation.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">{citation.title || JSON.stringify(citation)}</span>
                      )}
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

