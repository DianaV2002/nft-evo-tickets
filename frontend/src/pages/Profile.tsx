import { Award, Calendar, MapPin, Share2, Edit3, Sparkles, Users, Leaf, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { fetchAllEvents } from "@/services/eventService";

export default function Profile() {
  const { id } = useParams();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEvents, setUserEvents] = useState([]);
  const [userStats, setUserStats] = useState({
    eventsAttended: 0,
    eventsHosted: 0,
    communityPoints: 0,
    referrals: 0
  });

  // Generate user data based on wallet
  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) {
      setLoading(false);
      return;
    }

    async function loadUserData() {
      try {
        setLoading(true);
        
        // Fetch user's events
        const events = await fetchAllEvents(connection, wallet.publicKey);
        setUserEvents(events);
        
        // Calculate stats
        const eventsHosted = events.length;
        const eventsAttended = Math.floor(Math.random() * 20) + 5; // Mock for now
        const communityPoints = eventsHosted * 100 + eventsAttended * 50;
        const referrals = Math.floor(Math.random() * 10) + 2;
        
        setUserStats({
          eventsAttended,
          eventsHosted,
          communityPoints,
          referrals
        });

        // Generate user profile based on wallet
        const walletAddress = wallet.publicKey.toString();
        const avatarOptions = ["🌿", "🌱", "🌳", "🍃", "🌾", "🌻", "🌺", "🌸", "🌼", "🌷"];
        const nameOptions = ["Forest Walker", "Nature Lover", "Earth Guardian", "Wild Spirit", "Mountain Soul"];
        const bioOptions = [
          "Passionate about connecting with nature and building sustainable communities.",
          "Dedicated to environmental conservation and mindful living practices.",
          "Exploring the intersection of technology and nature for a better future.",
          "Building bridges between digital innovation and natural wisdom.",
          "Committed to creating positive impact through community engagement."
        ];
        
        // More reliable avatar generation
        const lastChar = walletAddress.slice(-1);
        const avatarIndex = parseInt(lastChar, 16) || 0;
        const avatar = avatarOptions[avatarIndex % avatarOptions.length];
        
        const secondLastChar = walletAddress.slice(-2, -1);
        const nameIndex = parseInt(secondLastChar, 16) || 0;
        const name = nameOptions[nameIndex % nameOptions.length];
        
        const thirdLastChar = walletAddress.slice(-3, -2);
        const bioIndex = parseInt(thirdLastChar, 16) || 0;
        const bio = bioOptions[bioIndex % bioOptions.length];
        
        // Generate badges based on activity
        const badges = [];
        if (eventsHosted >= 1) badges.push("Event Host");
        if (eventsAttended >= 10) badges.push("Community Champion");
        if (referrals >= 5) badges.push("Network Builder");
        if (communityPoints >= 1000) badges.push("Active Member");
        if (eventsHosted >= 5) badges.push("Community Leader");
        
        // Determine level based on activity
        let level = "Newcomer";
        if (communityPoints >= 2000) level = "Community Star";
        else if (communityPoints >= 1000) level = "Active Member";
        else if (communityPoints >= 500) level = "Engaged Participant";
        else if (communityPoints >= 100) level = "Community Member";
        
        setUser({
          name,
          avatar,
          bio,
          location: "Digital Forest",
          joined: "Recently",
          level,
          badges,
          walletAddress: walletAddress.slice(0, 8) + "..." + walletAddress.slice(-8)
        });
        
        // Debug: Log the generated avatar
        console.log("Generated avatar:", avatar, "for wallet:", walletAddress);
        console.log("Avatar options:", avatarOptions);
        console.log("Last char:", lastChar, "Index:", avatarIndex);
        
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [connection, wallet.publicKey, wallet.connected]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading your profile...</p>
      </div>
    );
  }

  // Wallet not connected
  if (!wallet.connected || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
        <p className="text-muted-foreground mb-6">
          Please connect your wallet to view your profile
        </p>
        <Button onClick={() => wallet.connect()}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  const achievements = [
    { icon: "🌱", name: "Seed Planter", description: "5 referrals", unlocked: true },
    { icon: "🧘", name: "Dedicated Soul", description: "10 events attended", unlocked: true },
    { icon: "🌳", name: "Forest Guardian", description: "15 referrals", unlocked: true },
    { icon: "✨", name: "Light Keeper", description: "25 events attended", unlocked: false },
    { icon: "🦋", name: "Transformation Guide", description: "Host 5 events", unlocked: false },
    { icon: "🌟", name: "Community Star", description: "50 events attended", unlocked: false }
  ];

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <Card className="glass-card border-none overflow-hidden">
        <div className="relative h-48 bg-gradient-primary">
          <div className="absolute inset-0 flex items-center justify-center text-9xl opacity-20">
            {user.avatar || "🌿"}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm border-border/50"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="-mt-24 relative">
              <div className="w-40 h-40 rounded-full bg-gradient-secondary flex items-center justify-center text-7xl border-8 border-background shadow-depth">
                {user.avatar || "🌿"}
              </div>
              {/* Debug info */}
              <div className="absolute -bottom-2 left-0 text-xs text-muted-foreground">
                Avatar: {user.avatar}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-4xl font-light mb-2">{user.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{user.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {user.joined}</span>
                    </div>
                  </div>
                  <Badge className="bg-gradient-primary text-primary-foreground border-none">
                    {user.level}
                  </Badge>
                </div>

                <Button variant="outline" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Profile
                </Button>
              </div>

              <p className="text-muted-foreground font-light leading-relaxed mb-6">
                {user.bio}
              </p>
              
              {/* Wallet Address */}
              <div className="mb-6 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                <p className="font-mono text-sm">{user.walletAddress}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-primary mb-1">{userStats.eventsAttended}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Events Attended</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-accent mb-1">{userStats.eventsHosted}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Events Hosted</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-secondary mb-1">{userStats.communityPoints}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Community Points</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-primary mb-1">{userStats.referrals}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Referrals</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Achievements */}
        <Card className="lg:col-span-2 glass-card border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-light">
              <Award className="w-6 h-6 text-primary" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {achievements.map((achievement, idx) => (
                <div 
                  key={idx} 
                  className={`bg-muted/30 rounded-xl p-4 text-center border border-border/50 transition-all duration-300 ${
                    achievement.unlocked 
                      ? 'spatial-hover' 
                      : 'opacity-40 grayscale'
                  }`}
                >
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <p className="text-sm font-medium mb-1">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-light">
              <Calendar className="w-6 h-6 text-accent" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {userEvents.length > 0 ? (
              userEvents.slice(0, 3).map((event) => (
                <div 
                  key={event.publicKey} 
                  className="bg-muted/30 rounded-xl p-3 spatial-hover cursor-pointer border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.name}</p>
                      <p className="text-xs text-muted-foreground">Event ID: {event.eventId}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-sm text-muted-foreground">No events created yet</p>
                <Button className="mt-4" onClick={() => window.location.href = '/create-event'}>
                  Create Your First Event
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
