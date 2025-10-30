import { TrendingUp, Filter, Grid, List, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UsdcDisplay } from "@/components/ui/usdc-input"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { fetchActiveListings, ListingData } from "@/services/ticketService"
import { fetchEventsByKeys, EventData } from "@/services/eventService"
import { getImageDisplayUrl } from "@/services/imageService"

export default function Marketplace() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [listings, setListings] = useState<(ListingData & { eventData?: EventData })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadListings() {
      try {
        setLoading(true)
        setError(null)

        console.log("🛒 Loading marketplace listings...")
        const activeListings = await fetchActiveListings(connection)
        console.log("🛒 Fetched listings:", activeListings)

        if (activeListings.length > 0) {
          // Get unique event keys from listings
          const eventKeys = [...new Set(activeListings.map(listing => {
            // We need to get the event from the ticket data
            // For now, we'll need to fetch ticket data to get the event
            return null // This will be implemented when we have ticket data
          }))].filter(Boolean)

          if (eventKeys.length > 0) {
            console.log("📅 Loading events for listings...")
            const eventData = await fetchEventsByKeys(connection, eventKeys as string[])
            console.log("📅 Fetched events:", eventData)

            // Map events to listings
            const listingsWithEvents = activeListings.map(listing => ({
              ...listing,
              eventData: eventData.find(event => event.publicKey === listing.ticket) // This needs to be fixed
            }))

            setListings(listingsWithEvents)
          } else {
            setListings(activeListings)
          }
        } else {
          setListings([])
        }
      } catch (err) {
        console.error("Error loading listings:", err)
        setError("Failed to load marketplace listings")
      } finally {
        setLoading(false)
      }
    }

    loadListings()
  }, [connection])

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
          <h1 className="text-4xl font-bold gradient-text">Wellness Ticket Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Discover and collect eco-friendly retreat and wellness experience tickets
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
          <CardTitle>Available Wellness Experiences</CardTitle>
          <CardDescription>Browse and reserve your transformative journey</CardDescription>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading marketplace listings...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tickets available for sale</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later or list your own tickets for sale
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => (
              <div
                key={listing.publicKey}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">🎫</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {listing.eventData?.name || "Unknown Event"}
                      </h3>
                      <Badge variant="outline">
                        Listed
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ticket ID: {listing.ticket.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Seller: {listing.seller.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <UsdcDisplay
                      amount={listing.priceLamports / 1_000_000}
                      className="font-bold text-primary"
                    />
                    <div className="text-xs text-muted-foreground">
                      Listed {new Date(listing.createdAt * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <Button size="sm" className="bg-gradient-primary neon-glow spatial-hover">
                    Buy Now
                  </Button>
                </div>
              </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured Collections */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Popular Retreat Categories
          </CardTitle>
          <CardDescription>
            Most sought-after wellness experiences this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Meditation Retreats', 'Yoga & Movement', 'Nature Immersion'].map((collection, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors spatial-hover">
                <h4 className="font-medium mb-2">{collection}</h4>
                <p className="text-sm text-muted-foreground">Floor: 30 USDT</p>
                <p className="text-sm text-accent">+15% (24h)</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}