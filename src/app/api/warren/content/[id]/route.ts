import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const RPC = process.env.MEGAETH_RPC_URL || 'https://megaeth.drpc.org'
const REGISTRY = '0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756'

const REGISTRY_ABI = ['function sites(uint256 tokenId) view returns (address)']
const CHUNK_ABI = ['function read() view returns (bytes)']

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
    const siteAddress: string = await registry.sites(tokenId)

    if (!siteAddress || siteAddress === ethers.ZeroAddress) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const site = new ethers.Contract(siteAddress, CHUNK_ABI, provider)
    const rawHex: string = await site.read()

    // ethers returns bytes as hex string "0x..."
    const hexStr = typeof rawHex === 'string' && rawHex.startsWith('0x') ? rawHex.slice(2) : String(rawHex)
    const rawBytes = Buffer.from(hexStr, 'hex')

    if (rawBytes.length === 0) {
      return NextResponse.json({ error: 'Empty content' }, { status: 404 })
    }

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

    // Try as text
    const text = rawBytes.toString('utf8')

    if (text.startsWith('<svg') || text.startsWith('<?xml')) {
      return new NextResponse(text, {
        headers: { 'Content-Type': 'image/svg+xml', ...CACHE_HEADERS },
      })
    }

    if (text.startsWith('<!') || text.startsWith('<html')) {
      return new NextResponse(text, {
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
