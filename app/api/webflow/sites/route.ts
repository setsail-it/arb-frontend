import { NextResponse } from "next/server"

const WEBFLOW_API = "https://api.webflow.com/v2/sites"

export type WebflowSite = {
  name: string
  id: string
  shortName: string
  webflowUrl: string
  customDomains: string[]
}

export type WebflowSitesResponse = {
  sites: WebflowSite[]
}

export async function GET() {
  const token = process.env.WEBFLOW_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: "WEBFLOW_ACCESS_TOKEN is not configured" },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(WEBFLOW_API, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Webflow API error: ${res.status}`, details: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    const sites: WebflowSite[] = (data.sites ?? []).map((s: { displayName?: string; id?: string; shortName?: string; customDomains?: { url?: string }[] }) => ({
      name: s.displayName ?? "",
      id: s.id ?? "",
      shortName: s.shortName ?? "",
      webflowUrl: (s.shortName ?? "") + ".webflow.io",
      customDomains: (s.customDomains ?? []).map((d) => d.url ?? "").filter(Boolean),
    }))

    return NextResponse.json({ sites } as WebflowSitesResponse)
  } catch (err) {
    console.error("[webflow/sites]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch Webflow sites" },
      { status: 500 }
    )
  }
}
