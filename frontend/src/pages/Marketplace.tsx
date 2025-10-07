import { TrendingUp, Filter, Grid, List } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UsdcDisplay } from "@/components/ui/usdc-input"

export default function Marketplace() {
  const tickets = [
    {
      id: 1,
      eventName: "Neon Nights Festival",
      ticketType: "VIP Pass",
      originalPriceUsdc: 80,
      currentPriceUsdc: 120,
      seller: "CryptoMusicFan",
      rarity: "Rare",
      image: "🎫",
      verified: true
    },
    {
      id: 2,
      eventName: "Digital Dreams",
      ticketType: "General Admission",
      originalPriceUsdc: 30,
      currentPriceUsdc: 40,
      seller: "TechGuru2024",
      rarity: "Common",
      image: "🎟️",
      verified: true
    },
    {
      id: 3,
      eventName: "Cyberpunk Exhibition",
      ticketType: "Artist Pass",
      originalPriceUsdc: 50,
      currentPriceUsdc: 70,
      seller: "ArtLover99",
      rarity: "Epic",
      image: "🎨",
      verified: false
    }
  ]

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
          <h1 className="text-4xl font-bold gradient-text">NFT Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Buy, sell, and trade event tickets as NFTs
          </p>
        </div>
        
  
      </div>

      {/* Marketplace Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">1,247</div>
            <p className="text-sm text-muted-foreground">Active Listings</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-secondary">$89,200</div>
            <p className="text-sm text-muted-foreground">Volume (24h)</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent">$45</div>
            <p className="text-sm text-muted-foreground">Floor Price</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">45</div>
            <p className="text-sm text-muted-foreground">Events Listed</p>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Listings - List View */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Available Tickets</CardTitle>
          <CardDescription>Browse and purchase event tickets</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-all duration-300 spatial-hover group"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{ticket.image}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {ticket.eventName}
                      </h3>
                      <Badge className={getRarityColor(ticket.rarity)}>
                        {ticket.rarity}
                      </Badge>
                      {ticket.verified && (
                        <Badge variant="outline">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{ticket.ticketType}</p>
                    <p className="text-xs text-muted-foreground">Seller: {ticket.seller}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <UsdcDisplay
                      amount={ticket.currentPriceUsdc}
                      className="font-bold text-primary"
                    />
                    <div className="text-xs text-muted-foreground line-through">
                      <UsdcDisplay
                        amount={ticket.originalPriceUsdc}
                        showSymbol={true}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  
                  <Button size="sm" className="bg-gradient-primary neon-glow spatial-hover">
                    Buy Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Featured Collections */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Trending Collections
          </CardTitle>
          <CardDescription>
            Most popular ticket collections this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Music Festivals', 'Tech Conferences', 'Art Exhibitions'].map((collection, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors spatial-hover">
                <h4 className="font-medium mb-2">{collection}</h4>
                <p className="text-sm text-muted-foreground">Floor: 0.3 SOL</p>
                <p className="text-sm text-accent">+15% (24h)</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}