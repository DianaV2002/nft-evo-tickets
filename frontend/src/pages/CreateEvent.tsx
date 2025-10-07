import { useState } from "react"
import { Calendar, MapPin, Clock, Users, DollarSign, Ticket, Loader2, CheckCircle2, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { createEvent } from "@/services/eventService"
import { recordActivity } from "@/services/levelService"

type EventFormData = {
  name: string
  description: string
  date: string
  time: string
  endDate: string
  endTime: string
  location: string
  capacity: number
  ticketPrice: number
  ticketSupply: number
}

export default function CreateEvent() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const form = useForm<EventFormData>()
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)

  const onSubmit = async (data: EventFormData) => {
    if (!wallet.connected) {
      setCreateError("Please connect your wallet first")
      return
    }

    try {
      setIsCreating(true)
      setCreateError(null)
      setTxSignature(null)
      setPointsEarned(null)

      // Combine date and time
      const startDateTime = new Date(`${data.date}T${data.time}`)
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`)

      // Validate dates
      if (endDateTime <= startDateTime) {
        setCreateError("End date/time must be after start date/time")
        return
      }

      // Create event on-chain
      const signature = await createEvent(connection, wallet, {
        name: data.name,
        startDate: startDateTime,
        endDate: endDateTime,
      })

      setTxSignature(signature)
      console.log("Event created successfully:", signature)

      // Record activity to instantly update user level
      try {
        const walletAddress = wallet.publicKey!.toBase58()
        const result = await recordActivity(
          walletAddress,
          'EVENT_CREATED',
          signature,
          { eventName: data.name }
        )

        if (result.success) {
          setPointsEarned(result.pointsEarned)
          console.log(`Points earned: +${result.pointsEarned}, New total: ${result.newTotal}`)
        }
      } catch (activityError) {
        console.error('Failed to record activity (but event was created):', activityError)
        // Don't fail the entire operation if activity recording fails
      }

      // Reset form after successful creation
      form.reset()

      // Refresh the page after a short delay to show success message
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      console.error("Failed to create event:", err)
      setCreateError(err.message || "Failed to create event on blockchain")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold gradient-text">Create Event</h1>
        <p className="text-muted-foreground mt-2">
          Set up your event and create NFT tickets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>
                Enter the information for your event and ticket configuration
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Event Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Neon Nights Festival" 
                            className="glass-input"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your event..."
                            className="glass-input resize-none"
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Start Date & Time */}
                  <div className="space-y-2">
                    <Label>Start Date & Time</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="date"
                                className="glass-input"
                                {...field}
                                required
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="time"
                                className="glass-input"
                                {...field}
                                required
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div className="space-y-2">
                    <Label>End Date & Time</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="date"
                                className="glass-input"
                                {...field}
                                required
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="time"
                                className="glass-input"
                                {...field}
                                required
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          Location
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Event venue or address"
                            className="glass-input"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Capacity & Pricing */}
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Capacity
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="1000"
                              className="glass-input"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ticketPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Price (SOL)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              placeholder="0.5"
                              className="glass-input"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ticketSupply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Ticket className="h-4 w-4 mr-2" />
                            Tickets
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="500"
                              className="glass-input"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Error Display */}
                  {createError && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{createError}</p>
                    </div>
                  )}

                  {/* Success Display */}
                  {txSignature && (
                    <div className="space-y-3">
                      <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-accent mb-1">Event created successfully!</p>
                            <p className="text-xs text-muted-foreground break-all">
                              Transaction: {txSignature.slice(0, 8)}...{txSignature.slice(-8)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {pointsEarned !== null && (
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-primary mb-1">
                               +{pointsEarned} points earned!
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary neon-glow spatial-hover"
                    disabled={isCreating || !wallet.connected}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Event on Blockchain...
                      </>
                    ) : !wallet.connected ? (
                      "Connect Wallet to Create Event"
                    ) : (
                      "Create Event on Blockchain"
                    )}
                  </Button>

                  {!wallet.connected && (
                    <p className="text-xs text-center text-muted-foreground">
                      Please connect your wallet to create events on the Solana blockchain
                    </p>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                How your event will appear to attendees
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Event Card Preview */}
              <div className="border border-border/50 rounded-lg overflow-hidden">
                {/* Event Image Placeholder */}
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                  <Ticket className="h-16 w-16 text-primary/40" />
                  <div className="absolute top-2 right-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      form.watch("date") && form.watch("time")
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {form.watch("date") && form.watch("time") ? "Upcoming" : "Status"}
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg line-clamp-2">
                      {form.watch("name") || "Your Event Name"}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {form.watch("description") || "Event description will appear here..."}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    {/* Start Date & Time */}
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>
                        {form.watch("date") && form.watch("time")
                          ? `${new Date(form.watch("date")).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })} at ${form.watch("time")}`
                          : "Start: Select date and time"}
                      </span>
                    </div>

                    {/* End Date & Time */}
                    {(form.watch("endDate") || form.watch("endTime")) && (
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {form.watch("endDate") && form.watch("endTime")
                            ? `Ends ${new Date(form.watch("endDate")).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })} at ${form.watch("endTime")}`
                            : "End: Select date and time"}
                        </span>
                      </div>
                    )}

                    {/* Location */}
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {form.watch("location") || "Event location"}
                      </span>
                    </div>

                    {/* Capacity */}
                    {form.watch("capacity") && (
                      <div className="flex items-center text-muted-foreground">
                        <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{form.watch("capacity")} attendees capacity</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing & Tickets */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {form.watch("ticketPrice")
                          ? `${form.watch("ticketPrice")} SOL`
                          : "0.0 SOL"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {form.watch("ticketSupply") || 0} tickets available
                      </p>
                    </div>
                    <Button className="bg-gradient-primary neon-glow" size="sm" disabled>
                      Buy Ticket
                    </Button>
                  </div>
                </div>
              </div>

              {/* Blockchain Info */}
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-start gap-2">
                  <Ticket className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-primary mb-1">Blockchain Event</p>
                    <p className="text-muted-foreground">
                      This event will be created on the Solana blockchain. Once created, it cannot be deleted.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}