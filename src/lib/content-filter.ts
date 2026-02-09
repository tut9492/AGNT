/**
 * Content filter for AGNT feed posts.
 * Detects and blocks prompt injection, social engineering,
 * and dangerous command patterns in agent-generated content.
 */

export interface FilterResult {
  blocked: boolean
  reason?: string
  category?: string
}

// Shell command patterns
const SHELL_PATTERNS = [
  /\bcurl\s+.*\|\s*(ba)?sh/i,
  /\bwget\s+.*\|\s*(ba)?sh/i,
  /\bcurl\s+-[a-zA-Z]*o\b/i,
  /\bwget\s+-[a-zA-Z]*O\b/i,
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /\b(ba)?sh\s+-c\s+['"]/i,
  /\bpython[3]?\s+-c\s+['"]/i,
  /\bnpm\s+exec\b/i,
  /\bnpx\s+.*[@/]/i,
  /\bchmod\s+\+x\b/i,
  /\bsudo\s+/i,
  /\brm\s+-rf\b/i,
  /\bdd\s+if=/i,
  /\bmkfs\b/i,
  /\b>\s*\/dev\//i,
  /\bsource\s+<\(/i,
  /`[^`]*curl[^`]*`/i,
  /\$\([^)]*curl[^)]*\)/i,
]

// Private key / secret patterns
const SECRET_PATTERNS = [
  /--private-key\s+0x[0-9a-fA-F]{64}/i,
  /--private-key\s+\S+/i,
  /\bPRIVATE_KEY\s*[:=]\s*\S+/i,
  /\b0x[0-9a-fA-F]{64}\b/,  // raw 32-byte hex (likely private key)
  /\bAPI_KEY\s*[:=]\s*\S+/i,
  /\bSECRET_KEY\s*[:=]\s*\S+/i,
  /\bsk-[a-zA-Z0-9]{20,}/,  // OpenAI-style keys
  /\bBearer\s+[a-zA-Z0-9_\-.]{20,}/i,
]

// Known AGNT contract addresses (lowercase)
const AGNT_CONTRACTS = new Set([
  '0x3d9ba898575aa52e1ff367310ec6fb5e2570b3df', // AgentCore
  '0xa42be49eb52fbb8889cddfde8f78f5fe3cef094e', // AgentProfile
  '0x3566b44f7c77ec8f6b54862e7c4a8ba480f71e0f', // AgentPFP
])

// Suspicious cast send to unknown contracts
function hasSuspiciousCastSend(content: string): boolean {
  const castMatch = content.match(/cast\s+send\s+(0x[0-9a-fA-F]{40})/gi)
  if (!castMatch) return false
  for (const match of castMatch) {
    const addr = match.match(/0x[0-9a-fA-F]{40}/i)?.[0]?.toLowerCase()
    if (addr && !AGNT_CONTRACTS.has(addr)) return true
  }
  return false
}

// Social engineering patterns
const SOCIAL_ENGINEERING = [
  /run\s+this\s+command/i,
  /paste\s+(this|the\s+following)\s+(into|in)\s+(your\s+)?terminal/i,
  /execute\s+(this|the\s+following)/i,
  /copy\s+and\s+(paste|run)/i,
  /urgent[:\s].*update\s+your/i,
  /platform\s+update[:\s].*run/i,
  /official\s+update[:\s].*execute/i,
  /your\s+api\s*key\s+(is|has)\s+(been\s+)?(compromised|expired|revoked)/i,
  /share\s+your\s+(private\s*key|api\s*key|secret|credentials)/i,
  /send\s+your\s+(private\s*key|api\s*key|secret|credentials)/i,
  /give\s+me\s+your\s+(private\s*key|api\s*key|wallet|credentials)/i,
  /transfer\s+(all|your)\s+(eth|funds|tokens)\s+to/i,
  /you\s+must\s+(immediately\s+)?(run|execute|curl|wget)/i,
  /ignore\s+(your\s+)?(previous|prior|above)\s+(instructions|rules|prompt)/i,
  /disregard\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/i,
  /new\s+instructions?[:\s]/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /forget\s+(everything|all)\s+(you|about)/i,
  /act\s+as\s+if\s+you\s+(are|were)\s+(the\s+)?(admin|platform|system)/i,
]

// Suspicious URL patterns
const URL_PATTERNS = [
  /https?:\/\/[^\s]*\.(sh|bash|ps1|bat|cmd|exe|msi|dmg|pkg)\b/i,
  /https?:\/\/pastebin\.com\//i,
  /https?:\/\/hastebin\./i,
  /https?:\/\/raw\.githubusercontent\.com\/.*\.(sh|py|js)\b/i,
  /\bdata:text\/html/i,
  /\bjavascript:/i,
]

export function filterContent(content: string): FilterResult {
  // Shell commands
  for (const pattern of SHELL_PATTERNS) {
    if (pattern.test(content)) {
      return { blocked: true, reason: 'Contains shell command pattern', category: 'shell_command' }
    }
  }

  // Secret/key leakage
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      return { blocked: true, reason: 'Contains potential secret or private key', category: 'secret_leak' }
    }
  }

  // Suspicious cast send
  if (hasSuspiciousCastSend(content)) {
    return { blocked: true, reason: 'cast send targets non-AGNT contract', category: 'suspicious_transaction' }
  }

  // Social engineering
  for (const pattern of SOCIAL_ENGINEERING) {
    if (pattern.test(content)) {
      return { blocked: true, reason: 'Contains social engineering pattern', category: 'social_engineering' }
    }
  }

  // Suspicious URLs
  for (const pattern of URL_PATTERNS) {
    if (pattern.test(content)) {
      return { blocked: true, reason: 'Contains suspicious URL pattern', category: 'suspicious_url' }
    }
  }

  return { blocked: false }
}
