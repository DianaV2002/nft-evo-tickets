import { Gift, Award, Share2, Sparkles, TrendingUp, Users, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getAllLevels,
  getUserLevel,
  getUserActivities,
  formatActivityType,
  getActivityIcon,
  timeAgo,
  type Level,
  type UserLevel,
  type Activity,
} from "@/services/levelService";

export default function Rewards() {
  const { publicKey } = useWallet();
  const [copied, setCopied] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const referralCode = "WELLNESS2024";

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch data on mount and when wallet changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all levels
        const levelsData = await getAllLevels();
        setLevels(levelsData);

        // Fetch user data if wallet connected
        if (publicKey) {
          const walletAddress = publicKey.toBase58();
          const [userLevelData, activitiesData] = await Promise.all([
            getUserLevel(walletAddress),
            getUserActivities(walletAddress, 20),
          ]);

          setUserLevel(userLevelData);
          setActivities(activitiesData);
        }
      } catch (err) {
        console.error('Error fetching level data:', err);
        setError('Failed to load level data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [publicKey]);

  // Determine current level index
  const currentLevelIndex = userLevel && levels.length > 0
    ? levels.findIndex(l => l.name === userLevel.currentLevelData.name)
    : 0;

  const perks = [
    {
      title: "Early Access",
      description: "Get first pick on new retreat launches",
      unlocked: (userLevel?.totalPoints || 0) >= 500
    },
    {
      title: "Exclusive Discounts",
      description: "15% off all wellness experiences",
      unlocked: (userLevel?.totalPoints || 0) >= 1000
    },
    {
      title: "VIP Gatherings",
      description: "Invite-only community events",
      unlocked: (userLevel?.totalPoints || 0) >= 2000
    },
    {
      title: "Free Hosting",
      description: "Host your own event for free",
      unlocked: (userLevel?.totalPoints || 0) >= 5000
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading your rewards...</p>
        </div>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-primary opacity-30"></div>
          <div className="relative p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-5xl font-light mb-4 text-foreground">Rewards & Growth</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light mb-6">
              Every connection you make, every experience you share, nurtures our collective garden
            </p>
            <p className="text-lg text-primary font-medium">
              Please connect your wallet to view your rewards
            </p>
          </div>
        </div>

        {/* Show levels preview */}
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-light">Available Levels</CardTitle>
            <CardDescription>Connect your wallet to start earning points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {levels.map((level, idx) => (
                <div
                  key={idx}
                  className="text-center p-4 rounded-xl border bg-muted/10 border-border/50"
                >
                  <div className="text-3xl mb-2">{level.emoji}</div>
                  <p className="text-sm font-medium">{level.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{level.minPoints} pts</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Level Progress */}
      {userLevel && (
        <Card className="glass-card border-none overflow-hidden">
          <div className="bg-gradient-secondary p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-primary-foreground/70 mb-1 uppercase tracking-wider">Current Level</p>
                <h2 className="text-3xl font-light text-primary-foreground">
                  {userLevel.currentLevelData.emoji} {userLevel.currentLevelData.name}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-foreground/70 mb-1 uppercase tracking-wider">Points</p>
                <p className="text-3xl font-light text-primary-foreground">{userLevel.totalPoints.toLocaleString()}</p>
              </div>
            </div>

            {userLevel.nextLevelData && (
              <>
                <Progress value={userLevel.progressToNext} className="h-3 mb-2" />
                <p className="text-sm text-primary-foreground/70 text-center">
                  {(userLevel.nextLevelData.minPoints - userLevel.totalPoints).toLocaleString()} points until {userLevel.nextLevelData.name}
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
                    idx <= currentLevelIndex
                      ? 'bg-muted/30 border-primary/30 spatial-hover'
                      : 'bg-muted/10 border-border/50 opacity-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{level.emoji}</div>
                  <p className="text-sm font-medium">{level.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{level.minPoints} pts</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                  <Badge variant="outline" className="border-primary/30 text-primary">+0.5 SOL + 100 pts</Badge>
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
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  No activity yet. Start earning points by interacting with events!
                </p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="text-2xl">{getActivityIcon(activity.activityType)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatActivityType(activity.activityType)}</p>
                      {activity.transactionSignature && (
                        <p className="text-xs text-muted-foreground mb-1">
                          Tx: {activity.transactionSignature.slice(0, 8)}...
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{timeAgo(activity.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-accent">+{activity.pointsEarned} pts</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
