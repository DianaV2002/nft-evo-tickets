import { Users, Award, Calendar, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function Community() {
  const navigate = useNavigate();

  const communityMembers = [
    {
      id: 1,
      name: "Maya Forest",
      avatar: "🌿",
      bio: "Sound healing practitioner & forest bathing guide",
      eventsAttended: 24,
      badges: ["Community Champion", "Early Adopter"],
      location: "Carpathian Mountains",
      joined: "Jan 2024"
    },
    {
      id: 2,
      name: "River Stone",
      avatar: "🏔️",
      bio: "Breathwork facilitator & mindfulness teacher",
      eventsAttended: 18,
      badges: ["Wellness Pioneer", "Event Host"],
      location: "Transylvania",
      joined: "Feb 2024"
    },
    {
      id: 3,
      name: "Luna Bloom",
      avatar: "🌸",
      bio: "Yoga instructor & herbalist",
      eventsAttended: 15,
      badges: ["Dedicated Soul"],
      location: "Cluj-Napoca",
      joined: "Mar 2024"
    },
    {
      id: 4,
      name: "Sky Meadow",
      avatar: "☀️",
      bio: "Ecstatic dance facilitator & energy healer",
      eventsAttended: 12,
      badges: ["Rising Star"],
      location: "Bucharest",
      joined: "Apr 2024"
    },
    {
      id: 5,
      name: "Ocean Wave",
      avatar: "🌊",
      bio: "Cold therapy guide & meditation teacher",
      eventsAttended: 10,
      badges: ["Ice Guardian"],
      location: "Black Sea Coast",
      joined: "May 2024"
    },
    {
      id: 6,
      name: "Sage Mountain",
      avatar: "🍃",
      bio: "Plant medicine educator & retreat organizer",
      eventsAttended: 8,
      badges: ["Seed Planter"],
      location: "Apuseni Mountains",
      joined: "Jun 2024"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-primary opacity-30"></div>
        <div className="relative p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-5xl font-light mb-4 text-foreground">Our Community</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
            Meet the souls who are weaving the fabric of our wellness collective
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-light text-primary mb-2">247</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Active Members</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-light text-accent mb-2">892</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Experiences Shared</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-light text-secondary mb-2">15</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Countries</p>
          </CardContent>
        </Card>
      </div>

      {/* Community Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communityMembers.map((member) => (
          <Card 
            key={member.id} 
            className="glass-card border-none spatial-hover cursor-pointer group overflow-hidden"
            onClick={() => navigate(`/profile/${member.id}`)}
          >
            <CardContent className="p-0">
              {/* Header with gradient overlay */}
              <div className="relative h-32 bg-gradient-secondary overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-40 group-hover:scale-110 transition-transform duration-500">
                  {member.avatar}
                </div>
                <div className="absolute bottom-4 left-6">
                  <div className="text-5xl mb-2">{member.avatar}</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-light mb-2 group-hover:text-primary transition-colors">
                  {member.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 font-light">
                  {member.bio}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{member.eventsAttended}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">{member.location}</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {member.badges.map((badge, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="text-xs font-light border-primary/30 text-primary"
                    >
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call to Action */}
      <Card className="glass-card border-none">
        <CardContent className="p-12 text-center">
          <Award className="w-12 h-12 mx-auto mb-4 text-accent" />
          <h3 className="text-2xl font-light mb-3">Join Our Growing Family</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto font-light">
            Every soul that joins strengthens our collective energy. Attend events, connect with others, and watch your impact grow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
