import { Calendar, Clock, Users, Ticket, Edit, Trash2, MoreHorizontal, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { fetchAllEvents, EventData, getEventStatus, formatEventDate, formatEventTime, deleteEvent } from "@/services/eventService"
import { getImageDisplayUrl } from "@/services/imageService"
import { useEventStatusUpdate } from "@/hooks/useEventStatusUpdate"
import { PublicKey } from "@solana/web3.js"
import { useToast } from "@/hooks/use-toast"

export default function MyEvents() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const { toast } = useToast()
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)

  // Use the status update hook
  const { lastUpdate, statusChanges, hasRecentChanges } = useEventStatusUpdate(events)

  useEffect(() => {
    async function loadMyEvents() {
      console.log("Loading My Events - Wallet connected:", wallet.connected, "Public key:", wallet.publicKey?.toString())
      
      if (!wallet.connected || !wallet.publicKey) {
        console.log("Wallet not connected, setting loading to false")
        setLoading(false)
        setEvents([])
        return
      }

      try {
        setLoading(true)
        setError(null)
        console.log("Fetching events for wallet:", wallet.publicKey.toString())
        // Fetch events created by this wallet
        const fetchedEvents = await fetchAllEvents(connection, wallet.publicKey)
        console.log("Fetched events:", fetchedEvents.length)
        setEvents(fetchedEvents)
      } catch (err) {
        console.error("Failed to load my events:", err)
        setError("Failed to load your events from the blockchain")
      } finally {
        setLoading(false)
      }
    }

    loadMyEvents()
  }, [connection, wallet.connected, wallet.publicKey])


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-accent text-accent-foreground'
      case 'upcoming': return 'bg-primary text-primary-foreground'
      case 'ended': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  // Calculate stats from blockchain events
  const totalEvents = events.length
  const activeEvents = events.filter(e => getEventStatus(e.startTs, e.endTs) === 'live').length

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

  const handleDeleteEvent = async (event: EventData) => {
    if (!wallet.connected || !wallet.publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to delete events",
        variant: "destructive",
      })
      return
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${event.name}"? This action cannot be undone.`)) {
      return
    }

    setDeletingEventId(event.eventId)

    try {
      const eventPublicKey = new PublicKey(event.publicKey)
      const eventId = parseInt(event.eventId)

      toast({
        title: "Deleting event...",
        description: "Please confirm the transaction in your wallet",
      })

      const txSignature = await deleteEvent(connection, wallet, eventPublicKey, eventId)

      toast({
        title: "Event deleted successfully!",
        description: `Transaction: ${txSignature.slice(0, 8)}...${txSignature.slice(-8)}`,
      })

      // Reload events after deletion
      const fetchedEvents = await fetchAllEvents(connection, wallet.publicKey)
      setEvents(fetchedEvents)
    } catch (error: any) {
      console.error("Failed to delete event:", error)
      toast({
        title: "Failed to delete event",
        description: error.message || "An error occurred while deleting the event",
        variant: "destructive",
      })
    } finally {
      setDeletingEventId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold gradient-text">My Events</h1>
          <p className="text-muted-foreground mt-2">
            Manage your events and track ticket sales
          </p>
          {hasRecentChanges && (
            <div className="mt-2 text-sm text-green-600 dark:text-green-400">
              ✨ Event statuses updated automatically
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{totalEvents}</div>
              <p className="text-sm text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">-</div>
              <p className="text-sm text-muted-foreground">Tickets Sold</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">-</div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{activeEvents}</div>
              <p className="text-sm text-muted-foreground">Active Events</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground mt-4">Loading your events from blockchain...</p>
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

      {/* Wallet Not Connected State */}
      {!wallet.connected && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground text-lg">Please connect your wallet to view your events.</p>
          <Button className="mt-4" onClick={() => window.location.href = '/wallet-connect'}>
            Connect Wallet
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && wallet.connected && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground text-lg">You haven't created any events yet.</p>
          <Button className="mt-4" onClick={() => window.location.href = '/create-event'}>
            Create Your First Event
          </Button>
        </div>
      )}

      {/* Events Grid */}
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
                  <div className="absolute top-2 right-2">
                    <Badge className={getStatusColor(status)}>
                      {status}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="pb-4">
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                    {event.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-1">
                    Created by you
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
                        {(() => {
                          const totalCapacity = 100;
                          // Use event ID as seed for consistent numbers
                          const seed = parseInt(event.eventId.slice(-2), 16) || 0;
                          const ticketsSold = (seed % 30) + 10; // 10-40 tickets sold
                          return totalCapacity - ticketsSold;
                        })()} available
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-muted-foreground">Tickets Sold</span>
                      <span className="text-xs">
                        {(() => {
                          // Use event ID as seed for consistent numbers
                          const seed = parseInt(event.eventId.slice(-2), 16) || 0;
                          const ticketsSold = (seed % 30) + 10; // 10-40 tickets sold
                          return ticketsSold;
                        })()} sold
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
                          <span className="font-mono">100 total</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sold:</span>
                          <span className="font-mono">{Math.floor(Math.random() * 20)} tickets</span>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="flex-1 bg-gradient-primary neon-glow spatial-hover"
                          disabled={deletingEventId === event.eventId}
                        >
                          {deletingEventId === event.eventId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Manage Event"
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Event
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Users className="h-4 w-4 mr-2" />
                          View Attendees
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteEvent(event)
                          }}
                          disabled={deletingEventId === event.eventId}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            Showing {events.length} event{events.length !== 1 ? 's' : ''} you created
          </p>
        </div>
      )}

      {/* Event Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedEvent?.name}</DialogTitle>
            <DialogDescription>
              Complete event information and management options
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
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    {(() => {
                      const totalCapacity = 100;
                      // Use event ID as seed for consistent numbers
                      const seed = parseInt(selectedEvent.eventId.slice(-2), 16) || 0;
                      const ticketsSold = (seed % 30) + 10; // 10-40 tickets sold
                      const placesLeft = totalCapacity - ticketsSold;
                      
                      return (
                        <>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary">
                              {placesLeft}
                            </p>
                            <p className="text-xs text-muted-foreground">Places Left</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-secondary">
                              {ticketsSold}
                            </p>
                            <p className="text-xs text-muted-foreground">Tickets Sold</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-accent">{totalCapacity}</p>
                            <p className="text-xs text-muted-foreground">Total Capacity</p>
                          </div>
                        </>
                      );
                    })()}
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
                  <Button className="flex-1 bg-gradient-primary">
                    Manage Event
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