
import QRCode from 'qrcode'
import { getPinataClient, uploadImageToPinata } from '../../../tests/helpers/pinata'

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

/**
 * Generate QR code and upload to Pinata IPFS
 */
export async function generateAndUploadQRCode(
  qrData: QRCodeData,
  ticketId: string
): Promise<string> {
  try {
    // Generate QR code image
    const qrCodeBuffer = await generateQRCodeImage(JSON.stringify(qrData))
    
    // Get Pinata client
    const jwt = import.meta.env.PINATA_JWT
    if (!jwt) {
      throw new Error('PINATA_JWT not configured')
    }
    
    const pinataClient = await getPinataClient(jwt)
    
    // Upload to Pinata IPFS
    const ipfsUrl = await uploadImageToPinata(
      pinataClient, 
      qrCodeBuffer, 
      `ticket-${ticketId}-qr.png`
    )
    
    console.log('QR code uploaded to IPFS:', ipfsUrl)
    return ipfsUrl
  } catch (error) {
    console.error('Error generating and uploading QR code:', error)
    throw new Error('Failed to generate and upload QR code')
  }
}

/**
 * Generate QR code data for a ticket with current timestamp
 */
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

/**
 * Generate QR code that points to NFT mint on Solana Explorer
 */
export function generateNFTExplorerQRData(nftMint: string): string {
  // Create QR code that points to the NFT mint on Solana Explorer devnet
  return `https://explorer.solana.com/address/${nftMint}?cluster=devnet`
}

/**
 * Generate QR code data that includes both NFT mint for scanning and Explorer URL
 */
export function generateScannerQRData(ticket: {
  nftMint: string
  publicKey: string
  event: string
  owner: string
}): string {
  const timestamp = Math.floor(Date.now() / 10000) * 10000 // Round to nearest 10 seconds
  
  const qrData = {
    // Primary data for scanner
    nftMint: ticket.nftMint,
    ticketPublicKey: ticket.publicKey,
    event: ticket.event,
    owner: ticket.owner,
    timestamp,
    
    // Additional info for display
    explorerUrl: `https://explorer.solana.com/address/${ticket.nftMint}?cluster=devnet`,
    type: 'nft-ticket',
    version: '1.0'
  }
  
  return JSON.stringify(qrData)
}

/**
 * Generate QR code as data URL for immediate display
 */
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

/**
 * Get QR code display URL from IPFS hash
 */
export function getQRCodeDisplayUrl(ipfsUrl: string): string {
  if (!ipfsUrl) {
    return ''
  }

  // IPFS URLs (ipfs://hash format)
  if (ipfsUrl.startsWith('ipfs://')) {
    const hash = ipfsUrl.replace('ipfs://', '')
    const gateway = import.meta.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
    return `https://${gateway}/ipfs/${hash}`
  }

  // Already a full URL (https://gateway.pinata.cloud/ipfs/hash)
  if (ipfsUrl.startsWith('http://') || ipfsUrl.startsWith('https://')) {
    return ipfsUrl
  }

  return ipfsUrl
}
