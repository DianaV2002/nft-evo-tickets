import { Users, Award, Calendar, MapPin, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getLeaderboard, type UserLevel } from "@/services/levelService";

export default function Community() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<UserLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await getLeaderboard(50); // Get top 50 users
        setLeaderboard(data);
        setTotalMembers(data.length);
        setTotalPoints(data.reduce((sum, user) => sum + user.totalPoints, 0));
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Generate avatar emoji based on level
  const getAvatarForLevel = (levelName: string): string => {
    if (levelName.includes('Nature Sage')) return '🍃';
    if (levelName.includes('Forest Guardian')) return '🌳';
    if (levelName.includes('Bloom Tender')) return '🌸';
    if (levelName.includes('Root Grower')) return '🌿';
    return '🌱';
  };

  // Format wallet address for display
  const formatWallet = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

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
            <p className="text-4xl font-light text-primary mb-2">
              {loading ? '...' : totalMembers}
            </p>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Active Members</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-light text-accent mb-2">
              {loading ? '...' : totalPoints.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Total Points Earned</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-none">
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-light text-secondary mb-2">
              {loading ? '...' : leaderboard.filter(u => u.totalPoints >= 5000).length}
            </p>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Nature Sages</p>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-pulse">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading community members...</p>
          </div>
        </div>
      )}

      {/* Community Members Grid - Real Data from Leaderboard */}
      {!loading && leaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaderboard.map((member, index) => (
            <Card
              key={member.walletAddress}
              className="glass-card border-none spatial-hover cursor-pointer group overflow-hidden"
              onClick={() => navigate(`/profile/${member.walletAddress}`)}
            >
              <CardContent className="p-0">
                {/* Header with gradient overlay */}
                <div className="relative h-32 bg-gradient-secondary overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-40 group-hover:scale-110 transition-transform duration-500">
                    {member.currentLevelData.emoji}
                  </div>
                  <div className="absolute bottom-4 left-6">
                    <div className="text-5xl mb-2">{member.currentLevelData.emoji}</div>
                  </div>
                  {/* Rank Badge */}
                  {index < 3 && (
                    <div className="absolute top-4 right-4">
                      <Badge className={`
                        ${index === 0 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : ''}
                        ${index === 1 ? 'bg-gray-400/20 text-gray-300 border-gray-400/30' : ''}
                        ${index === 2 ? 'bg-amber-700/20 text-amber-400 border-amber-700/30' : ''}
                      `}>
                        #{index + 1}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-light mb-2 group-hover:text-primary transition-colors font-mono">
                    {formatWallet(member.walletAddress)}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 font-light">
                    {member.currentLevelData.name}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1 text-primary">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-semibold">{member.totalPoints.toLocaleString()}</span>
                      <span className="text-muted-foreground text-xs">pts</span>
                    </div>
                    {member.nextLevelData && (
                      <div className="text-xs text-muted-foreground">
                        {Math.round(member.progressToNext)}% to next
                      </div>
                    )}
                  </div>

                  {/* Level Badge */}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs font-light border-primary/30 text-primary"
                    >
                      {member.currentLevelData.emoji} {member.currentLevelData.name}
                    </Badge>
                    {index < 10 && (
                      <Badge
                        variant="outline"
                        className="text-xs font-light border-accent/30 text-accent"
                      >
                        Top 10
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && leaderboard.length === 0 && (
        <Card className="glass-card border-none">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-2xl font-light mb-3">No community members yet</h3>
            <p className="text-muted-foreground">
              Be the first to join and start earning points!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Call to Action */}
      <Card className="glass-card border-none">
        <CardContent className="p-12 text-center">
          <Award className="w-12 h-12 mx-auto mb-4 text-accent" />
          <h3 className="text-2xl font-light mb-3">Join Our Growing Family</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto font-light">
            Every soul that joins strengthens our collective energy. Attend events, connect with others, and watch your impact grow.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌱</span>
              <span>Start at 0 pts</span>
            </div>
            <div className="text-primary">→</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍃</span>
              <span>Reach 5,000 pts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
