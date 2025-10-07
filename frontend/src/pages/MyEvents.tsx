import { Calendar, Clock, Users, Ticket, Edit, Trash2, MoreHorizontal, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { fetchAllEvents, EventData, getEventStatus, formatEventDate, formatEventTime } from "@/services/eventService"
import { PublicKey } from "@solana/web3.js"

export default function MyEvents() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMyEvents() {
      if (!wallet.publicKey) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        // Fetch events created by this wallet
        const fetchedEvents = await fetchAllEvents(connection, wallet.publicKey)
        setEvents(fetchedEvents)
      } catch (err) {
        console.error("Failed to load my events:", err)
        setError("Failed to load your events from the blockchain")
      } finally {
        setLoading(false)
      }
    }

    loadMyEvents()
  }, [connection, wallet.publicKey])

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold gradient-text">My Events</h1>
          <p className="text-muted-foreground mt-2">
            Manage your events and track ticket sales
          </p>
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

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="flex-1 bg-gradient-primary neon-glow spatial-hover">
                          Manage Event
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
                        <DropdownMenuItem className="text-destructive">
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
    </div>
  )
}