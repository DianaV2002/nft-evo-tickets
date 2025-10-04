import { useState } from "react"
import { Calendar, MapPin, Clock, Users, DollarSign, Ticket } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"

type EventFormData = {
  name: string
  description: string
  date: string
  time: string
  location: string
  capacity: number
  ticketPrice: number
  ticketSupply: number
}

export default function CreateEvent() {
  const form = useForm<EventFormData>()
  
  const onSubmit = (data: EventFormData) => {
    console.log("Event data:", data)
    // This will need Supabase integration for storage
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

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Date
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
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
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            Time
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="time"
                              className="glass-input"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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

                  {/* Submit */}
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary neon-glow spatial-hover"
                  >
                    Create Event & Mint Tickets
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                How your event will appear
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="aspect-video bg-gradient-secondary rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Event Image</span>
              </div>
              
              <div>
                <h3 className="font-bold text-lg">Event Name</h3>
                <p className="text-sm text-muted-foreground">Event description will appear here...</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  <span>Date & Time</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  <span>Location</span>
                </div>
                <div className="flex items-center">
                  <Ticket className="h-4 w-4 mr-2 text-primary" />
                  <span>Tickets Available</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}