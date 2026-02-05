"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Check, ChevronDown, ChevronUp } from "lucide-react"

interface Props {
  message: string
  minimized?: boolean
  onToggleMinimize?: () => void
}

export function KeywordGenerationProgress({ message, minimized = false, onToggleMinimize }: Props) {
  const isComplete = message.includes("Successfully")
  const isReasoning = message.includes("[The Brute is thinking...]")
  const reasoningText = isReasoning ? message.replace("[The Brute is thinking...]\n", "") : ""
  const displayMessage = isReasoning ? reasoningText : message

  return (
    <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
      <CardContent className={`pt-6 ${minimized ? "pb-4" : "pb-8"}`}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h3 className="text-xl font-bold text-foreground">The Brute</h3>
            </div>
            {onToggleMinimize && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleMinimize}
                className="h-6 w-6 p-0"
              >
                {minimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Reasoning/Message Display */}
          {!minimized && (
            <div className="bg-background/50 rounded-lg p-4 border border-border/50 max-h-[400px] overflow-y-auto">
              <div className="flex items-start gap-3">
                {isComplete ? (
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="h-5 w-5 flex-shrink-0 mt-0.5 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {isReasoning ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Reasoning:</p>
                      <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words">
                        {displayMessage}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-foreground break-words whitespace-pre-wrap">
                      {displayMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
