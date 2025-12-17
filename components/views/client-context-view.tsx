"use client"

import { useState } from "react"
import type { Client } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DiscoveryDocumentForm } from "@/components/views/discovery-document-form"
import { GeneralContextForm } from "@/components/views/general-context-form"

interface Props {
  client: Client
}

export function ClientContextView({ client }: Props) {
  const [activeTab, setActiveTab] = useState("discovery")

  return (
    <div className="h-full overflow-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="mb-4">
          <TabsTrigger value="discovery">Discovery Document</TabsTrigger>
          <TabsTrigger value="general">General Context</TabsTrigger>
          <TabsTrigger value="ground-truth">Ground Truth</TabsTrigger>
        </TabsList>

        <TabsContent value="discovery" className="mt-0">
          <DiscoveryDocumentForm client={client} />
        </TabsContent>

        <TabsContent value="general" className="mt-0">
          <GeneralContextForm client={client} />
        </TabsContent>

        <TabsContent value="ground-truth" className="mt-0">
          <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">Ground Truth - Coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
