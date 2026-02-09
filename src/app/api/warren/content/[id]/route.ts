import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const RPC = process.env.MEGAETH_RPC_URL || 'https://megaeth.drpc.org'
const REGISTRY = '0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756'

const REGISTRY_ABI = ['function sites(uint256 tokenId) view returns (address)']
const CHUNK_ABI = ['function read() view returns (string)']

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const tokenId = parseInt(id)

  if (isNaN(tokenId) || tokenId < 0) {
    return NextResponse.json({ error: 'Invalid token ID' }, { status: 400 })
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC, {
      chainId: 4326,
      name: 'megaeth',
    })

    const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider)
    const siteAddress = await registry.sites(tokenId)

    if (!siteAddress || siteAddress === ethers.ZeroAddress) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const site = new ethers.Contract(siteAddress, CHUNK_ABI, provider)
    const content = await site.read()

    if (!content) {
      return NextResponse.json({ error: 'Empty content' }, { status: 404 })
    }

    // Convert string to buffer (content is raw binary stored as string)
    const rawBytes = Buffer.from(content, 'binary')

    // PNG: 0x89504E47
    if (rawBytes[0] === 0x89 && rawBytes[1] === 0x50 && rawBytes[2] === 0x4E && rawBytes[3] === 0x47) {
      return new NextResponse(rawBytes, {
        headers: { 'Content-Type': 'image/png', ...CACHE_HEADERS },
      })
    }

    // JPEG: 0xFFD8FF
    if (rawBytes[0] === 0xFF && rawBytes[1] === 0xD8 && rawBytes[2] === 0xFF) {
      return new NextResponse(rawBytes, {
        headers: { 'Content-Type': 'image/jpeg', ...CACHE_HEADERS },
      })
    }

    // SVG / HTML / other
    if (content.startsWith('<svg') || content.startsWith('<?xml')) {
      return new NextResponse(content, {
        headers: { 'Content-Type': 'image/svg+xml', ...CACHE_HEADERS },
      })
    }

    if (content.startsWith('<!') || content.startsWith('<html')) {
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CACHE_HEADERS },
      })
    }

    return new NextResponse(rawBytes, {
      headers: { 'Content-Type': 'application/octet-stream', ...CACHE_HEADERS },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[warren/content/${id}]`, message)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}
