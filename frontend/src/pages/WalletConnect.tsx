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
import wellnessHero from "@/assets/wellness-hero.jpg";
import eventFeatured from "@/assets/event-featured.jpg";
import member1 from "@/assets/member-1.jpg";
import member2 from "@/assets/member-2.jpg";
import member3 from "@/assets/member-3.jpg";
import member4 from "@/assets/member-4.jpg";

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
    { name: "Sarah M.", image: member1, events: 47, level: "Supernova" },
    { name: "Jordan L.", image: member2, events: 38, level: "Gold" },
    { name: "Maya K.", image: member3, events: 31, level: "Gold" },
    { name: "Alex R.", image: member4, events: 24, level: "Silver" }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Background Image */}
  <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
  <video
    className="absolute inset-0 w-full h-full object-cover"
    autoPlay
    loop
    muted
    playsInline
    preload="auto"
    poster="/wellness-hero.jpg"   // optional fallback image
    aria-hidden="true"
  >
    <source src="/vid.mp4" type="video/mp4" />
    {/* optional: <source src="/wellness-hero.webm" type="video/webm" /> */}
  </video>
</div>
      {/* Gradient Overlay */}
<div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/80"></div>

      {/* Content */}
      <div className="relative z-10 w-full px-4 py-12">
        
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
            <WalletMultiButton className="!bg-gradient-primary hover:opacity-90 transition-opacity !rounded-lg !px-8 !py-6 !text-lg !font-medium">
              Connect Wallet
            </WalletMultiButton>
          </div>
        </div>

        {/* Featured Event Banner */}
        <Card className="glass-card border-none mb-16 overflow-hidden">
          <div className="relative h-64">
            <img 
              src={eventFeatured} 
              alt="Wellness event" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/70 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">Featured Event</Badge>
              <h2 className="text-4xl font-light text-foreground mb-3">Mindful Movement Retreat 2025</h2>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>June 15-17, 2025</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Bali, Indonesia</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>50 mindful souls</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

      

        {/* Most Active Community Members */}
        <div className="mb-16">
          <h2 className="text-3xl font-light mb-8 text-center">Most Active Community Members</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topMembers.map((member) => (
              <Card key={member.name} className="glass-card border-none spatial-hover overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"></div>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="text-lg font-medium mb-2">{member.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{member.events} events attended</p>
                    <Badge className="bg-primary/20 text-primary border-primary/40">{member.level}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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

       
        {/* Transparency & Accessibility */}
            <div className="text-center mb-12">
  <Shield className="w-16 h-16 mx-auto mb-6 text-secondary" />
  <h2 className="text-3xl font-light mb-4">
    Transparent & Accessible for Everyone
  </h2>
  <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
    We believe NFT tickets should be accessible to everyone. That's why we
    support payments in USDC – simple, transparent, and stable. No hidden
    fees, fair pricing, and instant payouts for organisers.
  </p>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
  <Card className="glass-card border-none">
    <CardContent className="p-8 text-center flex flex-col items-center gap-3">
      <DollarSign className="w-8 h-8 text-primary" />
      <p className="text-sm font-medium">USDC Payments</p>
    </CardContent>
  </Card>

  <Card className="glass-card border-none">
    <CardContent className="p-8 text-center flex flex-col items-center gap-3">
      <Zap className="w-8 h-8 text-accent" />
      <p className="text-sm font-medium">Instant Payouts</p>
    </CardContent>
  </Card>

  <Card className="glass-card border-none">
    <CardContent className="p-8 text-center flex flex-col items-center gap-3">
      <Shield className="w-8 h-8 text-secondary" />
      <p className="text-sm font-medium">No Hidden Fees</p>
    </CardContent>
  </Card>
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

       

        {/* Final CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Ready to experience the future of events?</p>
          <WalletMultiButton className="!bg-gradient-primary hover:opacity-90 transition-opacity !rounded-lg !px-8 !py-6 !text-lg !font-medium">
            Connect Wallet
          </WalletMultiButton>
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
