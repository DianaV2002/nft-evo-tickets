import { generateAndUploadQRCode, generateQRCodeData } from './qrCodeService'
import { getPinataClient, uploadMetadataToPinata } from '../../../tests/helpers/pinata'

export interface TicketMetadata {
  name: string
  description: string
  image: string
  external_url: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  properties: {
    files: Array<{
      uri: string
      type: string
    }>
    category: string
  }
  qr_code?: {
    image: string
    data: string
    expires_at: number
  }
  event_program?: {
    url: string
    title: string
    description: string
  }
  memories?: {
    url: string
    title: string
    description: string
  }
}

export async function createTicketMetadata(
  ticket: {
    nftMint: string
    publicKey: string
    event: string
    owner: string
    seat?: string
    stage: number
  },
  eventData: {
    name: string
    startTs: number
    endTs: number
    eventId: number
  }
): Promise<TicketMetadata> {
  try {
    // Create Solana Explorer URL
    const explorerUrl = `https://explorer.solana.com/address/${ticket.nftMint}?cluster=devnet`

    // Determine stage name
    const stageNames = ['Prestige', 'QR', 'Scanned', 'Collectible']
    const stageName = stageNames[ticket.stage] || 'Unknown'

    // Create stage-specific metadata
    let metadata: TicketMetadata

    switch (ticket.stage) {
      case 0: // Prestige
        metadata = await createPrestigeMetadata(ticket, eventData, explorerUrl)
        break
      case 1: // QR
        metadata = await createQRMetadata(ticket, eventData, explorerUrl)
        break
      case 2: // Scanned
        metadata = await createScannedMetadata(ticket, eventData, explorerUrl)
        break
      case 3: // Collectible
        metadata = await createCollectibleMetadata(ticket, eventData, explorerUrl)
        break
      default:
        throw new Error(`Unknown ticket stage: ${ticket.stage}`)
    }

    return metadata
  } catch (error) {
    console.error('Error creating ticket metadata:', error)
    throw new Error('Failed to create ticket metadata')
  }
}

async function createPrestigeMetadata(
  ticket: any,
  eventData: any,
  explorerUrl: string
): Promise<TicketMetadata> {
  const ticketImageUrl = `https://nft-evo-tickets.vercel.app/api/ticket-image/${ticket.nftMint}`
  
  return {
    name: `${eventData.name} - ${ticket.seat ? `Seat ${ticket.seat}` : 'Ticket'} (Prestige)`,
    description: `Prestige ticket for ${eventData.name}. This ticket will evolve when the event starts.`,
    image: ticketImageUrl,
    external_url: explorerUrl,
    attributes: [
      { trait_type: 'Event', value: eventData.name },
      { trait_type: 'Stage', value: 'Prestige' },
      { trait_type: 'Event ID', value: eventData.eventId },
      { trait_type: 'Start Date', value: new Date(eventData.startTs * 1000).toISOString() },
      { trait_type: 'End Date', value: new Date(eventData.endTs * 1000).toISOString() },
      ...(ticket.seat ? [{ trait_type: 'Seat', value: ticket.seat }] : [])
    ],
    properties: {
      files: [{ uri: ticketImageUrl, type: 'image/png' }],
      category: 'Ticket'
    }
  }
}

async function createQRMetadata(
  ticket: any,
  eventData: any,
  explorerUrl: string
): Promise<TicketMetadata> {
  const qrData = generateQRCodeData({
    nftMint: ticket.nftMint,
    publicKey: ticket.publicKey,
    event: ticket.event,
    owner: ticket.owner
  })

  const qrCodeUrl = await generateAndUploadQRCode(qrData, ticket.publicKey.slice(0, 8))
  const ticketImageUrl = `https://nft-evo-tickets.vercel.app/api/ticket-image/${ticket.nftMint}`
  
  return {
    name: `${eventData.name} - ${ticket.seat ? `Seat ${ticket.seat}` : 'Ticket'} (QR)`,
    description: `QR ticket for ${eventData.name}. Show this QR code to event staff for entry.`,
    image: ticketImageUrl,
    external_url: explorerUrl,
    attributes: [
      { trait_type: 'Event', value: eventData.name },
      { trait_type: 'Stage', value: 'QR' },
      { trait_type: 'Event ID', value: eventData.eventId },
      { trait_type: 'Start Date', value: new Date(eventData.startTs * 1000).toISOString() },
      { trait_type: 'End Date', value: new Date(eventData.endTs * 1000).toISOString() },
      ...(ticket.seat ? [{ trait_type: 'Seat', value: ticket.seat }] : [])
    ],
    properties: {
      files: [
        { uri: ticketImageUrl, type: 'image/png' },
        { uri: qrCodeUrl, type: 'image/png' }
      ],
      category: 'Ticket'
    },
    qr_code: {
      image: qrCodeUrl,
      data: JSON.stringify(qrData),
      expires_at: qrData.timestamp + 10000 // 10 seconds from generation
    }
  }
}

async function createScannedMetadata(
  ticket: any,
  eventData: any,
  explorerUrl: string
): Promise<TicketMetadata> {
  const ticketImageUrl = `https://nft-evo-tickets.vercel.app/api/ticket-image/${ticket.nftMint}`
  const eventProgramUrl = `https://nft-evo-tickets.vercel.app/api/event-program/${eventData.eventId}`
  
  return {
    name: `${eventData.name} - ${ticket.seat ? `Seat ${ticket.seat}` : 'Ticket'} (Scanned)`,
    description: `Scanned ticket for ${eventData.name}. You attended this event! Access the event program and memories.`,
    image: ticketImageUrl,
    external_url: explorerUrl,
    attributes: [
      { trait_type: 'Event', value: eventData.name },
      { trait_type: 'Stage', value: 'Scanned' },
      { trait_type: 'Event ID', value: eventData.eventId },
      { trait_type: 'Start Date', value: new Date(eventData.startTs * 1000).toISOString() },
      { trait_type: 'End Date', value: new Date(eventData.endTs * 1000).toISOString() },
      { trait_type: 'Scanned', value: 'Yes' },
      ...(ticket.seat ? [{ trait_type: 'Seat', value: ticket.seat }] : [])
    ],
    properties: {
      files: [
        { uri: ticketImageUrl, type: 'image/png' },
        { uri: eventProgramUrl, type: 'application/pdf' }
      ],
      category: 'Ticket'
    },
    event_program: {
      url: eventProgramUrl,
      title: `${eventData.name} Event Program`,
      description: 'Official event program and schedule'
    }
  }
}

async function createCollectibleMetadata(
  ticket: any,
  eventData: any,
  explorerUrl: string
): Promise<TicketMetadata> {
  const ticketImageUrl = `https://nft-evo-tickets.vercel.app/api/ticket-image/${ticket.nftMint}`
  const eventProgramUrl = `https://nft-evo-tickets.vercel.app/api/event-program/${eventData.eventId}`
  const memoriesUrl = `https://nft-evo-tickets.vercel.app/api/event-memories/${eventData.eventId}`
  
  return {
    name: `${eventData.name} - ${ticket.seat ? `Seat ${ticket.seat}` : 'Ticket'} (Collectible)`,
    description: `Collectible ticket from ${eventData.name}. A permanent memory of your attendance at this special event.`,
    image: ticketImageUrl,
    external_url: explorerUrl,
    attributes: [
      { trait_type: 'Event', value: eventData.name },
      { trait_type: 'Stage', value: 'Collectible' },
      { trait_type: 'Event ID', value: eventData.eventId },
      { trait_type: 'Start Date', value: new Date(eventData.startTs * 1000).toISOString() },
      { trait_type: 'End Date', value: new Date(eventData.endTs * 1000).toISOString() },
      { trait_type: 'Scanned', value: 'Yes' },
      { trait_type: 'Rarity', value: 'Event Attendee' },
      ...(ticket.seat ? [{ trait_type: 'Seat', value: ticket.seat }] : [])
    ],
    properties: {
      files: [
        { uri: ticketImageUrl, type: 'image/png' },
        { uri: eventProgramUrl, type: 'application/pdf' },
        { uri: memoriesUrl, type: 'application/json' }
      ],
      category: 'Collectible'
    },
    event_program: {
      url: eventProgramUrl,
      title: `${eventData.name} Event Program`,
      description: 'Official event program and schedule'
    },
    memories: {
      url: memoriesUrl,
      title: `${eventData.name} Memories`,
      description: 'Photos, videos, and memories from the event'
    }
  }
}

export async function uploadTicketMetadata(metadata: TicketMetadata): Promise<string> {
  try {
    const jwt = import.meta.env.PINATA_JWT
    if (!jwt) {
      throw new Error('PINATA_JWT not configured')
    }

    const pinataClient = await getPinataClient(jwt)
    const metadataUrl = await uploadMetadataToPinata(pinataClient, metadata)

    console.log('Ticket metadata uploaded to IPFS:', metadataUrl)
    return metadataUrl
  } catch (error) {
    console.error('Error uploading ticket metadata:', error)
    throw new Error('Failed to upload ticket metadata')
  }
}

export async function createAndUploadTicketMetadata(
  ticket: {
    nftMint: string
    publicKey: string
    event: string
    owner: string
    seat?: string
    stage: number
  },
  eventData: {
    name: string
    startTs: number
    endTs: number
    eventId: number
  }
): Promise<string> {
  const metadata = await createTicketMetadata(ticket, eventData)
  return await uploadTicketMetadata(metadata)
}
