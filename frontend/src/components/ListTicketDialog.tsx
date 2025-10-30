import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UsdcInput } from "@/components/ui/usdc-input";
import { Loader2, DollarSign } from "lucide-react";
import { listTicket, TicketData } from "@/services/ticketService";
import { toast } from "sonner";

interface ListTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketData | null;
  onSuccess?: () => void;
}

export default function ListTicketDialog({ 
  open, 
  onOpenChange, 
  ticket, 
  onSuccess 
}: ListTicketDialogProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [price, setPrice] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !wallet.publicKey) return;

    setLoading(true);
    try {
      const priceLamports = Math.floor(price * 1_000_000); // Convert USDC to lamports (assuming 6 decimals)
      const expiresTimestamp = expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : undefined;
      
      // Validate expiration time
      if (expiresTimestamp && expiresTimestamp <= Math.floor(Date.now() / 1000)) {
        toast.error("Expiration time must be in the future");
        return;
      }
      
      console.log("Listing ticket with:", {
        priceLamports,
        expiresTimestamp,
        currentTime: Math.floor(Date.now() / 1000)
      });

      const signature = await listTicket(
        connection,
        wallet,
        ticket.publicKey,
        priceLamports,
        expiresTimestamp
      );

      toast.success("Ticket listed successfully!", {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error listing ticket:", error);
      toast.error("Failed to list ticket", {
        description: error.message || "An error occurred while listing the ticket",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            List Ticket for Sale
          </DialogTitle>
          <DialogDescription>
            List your ticket on the marketplace for other users to purchase.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price (USDC)</Label>
            <UsdcInput
              value={price}
              onChange={setPrice}
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Expires At (Optional)</Label>
            <Input
              id="expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              Leave empty for no expiration
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || price <= 0}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              List Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
