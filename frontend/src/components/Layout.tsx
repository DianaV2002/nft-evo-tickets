import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { EvoSidebar } from "./EvoSidebar"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen p-8 flex w-full">
        <EvoSidebar />
        <main className="flex-1 relative">
          {/* Top Bar: Only show on mobile */}
          <header className="glass-card border-b border-border/50 sticky top-0 z-10 md:hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <SidebarTrigger className="hover:bg-muted/50 transition-colors duration-200" />
              {/* Remove WalletMultiButton from mobile top bar if not needed */}
            </div>
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}