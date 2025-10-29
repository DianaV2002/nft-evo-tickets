import { useState, useEffect } from "react"
import { TrendingUp, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import {
  fetchActiveListings,
  buyMarketplaceTicket,
  getTicketRarity,
  getTicketStageName,
  type ListingData,
  type TicketData
} from "@/services/ticketService"
import { fetchEventsByKeys, type EventData } from "@/services/eventService"
import { toast } from "sonner"

interface MarketplaceListing extends ListingData {
  ticketData?: TicketData;
  eventData?: EventData;
}

export default function Marketplace() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [buyingTicket, setBuyingTicket] = useState<string | null>(null)

  useEffect(() => {
    loadMarketplaceListings()
  }, [connection])

  const loadMarketplaceListings = async () => {
    try {
      setLoading(true)
      console.log("📋 Fetching marketplace listings...")

      // Fetch all active listings
      const activeListings = await fetchActiveListings(connection)
      console.log(`Found ${activeListings.length} active listings`)

      if (activeListings.length === 0) {
        setListings([])
        setLoading(false)
        return
      }

      // Get unique event public keys
      const eventKeys = [...new Set(
        activeListings
          .filter(l => l.ticketData)
          .map(l => l.ticketData!.event)
      )]

      // Fetch event data
      const eventsMap = await fetchEventsByKeys(connection, eventKeys)

      // Combine listing data with event data
      const enrichedListings: MarketplaceListing[] = activeListings.map(listing => ({
        ...listing,
        eventData: listing.ticketData ? eventsMap.get(listing.ticketData.event) : undefined
      }))

      setListings(enrichedListings)
    } catch (error) {
      console.error("Error loading marketplace listings:", error)
      toast.error("Failed to load marketplace listings")
    } finally {
      setLoading(false)
    }
  }

  const handleBuyTicket = async (listing: MarketplaceListing) => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!listing.ticketData) {
      toast.error("Ticket data not available")
      return
    }

    try {
      setBuyingTicket(listing.publicKey)
      toast.loading("Purchasing ticket from marketplace...")

      const tx = await buyMarketplaceTicket(
        connection,
        wallet,
        new PublicKey(listing.ticket),
        new PublicKey(listing.ticketData.event),
        new PublicKey(listing.seller),
        new PublicKey(listing.ticketData.nftMint)
      )

      toast.success(`Ticket purchased! Transaction: ${tx.slice(0, 8)}...`)

      // Reload listings after purchase
      await loadMarketplaceListings()
    } catch (error: any) {
      console.error("Error buying ticket:", error)
      toast.error(error?.message || "Failed to purchase ticket")
    } finally {
      setBuyingTicket(null)
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

  const formatPrice = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(2)
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
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
            <div className="text-2xl font-bold text-primary">{listings.length}</div>
            <p className="text-sm text-muted-foreground">Active Listings</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-secondary">
              {listings.length > 0 ? (
                `${formatPrice(
                  listings.reduce((sum, l) => sum + l.priceLamports, 0)
                )} SOL`
              ) : '0 SOL'}
            </div>
            <p className="text-sm text-muted-foreground">Total Volume</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent">
              {listings.length > 0 ? (
                `${formatPrice(Math.min(...listings.map(l => l.priceLamports)))} SOL`
              ) : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground">Floor Price</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(listings.map(l => l.ticketData?.event).filter(Boolean)).size}
            </div>
            <p className="text-sm text-muted-foreground">Events Listed</p>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Listings - List View */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Available Tickets</CardTitle>
              <CardDescription>Browse and purchase tickets from the secondary market</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMarketplaceListings}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tickets listed on the marketplace yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later or list your own tickets!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => {
                const ticketData = listing.ticketData
                const eventData = listing.eventData
                const rarity = ticketData ? getTicketRarity(ticketData.stage) : 'Common'

                return (
                  <div
                    key={listing.publicKey}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="text-2xl">🎫</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium group-hover:text-primary transition-colors truncate">
                            {eventData?.name || 'Unknown Event'}
                          </h3>
                          <Badge className={getRarityColor(rarity)}>
                            {rarity}
                          </Badge>
                          {ticketData && (
                            <Badge variant="outline">
                              {getTicketStageName(ticketData.stage)}
                            </Badge>
                          )}
                        </div>
                        {ticketData?.seat && (
                          <p className="text-sm text-muted-foreground">Seat: {ticketData.seat}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Seller: {truncateAddress(listing.seller)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-bold text-primary">
                          {formatPrice(listing.priceLamports)} SOL
                        </div>
                        {listing.expiresAt && (
                          <div className="text-xs text-muted-foreground">
                            Expires: {new Date(listing.expiresAt * 1000).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="bg-gradient-primary neon-glow spatial-hover"
                        onClick={() => handleBuyTicket(listing)}
                        disabled={!wallet.connected || buyingTicket === listing.publicKey}
                      >
                        {buyingTicket === listing.publicKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Buy Now"
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketplace Rules & Info Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Marketplace Guide
          </CardTitle>
          <CardDescription>
            How to buy and sell tickets on the secondary market
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* How It Works */}
          <div>
            <h3 className="font-semibold mb-3">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium mb-2">1. Browse Listings</h4>
                <p className="text-sm text-muted-foreground">
                  Explore available tickets from various events and find the perfect match
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium mb-2">2. Purchase Securely</h4>
                <p className="text-sm text-muted-foreground">
                  Buy tickets with SOL through secure blockchain transactions
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium mb-2">3. List Your Tickets</h4>
                <p className="text-sm text-muted-foreground">
                  Sell tickets you can't use at QR or Collectible stage
                </p>
              </div>
            </div>
          </div>

          {/* Listing Rules */}
          <div className="border-t border-border/50 pt-6">
            <h3 className="font-semibold mb-3">Who Can List Tickets?</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-2xl">👤</div>
                <div className="flex-1">
                  <h4 className="font-medium text-blue-600 dark:text-blue-400">Event Organizers</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Can place tickets on marketplace at any time if they want to sell excess inventory or promotional tickets
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-2xl">🎫</div>
                <div className="flex-1">
                  <h4 className="font-medium text-green-600 dark:text-green-400">Event Attendees</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Can list tickets when they reach <strong>QR Stage</strong> (ready for entry) or <strong>Collectible Stage</strong> (post-event memorabilia) with custom pricing
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="border-t border-border/50 pt-6">
            <h3 className="font-semibold mb-3">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start space-x-2">
                <div className="text-green-500 mt-0.5">✓</div>
                <div className="text-sm">
                  <strong>Custom Pricing:</strong> Sellers set their own prices in SOL
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="text-green-500 mt-0.5">✓</div>
                <div className="text-sm">
                  <strong>Secure Escrow:</strong> NFTs held safely until sold or canceled
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="text-green-500 mt-0.5">✓</div>
                <div className="text-sm">
                  <strong>5% Fee:</strong> Marketplace fee goes to event organizer
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="text-green-500 mt-0.5">✓</div>
                <div className="text-sm">
                  <strong>Cancel Anytime:</strong> Sellers can unlist tickets freely
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="border-t border-border/50 pt-6">
            <h3 className="font-semibold mb-3">Important Notes</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-500 mt-0.5">⚠️</div>
                <p>Prestige stage tickets cannot be listed by attendees (not yet activated)</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="text-yellow-500 mt-0.5">⚠️</div>
                <p>Scanned tickets cannot be listed (already used for entry)</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="text-blue-500 mt-0.5">ℹ️</div>
                <p>All transactions are recorded on the Solana blockchain for transparency</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}