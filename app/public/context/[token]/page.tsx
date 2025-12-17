"use client"

import { useParams } from "next/navigation"
import { GeneralContextForm } from "@/components/views/general-context-form"

export default function PublicContextPage() {
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
        <GeneralContextForm
          client={dummyClient}
          isPublicMode={true}
          editToken={token}
        />
      </div>
    </div>
  )
}

