import { Ticket, Calendar, MapPin, QrCode, Share2, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UsdcDisplay } from "@/components/ui/usdc-input"

export default function Tickets() {
  const myTickets = [
    {
      id: 1,
      eventName: "Neon Nights Festival",
      ticketType: "VIP Pass",
      date: "December 15, 2024",
      location: "Bucharest Arena",
      purchasePriceUsdc: 80,
      currentValueUsdc: 120,
      status: "active",
      qrCode: "QR123456",
      image: "🎫",
      rarity: "Rare"
    },
    {
      id: 2,
      eventName: "Digital Dreams Conference",
      ticketType: "General Admission",
      date: "December 20, 2024",
      location: "Virtual Reality Space",
      purchasePriceUsdc: 30,
      currentValueUsdc: 40,
      status: "active",
      qrCode: "QR789012",
      image: "🎟️",
      rarity: "Common"
    },
    {
      id: 3,
      eventName: "Retro Gaming Night",
      ticketType: "Early Bird",
      date: "November 30, 2024",
      location: "Game Center",
      purchasePriceUsdc: 20,
      currentValueUsdc: 20,
      status: "used",
      qrCode: "QR345678",
      image: "🎮",
      rarity: "Common"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-accent text-accent-foreground'
      case 'used': return 'bg-muted text-muted-foreground'
      case 'expired': return 'bg-destructive text-destructive-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

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

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{myTickets.length}</div>
            <p className="text-sm text-muted-foreground">Total Tickets</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-secondary">1.3 SOL</div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent">1.8 SOL</div>
            <p className="text-sm text-muted-foreground">Current Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {myTickets.map((ticket) => (
          <Card key={ticket.id} className="glass-card spatial-hover group">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="text-4xl mb-2">{ticket.image}</div>
                <div className="flex flex-col space-y-1">
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                  <Badge className={getRarityColor(ticket.rarity)}>
                    {ticket.rarity}
                  </Badge>
                </div>
              </div>
              <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                {ticket.eventName}
              </CardTitle>
              <CardDescription>
                {ticket.ticketType}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Event Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  {ticket.date}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  {ticket.location}
                </div>
              </div>

              {/* Price Info */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Purchase Price</span>
                  <UsdcDisplay
                    amount={ticket.purchasePriceUsdc}
                    className="text-sm"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Value</span>
                  <UsdcDisplay
                    amount={ticket.currentValueUsdc}
                    className="text-sm font-medium text-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                {ticket.status === 'active' && (
                  <>
                    <Button variant="outline" size="sm" className="flex-1 spatial-hover">
                      <QrCode className="h-4 w-4 mr-1" />
                      View QR
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 spatial-hover">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Sell
                    </Button>
                  </>
                )}
                {ticket.status === 'used' && (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Event Completed
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State for new users */}
      {myTickets.length === 0 && (
        <Card className="glass-card">
          <CardContent className="text-center py-12">
            <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your journey by purchasing your first NFT ticket
            </p>
            <Button className="bg-gradient-primary neon-glow">
              Browse Events
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}