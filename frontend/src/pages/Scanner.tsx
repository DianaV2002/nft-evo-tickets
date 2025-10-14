import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { QrCode, CheckCircle, XCircle, Clock, User, Calendar, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { EventData } from '@/services/eventService'

interface TicketInfo {
  owner: string
  event: string
  nftMint: string
  seat?: string
  stage: string
  wasScanned: boolean
  eventName?: string
}

export default function Scanner() {
  const { connection } = useConnection()
  const { wallet, connected, publicKey } = useWallet()
  const [events, setEvents] = useState<EventData[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const [qrCodeInput, setQrCodeInput] = useState('')
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null)
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load events for this organizer
  useEffect(() => {
    if (connected && publicKey) {
      loadEvents()
    }
  }, [connected, publicKey])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const { fetchAllEvents } = await import('@/services/eventService')
      // Load all events, not just ones where current wallet is organizer
      const allEvents = await fetchAllEvents(connection)
      // Filter to only show events with version == 1
      const filteredEvents = allEvents.filter(event => event.version === 1)
      setEvents(filteredEvents)
    } catch (error) {
      console.error('Error loading events:', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const validateTicket = async () => {
    if (!qrCodeInput.trim()) {
      toast.error('Please enter a QR code')
      return
    }

    if (!selectedEvent) {
      toast.error('Please select an event first')
      return
    }

    if (!publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    try {
      setScanning(true)
      toast.loading('Validating ticket...')

      // Import the program and validate ticket
      const { Program, AnchorProvider } = await import('@coral-xyz/anchor')
      const idl = await import('@/anchor-idl/nft_evo_tickets.json')
      
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      )

      const program = new Program(idl.default as any, provider) as any

      let nftMint: PublicKey
      try {
        try {
          const qrData = JSON.parse(qrCodeInput.trim())
          if (qrData.nftMint && qrData.type === 'nft-ticket') {
            nftMint = new PublicKey(qrData.nftMint)
          } else {
            throw new Error('Invalid QR data format')
          }
        } catch {
          nftMint = new PublicKey(qrCodeInput.trim())
        }
      } catch {
        toast.error('Invalid QR code format')
        return
      }

      // Derive ticket PDA from NFT mint
      const [ticketPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft-evo-tickets'),
          Buffer.from('ticket'),
          new PublicKey(selectedEvent.publicKey).toBuffer(),
          nftMint.toBuffer(),
        ],
        program.programId
      )

      // Fetch ticket account
      const ticketAccount = await program.account.ticketAccount.fetch(ticketPda)
      
      // Check if ticket belongs to selected event
      if (!ticketAccount.event.equals(new PublicKey(selectedEvent.publicKey))) {
        toast.error('This ticket does not belong to the selected event')
        return
      }

      // Check if current wallet is authorized scanner for this event
      if (publicKey.toString() !== selectedEvent.scanner) {
        toast.error('You are not authorized to scan tickets for this event')
        return
      }

      // Check if ticket is in QR stage
      const stage = Object.keys(ticketAccount.stage)[0]
      if (stage !== 'qr') {
        toast.error(`Ticket is not in QR stage. Current stage: ${stage}`)
        return
      }

      // Check if already scanned
      if (ticketAccount.wasScanned) {
        toast.error('This ticket has already been scanned')
        return
      }

      // Update ticket to scanned stage
      const tx = await program.methods
        .updateTicket({ scanned: {} })
        .accounts({
          signer: publicKey,
          eventAccount: new PublicKey(selectedEvent.publicKey),
          ticketAccount: ticketPda,
          authority: new PublicKey(selectedEvent.authority),
          scanner: new PublicKey(selectedEvent.scanner),
        })
        .rpc()

      toast.dismiss()
      toast.success('Ticket scanned successfully!')
      toast.success(`Transaction: ${tx.slice(0, 8)}...${tx.slice(-8)}`)

      // Update ticket info
      setTicketInfo({
        owner: ticketAccount.owner.toString(),
        event: ticketAccount.event.toString(),
        nftMint: ticketAccount.nftMint.toString(),
        seat: ticketAccount.seat || undefined,
        stage: 'scanned',
        wasScanned: true,
        eventName: selectedEvent.name,
      })

      // Clear QR input
      setQrCodeInput('')

    } catch (error: any) {
      console.error('Error scanning ticket:', error)
      toast.dismiss()
      toast.error(`Scanning failed: ${error.message || 'Unknown error'}`)
    } finally {
      setScanning(false)
    }
  }

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'prestige':
        return <Badge variant="secondary">Prestige</Badge>
      case 'qr':
        return <Badge variant="default">QR Ready</Badge>
      case 'scanned':
        return <Badge variant="outline" className="text-green-600 border-green-600">Scanned</Badge>
      case 'collectible':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Collectible</Badge>
      default:
        return <Badge variant="outline">{stage}</Badge>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Ticket Scanner</h1>
          <p className="text-muted-foreground">
            Scan QR codes to validate tickets for your events
          </p>
        </div>

        {!connected && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to access the scanner
            </AlertDescription>
          </Alert>
        )}

        {connected && (
          <div className="grid gap-6">
            {/* Event Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Select Event
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading events...</div>
                ) : events.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No events found. Create an event first to use the scanner.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {events.map((event) => {
                      const canScan = publicKey && publicKey.toString() === event.scanner
                      return (
                        <div
                          key={event.publicKey}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedEvent?.publicKey === event.publicKey
                              ? 'border-primary bg-primary/5'
                              : canScan
                              ? 'border-border hover:border-primary/50'
                              : 'border-border/50 opacity-60 cursor-not-allowed'
                          }`}
                          onClick={() => canScan && setSelectedEvent(event)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{event.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(event.startTs * 1000).toLocaleString()}
                              </p>
                              {!canScan && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Not authorized to scan
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={event.endTs * 1000 < Date.now() ? 'destructive' : 'default'}>
                                {event.endTs * 1000 < Date.now() ? 'Ended' : 'Active'}
                              </Badge>
                              {canScan && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Can Scan
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scanner Interface */}
            {selectedEvent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Scan Ticket
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="qr-input">QR Code / NFT Mint Address</Label>
                    <Input
                      id="qr-input"
                      placeholder="Enter QR code or NFT mint address"
                      value={qrCodeInput}
                      onChange={(e) => setQrCodeInput(e.target.value)}
                      disabled={scanning}
                    />
                  </div>

                  <Button
                    onClick={validateTicket}
                    disabled={scanning || !qrCodeInput.trim()}
                    className="w-full"
                  >
                    {scanning ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Scan Ticket
                      </>
                    )}
                  </Button>

                  {/* Ticket Info Display */}
                  {ticketInfo && (
                    <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Ticket Information
                      </h3>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">Owner:</span>
                          <span className="font-mono text-xs">{ticketInfo.owner}</span>
                        </div>
                        {ticketInfo.seat && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">Seat:</span>
                            <span>{ticketInfo.seat}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Status:</span>
                          {getStageBadge(ticketInfo.stage)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Event:</span>
                          <span>{ticketInfo.eventName}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
