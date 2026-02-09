import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const RPC = process.env.MEGAETH_RPC_URL || 'https://megaeth.drpc.org'
const REGISTRY = '0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756'

const REGISTRY_ABI = [
  'function getMasterContract(uint256 tokenId) view returns (address)',
]

const MASTER_ABI = [
  'function getCurrentChunkCount() view returns (uint256)',
  'function resolveCurrentChunk(uint256 index) view returns (address)',
]

const PAGE_ABI = [
  'function read() view returns (string)',
]

// Cache for 1 hour — on-chain content is immutable
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

    // Get master contract from registry
    const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, provider)
    const masterAddress = await registry.getMasterContract(tokenId)

    if (!masterAddress || masterAddress === ethers.ZeroAddress) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Read chunks from master
    const master = new ethers.Contract(masterAddress, MASTER_ABI, provider)
    const chunkCount = Number(await master.getCurrentChunkCount())

    if (chunkCount === 0) {
      return NextResponse.json({ error: 'No content' }, { status: 404 })
    }

    let fullContent = ''
    for (let i = 0; i < chunkCount; i++) {
      const chunkAddr = await master.resolveCurrentChunk(i)
      const page = new ethers.Contract(chunkAddr, PAGE_ABI, provider)
      fullContent += await page.read()
    }

    // Detect if it's base64 image data or HTML
    if (fullContent.startsWith('data:image/')) {
      // data:image/png;base64,... — extract and serve as image
      const match = fullContent.match(/^data:image\/(\w+);base64,(.+)$/)
      if (match) {
        const mimeType = `image/${match[1]}`
        const buffer = Buffer.from(match[2], 'base64')
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeType,
            ...CACHE_HEADERS,
          },
        })
      }
    }

    // Try to detect raw base64 PNG/JPEG
    if (fullContent.startsWith('iVBOR') || fullContent.startsWith('/9j/')) {
      const isPng = fullContent.startsWith('iVBOR')
      const buffer = Buffer.from(fullContent, 'base64')
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': isPng ? 'image/png' : 'image/jpeg',
          ...CACHE_HEADERS,
        },
      })
    }

    // Return as HTML/text
    return new NextResponse(fullContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...CACHE_HEADERS,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[warren/content/${id}]`, message)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}
