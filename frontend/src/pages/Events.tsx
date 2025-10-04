import { Calendar, MapPin, Users, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function Events() {
  const events = [
    {
      id: 1,
      name: "Neon Nights Festival 2024",
      description: "The ultimate electronic music experience",
      date: "December 15, 2024",
      time: "18:00 - 06:00",
      location: "Bucharest Arena",
      attendees: 5000,
      ticketsAvailable: 450,
      price: "0.5 SOL",
      image: "🎵",
      category: "Music",
      status: "live"
    },
    {
      id: 2,
      name: "Digital Dreams Conference",
      description: "Web3 and blockchain innovation summit",
      date: "December 20, 2024",
      time: "09:00 - 18:00",
      location: "Virtual Reality Space",
      attendees: 1000,
      ticketsAvailable: 200,
      price: "0.3 SOL",
      image: "💻",
      category: "Tech",
      status: "upcoming"
    },
    {
      id: 3,
      name: "Cyberpunk Art Exhibition",
      description: "Immersive digital art experience",
      date: "December 25, 2024",
      time: "12:00 - 22:00",
      location: "Gallery Matrix",
      attendees: 300,
      ticketsAvailable: 150,
      price: "0.2 SOL",
      image: "🎭",
      category: "Art",
      status: "upcoming"
    },
    {
      id: 4,
      name: "Future Gaming Expo",
      description: "Next-gen gaming and esports",
      date: "January 5, 2025",
      time: "10:00 - 20:00",
      location: "Convention Center",
      attendees: 2000,
      ticketsAvailable: 800,
      price: "0.4 SOL",
      image: "🎮",
      category: "Gaming",
      status: "upcoming"
    }
  ]

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

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card key={event.id} className="glass-card spatial-hover group overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="text-4xl mb-2">{event.image}</div>
                <Badge className={getStatusColor(event.status)}>
                  {event.status}
                </Badge>
              </div>
              <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                {event.name}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {event.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Event Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  {event.date}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  {event.time}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  {event.location}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="h-4 w-4 mr-2" />
                  {event.attendees} expected attendees
                </div>
              </div>

              {/* Pricing and Availability */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div>
                  <p className="text-2xl font-bold text-primary">{event.price}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.ticketsAvailable} tickets left
                  </p>
                </div>
                <Button className="bg-gradient-primary neon-glow spatial-hover">
                  Buy Ticket
                </Button>
              </div>

              {/* Category */}
              <Badge variant="outline" className="text-xs">
                {event.category}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center pt-8">
        <Button variant="outline" size="lg" className="spatial-hover">
          Load More Events
        </Button>
      </div>
    </div>
  )
}