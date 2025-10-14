
export interface TicketContent {
  title: string
  description: string
  icon: string
  color: string
  availableActions: string[]
  content: {
    qrCode?: boolean
    eventProgram?: boolean
    memories?: boolean
    collectible?: boolean
  }
}

/**
 * Get stage-specific content for a ticket
 */
export function getTicketContent(
  stage: number,
  eventStartTs: number,
  eventEndTs: number,
  currentTime: number = Date.now() / 1000
): TicketContent {
  const isEventStarted = currentTime >= eventStartTs
  const isEventEnded = currentTime >= eventEndTs

  switch (stage) {
    case 0: // Prestige
      return {
        title: 'Prestige Ticket',
        description: isEventStarted
          ? 'Your ticket is ready to evolve to QR stage!'
          : 'Your ticket will evolve when the event starts.',
        icon: '👑',
        color: 'text-yellow-600',
        availableActions: isEventStarted ? ['View QR Code', 'View Details'] : ['View Details'],
        content: {
          qrCode: isEventStarted, // Show QR code if event has started
          eventProgram: false,
          memories: false,
          collectible: false
        }
      }

    case 1: // QR
      return {
        title: 'QR Ticket',
        description: 'Show your QR code to event staff for entry.',
        icon: '📱',
        color: 'text-blue-600',
        availableActions: ['View QR Code', 'View Details'],
        content: {
          qrCode: true,
          eventProgram: false,
          memories: false,
          collectible: false
        }
      }

    case 2: // Scanned
      return {
        title: 'Scanned Ticket',
        description: 'You attended the event! Access the event program and memories.',
        icon: '✅',
        color: 'text-green-600',
        availableActions: ['View Event Program', 'View Details'],
        content: {
          qrCode: false,
          eventProgram: true,
          memories: false,
          collectible: false
        }
      }

    case 3: // Collectible
      return {
        title: 'Collectible NFT',
        description: 'A permanent memory of your attendance at this special event.',
        icon: '💎',
        color: 'text-purple-600',
        availableActions: ['View Event Program', 'View Memories', 'View Details'],
        content: {
          qrCode: false,
          eventProgram: true,
          memories: true,
          collectible: true
        }
      }

    default:
      return {
        title: 'Unknown Stage',
        description: 'Ticket stage is unknown.',
        icon: '❓',
        color: 'text-gray-600',
        availableActions: ['View Details'],
        content: {
          qrCode: false,
          eventProgram: false,
          memories: false,
          collectible: false
        }
      }
  }
}

/**
 * Get stage-specific badge styling
 */
export function getStageBadgeStyle(stage: number): string {
  const styles = {
    0: 'bg-yellow-100 text-yellow-800 border-yellow-200', // Prestige
    1: 'bg-blue-100 text-blue-800 border-blue-200',      // QR
    2: 'bg-green-100 text-green-800 border-green-200',   // Scanned
    3: 'bg-purple-100 text-purple-800 border-purple-200' // Collectible
  }
  return styles[stage as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'
}

/**
 * Get stage-specific button styling
 */
export function getStageButtonStyle(stage: number): string {
  const styles = {
    0: 'hover:bg-yellow-50 border-yellow-300', // Prestige
    1: 'hover:bg-blue-50 border-blue-300',      // QR
    2: 'hover:bg-green-50 border-green-300',   // Scanned
    3: 'hover:bg-purple-50 border-purple-300'  // Collectible
  }
  return styles[stage as keyof typeof styles] || 'hover:bg-gray-50 border-gray-300'
}

/**
 * Get evolution status message
 */
export function getEvolutionStatus(
  stage: number,
  eventStartTs: number,
  eventEndTs: number,
  currentTime: number = Date.now() / 1000
): string {
  const isEventStarted = currentTime >= eventStartTs
  const isEventEnded = currentTime >= eventEndTs

  switch (stage) {
    case 0:
      if (isEventStarted) {
        return 'Ready to evolve to QR stage!'
      } else {
        const timeUntilStart = eventStartTs - currentTime
        const hours = Math.floor(timeUntilStart / 3600)
        const minutes = Math.floor((timeUntilStart % 3600) / 60)
        return `Evolves in ${hours}h ${minutes}m`
      }
    case 1:
      return 'Ready for scanning by event staff'
    case 2:
      if (isEventEnded) {
        return 'Ready to become collectible!'
      } else {
        return 'Event is still ongoing'
      }
    case 3:
      return 'Fully evolved collectible NFT'
    default:
      return 'Unknown evolution status'
  }
}

/**
 * Check if a ticket can evolve to the next stage
 */
export function canEvolve(
  stage: number,
  eventStartTs: number,
  eventEndTs: number,
  currentTime: number = Date.now() / 1000
): boolean {
  const isEventStarted = currentTime >= eventStartTs
  const isEventEnded = currentTime >= eventEndTs

  switch (stage) {
    case 0: // Prestige -> QR
      return isEventStarted
    case 1: // QR -> Scanned (requires manual scanning)
      return false // Only scanner can trigger this
    case 2: // Scanned -> Collectible
      return isEventEnded
    case 3: // Collectible (final stage)
      return false
    default:
      return false
  }
}

export function shouldShowQRCode(ticketStage: number, eventStartTs: number, currentTime: number = Date.now() / 1000): boolean {
  // Show QR code when event has started, regardless of ticket stage
  // This allows users to see their QR code even if ticket hasn't evolved yet
  return currentTime >= eventStartTs
}
