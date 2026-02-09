import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const RPC = process.env.MEGAETH_RPC_URL || 'https://megaeth.drpc.org'
const REGISTRY = '0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756'

// Warren MasterNFT Registry — maps tokenId → root chunk contract
// The root chunk has read() that returns raw content
const REGISTRY_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getLinkedSites(uint256 tokenId) view returns (address[])',
]

const CHUNK_ABI = [
  'function read() view returns (string)',
  'function getCurrentChunkCount() view returns (uint256)',
  'function resolveCurrentChunk(uint256 index) view returns (address)',
]

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

    // Get linked sites (master contracts) from registry
    const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider)
    const sites = await registry.getLinkedSites(tokenId)

    if (!sites || sites.length === 0) {
      return NextResponse.json({ error: 'No content linked to this token' }, { status: 404 })
    }

    const masterAddress = sites[0]

    // Try reading directly from master (single chunk case)
    const master = new ethers.Contract(masterAddress, CHUNK_ABI, provider)

    let fullContent: string
    try {
      // Try multi-chunk read first
      const chunkCount = Number(await master.getCurrentChunkCount())
      fullContent = ''
      for (let i = 0; i < chunkCount; i++) {
        const chunkAddr = await master.resolveCurrentChunk(i)
        const chunk = new ethers.Contract(chunkAddr, CHUNK_ABI, provider)
        fullContent += await chunk.read()
      }
    } catch {
      // Fall back to single read()
      fullContent = await master.read()
    }

    if (!fullContent) {
      return NextResponse.json({ error: 'Empty content' }, { status: 404 })
    }

    // Detect content type from raw bytes
    const rawBytes = Buffer.from(fullContent, 'binary')

    // PNG signature: 0x89504E47
    if (rawBytes[0] === 0x89 && rawBytes[1] === 0x50 && rawBytes[2] === 0x4E && rawBytes[3] === 0x47) {
      return new NextResponse(rawBytes, {
        headers: { 'Content-Type': 'image/png', ...CACHE_HEADERS },
      })
    }

    // JPEG signature: 0xFFD8FF
    if (rawBytes[0] === 0xFF && rawBytes[1] === 0xD8 && rawBytes[2] === 0xFF) {
      return new NextResponse(rawBytes, {
        headers: { 'Content-Type': 'image/jpeg', ...CACHE_HEADERS },
      })
    }

    // SVG
    if (fullContent.startsWith('<svg') || fullContent.startsWith('<?xml')) {
      return new NextResponse(fullContent, {
        headers: { 'Content-Type': 'image/svg+xml', ...CACHE_HEADERS },
      })
    }

    // HTML
    if (fullContent.startsWith('<!') || fullContent.startsWith('<html')) {
      return new NextResponse(fullContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CACHE_HEADERS },
      })
    }

    // Default: return as binary
    return new NextResponse(rawBytes, {
      headers: { 'Content-Type': 'application/octet-stream', ...CACHE_HEADERS },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[warren/content/${id}]`, message)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}
