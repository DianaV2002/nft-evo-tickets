
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

export function generateScannerQRData(ticket: {
  nftMint: string
  publicKey: string
  event: string
  owner: string
}): string {
  const timestamp = Math.floor(Date.now() / 10000) * 10000 // Round to nearest 10 seconds
  
  const qrData = {
    nftMint: ticket.nftMint,
    ticketPublicKey: ticket.publicKey,
    event: ticket.event,
    owner: ticket.owner,
    timestamp,
    
    explorerUrl: `https://explorer.solana.com/address/${ticket.nftMint}?cluster=devnet`,
    type: 'nft-ticket',
    version: '1.0'
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
