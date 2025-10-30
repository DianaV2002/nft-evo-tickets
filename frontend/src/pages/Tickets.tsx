import { Ticket, Calendar, MapPin, QrCode, Share2, DollarSign, Loader2, X, RefreshCw, FileText, Heart, Info, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UsdcDisplay } from "@/components/ui/usdc-input"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import {
  fetchUserTicketsV2Only,
  TicketData,
  getTicketStageName,
  getTicketRarity,
  listTicketOnMarketplace,
  cancelTicketListing,
  TicketStage
} from "@/services/ticketService"
import { EventData, fetchEventsByKeys, formatEventDate, formatEventTime, getEventStatus } from "@/services/eventService"
import { getImageDisplayUrl } from "@/services/imageService"
import { generateQRCodeDataURL, generateQRCodeData, generateNFTExplorerQRData, generateScannerQRData, QRCodeData } from "@/services/qrCodeService"
import { getTicketContent, getStageBadgeStyle, getStageButtonStyle, getEvolutionStatus, canEvolve, shouldShowQRCode } from "@/services/ticketContentService"
import { PublicKey } from "@solana/web3.js"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useAuth } from "@/contexts/AuthContext"
import { isEmailUser } from "@/services/emailTicketService"
import { toast } from "sonner"
import { getFusionRewardByTxSignature } from './CreateEvent';

export default function Tickets() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const { user, isConnected } = useAuth()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [events, setEvents] = useState<Map<string, EventData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null)
  const [qrCodeData, setQrCodeData] = useState<string>('')
  const [qrCodeImage, setQrCodeImage] = useState<string>('')
  const [qrRefreshInterval, setQrRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Marketplace listing state
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [listingTicket, setListingTicket] = useState<TicketData | null>(null)
  const [listingPrice, setListingPrice] = useState<string>('')
  const [listingInProgress, setListingInProgress] = useState(false)
  const [cancelingListing, setCancelingListing] = useState<string | null>(null)

  // Fusion state for collectible tickets
  const [fusionSelected, setFusionSelected] = useState<Set<string>>(new Set())
  const [fusionDialogOpen, setFusionDialogOpen] = useState(false)
  const toggleFusionSelection = (ticketPubkey: string) => {
    const ticket = tickets.find(t => t.publicKey === ticketPubkey)
    if (!ticket) return

    setFusionSelected(prev => {
      const next = new Set(prev)

      if (next.has(ticketPubkey)) {
        next.delete(ticketPubkey)
        return next
      }

      // If this is the first selection, allow
      if (next.size === 0) {
        next.add(ticketPubkey)
        return next
      }

      // Enforce same event and organizer as first selection
      const [firstId] = Array.from(next)
      const first = tickets.find(t => t.publicKey === firstId)
      const a = first ? events.get(first.event) : undefined
      const b = events.get(ticket.event)

      if (!first || !a || !b) {
        toast.error('Event data not available for fusion')
        return next
      }

      if (first.event !== ticket.event) {
        toast.error('Select tickets from the same event to fuse')
        return next
      }

      if (a.authority !== b.authority) {
        toast.error('Select tickets from the same organizer to fuse')
        return next
      }

      if (next.size < 2) next.add(ticketPubkey)
      return next
    })
  }
  const fusionSelectedTickets = () => tickets.filter(t => fusionSelected.has(t.publicKey))
  const fusionHasTwo = () => fusionSelected.size === 2
  const fusionIsSameEvent = () => {
    const sel = fusionSelectedTickets()
    if (sel.length !== 2) return false
    return sel[0].event === sel[1].event
  }
  const fusionIsSameOrganizer = () => {
    const sel = fusionSelectedTickets()
    if (sel.length !== 2) return false
    const a = events.get(sel[0].event)
    const b = events.get(sel[1].event)
    if (!a || !b) return false
    return a.authority === b.authority
  }
  const canFuse = fusionHasTwo() && fusionIsSameEvent() && fusionIsSameOrganizer()
  const handleFuseSelected = () => {
    if (!canFuse) return
    setFusionDialogOpen(true)
  }

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

  // Collectible tickets (stage == Collectible)
  const collectibleTickets = tickets
    .filter(ticket => ticket.stage === TicketStage.Collectible)
    .sort((a, b) => {
      const eventA = events.get(a.event)
      const eventB = events.get(b.event)
      if (!eventA || !eventB) return 0
      return eventB.startTs - eventA.startTs
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

        console.log("Fetching user tickets (version 2 events only)...")
        const userTickets = await fetchUserTicketsV2Only(connection, wallet.publicKey)
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

  // Can list ticket if it's in QR or Collectible stage and not already listed
  const canListTicket = (ticket: TicketData): boolean => {
    const isCorrectStage = ticket.stage === TicketStage.Qr || ticket.stage === TicketStage.Collectible
    const notListed = !ticket.isListed
    const notScanned = !ticket.wasScanned

    console.log('[canListTicket]', {
      ticketId: ticket.publicKey.slice(0, 8),
      stage: ticket.stage,
      stageName: getTicketStageName(ticket.stage),
      isQr: ticket.stage === TicketStage.Qr,
      isCollectible: ticket.stage === TicketStage.Collectible,
      isCorrectStage,
      isListed: ticket.isListed,
      notListed,
      wasScanned: ticket.wasScanned,
      notScanned,
      canList: isCorrectStage && notListed && notScanned
    })

    return isCorrectStage && notListed && notScanned
  }

  // Open listing dialog
  const openListDialog = (ticket: TicketData) => {
    setListingTicket(ticket)
    setListingPrice('')
    setListDialogOpen(true)
  }

  // Close listing dialog
  const closeListDialog = () => {
    setListDialogOpen(false)
    setListingTicket(null)
    setListingPrice('')
  }

  // List ticket on marketplace
  const handleListTicket = async () => {
    if (!listingTicket || !wallet.publicKey) return

    const priceInSol = parseFloat(listingPrice)
    if (isNaN(priceInSol) || priceInSol <= 0) {
      toast.error("Please enter a valid price")
      return
    }

    const toastId = toast.loading("Sending transaction to blockchain...", {
      duration: Infinity
    })

    try {
      setListingInProgress(true)

      const priceLamports = Math.floor(priceInSol * LAMPORTS_PER_SOL)

      const tx = await listTicketOnMarketplace(
        connection,
        wallet,
        new PublicKey(listingTicket.publicKey),
        new PublicKey(listingTicket.event),
        new PublicKey(listingTicket.nftMint),
        priceLamports
      )

      toast.dismiss(toastId)
      toast.success(
        <div>
          <p className="font-semibold">Ticket listed successfully!</p>
          <a
            href={`https://explorer.solana.com/tx/${tx}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline text-blue-400 hover:text-blue-300"
          >
            View on Explorer: {tx.slice(0, 8)}...
          </a>
        </div>,
        { duration: 5000 }
      )
      closeListDialog()

      // Reload tickets after a short delay
      setTimeout(async () => {
        if (wallet.publicKey) {
          const updatedTickets = await fetchUserTicketsV2Only(connection, wallet.publicKey)
          setTickets(updatedTickets)
        }
      }, 2000)
    } catch (error: any) {
      console.error("Error listing ticket:", error)
      toast.dismiss(toastId)

      // Check if error message contains transaction signature
      const txMatch = error.message?.match(/([A-Za-z0-9]{87,88})/)
      if (txMatch) {
        toast.error(
          <div>
            <p className="font-semibold">Transaction may have succeeded</p>
            <p className="text-xs mb-2">Check the status on explorer:</p>
            <a
              href={`https://explorer.solana.com/tx/${txMatch[1]}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline text-blue-400 hover:text-blue-300"
            >
              View Transaction
            </a>
          </div>,
          { duration: 10000 }
        )
      } else {
        toast.error(error?.message || "Failed to list ticket", { duration: 5000 })
      }
    } finally {
      setListingInProgress(false)
    }
  }

  // Cancel listing
  const handleCancelListing = async (ticket: TicketData) => {
    if (!wallet.publicKey) return

    try {
      setCancelingListing(ticket.publicKey)
      toast.loading("Canceling listing...")

      const tx = await cancelTicketListing(
        connection,
        wallet,
        new PublicKey(ticket.publicKey),
        new PublicKey(ticket.nftMint)
      )

      toast.success(`Listing canceled! Transaction: ${tx.slice(0, 8)}...`)

      // Reload tickets
      if (wallet.publicKey) {
        const updatedTickets = await fetchUserTicketsV2Only(connection, wallet.publicKey)
        setTickets(updatedTickets)
      }
    } catch (error: any) {
      console.error("Error canceling listing:", error)
      toast.error(error?.message || "Failed to cancel listing")
    } finally {
      setCancelingListing(null)
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

      {/* Email user notice */}
      {isConnected && user && isEmailUser(user.authMethod) && (
        <Card className="glass-card border-amber-300/40">
          <CardContent className="py-4 text-sm">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-amber-500 mt-0.5" />
              <div>
                <p className="text-foreground font-medium">Email accounts: My Tickets support coming soon</p>
                <p className="text-muted-foreground">Viewing and managing tickets for email-based accounts is coming soon. Connect a wallet to see on-chain tickets, or check back later.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Collectible Tickets Section with Fusion */}
      {wallet.connected && !loading && !error && collectibleTickets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold">Collectible Tickets</h2>
              <Badge variant="secondary">{collectibleTickets.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="bg-gradient-primary"
                disabled={!canFuse}
                onClick={handleFuseSelected}
                title={
                  canFuse
                    ? 'Fuse selected tickets'
                    : fusionHasTwo()
                      ? (!fusionIsSameEvent() ? 'Tickets must be from the same event' : !fusionIsSameOrganizer() ? 'Tickets must be from the same organizer' : 'Select two collectible tickets')
                      : 'Select two collectible tickets to fuse'
                }
              >
                Fuse Selected (2)
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Fusion rewards are set by the event organizer. Select two collectible tickets from the same event to enable fusion.
          </div>
          {fusionHasTwo() && (!fusionIsSameEvent() || !fusionIsSameOrganizer()) && (
            <div className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded p-2">
              { !fusionIsSameEvent() ? 'Selected tickets are from different events. ' : ''}
              { !fusionIsSameOrganizer() ? 'Selected tickets have different organizers.' : ''}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {collectibleTickets.map((ticket) => {
              const eventData = events.get(ticket.event)
              const rarity = getTicketRarity(ticket.stage)
              const image = getTicketImage(ticket.stage)
              const isSelected = fusionSelected.has(ticket.publicKey)

              return (
                <Card key={`collectible-${ticket.publicKey}`} className={`glass-card group overflow-hidden ${ isSelected ? 'ring-2 ring-primary' : '' }`}>
                  <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                    {eventData?.coverImageUrl && getImageDisplayUrl(eventData.coverImageUrl) ? (
                      <img
                        src={getImageDisplayUrl(eventData.coverImageUrl)!}
                        alt={eventData?.name || 'Event'}
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
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <Badge className="bg-purple-600 text-white">Collectible</Badge>
                      <Badge className={getRarityColor(rarity)}>{rarity}</Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                      {eventData?.name || 'Event'}
                    </CardTitle>
                    <CardDescription>
                      {getTicketStageName(ticket.stage)} {ticket.seat ? `• Seat ${ticket.seat}` : ''}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">NFT Mint</span>
                      <span className="text-xs font-mono">{ticket.nftMint.slice(0,4)}...{ticket.nftMint.slice(-4)}</span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleFusionSelection(ticket.publicKey)}
                      >
                        {isSelected ? 'Selected for Fusion' : 'Select for Fusion'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
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

              // Debug logging
              console.log('[Ticket Rendering]', {
                ticketId: ticket.publicKey.slice(0, 8),
                stage: ticket.stage,
                stageName: getTicketStageName(ticket.stage),
                status: status,
                isListed: ticket.isListed,
                wasScanned: ticket.wasScanned,
                eventData: eventData ? 'loaded' : 'missing'
              })

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
                      {/* Listed Status - Show cancel button */}
                      {status === 'listed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleCancelListing(ticket)}
                          disabled={cancelingListing === ticket.publicKey}
                        >
                          {cancelingListing === ticket.publicKey ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Cancel Listing
                        </Button>
                      )}

                      {/* Used Status */}
                      {status === 'used' && (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Event Completed
                        </Button>
                      )}

                      {/* Active Status - Show stage-specific buttons + List button */}
                      {status === 'active' && eventData && (() => {
                        const content = getTicketContent(ticket.stage, eventData.startTs, eventData.endTs)
                        const canList = canListTicket(ticket)

                        console.log('[Button Rendering]', {
                          ticketId: ticket.publicKey.slice(0, 8),
                          status: status,
                          hasEventData: !!eventData,
                          canList: canList,
                          hasQrButton: !!content.content.qrCode,
                          hasEventProgram: !!content.content.eventProgram,
                          hasMemories: !!content.content.memories
                        })

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

                            {/* List Button - For QR or Collectible stage tickets */}
                            {canList && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 spatial-hover"
                                onClick={() => openListDialog(ticket)}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                List
                              </Button>
                            )}
                          </>
                        )
                      })()}
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

              // Debug logging
              console.log('[Past Ticket Rendering]', {
                ticketId: ticket.publicKey.slice(0, 8),
                stage: ticket.stage,
                stageName: getTicketStageName(ticket.stage),
                status: status,
                isListed: ticket.isListed,
                wasScanned: ticket.wasScanned,
                eventData: eventData ? 'loaded' : 'missing'
              })

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
                      {/* Listed Status - Show cancel button */}
                      {status === 'listed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleCancelListing(ticket)}
                          disabled={cancelingListing === ticket.publicKey}
                        >
                          {cancelingListing === ticket.publicKey ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Cancel Listing
                        </Button>
                      )}

                      {/* Used Status */}
                      {status === 'used' && (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Event Completed
                        </Button>
                      )}

                      {/* Active Status - Show stage-specific buttons + List button */}
                      {status === 'active' && eventData && (() => {
                        const content = getTicketContent(ticket.stage, eventData.startTs, eventData.endTs)
                        const canList = canListTicket(ticket)

                        console.log('[Past Ticket Button Rendering]', {
                          ticketId: ticket.publicKey.slice(0, 8),
                          status: status,
                          hasEventData: !!eventData,
                          canList: canList,
                          hasEventProgram: !!content.content.eventProgram,
                          hasMemories: !!content.content.memories
                        })

                        return (
                          <>
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

                            {/* List Button - For Collectible stage tickets */}
                            {canList && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 spatial-hover"
                                onClick={() => openListDialog(ticket)}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                List
                              </Button>
                            )}
                          </>
                        )
                      })()}

                      {/* Default for past events with no special status */}
                      {status !== 'active' && status !== 'listed' && status !== 'used' && (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Event Ended
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

      {/* List Ticket Dialog */}
      <Dialog open={listDialogOpen} onOpenChange={closeListDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              List Ticket on Marketplace
            </DialogTitle>
            <DialogDescription>
              Set a price for your ticket. Only tickets in QR or Collectible stage can be listed.
            </DialogDescription>
          </DialogHeader>

          {listingTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="bg-muted/30 rounded-lg p-3">
                <h3 className="font-semibold text-sm mb-2">
                  {events.get(listingTicket.event)?.name || "Loading Event..."}
                </h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Stage: {getTicketStageName(listingTicket.stage)}</p>
                  {listingTicket.seat && <p>Seat: {listingTicket.seat}</p>}
                  <p className="font-mono">
                    {listingTicket.publicKey.slice(0, 8)}...{listingTicket.publicKey.slice(-8)}
                  </p>
                </div>
              </div>

              {/* Price Input */}
              <div className="space-y-2">
                <Label htmlFor="listing-price">Price (SOL)</Label>
                <Input
                  id="listing-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  disabled={listingInProgress}
                />
                <p className="text-xs text-muted-foreground">
                  A 5% marketplace fee will be deducted from the sale price
                </p>
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Your ticket will be held in escrow until sold or canceled. You can cancel the listing at any time.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeListDialog}
              disabled={listingInProgress}
            >
              Cancel
            </Button>
            <Button
              onClick={handleListTicket}
              disabled={listingInProgress || !listingPrice}
              className="bg-gradient-primary"
            >
              {listingInProgress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Listing...
                </>
              ) : (
                "List Ticket"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fusion Dialog */}
      <Dialog open={fusionDialogOpen} onOpenChange={setFusionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Fuse Collectible Tickets
            </DialogTitle>
            <DialogDescription>
              Fusion rewards are defined by the event organizer. Selected tickets must be from the same event and organizer.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const sel = tickets.filter(t => fusionSelected.has(t.publicKey))
            const event = sel.length === 2 ? events.get(sel[0].event) : undefined
            const reward = sel.length === 2 ? getFusionRewardByTxSignature(sel[0].event) : null;
            return (
              <div className="space-y-4">
                {/* Selection Summary */}
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  {sel.length === 2 ? (
                    <div className="space-y-1">
                      <div className="font-medium">{event?.name || 'Selected Event'}</div>
                      <div className="text-muted-foreground">Organizer: <span className="font-mono text-xs">{event?.authority?.slice(0,8)}...{event?.authority?.slice(-8)}</span></div>
                      <div className="text-muted-foreground text-xs">
                        Tickets:
                        <div className="mt-1 space-y-1">
                          {sel.map((t) => (
                            <div key={t.publicKey} className="flex justify-between">
                              <span>{getTicketStageName(t.stage)}{t.seat ? ` • Seat ${t.seat}` : ''}</span>
                              <span className="font-mono">{t.publicKey.slice(0,6)}...{t.publicKey.slice(-6)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">Select two collectible tickets to fuse.</div>
                  )}
                </div>

                {/* Rewards Preview (from organizer, if any) */}
                {reward && (
                  <div className="rounded-lg border border-green-500/40 p-4 bg-green-100 dark:bg-green-900/20">
                    <div className="text-base font-semibold text-green-700 dark:text-green-300 mb-1">Fusion Reward</div>
                    <div className="font-medium text-green-700 dark:text-green-200 pb-1">{reward.title}</div>
                    <div className="text-xs text-green-800 dark:text-green-300">{reward.description}</div>
                  </div>
                )}
                {!reward && (
                  <div className="rounded-lg border border-primary/20 p-3 bg-primary/5">
                    <div className="text-sm font-medium text-primary mb-1">Organizer Rewards (Preview)</div>
                    <div className="text-xs text-muted-foreground">
                      Rewards for fusion are configured by the event organizer. This will show details like upgraded metadata, perks, or collectibles.
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFusionDialogOpen(false)}>
              Close
            </Button>
            <Button disabled className="opacity-80">
              Coming Soon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}