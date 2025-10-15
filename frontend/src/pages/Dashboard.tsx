import { Calendar, Ticket, TrendingUp, Users, Plus, Sparkles, Award, Gift, Share2, Leaf } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { getUserLevel, type UserLevel } from "@/services/levelService"
import { useWallet } from "@solana/wallet-adapter-react"
import meditationBanner from "@/assets/meditation-banner.jpg"

export default function Dashboard() {
  const { publicKey } = useWallet();
  const [myPoints, setMyPoints] = useState<number | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);

  useEffect(() => {
    const fetchMyPoints = async () => {
      try {
        if (publicKey) {
          const walletAddress = publicKey.toBase58();
          const level = await getUserLevel(walletAddress);
          setMyPoints(level.totalPoints);
          setUserLevel(level);
        } else {
          setMyPoints(0);
          setUserLevel(null);
        }
      } catch (error) {
        console.error('Error fetching user points:', error);
        setMyPoints(0);
        setUserLevel(null);
      }
    };

    fetchMyPoints();
  }, [publicKey]);

  const stats = [
    {
      title: "Events Attended",
      value: "24",
      change: "+12%",
      icon: Leaf,
      color: "text-primary"
    },
    {
      title: "Level Points",
      value: myPoints !== null ? myPoints.toLocaleString() : "...",
      change: "+180 this week",
      icon: Sparkles,
      color: "text-accent"
    },
    {
      title: "NFT Collectibles",
      value: "8",
      change: "+3 this month",
      icon: Award,
      color: "text-secondary"
    },
    {
      title: "Referral Earnings",
      value: "3.2 USDT",
      change: "+0.8 USDT",
      icon: Gift,
      color: "text-primary"
    }
  ]

  const upcomingEvents = [
    {
      id: 1,
      name: "Sound Healing Retreat",
      date: "Jan 15, 2025",
      location: "Carpathian Mountains",
      spots: 12,
      gradient: "from-primary/20 to-primary/5"
    },
    {
      id: 2,
      name: "Moonlight Yoga & Meditation",
      date: "Jan 20, 2025",
      location: "Sacred Grove",
      spots: 30,
      gradient: "from-secondary/20 to-secondary/5"
    },
    {
      id: 3,
      name: "Breathwork & Cold Plunge",
      date: "Jan 25, 2025",
      location: "Mountain Lake",
      spots: 8,
      gradient: "from-accent/20 to-accent/5"
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header with Banner */}
      <div className="relative overflow-hidden rounded-3xl h-60">
        <img 
          src={meditationBanner} 
          alt="Your wellness journey" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/30"></div>
        <div className="relative h-full flex flex-col justify-center p-8">
          <h1 className="text-4xl md:text-5xl font-light mb-3 text-foreground">Your Wellness Journey</h1>
          <p className="text-muted-foreground text-lg">
            Track your events, grow mindfully, and unlock your inner peace
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
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${event.gradient} flex items-center justify-center`}>
                  <Calendar className="w-6 h-6 text-foreground/70" />
                </div>
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
              <p className="text-xs opacity-75">3 friends joined • 25 USDT earned</p>
            </div>

            {/* Gamification Badges */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center">
                <Award className="h-4 w-4 mr-2 text-primary" />
                Your Achievements
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/10 rounded-lg p-3 border border-primary/20 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                    <span className="text-lg">{userLevel?.currentLevelData.emoji || '🌱'}</span>
                  </div>
                  <p className="text-xs font-medium">{userLevel?.currentLevelData.name || 'Seed Planter'}</p>
                  <p className="text-xs text-muted-foreground">{myPoints || 0} points</p>
                </div>
                <div className="bg-secondary/10 rounded-lg p-3 border border-secondary/20 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <p className="text-xs font-medium">Dedicated Soul</p>
                  <p className="text-xs text-muted-foreground">10 events</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-3 border border-border/30 text-center opacity-50">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-muted/40 to-muted/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium">Guardian</p>
                  <p className="text-xs text-muted-foreground">15 referrals</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-3 border border-border/30 text-center opacity-50">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-muted/40 to-muted/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                  </div>
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
                Refer 2 more friends to unlock "Community Connector" badge + 20 USDT bonus
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}