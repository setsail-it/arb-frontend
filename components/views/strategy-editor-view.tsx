"use client"

import { useState, useEffect } from "react"
import type { Client, VersionedStrategy, StrategyVersion } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StrategyChat } from "@/components/strategy-chat"
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Props {
  client: Client
  readOnly?: boolean
}

export function StrategyEditorView({ client, readOnly = false }: Props) {
  const [versions, setVersions] = useState<StrategyVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [strategy, setStrategy] = useState<VersionedStrategy | null>(null)
  const [isLoadingVersions, setIsLoadingVersions] = useState(true)
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load versions on mount
  useEffect(() => {
    loadVersions()
  }, [client.id])

  // Load strategy when version changes
  useEffect(() => {
    if (selectedVersion !== null) {
      loadStrategy(selectedVersion)
    }
  }, [selectedVersion])

  const loadVersions = async () => {
    setIsLoadingVersions(true)
    setError(null)
    try {
      const result = await api.getStrategyVersions(client.id)
      setVersions(result.versions)
      // Auto-select the latest version if available
      if (result.versions.length > 0 && selectedVersion === null) {
        setSelectedVersion(result.versions[0].version_number)
      }
    } catch (e: any) {
      console.error("Failed to load strategy versions:", e)
      setError(e.message || "Failed to load versions")
      setVersions([])
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const loadStrategy = async (versionNumber: number) => {
    setIsLoadingStrategy(true)
    try {
      const result = await api.getVersionedStrategy(client.id, versionNumber)
      setStrategy(result)
    } catch (e: any) {
      console.error("Failed to load strategy:", e)
      setStrategy(null)
    } finally {
      setIsLoadingStrategy(false)
    }
  }

  const handleCreateVersion = async () => {
    setIsCreating(true)
    try {
      // Copy from latest version if one exists
      const copyFrom = versions.length > 0 ? versions[0].version_number : undefined
      const result = await api.createStrategyVersion(client.id, copyFrom)
      // Reload versions and select the new one
      await loadVersions()
      setSelectedVersion(result.version_number)
    } catch (e: any) {
      console.error("Failed to create strategy version:", e)
      setError(e.message || "Failed to create version")
    } finally {
      setIsCreating(false)
    }
  }

  const handleStrategyUpdated = () => {
    // Reload the current strategy after an edit
    if (selectedVersion !== null) {
      loadStrategy(selectedVersion)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown"
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  if (isLoadingVersions) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-violet-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full gap-4">
      {/* Version Sidebar */}
      <div className="w-56 flex-shrink-0 bg-slate-900/50 rounded-lg border border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-white text-sm">Versions</h3>
            {!readOnly && (
              <Button
                onClick={handleCreateVersion}
                disabled={isCreating}
                size="sm"
                className="h-7 px-2 bg-violet-600 hover:bg-violet-500"
              >
                {isCreating ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {versions.length === 0 ? (
            <div className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No versions yet</p>
              {!readOnly && (
                <Button
                  onClick={handleCreateVersion}
                  disabled={isCreating}
                  size="sm"
                  className="mt-3 bg-violet-600 hover:bg-violet-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Version
                </Button>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {versions.map((v) => (
                <button
                  key={v.version_number}
                  onClick={() => setSelectedVersion(v.version_number)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedVersion === v.version_number
                      ? "bg-violet-600/20 border border-violet-500/50"
                      : "hover:bg-slate-800 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectedVersion === v.version_number ? (
                      <CheckCircle2 className="h-4 w-4 text-violet-400" />
                    ) : (
                      <FileText className="h-4 w-4 text-slate-500" />
                    )}
                    <span
                      className={`font-medium text-sm ${
                        selectedVersion === v.version_number
                          ? "text-violet-300"
                          : "text-slate-300"
                      }`}
                    >
                      Version {v.version_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 ml-6">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span className="text-xs text-slate-500">
                      {formatDate(v.updated_at || v.created_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Strategy Document */}
      <div className="flex-1 min-w-0 bg-slate-900/50 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
        {selectedVersion === null ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-slate-600" />
              <p>Select a version to view the strategy</p>
            </div>
          </div>
        ) : isLoadingStrategy ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner className="h-8 w-8 text-violet-500" />
          </div>
        ) : strategy ? (
          <>
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/30 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">
                  Strategy v{strategy.version_number}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Last updated: {formatDate(strategy.updated_at)}
                </p>
              </div>
              <Button
                onClick={() => loadStrategy(selectedVersion)}
                variant="outline"
                size="sm"
                className="gap-2 border-slate-600 hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {strategy.full_document ? (
                <div className="prose prose-invert max-w-none prose-headings:font-bold">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold text-white mb-2 pb-3 border-b border-slate-700">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-bold text-violet-300 mt-8 mb-3">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold text-white mt-6 mb-2">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-slate-300 leading-relaxed mb-3">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 text-slate-300 mb-4">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 text-slate-300 mb-4">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-slate-300">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-white font-semibold">
                          {children}
                        </strong>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:text-violet-300 underline"
                        >
                          {children}
                        </a>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="w-full border-collapse border border-slate-700">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-slate-800">{children}</thead>
                      ),
                      th: ({ children }) => (
                        <th className="px-4 py-2 text-left text-slate-300 font-semibold border border-slate-700">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-4 py-2 text-slate-300 border border-slate-700">
                          {children}
                        </td>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-violet-500 pl-4 italic text-slate-400 my-4">
                          {children}
                        </blockquote>
                      ),
                      hr: () => <hr className="border-slate-700 my-6" />,
                      code: ({ className, children }) => {
                        const isInline = !className
                        if (isInline) {
                          return (
                            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-violet-300">
                              {children}
                            </code>
                          )
                        }
                        return (
                          <code className="block bg-slate-950 p-4 rounded overflow-x-auto text-sm text-slate-300">
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {strategy.full_document}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                  <p>This strategy version is empty</p>
                  <p className="text-sm mt-1">
                    Use the chat to add content to sections
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <p>Failed to load strategy</p>
          </div>
        )}
      </div>

      {/* Chat Copilot */}
      {selectedVersion !== null && !readOnly && (
        <div className="w-80 flex-shrink-0">
          <StrategyChat
            clientId={client.id}
            versionNumber={selectedVersion}
            onStrategyUpdated={handleStrategyUpdated}
          />
        </div>
      )}
    </div>
  )
}

