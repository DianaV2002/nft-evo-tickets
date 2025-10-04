import { Calendar, Users, Ticket, Edit, Trash2, MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function MyEvents() {
  const events = [
    {
      id: 1,
      name: "Neon Nights Festival",
      date: "2024-03-15",
      location: "Digital Arena",
      ticketsSold: 450,
      totalTickets: 500,
      revenue: "225 SOL",
      status: "Active"
    },
    {
      id: 2,
      name: "Tech Summit 2024",
      date: "2024-04-20",
      location: "Convention Center",
      ticketsSold: 120,
      totalTickets: 200,
      revenue: "60 SOL",
      status: "Upcoming"
    },
    {
      id: 3,
      name: "Art Gallery Opening",
      date: "2024-02-28",
      location: "Modern Gallery",
      ticketsSold: 80,
      totalTickets: 80,
      revenue: "40 SOL",
      status: "Completed"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-primary text-primary-foreground'
      case 'Upcoming': return 'bg-secondary text-secondary-foreground'
      case 'Completed': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">3</div>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-secondary">650</div>
            <p className="text-sm text-muted-foreground">Tickets Sold</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent">325 SOL</div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">1</div>
            <p className="text-sm text-muted-foreground">Active Events</p>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Your Events</CardTitle>
          <CardDescription>Manage and monitor your event listings</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div 
                key={event.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-all duration-300 spatial-hover group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {event.name}
                      </h3>
                      <Badge className={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {/* Tickets Info */}
                  <div className="text-center">
                    <div className="flex items-center text-sm">
                      <Ticket className="h-4 w-4 mr-1 text-primary" />
                      <span className="font-medium">{event.ticketsSold}/{event.totalTickets}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Sold</p>
                  </div>

                  {/* Revenue */}
                  <div className="text-center">
                    <div className="font-medium text-sm text-secondary">{event.revenue}</div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}