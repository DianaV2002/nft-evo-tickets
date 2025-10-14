import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Users, Image, Loader2, X } from "lucide-react"
import { EventData, updateEvent } from "@/services/eventService"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { toast } from "sonner"

interface EditEventDialogProps {
  isOpen: boolean
  onClose: () => void
  event: EventData | null
  onEventUpdated: () => void
}

export default function EditEventDialog({ isOpen, onClose, event, onEventUpdated }: EditEventDialogProps) {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    startTs: 0,
    endTs: 0,
    ticketSupply: 0,
    coverImageUrl: ""
  })

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        startTs: event.startTs,
        endTs: event.endTs,
        ticketSupply: event.ticketSupply,
        coverImageUrl: event.coverImageUrl
      })
    }
  }, [event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.publicKey || !event) {
      console.error("Missing wallet or event:", { wallet: !!wallet.publicKey, event: !!event })
      return
    }

    console.log("Updating event:", {
      eventId: event.eventId,
      formData,
      wallet: wallet.publicKey.toString()
    })

    try {
      setLoading(true)
      
      const tx = await updateEvent(connection, wallet, Number(event.eventId), {
        name: formData.name,
        startTs: formData.startTs,
        endTs: formData.endTs,
        ticketSupply: formData.ticketSupply,
        coverImageUrl: formData.coverImageUrl
      })

      console.log("Event update transaction:", tx)
      toast.success("Event updated successfully!")
      onEventUpdated()
      onClose()
    } catch (error: any) {
      console.error("Error updating event:", error)
      toast.error(`Failed to update event: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toISOString().slice(0, 16)
  }

  const parseDateTime = (dateTimeString: string) => {
    return Math.floor(new Date(dateTimeString).getTime() / 1000)
  }

  if (!event) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Event
          </DialogTitle>
          <DialogDescription>
            Update your event details. Note: You can only edit events that haven't started and have no tickets sold.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter event name"
              required
              maxLength={64}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTs">Start Date & Time</Label>
              <div className="relative">
                <Input
                  id="startTs"
                  type="datetime-local"
                  value={formatDateTime(formData.startTs)}
                  onChange={(e) => handleInputChange("startTs", parseDateTime(e.target.value))}
                  required
                />
                <Clock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTs">End Date & Time</Label>
              <div className="relative">
                <Input
                  id="endTs"
                  type="datetime-local"
                  value={formatDateTime(formData.endTs)}
                  onChange={(e) => handleInputChange("endTs", parseDateTime(e.target.value))}
                  required
                />
                <Clock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Ticket Supply */}
          <div className="space-y-2">
            <Label htmlFor="ticketSupply">Ticket Supply</Label>
            <div className="relative">
              <Input
                id="ticketSupply"
                type="number"
                value={formData.ticketSupply}
                onChange={(e) => handleInputChange("ticketSupply", parseInt(e.target.value) || 0)}
                placeholder="Enter number of tickets"
                required
                min="1"
              />
              <Users className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="coverImageUrl">Cover Image URL</Label>
            <div className="relative">
              <Input
                id="coverImageUrl"
                value={formData.coverImageUrl}
                onChange={(e) => handleInputChange("coverImageUrl", e.target.value)}
                placeholder="Enter image URL (IPFS, HTTP, etc.)"
                maxLength={200}
              />
              <Image className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {formData.coverImageUrl && (
              <div className="mt-2">
                <img
                  src={formData.coverImageUrl}
                  alt="Cover preview"
                  className="w-full h-32 object-cover rounded-lg border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Current Event Info */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Current Event Info</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Event ID:</strong> {event.eventId}</p>
              <p><strong>Tickets Sold:</strong> {event.ticketsSold}</p>
              <p><strong>Authority:</strong> {event.authority.slice(0, 8)}...{event.authority.slice(-8)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Update Event
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
