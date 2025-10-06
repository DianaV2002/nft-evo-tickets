import { Calendar, Ticket, TrendingUp, Users, Plus, Sparkles, Award, Gift, Share2, Leaf } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { getUserLevel } from "@/services/levelService"
import { useWallet } from "@solana/wallet-adapter-react"

export default function Dashboard() {
  const { publicKey } = useWallet();
  const [myPoints, setMyPoints] = useState<number | null>(null);

  useEffect(() => {
    const fetchMyPoints = async () => {
      try {
        if (publicKey) {
          const walletAddress = publicKey.toBase58();
          const userLevel = await getUserLevel(walletAddress);
          setMyPoints(userLevel.totalPoints);
        } else {
          setMyPoints(0);
        }
      } catch (error) {
        console.error('Error fetching user points:', error);
        setMyPoints(0);
      }
    };

    fetchMyPoints();
  }, [publicKey]);

  const stats = [
    {
      title: "Wellness Events",
      value: "24",
      change: "+12%",
      icon: Leaf,
      color: "text-primary"
    },
    {
      title: "Experiences Attended",
      value: "8",
      change: "+3 this month",
      icon: Calendar,
      color: "text-accent"
    },
    {
      title: "Community Points",
      value: myPoints !== null ? myPoints.toLocaleString() : "...",
      change: "+180 this week",
      icon: Sparkles,
      color: "text-secondary"
    },
    {
      title: "Referral Rewards",
      value: "3.2 SOL",
      change: "+0.8 SOL",
      icon: Gift,
      color: "text-primary"
    }
  ]

  const upcomingEvents = [
    {
      id: 1,
      name: "Forest Sound Healing Retreat",
      date: "Jan 15, 2025",
      location: "Carpathian Mountains",
      spots: 12,
      image: "🌲"
    },
    {
      id: 2,
      name: "Moonlight Yoga & Meditation",
      date: "Jan 20, 2025",
      location: "Sacred Grove",
      spots: 30,
      image: "🌙"
    },
    {
      id: 3,
      name: "Breathwork & Cold Plunge",
      date: "Jan 25, 2025",
      location: "Mountain Lake",
      spots: 8,
      image: "❄️"
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Your Wellness Journey</h1>
          <p className="text-muted-foreground mt-2">
            Transform through authentic experiences and community connection
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="glass-card spatial-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-accent">
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Events & Referral Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Wellness Events */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              Upcoming Experiences
            </CardTitle>
            <CardDescription>
              Your next wellness journeys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/30 transition-colors duration-200 spatial-hover">
                <div className="text-2xl">{event.image}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{event.name}</p>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">{event.spots} spots</p>
                  <p className="text-xs text-muted-foreground">{event.date}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Referral & Gamification Zone */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="h-5 w-5 mr-2 text-accent" />
              Grow the Community
            </CardTitle>
            <CardDescription>
              Share wellness, earn rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Referral Stats */}
            <div className="bg-gradient-primary rounded-xl p-4 text-primary-foreground">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Your Referral Code</span>
                <Share2 className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold mb-1">WELLNESS2024</p>
              <p className="text-xs opacity-75">3 friends joined • 0.8 SOL earned</p>
            </div>

            {/* Gamification Badges */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center">
                <Award className="h-4 w-4 mr-2 text-primary" />
                Your Achievements
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <div className="text-2xl mb-1">🌱</div>
                  <p className="text-xs font-medium">Seed Planter</p>
                  <p className="text-xs text-muted-foreground">5 referrals</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <div className="text-2xl mb-1">🧘</div>
                  <p className="text-xs font-medium">Dedicated Soul</p>
                  <p className="text-xs text-muted-foreground">10 events</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center opacity-50">
                  <div className="text-2xl mb-1">🌳</div>
                  <p className="text-xs font-medium">Forest Guardian</p>
                  <p className="text-xs text-muted-foreground">15 referrals</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center opacity-50">
                  <div className="text-2xl mb-1">✨</div>
                  <p className="text-xs font-medium">Light Keeper</p>
                  <p className="text-xs text-muted-foreground">25 events</p>
                </div>
              </div>
            </div>

            {/* Rewards Progress */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Next Reward</span>
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div className="bg-gradient-primary h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-muted-foreground">
                Refer 2 more friends to unlock "Community Connector" badge + 0.5 SOL bonus
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}