import React, { useState, useRef } from "react"
import { Calendar, MapPin, Clock, Users, DollarSign, Ticket, Loader2, CheckCircle2, Sparkles, Upload, Image, X, Leaf, Zap, Coins } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { UsdcInput, UsdcDisplay } from "@/components/ui/usdc-input"
import { ErrorDisplay, SuccessDisplay } from "@/components/ui/error-display"
import { useForm } from "react-hook-form"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useNavigate } from "react-router-dom"
import { createEvent } from "@/services/eventService"
import { mintTicket } from "@/services/ticketService"
import { recordActivity } from "@/services/levelService"
import { mapError, UserFriendlyError } from "@/utils/errorMapper"
import { usdcToLamportsWithPrice, formatUsdc } from "@/utils/usdcUtils"
import { PublicKey } from "@solana/web3.js"

type EventFormData = {
  name: string
  description: string
  startDateTime: Date | undefined
  endDateTime: Date | undefined
  location: string
  capacity: number | undefined
  ticketPriceUsdc: number | undefined
  ticketSupply: number | undefined
  coverPhoto: File | null
}

export default function CreateEvent() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const navigate = useNavigate()
  const form = useForm<EventFormData>({
    defaultValues: {
      name: "",
      description: "",
      startDateTime: undefined,
      endDateTime: undefined,
      location: "",
      capacity: undefined,
      ticketPriceUsdc: undefined,
      ticketSupply: undefined,
      coverPhoto: null,
    },
    mode: "onChange"
  })
  const [isCreating, setIsCreating] = useState(false)
  const [userError, setUserError] = useState<UserFriendlyError | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [mintingCost, setMintingCost] = useState<number>(0)
  const [carbonFootprintReduced, setCarbonFootprintReduced] = useState<number>(0)

  // Watch form state for validation
  const watchedFields = form.watch()
  const formErrors = form.formState.errors
  const isFormValid = form.formState.isValid
  const isFormDirty = form.formState.isDirty

  // Calculate minting costs and carbon footprint
  const calculateCostsAndImpact = () => {
    const ticketSupply = watchedFields.ticketSupply || 0
    const capacity = watchedFields.capacity || 0
    
    // Calculate minting cost (approximate: $0.01 per NFT + base transaction cost)
    const baseCost = 0.5 // Base transaction cost in USDC
    const perNftCost = 0.01 // Cost per NFT mint
    const totalMintingCost = baseCost + (ticketSupply * perNftCost)
    
    // Calculate carbon footprint reduction (vs traditional paper tickets)
    // Traditional event: ~0.5kg CO2 per attendee (transport, paper, etc.)
    // Blockchain event: ~0.1kg CO2 per attendee (just digital)
    const traditionalFootprint = capacity * 0.5 // kg CO2
    const blockchainFootprint = capacity * 0.1 // kg CO2
    const carbonReduction = traditionalFootprint - blockchainFootprint
    
    setMintingCost(totalMintingCost)
    setCarbonFootprintReduced(carbonReduction)
  }

  // Update calculations when form changes
  React.useEffect(() => {
    calculateCostsAndImpact()
  }, [watchedFields.ticketSupply, watchedFields.capacity])

  const onSubmit = async (data: EventFormData) => {
    if (!wallet.connected) {
      setUserError({
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to continue.',
        suggestion: 'Click the "Connect Wallet" button to get started.',
        type: 'error'
      })
      return
    }

    // Show confirmation dialog with costs and impact
    setShowConfirmation(true)
  }

  const handleConfirmCreation = async (data: EventFormData) => {
    try {
      setIsCreating(true)
      setUserError(null)
      setTxSignature(null)
      setPointsEarned(null)
      setShowConfirmation(false)

      // Validate dates
      if (!data.startDateTime || !data.endDateTime) {
        setUserError({
          title: 'Missing Date Information',
          message: 'Please select both start and end date/time.',
          suggestion: 'Use the date and time pickers to select your event dates.',
          type: 'error'
        })
        return
      }

      // Check if start date is in the past
      const now = new Date()
      if (data.startDateTime <= now) {
        setUserError({
          title: 'Invalid Start Date',
          message: 'Event start date must be in the future.',
          suggestion: 'Please select a start date and time that is after the current time.',
          type: 'error'
        })
        return
      }

      if (data.endDateTime <= data.startDateTime) {
        setUserError({
          title: 'Invalid Date Range',
          message: 'End date/time must be after start date/time.',
          suggestion: 'Please select an end date that comes after the start date.',
          type: 'error'
        })
        return
      }

      // Validate pricing and quantities
      if (!data.ticketPriceUsdc || data.ticketPriceUsdc <= 0) {
        setUserError({
          title: 'Invalid Ticket Price',
          message: 'Ticket price must be greater than $0.',
          suggestion: 'Please enter a valid ticket price (minimum $0.01).',
          type: 'error'
        })
        return
      }

      if (!data.ticketSupply || data.ticketSupply <= 0) {
        setUserError({
          title: 'Invalid Ticket Quantity',
          message: 'Number of tickets must be greater than 0.',
          suggestion: 'Please enter a valid number of tickets to create.',
          type: 'error'
        })
        return
      }

      if (!data.capacity || data.capacity <= 0) {
        setUserError({
          title: 'Invalid Event Capacity',
          message: 'Event capacity must be greater than 0.',
          suggestion: 'Please enter a valid event capacity.',
          type: 'error'
        })
        return
      }

      // Create event on-chain
      const signature = await createEvent(connection, wallet, {
        name: data.name,
        startDate: data.startDateTime,
        endDate: data.endDateTime,
        ticketSupply: data.ticketSupply!,
        coverPhoto: data.coverPhoto,
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

      // Redirect to My Events page after a short delay to show success message
      setTimeout(() => {
        navigate('/my-events')
      }, 3000)
    } catch (err: any) {
      console.error("Failed to create event:", err)
      const friendlyError = mapError(err)
      setUserError(friendlyError)
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
                            placeholder="Name your event..."
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

                  {/* Cover Photo */}
                  <FormField
                    control={form.control}
                    name="coverPhoto"
                    rules={{
                      validate: (value) => {
                        if (value && value.size > 10 * 1024 * 1024) {
                          return "File size must be less than 10MB"
                        }
                        if (value && !value.type.startsWith('image/')) {
                          return "Please select an image file"
                        }
                        return true
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cover Photo</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {field.value ? (
                              <div className="relative">
                                <div className="w-full h-48 rounded-lg overflow-hidden border border-border/50">
                                  <img 
                                    src={URL.createObjectURL(field.value)} 
                                    alt="Cover preview" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => {
                                    field.onChange(null);
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = '';
                                    }
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                                <div className="flex flex-col items-center space-y-4">
                                  <div className="p-4 bg-muted/30 rounded-full">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Upload Cover Photo</p>
                                    <p className="text-xs text-muted-foreground">
                                      PNG, JPG, or WebP up to 10MB
                                    </p>
                                  </div>
                                  <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        // Validate file size (10MB max)
                                        if (file.size > 10 * 1024 * 1024) {
                                          form.setError("coverPhoto", {
                                            type: "manual",
                                            message: "File size must be less than 10MB"
                                          });
                                          return;
                                        }
                                        // Validate file type
                                        if (!file.type.startsWith('image/')) {
                                          form.setError("coverPhoto", {
                                            type: "manual",
                                            message: "Please select an image file"
                                          });
                                          return;
                                        }
                                        field.onChange(file);
                                        form.clearErrors("coverPhoto");
                                      }
                                      // Reset the input value to allow selecting the same file again
                                      if (e.target) {
                                        e.target.value = '';
                                      }
                                    }}
                                    className="hidden"
                                    id="cover-photo-upload"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('cover-photo-upload')?.click()}
                                  >
                                    <Image className="h-4 w-4 mr-2" />
                                    Choose Image
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Start Date & Time */}
                  <FormField
                    control={form.control}
                    name="startDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Start Date & Time
                        </FormLabel>
                        <FormControl>
                          <DateTimePicker
                            date={field.value}
                            onDateChange={field.onChange}
                            placeholder="Select start date and time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* End Date & Time */}
                  <FormField
                    control={form.control}
                    name="endDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          End Date & Time
                        </FormLabel>
                        <FormControl>
                          <DateTimePicker
                            date={field.value}
                            onDateChange={field.onChange}
                            placeholder="Select end date and time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                      rules={{
                        required: "Event capacity is required",
                        min: {
                          value: 1,
                          message: "Capacity must be at least 1"
                        },
                        max: {
                          value: 1000000,
                          message: "Maximum capacity is 1,000,000"
                        },
                        validate: (value) => {
                          if (value <= 0) return "Capacity must be greater than 0"
                          if (!Number.isInteger(value)) return "Capacity must be a whole number"
                          return true
                        }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Event Capacity
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="1"
                              max="1000000"
                              step="1"
                              placeholder="1000"
                              className="glass-input"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(undefined);
                                } else {
                                  const numValue = parseInt(value);
                                  field.onChange(isNaN(numValue) ? undefined : numValue);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ticketPriceUsdc"
                      rules={{
                        required: "Ticket price is required",
                        min: {
                          value: 0.01,
                          message: "Price must be at least $0.01"
                        },
                        max: {
                          value: 10000,
                          message: "Maximum price is $10,000"
                        },
                        validate: (value) => {
                          if (value <= 0) return "Price must be greater than $0"
                          if (value < 0.01) return "Price must be at least $0.01"
                          return true
                        }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <UsdcInput
                              value={field.value}
                              onChange={field.onChange}
                              label="Ticket Price"
                              placeholder="25.00"
                              minAmount={0.01}
                              maxAmount={10000}
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ticketSupply"
                      rules={{
                        required: "Number of tickets is required",
                        min: {
                          value: 1,
                          message: "Must have at least 1 ticket"
                        },
                        max: {
                          value: 100000,
                          message: "Maximum 100,000 tickets allowed"
                        },
                        validate: (value) => {
                          if (value <= 0) return "Number of tickets must be greater than 0"
                          if (!Number.isInteger(value)) return "Number of tickets must be a whole number"
                          return true
                        }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Ticket className="h-4 w-4 mr-2" />
                            Number of Tickets
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              min="1"
                              max="100000"
                              step="1"
                              placeholder="100"
                              className="glass-input"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(undefined);
                                } else {
                                  const numValue = parseInt(value);
                                  field.onChange(isNaN(numValue) ? undefined : numValue);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Cost and Impact Display */}
                  {watchedFields.ticketSupply && watchedFields.capacity && (
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Coins className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-primary">NFT Minting Cost</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Minting Cost</p>
                          <p className="text-2xl font-bold text-primary">
                            ${mintingCost.toFixed(2)} USDC
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${(mintingCost / (watchedFields.ticketSupply || 1)).toFixed(3)} per NFT
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Carbon Footprint Reduced</p>
                          <p className="text-2xl font-bold text-green-600">
                            {carbonFootprintReduced.toFixed(1)} kg CO₂
                          </p>
                          <p className="text-xs text-muted-foreground">
                            vs traditional paper tickets
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-green-700 dark:text-green-300">
                            🌱 You're creating a sustainable event! This blockchain approach reduces environmental impact by {((carbonFootprintReduced / (watchedFields.capacity * 0.5)) * 100).toFixed(0)}% compared to traditional events.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {userError && (
                    <ErrorDisplay
                      error={userError}
                      onRetry={() => {
                        setUserError(null)
                        form.handleSubmit(onSubmit)()
                      }}
                      onDismiss={() => setUserError(null)}
                    />
                  )}

                  {/* Success Display */}
                  {txSignature && (
                    <SuccessDisplay
                      title="Event Created Successfully!"
                      message="Your event is now live on the blockchain! Next step: Visit 'My Events' to mint tickets for your attendees. You'll be redirected shortly."
                      txSignature={txSignature}
                      onDismiss={() => setTxSignature(null)}
                    />
                  )}
                  
                  {/* Points Earned Display */}
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

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary neon-glow spatial-hover"
                    disabled={isCreating || !wallet.connected || !isFormValid || Object.keys(formErrors).length > 0}
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
                {/* Event Image */}
                {watchedFields.coverPhoto ? (
                  <div className="aspect-video relative">
                    <img 
                      src={URL.createObjectURL(watchedFields.coverPhoto)} 
                      alt="Event cover" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        form.watch("startDateTime")
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {form.watch("startDateTime") ? "Upcoming" : "Status"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                    <Ticket className="h-16 w-16 text-primary/40" />
                    <div className="absolute top-2 right-2">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        form.watch("startDateTime")
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {form.watch("startDateTime") ? "Upcoming" : "Status"}
                      </div>
                    </div>
                  </div>
                )}

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
                        {form.watch("startDateTime")
                          ? form.watch("startDateTime")!.toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Start: Select date and time"}
                      </span>
                    </div>

                    {/* End Date & Time */}
                    {form.watch("endDateTime") && (
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {form.watch("endDateTime")
                            ? `Ends ${form.watch("endDateTime")!.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}`
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
                      <UsdcDisplay
                        amount={form.watch("ticketPriceUsdc") || 0}
                        className="text-2xl font-bold text-primary"
                      />
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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Ready to Mint Your NFT Tickets?
            </DialogTitle>
            <DialogDescription>
              Confirm your event details and see the amazing impact you're creating!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Event Summary */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">{watchedFields.name || "Your Event"}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {watchedFields.startDateTime ? 
                      watchedFields.startDateTime.toLocaleDateString() + " " + 
                      watchedFields.startDateTime.toLocaleTimeString() : 
                      "Not set"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{watchedFields.location || "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tickets</p>
                  <p className="font-medium">{watchedFields.ticketSupply || 0} NFTs</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Capacity</p>
                  <p className="font-medium">{watchedFields.capacity || 0} attendees</p>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Minting Cost Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base transaction cost:</span>
                  <span>$0.50 USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>NFT minting ({watchedFields.ticketSupply || 0} × $0.01):</span>
                  <span>${((watchedFields.ticketSupply || 0) * 0.01).toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total cost:</span>
                  <span className="text-primary">${mintingCost.toFixed(2)} USDC</span>
                </div>
              </div>
            </div>

            {/* Environmental Impact */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-700 dark:text-green-300">
                <Leaf className="h-5 w-5" />
                Environmental Impact
              </h4>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {carbonFootprintReduced.toFixed(1)} kg CO₂
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Carbon footprint reduced compared to traditional paper tickets
                  </p>
                </div>
                <div className="bg-white dark:bg-green-800/30 rounded-lg p-3">
                  <p className="text-sm text-green-700 dark:text-green-300 text-center">
                    🌱 <strong>Amazing!</strong> You're reducing environmental impact by{" "}
                    <strong>{((carbonFootprintReduced / (watchedFields.capacity * 0.5)) * 100).toFixed(0)}%</strong>{" "}
                    compared to traditional events. Every NFT ticket helps save the planet! 🌍✨
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowConfirmation(false)}
              >
                Review Details
              </Button>
              <Button 
                className="flex-1 bg-gradient-primary"
                onClick={() => handleConfirmCreation(watchedFields)}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Event...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Mint NFT Tickets!
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}