import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Leaf, Users, Award, Sparkles, Calendar, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WalletConnect() {
    const { connected } = useWallet();
    const navigate = useNavigate();

    useEffect(() => {
        if (connected) {
            navigate("/", { replace: true });
        }
    }, [connected, navigate]);

    const topAttendees = [
        { name: "Maya Forest", events: 24, avatar: "🌿" },
        { name: "River Stone", events: 18, avatar: "🏔️" },
        { name: "Luna Bloom", events: 15, avatar: "🌸" },
        { name: "Sky Meadow", events: 12, avatar: "☀️" },
    ];

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Background Video */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-20"
            >
                <source src="/vid.mp4" type="video/mp4" />
            </video>

            {/* Main Content */}
            <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <div className="text-center pt-8 pb-4">
                    <div className="w-20 h-20 bg-gradient-primary rounded-3xl neon-glow mx-auto mb-6 flex items-center justify-center">
                        <Leaf className="w-12 h-12 text-primary-foreground drop-shadow-lg" />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-3">Wellness Collective</h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Join our community of seekers. Find your path through transformative retreats, forest gatherings, and wellness experiences.
                    </p>
                </div>

                {/* Featured Event Banner */}
                <Card className="glass-card overflow-hidden spatial-hover">
                    <div className="relative">
                        <div className="absolute top-4 right-4 z-10">
                            <Badge className="bg-accent text-accent-foreground">Featured Event</Badge>
                        </div>
                        <div className="bg-gradient-primary p-8 md:p-12">
                            <div className="max-w-3xl">
                                <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                                    Secret Forest Gathering 2024
                                </h2>
                                <p className="text-primary-foreground/90 text-lg mb-6">
                                    Three days of deep connection, sound healing, and nature immersion in the Carpathian mountains. Limited to 50 conscious souls.
                                </p>
                                <div className="flex flex-wrap gap-4 text-primary-foreground/90 mb-6">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        <span>June 21-23, 2025</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5" />
                                        <span>Secret Location, Romania</span>
                                    </div>
                                </div>
                                <div className="text-primary-foreground/70 text-sm">
                                    Connect your wallet to access exclusive early-bird tickets
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Most Active Community Members */}
                <Card className="glass-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Users className="w-6 h-6 text-primary" />
                            <h3 className="text-2xl font-bold">Most Active Community Members</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {topAttendees.map((attendee, idx) => (
                                <div key={idx} className="bg-muted/30 rounded-xl p-4 spatial-hover border border-border/50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="text-3xl">{attendee.avatar}</div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm">{attendee.name}</p>
                                            <p className="text-xs text-muted-foreground">{attendee.events} events attended</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-accent text-xs">
                                        <Award className="w-3 h-3" />
                                        <span>Community Champion</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Connect Wallet Section */}
                <Card className="glass-card">
                    <CardContent className="p-8 text-center">
                        <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-2xl font-bold mb-3">Begin Your Journey</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Connect your Phantom wallet to unlock exclusive wellness events, earn rewards, and join our growing community.
                        </p>
                        
                        <WalletMultiButton className="w-full md:w-auto bg-gradient-primary neon-glow spatial-hover text-lg font-bold py-3 px-8 rounded-xl mb-6" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            <div className="bg-card/50 rounded-xl p-4 border border-border/50">
                                <Leaf className="h-8 w-8 text-primary mb-2 mx-auto" />
                                <span className="font-semibold block mb-1">Authentic</span>
                                <span className="text-xs text-muted-foreground">Verified wellness experiences</span>
                            </div>
                            <div className="bg-card/50 rounded-xl p-4 border border-border/50">
                                <Users className="h-8 w-8 text-accent mb-2 mx-auto" />
                                <span className="font-semibold block mb-1">Community</span>
                                <span className="text-xs text-muted-foreground">Connect with like-minded souls</span>
                            </div>
                            <div className="bg-card/50 rounded-xl p-4 border border-border/50">
                                <Award className="h-8 w-8 text-secondary mb-2 mx-auto" />
                                <span className="font-semibold block mb-1">Rewards</span>
                                <span className="text-xs text-muted-foreground">Earn as you explore and share</span>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-6">
                            New to crypto? Download Phantom from{" "}
                            <a
                                href="https://phantom.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline text-primary"
                            >
                                phantom.app
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}