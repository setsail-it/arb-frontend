"use client"

import { useParams } from "next/navigation"
import { DiscoveryDocumentForm } from "@/components/views/discovery-document-form"

export default function PublicDiscoveryDocumentPage() {
  const params = useParams()
  const token = params.token as string

  // Create a dummy client object for the form
  // In public mode, we use the token instead of client.id
  const dummyClient = {
    id: "0",
    name: "Client",
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        <DiscoveryDocumentForm
          client={dummyClient}
          isPublicMode={true}
          editToken={token}
        />
      </div>
    </div>
  )
}

