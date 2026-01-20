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
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          )
        },
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
          if (toolName.startsWith("editStrategy")) {
            onStrategyUpdated?.()
          }
        },
        () => {
          setIsLoading(false)
        },
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
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-200 text-sm">Strategy Copilot</h3>
            <p className="text-xs text-zinc-500">Edit sections via chat</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-600 py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <Bot className="h-8 w-8 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">No messages yet</p>
            <p className="text-xs mt-2 text-zinc-600 max-w-[200px] mx-auto">
              Try: &quot;Edit section 3 to focus more on B2B customers&quot;
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-emerald-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {/* Tool calls indicator */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-2 pb-2 border-b border-zinc-700/50">
                    {msg.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 text-xs text-amber-400"
                      >
                        <Wrench className="h-3 w-3" />
                        <span className="font-mono">{tc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Message content */}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {/* Loading indicator */}
                {msg.role === "assistant" && !msg.content && isLoading && (
                  <div className="flex items-center gap-2">
                    <Spinner className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-zinc-500">Thinking...</span>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/80">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to edit the strategy..."
            className="flex-1 min-h-[44px] max-h-[100px] resize-none bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm rounded-xl focus:border-emerald-600/50 focus:ring-emerald-600/20"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white h-[44px] w-[44px] p-0 rounded-xl"
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
