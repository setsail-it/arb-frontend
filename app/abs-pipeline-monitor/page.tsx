"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/api"

interface PipelineState {
  client_id: number
  blog_id: number
  title: string | null
  keywords: {
    primary_keyword: string
    secondary_keywords: string[]
  } | null
  current_agent: string | null
  metrics: {
    iteration: number
    version: number | null
    w_calls: number
    sq_calls: number
    sq_vampire_calls: number
  }
  outputs: {
    W: string | null
    SQ: string | null
    SQ_vampire: string | null
  }
  latest_html: {
    client_id: number | null
    blog_id: number | null
    version: number | null
  }
}

function AbsPipelineMonitorContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get("client_id")
  const blogId = searchParams.get("blog_id")

  const [state, setState] = useState<PipelineState | null>(null)
  const [connected, setConnected] = useState(false)
  const [selectedOutput, setSelectedOutput] = useState<{
    agent: string
    output: string
  } | null>(null)

  useEffect(() => {
    if (!clientId || !blogId) return

    const fetchState = async () => {
      try {
        const data = await api.getAbsPipelineState(Number(clientId), Number(blogId))
        setState(data)
        setConnected(true)
      } catch (error) {
        console.error("Failed to fetch pipeline state:", error)
        setConnected(false)
      }
    }

    // Initial fetch
    fetchState()

    // Poll every 500ms
    const interval = setInterval(fetchState, 500)

    return () => clearInterval(interval)
  }, [clientId, blogId])

  if (!clientId || !blogId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">ABS Pipeline Monitor</h1>
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-center">
            Missing client_id or blog_id in URL
          </div>
        </div>
      </div>
    )
  }

  const getOrbClass = (agent: string) => {
    if (state?.current_agent === agent) {
      return "bg-green-500 animate-pulse"
    } else if (state?.outputs[agent as keyof typeof state.outputs]) {
      return "bg-blue-500"
    } else {
      return "bg-gray-500 opacity-50"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Status Indicator */}
        <div
          className={`fixed top-4 right-4 px-4 py-2 rounded-full text-sm font-semibold ${
            connected ? "bg-green-500/80" : "bg-red-500/80"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </div>

        <h1 className="text-4xl font-bold text-center mb-8 drop-shadow-lg">ABS Pipeline Monitor</h1>

        {/* Blog Info */}
        {state && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 shadow-xl">
            <h2 className="text-2xl font-semibold mb-4">{state.title || "Loading..."}</h2>
            {state.keywords && (
              <div className="text-sm opacity-90 space-y-2">
                <div>
                  <strong>Primary:</strong> {state.keywords.primary_keyword || "-"}
                </div>
                <div>
                  <strong>Secondaries:</strong>{" "}
                  {state.keywords.secondary_keywords?.length > 0
                    ? state.keywords.secondary_keywords.join(", ")
                    : "-"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metrics Bar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-sm opacity-80 mb-2">Iteration</div>
              <div className="text-3xl font-bold">{state?.metrics.iteration || 0}</div>
            </div>
            <div>
              <div className="text-sm opacity-80 mb-2">Version</div>
              <div className="text-3xl font-bold">{state?.metrics.version || "-"}</div>
            </div>
            <div>
              <div className="text-sm opacity-80 mb-2">W Calls</div>
              <div className="text-3xl font-bold">{state?.metrics.w_calls || 0}</div>
            </div>
            <div>
              <div className="text-sm opacity-80 mb-2">SQ Calls</div>
              <div className="text-3xl font-bold">{state?.metrics.sq_calls || 0}</div>
            </div>
            <div>
              <div className="text-sm opacity-80 mb-2">SQ Vampire Calls</div>
              <div className="text-3xl font-bold">{state?.metrics.sq_vampire_calls || 0}</div>
            </div>
            {state?.latest_html?.client_id && (
              <div>
                <div className="text-sm opacity-80 mb-2">Latest HTML</div>
                <div className="text-3xl font-bold">
                  <a
                    href={`/api/proxy/clients/${clientId}/blog-ideas/${blogId}/html?version_number=${state.latest_html.version}`}
                    target="_blank"
                    className="text-green-300 hover:text-green-200 underline"
                  >
                    View
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agent Orbs */}
        <div className="flex justify-center items-center gap-16 flex-wrap my-12">
          {["W", "SQ", "SQ_vampire"].map((agent) => (
            <div key={agent} className="text-center">
              <button
                onClick={() => {
                  const output = state?.outputs[agent as keyof typeof state.outputs]
                  if (output) {
                    setSelectedOutput({ agent, output })
                  }
                }}
                className={`w-48 h-48 rounded-full ${getOrbClass(agent)} flex items-center justify-center text-3xl font-bold text-white shadow-2xl transition-transform hover:scale-110 cursor-pointer ${
                  state?.outputs[agent as keyof typeof state.outputs] ? "cursor-pointer" : "cursor-default"
                }`}
                disabled={!state?.outputs[agent as keyof typeof state.outputs]}
              >
                {agent === "SQ_vampire" ? (
                  <>
                    SQ<sub className="text-2xl">V</sub>
                  </>
                ) : (
                  agent
                )}
              </button>
              <div className="mt-4 text-lg font-semibold">
                {agent === "W" ? "Writer" : agent === "SQ" ? "Quality Check" : "Critique"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Output Modal */}
      {selectedOutput && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8"
          onClick={() => setSelectedOutput(null)}
        >
          <div
            className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
              <h2 className="text-2xl font-bold">{selectedOutput.agent} Output</h2>
              <button
                onClick={() => setSelectedOutput(null)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold"
              >
                Close
              </button>
            </div>
            <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap break-words">
              {selectedOutput.output}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AbsPipelineMonitorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 text-white p-8 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    }>
      <AbsPipelineMonitorContent />
    </Suspense>
  )
}

