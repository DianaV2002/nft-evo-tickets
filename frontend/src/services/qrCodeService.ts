
import QRCode from 'qrcode'

export interface QRCodeData {
  nftMint: string
  ticketPublicKey: string
  event: string
  timestamp: number
  owner: string
}

export async function generateQRCodeImage(data: string): Promise<Buffer> {
  try {
    const qrCodeBuffer = await QRCode.toBuffer(data, {
      type: 'png',
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
    
    return qrCodeBuffer
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

export async function generateAndUploadQRCode(
  qrData: QRCodeData,
  ticketId: string
): Promise<string> {
  try {
    // Generate QR code image
    const qrCodeBuffer = await generateQRCodeImage(JSON.stringify(qrData))

    // Upload to backend which handles Pinata IPFS upload
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

    const formData = new FormData()
    // Convert Buffer to Uint8Array for browser compatibility
    const uint8Array = new Uint8Array(qrCodeBuffer)
    const blob = new Blob([uint8Array], { type: 'image/png' })
    formData.append('image', blob, `ticket-${ticketId}-qr.png`)

    const response = await fetch(`${backendUrl}/api/upload-qr`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const result = await response.json()
    console.log('QR code uploaded to IPFS:', result.ipfsUrl)
    return result.ipfsUrl
  } catch (error) {
    console.error('Error generating and uploading QR code:', error)
    throw new Error('Failed to generate and upload QR code')
  }
}

export function generateQRCodeData(ticket: {
  nftMint: string
  publicKey: string
  event: string
  owner: string
}): QRCodeData {
  const timestamp = Math.floor(Date.now() / 10000) * 10000 // Round to nearest 10 seconds
  
  return {
    nftMint: ticket.nftMint,
    ticketPublicKey: ticket.publicKey,
    event: ticket.event,
    timestamp,
    owner: ticket.owner
  }
}

export function generateNFTExplorerQRData(nftMint: string): string {
  // Create QR code that points to the NFT mint on Solana Explorer devnet
  return `https://explorer.solana.com/address/${nftMint}?cluster=devnet`
}

export async function generateScannerQRData(
  ticket: {
    nftMint: string
    publicKey: string
    event: string
    owner: string
  },
  wallet: any
): Promise<string> {
  const timestamp = Date.now()
  const expiresAt = timestamp + 30000 // Expires in 30 seconds

  // Create message to sign
  const message = `NFT-TICKET-VALIDATION
NFT Mint: ${ticket.nftMint}
Event: ${ticket.event}
Timestamp: ${timestamp}
Expires: ${expiresAt}
Owner: ${ticket.owner}`

  let signature = ''

  // Sign the message with the wallet
  if (wallet && wallet.signMessage) {
    try {
      const encodedMessage = new TextEncoder().encode(message)
      const signatureBytes = await wallet.signMessage(encodedMessage)
      // Convert signature to base58
      signature = Buffer.from(signatureBytes).toString('base64')
    } catch (error) {
      console.error('Failed to sign QR code message:', error)
      throw new Error('Wallet signature required for secure QR code')
    }
  } else {
    throw new Error('Wallet does not support message signing')
  }

  const qrData = {
    nftMint: ticket.nftMint,
    ticketPublicKey: ticket.publicKey,
    event: ticket.event,
    owner: ticket.owner,
    timestamp,
    expiresAt,
    signature,
    message,
    explorerUrl: `https://explorer.solana.com/address/${ticket.nftMint}?cluster=devnet`,
    type: 'nft-ticket-secure',
    version: '2.0'
  }

  return JSON.stringify(qrData)
}

export async function generateQRCodeDataURL(data: string): Promise<string> {
  try {
    const dataURL = await QRCode.toDataURL(data, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
    
    return dataURL
  } catch (error) {
    console.error('Error generating QR code data URL:', error)
    throw new Error('Failed to generate QR code')
  }
}

export interface SecureQRData {
  nftMint: string
  ticketPublicKey: string
  event: string
  owner: string
  timestamp: number
  expiresAt: number
  signature: string
  message: string
  explorerUrl: string
  type: string
  version: string
}

export interface QRValidationResult {
  valid: boolean
  error?: string
  data?: SecureQRData
}

/**
 * Validates a secure QR code
 * Checks: expiration, signature, and format
 */
export async function validateSecureQRCode(
  qrCodeString: string,
  connection: any
): Promise<QRValidationResult> {
  try {
    const qrData: SecureQRData = JSON.parse(qrCodeString)

    // Check if it's a secure QR code (v2.0)
    if (qrData.type !== 'nft-ticket-secure' || qrData.version !== '2.0') {
      return {
        valid: false,
        error: 'This is not a secure QR code. Please use the latest app version.'
      }
    }

    // Check expiration
    const now = Date.now()
    if (now > qrData.expiresAt) {
      const secondsExpired = Math.floor((now - qrData.expiresAt) / 1000)
      return {
        valid: false,
        error: `QR code expired ${secondsExpired} seconds ago. Please refresh.`
      }
    }

    // Verify signature
    try {
      const { PublicKey } = await import('@solana/web3.js')
      const nacl = await import('tweetnacl')

      const ownerPubkey = new PublicKey(qrData.owner)
      const messageBytes = new TextEncoder().encode(qrData.message)
      const signatureBytes = Buffer.from(qrData.signature, 'base64')

      const isValid = nacl.default.sign.detached.verify(
        messageBytes,
        signatureBytes,
        ownerPubkey.toBytes()
      )

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid signature. QR code may be tampered with.'
        }
      }
    } catch (error) {
      console.error('Signature verification error:', error)
      return {
        valid: false,
        error: 'Failed to verify signature'
      }
    }

    // Verify owner actually owns the NFT (on-chain check)
    try {
      const { PublicKey } = await import('@solana/web3.js')
      const { getAssociatedTokenAddress } = await import('@solana/spl-token')

      const nftMint = new PublicKey(qrData.nftMint)
      const owner = new PublicKey(qrData.owner)

      const tokenAccount = await getAssociatedTokenAddress(nftMint, owner)
      const accountInfo = await connection.getTokenAccountBalance(tokenAccount)

      if (!accountInfo || accountInfo.value.uiAmount !== 1) {
        return {
          valid: false,
          error: 'Owner does not possess this NFT ticket'
        }
      }
    } catch (error) {
      console.error('NFT ownership verification error:', error)
      return {
        valid: false,
        error: 'Failed to verify NFT ownership'
      }
    }

    // All checks passed
    return {
      valid: true,
      data: qrData
    }
  } catch (error) {
    console.error('QR validation error:', error)
    return {
      valid: false,
      error: 'Invalid QR code format'
    }
  }
}

export function getQRCodeDisplayUrl(ipfsUrl: string): string {
  if (!ipfsUrl) {
    return ''
  }

  if (ipfsUrl.startsWith('ipfs://')) {
    const hash = ipfsUrl.replace('ipfs://', '')
    const gateway = import.meta.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
    return `https://${gateway}/ipfs/${hash}`
  }

  if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    return ipfsUrl
  }

  return ipfsUrl
}
