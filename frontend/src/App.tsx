import { useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import AIChatbot from "./components/AIChatbot";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Marketplace from "./pages/Marketplace";
import Tickets from "./pages/Tickets";
import CreateEvent from "./pages/CreateEvent";
import MyEvents from "./pages/MyEvents";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import Rewards from "./pages/Rewards";
import WalletConnect from "./pages/WalletConnect";
import NotFound from "./pages/NotFound";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useWallet } from "@solana/wallet-adapter-react";

const queryClient = new QueryClient();

const network = WalletAdapterNetwork.Devnet;
const endpoint = "https://api.devnet.solana.com";

function AppRoutes() {
  const { connected } = useWallet();

  return (
    <BrowserRouter>
      {connected ? (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/community" element={<Community />} />
            <Route path="/events" element={<Events />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/my-events" element={<MyEvents />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatbot />
        </Layout>
      ) : (
        <Routes>
          <Route path="*" element={<WalletConnect />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

const App = () => {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </TooltipProvider>
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;