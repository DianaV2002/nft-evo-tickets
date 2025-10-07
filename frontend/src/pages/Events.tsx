import { Calendar, Clock, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConnection } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { fetchAllEvents, EventData, getEventStatus, formatEventDate, formatEventTime } from "@/services/eventService"

export default function Events() {
  const { connection } = useConnection()
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-accent text-accent-foreground'
      case 'upcoming': return 'bg-primary text-primary-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
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
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="text-4xl mb-2">🎫</div>
                    <Badge className={getStatusColor(status)}>
                      {status}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                    {event.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-1 text-xs font-mono">
                    ID: {event.eventId}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Event Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {date}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {time}
                    </div>
                  </div>

                  {/* Event Account Info */}
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground truncate" title={event.publicKey}>
                      Account: {event.publicKey.slice(0, 8)}...{event.publicKey.slice(-8)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1" title={event.authority}>
                      Authority: {event.authority.slice(0, 8)}...{event.authority.slice(-8)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      View Details
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-primary neon-glow spatial-hover"
                      onClick={() => {
                        setSelectedEvent(event)
                        setIsDialogOpen(true)
                      }}
                    >
                      Buy Ticket
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

      {/* Buy Ticket Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy Ticket</DialogTitle>
            <DialogDescription>
              Purchase your NFT ticket for {selectedEvent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedEvent && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{formatEventDate(selectedEvent.startTs)}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{formatEventTime(selectedEvent.startTs, selectedEvent.endTs)}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-4">
                    Event ID: {selectedEvent.eventId}
                  </p>
                  <Button className="w-full bg-gradient-primary">
                    Confirm Purchase
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