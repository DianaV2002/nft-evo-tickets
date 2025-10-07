import { Gift, Award, Share2, Sparkles, TrendingUp, Users, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function Rewards() {
  const [copied, setCopied] = useState(false);

  const referralCode = "WELLNESS2024";
  
  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const levels = [
    { name: "Seed Planter", points: 0, icon: "🌱", color: "text-primary" },
    { name: "Root Grower", points: 500, icon: "🌿", color: "text-accent" },
    { name: "Bloom Tender", points: 1000, icon: "🌸", color: "text-secondary" },
    { name: "Forest Guardian", points: 2000, icon: "🌳", color: "text-primary" },
    { name: "Nature Sage", points: 5000, icon: "🍃", color: "text-accent" }
  ];

  const currentPoints = 1247;
  const currentLevel = levels.findIndex(l => l.points > currentPoints) - 1;
  const nextLevel = levels[currentLevel + 1];
  const progressToNext = nextLevel 
    ? ((currentPoints - levels[currentLevel].points) / (nextLevel.points - levels[currentLevel].points)) * 100
    : 100;

  const rewards = [
    {
      type: "Referral Bonus",
      description: "Friend joined and attended first event",
      amount: "+20 USDT bonus",
      points: "+100 pts",
      date: "2 days ago",
      icon: "🎁"
    },
    {
      type: "Event Attendance",
      description: "Completed Forest Sound Healing Retreat",
      amount: "",
      points: "+50 pts",
      date: "1 week ago",
      icon: "✅"
    },
    {
      type: "Community Engagement",
      description: "Shared event with 5 friends",
      amount: "",
      points: "+30 pts",
      date: "2 weeks ago",
      icon: "💚"
    }
  ];

  const perks = [
    {
      title: "Early Access",
      description: "Get first pick on new retreat launches",
      unlocked: true
    },
    {
      title: "Exclusive Discounts",
      description: "15% off all wellness experiences",
      unlocked: true
    },
    {
      title: "VIP Gatherings",
      description: "Invite-only community events",
      unlocked: false
    },
    {
      title: "Free Hosting",
      description: "Host your own event for free",
      unlocked: false
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-primary opacity-30"></div>
        <div className="relative p-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-5xl font-light mb-4 text-foreground">Rewards & Growth</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
            Every connection you make, every experience you share, nurtures our collective garden
          </p>
        </div>
      </div>

      {/* Level Progress */}
      <Card className="glass-card border-none overflow-hidden">
        <div className="bg-gradient-secondary p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-primary-foreground/70 mb-1 uppercase tracking-wider">Current Level</p>
              <h2 className="text-3xl font-light text-primary-foreground">
                {levels[currentLevel].icon} {levels[currentLevel].name}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-foreground/70 mb-1 uppercase tracking-wider">Points</p>
              <p className="text-3xl font-light text-primary-foreground">{currentPoints}</p>
            </div>
          </div>

          {nextLevel && (
            <>
              <div className="w-full bg-background/20 rounded-full h-3 mb-2">
                <div 
                  className="bg-primary-foreground h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%` }}
                ></div>
              </div>
              <p className="text-sm text-primary-foreground/70 text-center">
                {nextLevel.points - currentPoints} points until {nextLevel.name}
              </p>
            </>
          )}
        </div>

        <CardContent className="p-6">
          <h3 className="text-lg font-light mb-4">All Levels</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {levels.map((level, idx) => (
              <div 
                key={idx}
                className={`text-center p-4 rounded-xl border transition-all duration-300 ${
                  idx <= currentLevel
                    ? 'bg-muted/30 border-primary/30 spatial-hover'
                    : 'bg-muted/10 border-border/50 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{level.icon}</div>
                <p className={`text-sm font-medium ${level.color}`}>{level.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{level.points} pts</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Referral Program */}
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-light">
              <Share2 className="w-6 h-6 text-primary" />
              Referral Program
            </CardTitle>
            <CardDescription className="font-light">
              Invite friends and grow together
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Referral Code */}
            <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground">
              <p className="text-sm opacity-90 mb-2 uppercase tracking-wider">Your Referral Code</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-light">{referralCode}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyReferralCode}
                  className="bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/30"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Referral Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-xl p-4 text-center border border-border/50">
                <p className="text-3xl font-light text-primary mb-1">8</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Friends Referred</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center border border-border/50">
                <p className="text-3xl font-light text-accent mb-1">3.2</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">SOL Earned</p>
              </div>
            </div>

            {/* Referral Rewards */}
            <div className="space-y-2">
              <h4 className="text-sm font-light uppercase tracking-wider text-muted-foreground">Earn Rewards</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🌱</div>
                    <div>
                      <p className="text-sm font-medium">Friend Signs Up</p>
                      <p className="text-xs text-muted-foreground">They create account</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-accent/30 text-accent">+50 pts</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🎫</div>
                    <div>
                      <p className="text-sm font-medium">First Event Attended</p>
                      <p className="text-xs text-muted-foreground">They join their first experience</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">+20 USDT bonus+ 100 pts</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Perks & History */}
        <div className="space-y-8">
          {/* Unlocked Perks */}
          <Card className="glass-card border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-light">
                <Gift className="w-6 h-6 text-accent" />
                Your Perks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {perks.map((perk, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    perk.unlocked
                      ? 'bg-muted/30 border-primary/30'
                      : 'bg-muted/10 border-border/50 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">{perk.title}</p>
                      <p className="text-xs text-muted-foreground">{perk.description}</p>
                    </div>
                    {perk.unlocked && (
                      <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">Active</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-card border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-light">
                <TrendingUp className="w-6 h-6 text-secondary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rewards.map((reward, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="text-2xl">{reward.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{reward.type}</p>
                    <p className="text-xs text-muted-foreground mb-1">{reward.description}</p>
                    <p className="text-xs text-muted-foreground">{reward.date}</p>
                  </div>
                  <div className="text-right">
                    {reward.amount && (
                      <p className="text-sm font-medium text-primary">{reward.amount}</p>
                    )}
                    <p className="text-xs text-accent">{reward.points}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
