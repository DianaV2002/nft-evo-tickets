import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Ticket, 
  TrendingUp, 
  Award, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Users,
  CheckCircle2,
  Zap,
  Shield,
  Leaf,
  DollarSign,
  Rocket,
  Star,
  Crown,
  Globe
} from "lucide-react";

export default function WalletConnect() {
  const { connected } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (connected) {
      navigate("/");
    }
  }, [connected, navigate]);

  const gamificationLevels = [
    { name: "Bronze", icon: Award, color: "text-orange-400", perks: ["Basic access", "Event discovery"] },
    { name: "Silver", icon: Star, color: "text-gray-300", perks: ["5% discounts", "Early access"] },
    { name: "Gold", icon: Crown, color: "text-yellow-400", perks: ["10% discounts", "VIP support", "Exclusive events"] },
    { name: "Supernova", icon: Sparkles, color: "text-purple-400", perks: ["15% discounts", "Backstage access", "Rare NFTs", "Partner perks"] }
  ];

  const organizerPlans = [
    {
      name: "Freemium",
      price: "Free",
      description: "Perfect for getting started",
      features: [
        "Up to 5 events",
        "Basic analytics",
        "Standard support",
        "NFT ticketing"
      ]
    },
    {
      name: "Growth",
      price: "€200/year",
      description: "For growing event organizers",
      features: [
        "Unlimited events",
        "Advanced analytics",
        "Custom branding",
        "Priority support",
        "Marketing tools"
      ],
      popular: true
    },
    {
      name: "Supernova",
      price: "Custom",
      description: "For large-scale events & festivals",
      features: [
        "White-label solution",
        "Dedicated account manager",
        "API access",
        "International support",
        "Custom integrations"
      ]
    }
  ];

  const topMembers = [
    { name: "Alex Thunder", avatar: "⚡", events: 47, level: "Supernova" },
    { name: "Luna Beats", avatar: "🎵", events: 38, level: "Gold" },
    { name: "Rio Vibe", avatar: "🌊", events: 31, level: "Gold" },
    { name: "Nova Star", avatar: "✨", events: 24, level: "Silver" }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20"
      >
        <source src="/vid-bg.mp4" type="video/mp4" />
      </video>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background"></div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
            <Ticket className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Evo Tickets</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-light mb-6 gradient-text">
            The Future of Events:<br />Tickets that Unlock More
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto font-light">
            Buy, collect, resell, and level up with NFT-powered tickets
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <WalletMultiButton className="!bg-gradient-primary hover:opacity-90 transition-opacity !rounded-lg !px-8 !py-6 !text-lg !font-medium" />
            <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
              Organise Your Event
            </Button>
          </div>
        </div>

        {/* Featured Event Banner */}
        <Card className="glass-card border-none mb-16 overflow-hidden">
          <div className="relative h-64 bg-gradient-primary">
            <div className="absolute inset-0 flex items-center justify-center text-9xl opacity-20">
              🎪
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <Badge className="mb-3 bg-accent/20 text-accent border-accent/30">Featured Event</Badge>
              <h2 className="text-4xl font-light text-foreground mb-3">Electric Dreams Festival 2025</h2>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>June 15-17, 2025</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Transylvania, Romania</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>5,000 attendees</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Gamification Section */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-light mb-4">Level Up Your Experience</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Earn points and unlock exclusive perks by attending events and collecting rare tickets
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gamificationLevels.map((level) => (
              <Card key={level.name} className="glass-card border-none spatial-hover">
                <CardContent className="p-6 text-center">
                  <level.icon className={`w-12 h-12 mx-auto mb-4 ${level.color}`} />
                  <h3 className="text-xl font-medium mb-3">{level.name}</h3>
                  <ul className="text-sm text-muted-foreground space-y-2 text-left">
                    {level.perks.map((perk, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Most Active Community Members */}
        <div className="mb-16">
          <h2 className="text-3xl font-light mb-8 text-center">Most Active Community Members</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topMembers.map((member) => (
              <Card key={member.name} className="glass-card border-none spatial-hover">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl mb-3">{member.avatar}</div>
                  <h3 className="text-lg font-medium mb-2">{member.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{member.events} events attended</p>
                  <Badge className="bg-primary/20 text-primary border-primary/30">{member.level}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Organiser Plans */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-light mb-4">For Event Organizers</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Set up your event in minutes, sell tickets globally, and track everything on-chain – fast, secure, and transparent
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {organizerPlans.map((plan) => (
              <Card key={plan.name} className={`glass-card border-none spatial-hover ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-8">
                  {plan.popular && (
                    <Badge className="mb-4 bg-primary text-primary-foreground">Most Popular</Badge>
                  )}
                  <h3 className="text-2xl font-light mb-2">{plan.name}</h3>
                  <p className="text-3xl font-medium mb-2 gradient-text">{plan.price}</p>
                  <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    {plan.price === "Custom" ? "Contact Us" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Transparency & Accessibility */}
        <Card className="glass-card border-none mb-16">
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 text-secondary" />
            <h2 className="text-3xl font-light mb-4">Transparent & Accessible for Everyone</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              We believe NFT tickets should be accessible to everyone. That's why we support payments in USDC – simple, transparent, and stable. No hidden fees, fair pricing, and instant payouts for organisers.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex flex-col items-center gap-2">
                <DollarSign className="w-8 h-8 text-primary" />
                <p className="text-sm font-medium">USDC Payments</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Zap className="w-8 h-8 text-accent" />
                <p className="text-sm font-medium">Instant Payouts</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Shield className="w-8 h-8 text-secondary" />
                <p className="text-sm font-medium">No Hidden Fees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eco-Friendly Section */}
        <Card className="glass-card border-none mb-16 overflow-hidden">
          <div className="bg-gradient-secondary p-12 text-center">
            <Leaf className="w-16 h-16 mx-auto mb-6 text-primary-foreground" />
            <h2 className="text-3xl font-light mb-4 text-primary-foreground">Blockchain, but make it green</h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-6">
              Evo Tickets runs on Solana: faster, cheaper, and more eco-friendly than Ethereum. Sustainable by design, powered by innovation.
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-primary-foreground/90">
              <div className="flex flex-col items-center">
                <Zap className="w-8 h-8 mb-2" />
                <p className="text-sm">Ultra Fast</p>
              </div>
              <div className="flex flex-col items-center">
                <DollarSign className="w-8 h-8 mb-2" />
                <p className="text-sm">Low Fees</p>
              </div>
              <div className="flex flex-col items-center">
                <Leaf className="w-8 h-8 mb-2" />
                <p className="text-sm">Eco-Friendly</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Community Benefits */}
        <div className="text-center mb-12">
          <Globe className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h2 className="text-4xl font-light mb-4">More Than Just Tickets</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Evo Tickets is a community of events, starting with wellness and festivals. Discover events, unlock perks, keep lifelong collectibles – while organizers grow loyal audiences, gamify engagement, and reduce fraud with on-chain transparency.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="glass-card border-none">
              <CardContent className="p-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-medium mb-3">For Attendees</h3>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Discover amazing events</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Unlock exclusive perks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Keep lifelong collectibles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Level up and earn rewards</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="glass-card border-none">
              <CardContent className="p-8">
                <Rocket className="w-12 h-12 mx-auto mb-4 text-accent" />
                <h3 className="text-xl font-medium mb-3">For Organisers</h3>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Grow loyal audiences</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Gamify fan engagement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Reduce fraud with blockchain</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span>Track everything on-chain</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Ready to experience the future of events?</p>
          <WalletMultiButton className="!bg-gradient-primary hover:opacity-90 transition-opacity !rounded-lg !px-8 !py-6 !text-lg !font-medium" />
          <p className="text-sm text-muted-foreground mt-4">
            Don't have a wallet?{" "}
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Download Phantom
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
