"use client"

import { useState, useEffect } from "react"
import type { Client } from "@/types"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Props {
  client: Client
}

interface PainPointStrategy {
  id: number
  client_id: number
  content: string | null
  created_at: string
  updated_at: string
}

export function PainPointStrategyView({ client }: Props) {
  const [painPointStrategy, setPainPointStrategy] = useState<PainPointStrategy | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const doc = await api.getPainPointStrategy(client.id)
        if (doc && doc.content) {
          setPainPointStrategy(doc)
        }
      } catch (e) {
        console.error("Error loading pain point strategy:", e)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [client.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-amber-500" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-600 text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Pain Point Rewriter</h1>
          <p className="text-slate-400">Strategy refined with improved pain point messaging</p>
        </div>
      </div>

      {/* Content */}
      {painPointStrategy?.content ? (
        <Card className="border-slate-700 bg-slate-900">
          <CardHeader className="border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
                <CardTitle className="text-white">Rewritten Strategy</CardTitle>
              </div>
              {painPointStrategy.updated_at && (
                <span className="text-sm text-slate-400">
                  Last updated: {new Date(painPointStrategy.updated_at).toLocaleDateString()}
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
                    <h1 className="text-2xl font-bold text-white border-b border-amber-500/30 pb-3 mb-6">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-amber-400 mt-10 mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
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
                    <strong className="text-amber-300 font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-gray-300 italic">{children}</em>
                  ),
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
                    <th className="px-4 py-3 text-left text-amber-400 font-semibold text-sm uppercase tracking-wide">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 text-gray-200">{children}</td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-amber-500 pl-4 py-2 bg-amber-950/30 rounded-r-lg italic text-gray-300 my-4">
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
                        <code className="bg-slate-700 px-1.5 py-0.5 rounded text-sm text-amber-300">
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
                {painPointStrategy.content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-700 bg-slate-800/40">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-700 flex items-center justify-center text-slate-400">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Rewritten Strategy Yet</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Run the Pain Point Rewriter to refine your strategy with improved messaging.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

