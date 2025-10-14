import { Calendar, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { fetchAllEvents, EventData, getEventStatus, formatEventDate, formatEventTime } from "@/services/eventService"
import { getImageDisplayUrl } from "@/services/imageService"
import { useEventStatusUpdate } from "@/hooks/useEventStatusUpdate"
import { buyEventTicket, fetchActiveListings } from "@/services/ticketService"
import { recordActivity } from "@/services/levelService"
import { PublicKey } from "@solana/web3.js"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { toast } from "sonner"

export default function Events() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buyingTicket, setBuyingTicket] = useState(false)
  const [listings, setListings] = useState<any[]>([])

  // Use the status update hook
  const { lastUpdate, statusChanges, hasRecentChanges } = useEventStatusUpdate(events)
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true)
        setError(null)
        // Fetch all events owned by the current program (no authority filter)
        // This will show all events created through program 6mz15gSnFGTWzjHsveE8aFpVTKjdiLkVfQKtvFf1CGdc
        const fetchedEvents = await fetchAllEvents(connection)
        setEvents(fetchedEvents)
      } catch (err) {
        console.error("Failed to load events:", err)
        setError("Failed to load events from the blockchain")
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [connection])

  const handleBuyTicket = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!selectedEvent) {
      toast.error("No event selected")
      return
    }

    try {
      setBuyingTicket(true)
      toast.loading("Purchasing your ticket...")

      // Buy a ticket from event (price: 0.1 SOL as example)
      const ticketPrice = 0.1 * LAMPORTS_PER_SOL;
      const tx = await buyEventTicket(
        connection,
        wallet,
        new PublicKey(selectedEvent.publicKey),
        ticketPrice,
        undefined // seat number (optional)
      )

      toast.dismiss()
      toast.success("Ticket purchased successfully!")
      toast.success(`Transaction: ${tx.slice(0, 8)}...${tx.slice(-8)}`)
      
      // Check if event has started to inform user about ticket stage
      const now = Math.floor(Date.now() / 1000)
      const eventHasStarted = now >= selectedEvent.startTs
      if (eventHasStarted) {
        toast.info("Your ticket is ready for scanning! QR code has been generated.")
      } else {
        toast.info("Your ticket is in Prestige stage. QR code will be generated when the event starts.")
      }

      // Record activity for points
      try {
        const result = await recordActivity(
          wallet.publicKey.toString(),
          'TICKET_PURCHASED',
          tx,
          { eventName: selectedEvent.name }
        )

        if (result.success && result.pointsEarned > 0) {
          toast.success(`+${result.pointsEarned} points earned!`)
        }
      } catch (activityError) {
        console.error('Failed to record activity:', activityError)
        // Don't fail the flow if points recording fails
      }

      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Error buying ticket:", error)
      toast.dismiss()

      if (error.message?.includes("already in use")) {
        toast.error("You already have a ticket for this event!")
        toast.info("Each wallet can only own one ticket per event.")
      } else if (error.message?.includes("insufficient")) {
        toast.error("Insufficient funds!")
        toast.info("You need more SOL to purchase this ticket.")
      } else if (error.message?.includes("InvalidInput") || error.message?.includes("sold out") || error.message?.includes("capacity")) {
        toast.error("Event is sold out!")
        toast.info("All tickets have been sold for this event.")
      } else {
        toast.error(error.message || "Failed to purchase ticket")
      }
    } finally {
      setBuyingTicket(false)
    }
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-accent text-accent-foreground'
      case 'upcoming': return 'bg-primary text-primary-foreground'
      case 'ended': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const toggleCardExpansion = (eventId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Events</h1>
          <p className="text-muted-foreground mt-2">
            Discover amazing events and secure your NFT tickets
          </p>
          {hasRecentChanges && (
            <div className="mt-2 text-sm text-green-600 dark:text-green-400">
              ✨ Event statuses updated automatically
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground mt-4">Loading events from blockchain...</p>
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

      {/* Events Grid */}
      {!loading && !error && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground text-lg">No events found</p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event) => {
            const status = getEventStatus(event.startTs, event.endTs)
            const date = formatEventDate(event.startTs)
            const time = formatEventTime(event.startTs, event.endTs)

            return (
              <Card key={event.publicKey} className="glass-card spatial-hover group overflow-hidden">
                {/* Cover Photo */}
                <div className="aspect-video relative overflow-hidden">
                  {event.coverImageUrl && getImageDisplayUrl(event.coverImageUrl) ? (
                    <img
                      src={getImageDisplayUrl(event.coverImageUrl)!}
                      alt={event.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ${event.coverImageUrl && getImageDisplayUrl(event.coverImageUrl) ? 'hidden' : ''}`}>
                    <div className="text-6xl opacity-40"></div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge className={getStatusColor(status)}>
                      {status}
                    </Badge>
                    {event.ticketsSold >= event.ticketSupply && (
                      <Badge className="bg-destructive text-destructive-foreground">
                        Sold Out
                      </Badge>
                    )}
                  </div>
                </div>
                
                <CardHeader className="pb-4">
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                    {event.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-1">
                    Event ID: {event.eventId}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Event Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <div className="flex flex-col">
                        <span>{formatEventDate(event.startTs)}</span>
                        <span className="text-xs">to {formatEventDate(event.endTs)}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {time}
                    </div>
                  </div>

                  {/* Event Stats */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Event ID</span>
                      <span className="font-mono text-xs">{event.eventId}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-muted-foreground">Places Left</span>
                      <span className="text-xs font-medium text-primary">
                        {event.ticketSupply - event.ticketsSold} available
                      </span>
                    </div>
                    
                    {/* Technical Details Toggle */}
                    <button
                      onClick={() => toggleCardExpansion(event.eventId)}
                      className="flex items-center justify-between w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Technical Details</span>
                      {expandedCards.has(event.eventId) ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                    
                    {/* Collapsible Technical Details */}
                    {expandedCards.has(event.eventId) && (
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-mono">
                            {status === 'live' ? 'Live' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capacity:</span>
                          <span className="font-mono">{event.ticketSupply} total</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sold:</span>
                          <span className="font-mono">{event.ticketsSold} tickets</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account:</span>
                          <span className="font-mono truncate" title={event.publicKey}>
                            {event.publicKey.slice(0, 8)}...{event.publicKey.slice(-8)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Authority:</span>
                          <span className="font-mono truncate" title={event.authority}>
                            {event.authority.slice(0, 8)}...{event.authority.slice(-8)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Scanner:</span>
                          <span className="font-mono truncate" title={event.scanner}>
                            {event.scanner.slice(0, 8)}...{event.scanner.slice(-8)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedEvent(event)
                        setIsDialogOpen(true)
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-primary neon-glow spatial-hover"
                      onClick={() => {
                        setSelectedEvent(event)
                        setIsDialogOpen(true)
                      }}
                      disabled={!wallet.connected || event.ticketsSold >= event.ticketSupply}
                    >
                      {event.ticketsSold >= event.ticketSupply
                        ? "Sold Out"
                        : wallet.connected
                          ? "Buy Ticket"
                          : "Connect Wallet"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Event Count */}
      {!loading && !error && events.length > 0 && (
        <div className="flex justify-center pt-8">
          <p className="text-muted-foreground">
            Showing {events.length} event{events.length !== 1 ? 's' : ''} from the blockchain
          </p>
        </div>
      )}

      {/* Event Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedEvent?.name}</DialogTitle>
            <DialogDescription>
              Complete event information and ticket purchase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedEvent && (
              <>
                {/* Event Overview */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Event Dates</span>
                      </div>
                      <div className="ml-6 text-sm text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium text-foreground">Start:</span> {formatEventDate(selectedEvent.startTs)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">End:</span> {formatEventDate(selectedEvent.endTs)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Time</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        {formatEventTime(selectedEvent.startTs, selectedEvent.endTs)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Event Stats */}
                  <div className="space-y-4 pt-4 border-t">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ticket Sales Progress</span>
                        <span className="font-medium">
                          {selectedEvent.ticketsSold} / {selectedEvent.ticketSupply}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, (selectedEvent.ticketsSold / selectedEvent.ticketSupply) * 100)}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {Math.round((selectedEvent.ticketsSold / selectedEvent.ticketSupply) * 100)}% sold
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {selectedEvent.ticketSupply - selectedEvent.ticketsSold}
                        </p>
                        <p className="text-xs text-muted-foreground">Places Left</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-secondary">
                          {selectedEvent.ticketsSold}
                        </p>
                        <p className="text-xs text-muted-foreground">Tickets Sold</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-accent">{selectedEvent.ticketSupply}</p>
                        <p className="text-xs text-muted-foreground">Total Capacity</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium text-sm">Event Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Event ID:</span>
                      <p className="font-mono text-xs">{selectedEvent.eventId}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="font-mono text-xs">
                        {getEventStatus(selectedEvent.startTs, selectedEvent.endTs) === 'live' ? 'Live' : 
                         getEventStatus(selectedEvent.startTs, selectedEvent.endTs) === 'upcoming' ? 'Upcoming' : 'Ended'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account:</span>
                      <p className="font-mono text-xs truncate" title={selectedEvent.publicKey}>
                        {selectedEvent.publicKey.slice(0, 8)}...{selectedEvent.publicKey.slice(-8)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Authority:</span>
                      <p className="font-mono text-xs truncate" title={selectedEvent.authority}>
                        {selectedEvent.authority.slice(0, 8)}...{selectedEvent.authority.slice(-8)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-primary"
                    onClick={handleBuyTicket}
                    disabled={buyingTicket || !wallet.connected || selectedEvent.ticketsSold >= selectedEvent.ticketSupply}
                  >
                    {buyingTicket
                      ? "Purchasing..."
                      : selectedEvent.ticketsSold >= selectedEvent.ticketSupply
                        ? "Sold Out"
                        : "Buy Ticket"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}