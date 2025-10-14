import { Ticket, Calendar, MapPin, QrCode, Share2, DollarSign, Loader2, X, RefreshCw, FileText, Heart } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UsdcDisplay } from "@/components/ui/usdc-input"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { fetchUserTickets, TicketData, getTicketStageName, getTicketRarity } from "@/services/ticketService"
import { EventData, fetchEventsByKeys, formatEventDate, formatEventTime, getEventStatus } from "@/services/eventService"
import { getImageDisplayUrl } from "@/services/imageService"
import { generateQRCodeDataURL, generateQRCodeData, generateNFTExplorerQRData, generateScannerQRData, QRCodeData } from "@/services/qrCodeService"
import { getTicketContent, getStageBadgeStyle, getStageButtonStyle, getEvolutionStatus, canEvolve, shouldShowQRCode } from "@/services/ticketContentService"
import { PublicKey } from "@solana/web3.js"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

export default function Tickets() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [events, setEvents] = useState<Map<string, EventData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null)
  const [qrCodeData, setQrCodeData] = useState<string>('')
  const [qrCodeImage, setQrCodeImage] = useState<string>('')
  const [qrRefreshInterval, setQrRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Separate and sort tickets by event date
  const upcomingTickets = tickets
    .filter(ticket => {
      const eventData = events.get(ticket.event)
      if (!eventData) return false
      const status = getEventStatus(eventData.startTs, eventData.endTs)
      return status === "upcoming" || status === "live"
    })
    .sort((a, b) => {
      const eventA = events.get(a.event)
      const eventB = events.get(b.event)
      if (!eventA || !eventB) return 0
      return eventA.startTs - eventB.startTs // Soonest first
    })

  const pastTickets = tickets
    .filter(ticket => {
      const eventData = events.get(ticket.event)
      if (!eventData) return false
      const status = getEventStatus(eventData.startTs, eventData.endTs)
      return status === "ended"
    })
    .sort((a, b) => {
      const eventA = events.get(a.event)
      const eventB = events.get(b.event)
      if (!eventA || !eventB) return 0
      return eventB.startTs - eventA.startTs // Most recent first
    })

  useEffect(() => {
    async function loadTicketsAndEvents() {
      if (!wallet.publicKey) {
        console.log("No wallet connected")
        setTickets([])
        setLoading(false)
        return
      }

      try {
        console.log("Loading tickets and events...")
        setLoading(true)
        setError(null)

        console.log("Fetching user tickets...")
        const userTickets = await fetchUserTickets(connection, wallet.publicKey)
        console.log("Received tickets:", userTickets)
        setTickets(userTickets)


        const eventKeys = [...new Set(userTickets.map(ticket => ticket.event))]

        console.log("Fetching events for tickets...")
        const eventsMap = await fetchEventsByKeys(connection, eventKeys)
        console.log("Received events:", eventsMap)
        setEvents(eventsMap)
        console.log("Tickets and events loaded successfully")
      } catch (err) {
        console.error("Failed to load tickets:", err)
        setError(`Failed to load tickets: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    loadTicketsAndEvents()
  }, [connection, wallet.publicKey])

  const getTicketStatus = (ticket: TicketData): string => {
    if (ticket.wasScanned) return "used"
    if (ticket.isListed) return "listed"
    return "active"
  }

  const getTicketImage = (stage: number): string => {
    switch (stage) {
      case 0: return "" // Prestige
      case 1: return "📱" // QR
      case 2: return "✅" // Scanned
      case 3: return "💎" // Collectible
      default: return "🎟️"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-accent text-accent-foreground'
      case 'used': return 'bg-muted text-muted-foreground'
      case 'listed': return 'bg-primary text-primary-foreground'
      case 'expired': return 'bg-destructive text-destructive-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  // Generate QR code data and image for a ticket
  const generateQRCodeForTicket = async (ticket: TicketData) => {
    try {
      // Get event data to check timing
      const event = events.get(ticket.event)
      if (!event) {
        setQrCodeData('')
        setQrCodeImage('')
        return
      }

      // Check if QR code should be available based on ticket stage and event timing
      const shouldShow = shouldShowQRCode(ticket.stage, event.startTs)
      if (!shouldShow) {
        setQrCodeData('')
        setQrCodeImage('')
        return
      }

      // Generate QR code with scanner-friendly data and wallet signature
      const qrDataString = await generateScannerQRData({
        nftMint: ticket.nftMint,
        publicKey: ticket.publicKey,
        event: ticket.event,
        owner: ticket.owner
      }, wallet)
      setQrCodeData(qrDataString)
      
      // Generate QR code image
      const qrCodeImageURL = await generateQRCodeDataURL(qrDataString)
      setQrCodeImage(qrCodeImageURL)
    } catch (error) {
      console.error('Error generating QR code:', error)
      setQrCodeImage('')
    }
  }

  // Start QR code refresh interval
  const startQRRefresh = async (ticket: TicketData) => {
    // Clear existing interval
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval)
    }

    // Generate initial QR code
    await generateQRCodeForTicket(ticket)

    // Set up refresh every 30 seconds (matching QR code expiration)
    const interval = setInterval(async () => {
      await generateQRCodeForTicket(ticket)
    }, 30000)

    setQrRefreshInterval(interval)
  }

  // Stop QR code refresh
  const stopQRRefresh = () => {
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval)
      setQrRefreshInterval(null)
    }
  }

  // Open QR dialog
  const openQRDialog = async (ticket: TicketData) => {
    setSelectedTicket(ticket)
    setQrDialogOpen(true)
    await startQRRefresh(ticket)
  }

  // Close QR dialog
  const closeQRDialog = () => {
    setQrDialogOpen(false)
    setSelectedTicket(null)
    stopQRRefresh()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopQRRefresh()
    }
  }, [])

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'bg-muted text-muted-foreground'
      case 'Rare': return 'bg-secondary text-secondary-foreground'
      case 'Epic': return 'bg-primary text-primary-foreground'
      case 'Legendary': return 'bg-accent text-accent-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold gradient-text">My Tickets</h1>
          <p className="text-muted-foreground mt-2">
            Manage your NFT tickets and view event details
          </p>
        </div>
        
  
      </div>

      {/* Wallet Connection Check */}
      {!wallet.connected && (
        <Card className="glass-card">
          <CardContent className="text-center py-12">
            <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to view your NFT tickets
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && wallet.connected && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground mt-4">Loading your tickets from blockchain...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-destructive text-lg">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {/* Portfolio Stats */}
      {wallet.connected && !loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{tickets.length}</div>
              <p className="text-sm text-muted-foreground">Total Tickets</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">
                {(tickets.reduce((sum, t) => sum + (t.listingPrice || 0), 0) / LAMPORTS_PER_SOL).toFixed(2)} SOL
              </div>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">
                {tickets.filter(t => t.isListed).length}
              </div>
              <p className="text-sm text-muted-foreground">Listed for Sale</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Events Section */}
      {wallet.connected && !loading && !error && upcomingTickets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold">Upcoming Events</h2>
            <Badge variant="secondary">{upcomingTickets.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {upcomingTickets.map((ticket) => {
              const eventData = events.get(ticket.event)
              const status = getTicketStatus(ticket)
              const rarity = getTicketRarity(ticket.stage)
              const image = getTicketImage(ticket.stage)
              const eventStatus = eventData ? getEventStatus(eventData.startTs, eventData.endTs) : "ended"

              return (
                <Card key={ticket.publicKey} className="glass-card spatial-hover group overflow-hidden">
                  {/* Event Cover Image Thumbnail */}
                  <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                    {eventData?.coverImageUrl && getImageDisplayUrl(eventData.coverImageUrl) ? (
                      <img
                        src={getImageDisplayUrl(eventData.coverImageUrl)!}
                        alt={eventData.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ${eventData?.coverImageUrl && getImageDisplayUrl(eventData.coverImageUrl) ? 'hidden' : ''}`}>
                      <div className="text-6xl opacity-40">{image}</div>
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {eventStatus === "live" && (
                        <Badge className="bg-green-500 text-white">
                          Live
                        </Badge>
                      )}
                      <Badge className={getStatusColor(status)}>
                        {status}
                      </Badge>
                      <Badge className={getRarityColor(rarity)}>
                        {rarity}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-4">
                    <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                      {eventData?.name || "Loading Event..."}
                    </CardTitle>
                    <CardDescription>
                      {getTicketStageName(ticket.stage)} {ticket.seat ? `• Seat ${ticket.seat}` : ""}
                    </CardDescription>
                    
                    {/* Stage-specific content */}
                    {eventData && (() => {
                      const content = getTicketContent(ticket.stage, eventData.startTs, eventData.endTs)
                      return (
                        <div className="mt-2 p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{content.icon}</span>
                            <span className={`font-medium ${content.color}`}>{content.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{content.description}</p>
                          <div className="text-xs text-muted-foreground">
                            {getEvolutionStatus(ticket.stage, eventData.startTs, eventData.endTs)}
                          </div>
                        </div>
                      )
                    })()}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Event Details */}
                    {eventData && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium">Start: {formatEventDate(eventData.startTs)}</span>
                            <span>End: {formatEventDate(eventData.endTs)}</span>
                          </div>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          Event ID: {eventData.eventId}
                        </div>
                      </div>
                    )}

                    {/* Price Info */}
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      {ticket.listingPrice && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Listed Price</span>
                          <span className="text-sm font-medium text-primary">
                            {(ticket.listingPrice / LAMPORTS_PER_SOL).toFixed(4)} SOL
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">NFT Mint</span>
                        <span className="text-xs font-mono">
                          {ticket.nftMint.slice(0, 4)}...{ticket.nftMint.slice(-4)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      {eventData && (() => {
                        const content = getTicketContent(ticket.stage, eventData.startTs, eventData.endTs)
                        return (
                          <>
                            {/* QR Code Button - Only for QR stage */}
                            {content.content.qrCode && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 spatial-hover"
                                onClick={() => openQRDialog(ticket)}
                              >
                                <QrCode className="h-4 w-4 mr-1" />
                                View QR
                              </Button>
                            )}
                            
                            {/* Event Program Button - For Scanned and Collectible stages */}
                            {content.content.eventProgram && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 spatial-hover"
                                onClick={() => {
                                  // TODO: Implement event program viewer
                                  console.log('View event program')
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Program
                              </Button>
                            )}
                            
                            {/* Memories Button - For Collectible stage */}
                            {content.content.memories && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 spatial-hover"
                                onClick={() => {
                                  // TODO: Implement memories viewer
                                  console.log('View memories')
                                }}
                              >
                                <Heart className="h-4 w-4 mr-1" />
                                Memories
                              </Button>
                            )}
                            
                            {/* List Button - For active tickets */}
                            {status === 'active' && (
                              <Button variant="outline" size="sm" className="flex-1 spatial-hover">
                                <DollarSign className="h-4 w-4 mr-1" />
                                List
                              </Button>
                            )}
                          </>
                        )
                      })()}
                      
                      {status === 'used' && (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Event Completed
                        </Button>
                      )}
                      {status === 'listed' && (
                        <Button variant="outline" size="sm" className="w-full">
                          Cancel Listing
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Past Events Section */}
      {wallet.connected && !loading && !error && pastTickets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-muted-foreground">Past Events</h2>
            <Badge variant="outline">{pastTickets.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pastTickets.map((ticket) => {
              const eventData = events.get(ticket.event)
              const status = getTicketStatus(ticket)
              const rarity = getTicketRarity(ticket.stage)
              const image = getTicketImage(ticket.stage)

              return (
                <Card key={ticket.publicKey} className="glass-card opacity-75 hover:opacity-100 transition-opacity overflow-hidden">
                  {/* Event Cover Image Thumbnail */}
                  <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                    {eventData?.coverImageUrl && getImageDisplayUrl(eventData.coverImageUrl) ? (
                      <img
                        src={getImageDisplayUrl(eventData.coverImageUrl)!}
                        alt={eventData.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ${eventData?.coverImageUrl && getImageDisplayUrl(eventData.coverImageUrl) ? 'hidden' : ''}`}>
                      <div className="text-6xl opacity-40">{image}</div>
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <Badge className={getStatusColor(status)}>
                        {status}
                      </Badge>
                      <Badge className={getRarityColor(rarity)}>
                        {rarity}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-4">
                    <CardTitle className="line-clamp-1">
                      {eventData?.name || "Loading Event..."}
                    </CardTitle>
                    <CardDescription>
                      {getTicketStageName(ticket.stage)} {ticket.seat ? `• Seat ${ticket.seat}` : ""}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Event Details */}
                    {eventData && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium">Start: {formatEventDate(eventData.startTs)}</span>
                            <span>End: {formatEventDate(eventData.endTs)}</span>
                          </div>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2" />
                          Event ID: {eventData.eventId}
                        </div>
                      </div>
                    )}

                    {/* Price Info */}
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">NFT Mint</span>
                        <span className="text-xs font-mono">
                          {ticket.nftMint.slice(0, 4)}...{ticket.nftMint.slice(-4)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Event Ended
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State for new users */}
      {wallet.connected && !loading && !error && tickets.length === 0 && (
        <Card className="glass-card">
          <CardContent className="text-center py-12">
            <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your journey by purchasing your first NFT ticket
            </p>
            <Button className="bg-gradient-primary neon-glow" onClick={() => window.location.href = '/events'}>
              Browse Events
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={closeQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Ticket QR Code
            </DialogTitle>
            <DialogDescription>
              {selectedTicket && events.get(selectedTicket.event) ? (
                shouldShowQRCode(selectedTicket.stage, events.get(selectedTicket.event)!.startTs)
                  ? "Your ticket QR code is cryptographically signed by your wallet and expires every 30 seconds for security. Screenshots cannot be reused."
                  : `QR codes are only available after the event starts.`
              ) : "Loading ticket information..."
              }
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Event Info */}
              <div className="bg-muted/30 rounded-lg p-3">
                <h3 className="font-semibold text-sm mb-2">
                  {events.get(selectedTicket.event)?.name || "Loading Event..."}
                </h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Ticket: {selectedTicket.publicKey.slice(0, 8)}...{selectedTicket.publicKey.slice(-8)}</p>
                  <p>Stage: {getTicketStageName(selectedTicket.stage)}</p>
                  {selectedTicket.seat && <p>Seat: {selectedTicket.seat}</p>}
                </div>
              </div>

              {/* QR Code Display */}
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-muted-foreground/20">
                  {selectedTicket && events.get(selectedTicket.event) && shouldShowQRCode(selectedTicket.stage, events.get(selectedTicket.event)!.startTs) ? (
                    qrCodeImage ? (
                      <div className="text-center">
                        <img 
                          src={qrCodeImage} 
                          alt="Ticket QR Code" 
                          className="w-64 h-64 mx-auto"
                        />
                        <p className="text-sm text-muted-foreground mt-2">Secure QR Code</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Auto-refreshes every 30 seconds
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-6xl mb-2">📱</div>
                        <p className="text-sm text-muted-foreground">Generating QR Code...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Please wait...
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center">
                      <div className="text-6xl mb-2">🔒</div>
                      <p className="text-sm text-muted-foreground">QR Code Not Available</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Available when event starts
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current stage: {getTicketStageName(selectedTicket.stage)}
                      </p>
                    </div>
                  )}
                </div>

                {/* QR Code Info - Show when event has started and QR is available */}
                {selectedTicket && events.get(selectedTicket.event) && shouldShowQRCode(selectedTicket.stage, events.get(selectedTicket.event)!.startTs) && (
                  <div className="w-full space-y-3">
                    {/* Scanner Data */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Scanner Data:</p>
                      <div className="bg-muted/30 rounded p-2 text-xs font-mono break-all">
                        {(() => {
                          try {
                            const data = JSON.parse(qrCodeData)
                            return `NFT Mint: ${data.nftMint}`
                          } catch {
                            return qrCodeData
                          }
                        })()}
                      </div>
                    </div>
                    
                    {/* Explorer Link */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">View on Solana Explorer:</p>
                      <div className="bg-muted/30 rounded p-2 text-xs">
                        {(() => {
                          try {
                            const data = JSON.parse(qrCodeData)
                            return (
                              <a 
                                href={data.explorerUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline break-all"
                              >
                                {data.explorerUrl}
                              </a>
                            )
                          } catch {
                            return <span className="text-muted-foreground">Invalid QR data</span>
                          }
                        })()}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Secure QR code with wallet signature. Prevents screenshot theft.
                    </p>
                  </div>
                )}

                {/* Refresh Indicator - Show when event has started and QR is available */}
                {selectedTicket && events.get(selectedTicket.event) && shouldShowQRCode(selectedTicket.stage, events.get(selectedTicket.event)!.startTs) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Refreshing automatically...</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={closeQRDialog}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    if (selectedTicket) {
                      await generateQRCodeForTicket(selectedTicket)
                    }
                  }}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Now
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}