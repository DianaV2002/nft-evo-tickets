import { Award, Calendar, MapPin, Share2, Edit3, Sparkles, Users, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";

export default function Profile() {
  const { id } = useParams();

  // Mock user data - in real app, fetch based on id
  const user = {
    name: "Maya Forest",
    avatar: "🌿",
    bio: "Sound healing practitioner, forest bathing guide, and nature connection facilitator. I believe in the transformative power of slowing down and listening to the wisdom of the earth.",
    eventsAttended: 24,
    eventsHosted: 3,
    badges: ["Community Champion", "Early Adopter", "Wellness Pioneer"],
    location: "Carpathian Mountains, Romania",
    joined: "January 2024",
    communityPoints: 1247,
    referrals: 8,
    level: "Forest Guardian"
  };

  const upcomingEvents = [
    { id: 1, name: "Forest Sound Healing Retreat", date: "Jan 15", image: "🌲" },
    { id: 2, name: "Moonlight Yoga & Meditation", date: "Jan 20", image: "🌙" },
    { id: 3, name: "Breathwork & Cold Plunge", date: "Jan 25", image: "❄️" }
  ];

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
            {user.avatar}
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
                {user.avatar}
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

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-primary mb-1">{user.eventsAttended}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Events Attended</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-accent mb-1">{user.eventsHosted}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Events Hosted</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-secondary mb-1">{user.communityPoints}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Community Points</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-primary mb-1">{user.referrals}</p>
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
            {upcomingEvents.map((event) => (
              <div 
                key={event.id} 
                className="bg-muted/30 rounded-xl p-3 spatial-hover cursor-pointer border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{event.image}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.name}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
