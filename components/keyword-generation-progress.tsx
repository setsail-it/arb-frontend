"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Check } from "lucide-react"

interface Props {
  message: string
}

export function KeywordGenerationProgress({ message }: Props) {
  const isComplete = message.includes("Successfully")
  const isReasoning = message.includes("[The Brute is thinking...]")
  const reasoningText = isReasoning ? message.replace("[The Brute is thinking...]\n", "") : ""
  const displayMessage = isReasoning ? reasoningText : message

  return (
    <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
      <CardContent className="pt-6 pb-8">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-foreground">The Brute</h3>
          </div>

          {/* Reasoning/Message Display */}
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
        </div>
      </CardContent>
    </Card>
  )
}
