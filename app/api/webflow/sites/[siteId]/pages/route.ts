import { NextRequest, NextResponse } from "next/server"

const WEBFLOW_API = "https://api.webflow.com/v2/sites"

export type WebflowPageItem = {
  id: string
  title: string | null
  slug: string | null
  publishedPath: string | null
  collectionId: string | null
  type: string
}

export type WebflowPagesResponse = {
  pages: WebflowPageItem[]
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await context.params
  if (!siteId) {
    return NextResponse.json({ error: "siteId required" }, { status: 400 })
  }

  const token = process.env.WEBFLOW_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: "WEBFLOW_ACCESS_TOKEN is not configured" },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(`${WEBFLOW_API}/${siteId}/pages`, {
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
    const rawPages = data.pages ?? []
    const pages: WebflowPageItem[] = rawPages.map(
      (p: {
        id?: string
        title?: string
        slug?: string
        publishedPath?: string
        collectionId?: string | null
      }) => ({
        id: p.id ?? "",
        title: p.title ?? null,
        slug: p.slug ?? null,
        publishedPath: p.publishedPath ?? null,
        collectionId: p.collectionId ?? null,
        type: p.collectionId ? "cms_template" : "static",
      })
    )

    return NextResponse.json({ pages } as WebflowPagesResponse)
  } catch (err) {
    console.error("[webflow/pages]", err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to fetch Webflow pages",
      },
      { status: 500 }
    )
  }
}
