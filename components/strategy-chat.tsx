"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Send, Bot, User, Wrench } from "lucide-react"
import type { ChatMessage } from "@/types"
import { api } from "@/lib/api"

interface Props {
  clientId: number
  versionNumber: number
  onStrategyUpdated?: () => void
}

export function StrategyChat({ clientId, versionNumber, onStrategyUpdated }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Create a placeholder for the assistant's response
    const assistantMessageId = `assistant-${Date.now()}`
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      toolCalls: [],
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      await api.sendStrategyChatMessage(
        clientId,
        versionNumber,
        userMessage.content,
        // onChunk - append content to the assistant message
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          )
        },
        // onToolCall - record tool calls
        (toolName, args) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    toolCalls: [
                      ...(msg.toolCalls || []),
                      { name: toolName, arguments: args },
                    ],
                  }
                : msg
            )
          )
          // Notify parent that strategy may have been updated
          if (toolName.startsWith("editStrategy")) {
            onStrategyUpdated?.()
          }
        },
        // onComplete
        () => {
          setIsLoading(false)
        },
        // onError
        (error) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: `Error: ${error}` }
                : msg
            )
          )
          setIsLoading(false)
        }
      )
    } catch (error: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `Error: ${error.message}` }
            : msg
        )
      )
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-violet-400" />
          <h3 className="font-semibold text-white">Strategy Copilot</h3>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Ask me to edit specific sections of the strategy
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <Bot className="h-12 w-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1">
              Try: &quot;Edit section 3 to focus more on B2B customers&quot;
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-violet-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                {/* Tool calls indicator */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-2 pb-2 border-b border-slate-700">
                    {msg.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs text-amber-400"
                      >
                        <Wrench className="h-3 w-3" />
                        <span>Called: {tc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Message content */}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {/* Loading indicator for empty assistant message */}
                {msg.role === "assistant" && !msg.content && isLoading && (
                  <div className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    <span className="text-xs text-slate-400">Thinking...</span>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/30">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to edit the strategy..."
            className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="bg-violet-600 hover:bg-violet-500 h-[44px] w-[44px] p-0"
          >
            {isLoading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

