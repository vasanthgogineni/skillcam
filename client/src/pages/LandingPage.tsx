import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/lib/theme";
import {
  Video,
  ClipboardList,
  Users2,
  Target,
  Building2,
  Sparkles,
  Gauge,
  ArrowRight,
  Moon,
  Sun,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Play,
  BarChart3,
  Settings,
  User,
  Pause,
} from "lucide-react";

export default function LandingPage() {
  const { isDark, setTheme } = useTheme();
  const { toast } = useToast();
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const [waitlistResult, setWaitlistResult] = useState<
    "idle" | "success" | "duplicate" | "error"
  >("idle");

  const problemInsights = [
    {
      title: "Hesitation to Practice",
      description: "Trainees avoid logging hours on expensive equipment, meaning the first real job often doubles as on-the-job training."
    },
    {
      title: "Overwhelmed Trainers",
      description: "Trainers juggle full bays and compliance paperwork, leaving little time for consistent, actionable coaching."
    },
    {
      title: "Slow Ramp-up",
      description: "Employers still see two to three months of ramp-up after hiring “certified” workers."
    },
    {
      title: "Subjective Feedback",
      description: "Discovery interviews point to the same gap: no objective, real-time signal on performance."
    }
  ];

  const solutionHighlights = [
    {
      id: "item-1",
      title: "Real-time AI Feedback",
      content: "SkillCam captures every repetition and delivers corrective cues in seconds. Computer vision spots posture, tooling, and sequencing errors immediately."
    },
    {
      id: "item-2",
      title: "Consistent Benchmarking",
      content: "Every upload is scored against the same gold standard, giving trainers and employers a shared, objective dashboard for readiness."
    },
    {
      id: "item-3",
      title: "Trainer-Augmented Coaching",
      content: "Trainers stay in charge. AI handles the tedious tape review while coaches add human nuance with timestamped comments and guidance."
    }
  ];

  const audienceSegments = [
    {
      title: "Lab & Floor Trainers",
      icon: <Users2 className="h-6 w-6 text-primary" />,
      description:
        "Seasoned mentors who need a reliable assistant to watch every rep between live check-ins.",
    },
    {
      title: "Hands-On Trainees",
      icon: <Target className="h-6 w-6 text-primary" />,
      description:
        "Machinists, welders, and technicians hungry for concrete feedback that speeds up mastery.",
    },
    {
      title: "Workforce Directors",
      icon: <Building2 className="h-6 w-6 text-primary" />,
      description:
        "Employers and workforce programs measured on job readiness and throughput.",
    },
  ];

  const handleWaitlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!waitlistEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Enter an email so we can confirm your spot.",
      });
      return;
    }

    setIsSubmittingWaitlist(true);
    setWaitlistResult("idle");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: waitlistEmail }),
      });

      const contentType = response.headers.get("content-type");
      let data: { success?: boolean; alreadyJoined?: boolean } | null = null;

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        const raw = await response.text();
        throw new Error(
          raw?.trim()
            ? raw.trim().slice(0, 160)
            : "Unexpected response while joining the waitlist.",
        );
      }

      if (!response.ok) {
        throw new Error((data as any)?.error ?? "Unable to join the waitlist right now.");
      }

      if (data?.alreadyJoined) {
        setWaitlistResult("duplicate");
        toast({
          title: "You’re already on the list",
          description: "We’ll keep you posted as soon as the beta opens.",
        });
      } else {
        setWaitlistResult("success");
        toast({
          title: "Welcome aboard",
          description: "We’ll reach out soon with onboarding details.",
        });
      }

      setWaitlistEmail("");
    } catch (error: any) {
      setWaitlistResult("error");
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: error?.message ?? "Please try again shortly.",
      });
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 bg-primary rounded-lg transform rotate-3 group-hover:rotate-6 transition-transform"></div>
              <div className="absolute inset-0 bg-background border-2 border-primary rounded-lg flex items-center justify-center -rotate-3 group-hover:-rotate-6 transition-transform">
                <Video className="h-5 w-5 text-primary" />
              </div>
            </div>
            <span className="text-xl font-heading font-bold tracking-tight ml-1">SkillCam</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
              <a href="#audience" className="hover:text-foreground transition-colors">For Trainers</a>
            </nav>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Link href="/login">
                <Button size="sm" variant="outline" className="hidden sm:flex">
                  Log in
                </Button>
              </Link>
              <Button asChild size="sm">
                <a href="#waitlist">Get Access</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-default">
              <Sparkles className="w-4 h-4 mr-2 inline-block" />
              Now accepting beta partners
            </Badge>
            <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight mb-6 max-w-4xl mx-auto text-foreground">
              SkillCam keeps every rep on track.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Instant coaching, faster corrections, and trainer-approved metrics so emerging talent becomes shop-floor ready in weeks, not months.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Button asChild size="lg" className="text-lg px-8 h-14 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                <a href="#waitlist">
                  Join the beta waitlist
                  <ArrowRight className="h-5 w-5 ml-2" />
                </a>
              </Button>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-full bg-background/50 backdrop-blur-sm">
                  Coach with SkillCam
                </Button>
              </Link>
            </div>
            
            {/* Detailed Dashboard Mockup */}
            <div className="mx-auto max-w-5xl rounded-xl border bg-card/50 backdrop-blur shadow-2xl overflow-hidden">
              <div className="bg-muted/50 border-b px-4 py-3 flex items-center gap-2">
                 <div className="flex gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-red-400/80" />
                   <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                   <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                 </div>
                 <div className="ml-4 text-xs text-muted-foreground font-mono bg-background/50 px-2 py-0.5 rounded">skillcam-dashboard.app</div>
              </div>
              <div className="grid grid-cols-[60px_1fr_280px] h-[400px] bg-background/95">
                {/* Left Sidebar */}
                <div className="border-r bg-muted/10 flex flex-col items-center py-4 gap-6">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><Video className="w-5 h-5" /></div>
                  <div className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><BarChart3 className="w-5 h-5" /></div>
                  <div className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Users2 className="w-5 h-5" /></div>
                  <div className="mt-auto p-2 rounded-lg hover:bg-muted text-muted-foreground"><Settings className="w-5 h-5" /></div>
                </div>

                {/* Main Video Area */}
                <div className="relative bg-black/90 flex items-center justify-center overflow-hidden group">
                   {/* Grid overlay */}
                   <div className="absolute inset-0 opacity-20" 
                        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                   </div>
                   
                   {/* Bounding box mock */}
                   <div className="absolute border-2 border-emerald-500 w-48 h-64 rounded bg-emerald-500/10 flex flex-col justify-between p-2 animate-pulse">
                      <div className="bg-emerald-500 text-black text-[10px] font-bold px-1 self-start rounded-sm">POSTURE: GOOD</div>
                   </div>
                   
                   <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all">
                     <Play className="h-8 w-8 text-white ml-1" />
                   </div>

                   {/* Video Controls */}
                   <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent flex items-end px-4 pb-3 gap-4">
                      <Pause className="text-white w-4 h-4" />
                      <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-primary"></div>
                      </div>
                      <span className="text-white text-xs font-mono">00:12 / 00:45</span>
                   </div>
                </div>

                {/* Right Analysis Panel */}
                <div className="border-l bg-card p-4 flex flex-col gap-4">
                   <div>
                     <h3 className="text-sm font-semibold mb-1">Session Analysis</h3>
                     <p className="text-xs text-muted-foreground">Today, 10:42 AM</p>
                   </div>
                   
                   <div className="space-y-3">
                      <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-semibold">Posture Correct</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Maintained proper stance throughout the welding sequence.</p>
                      </div>
                      
                      <div className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                          <Target className="w-4 h-4" />
                          <span className="text-xs font-semibold">Angle Deviation</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Torch angle drifted 15° at the 12s mark. Corrective feedback sent.</p>
                      </div>
                   </div>

                   <div className="mt-auto">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-medium">Overall Score</span>
                        <span className="text-xl font-bold text-primary">88%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[88%] rounded-full"></div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem & Solution */}
        <section id="how-it-works" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <div>
                <h2 className="text-3xl font-heading font-bold mb-6">
                  The gap between "certified" and "ready"
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Training programs are under pressure to produce more skilled workers faster, but traditional methods struggle to scale personalized feedback.
                </p>
                <div className="space-y-6">
                  {problemInsights.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-destructive" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-card border rounded-2xl p-8 shadow-sm">
                 <div className="mb-6">
                   <Badge variant="outline" className="mb-2">The Solution</Badge>
                   <h3 className="text-2xl font-bold">A coaching loop built around every rep</h3>
                 </div>
                 <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                  {solutionHighlights.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-lg font-medium hover:no-underline hover:text-primary text-left">
                        {item.title}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                        {item.content}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* Audience Segments */}
        <section id="audience" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                Built for the people shaping the workforce
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Whether you're training the next generation or mastering a trade yourself, SkillCam adapts to your workflow.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {audienceSegments.map((audience) => (
                <Card key={audience.title} className="bg-card hover:shadow-lg transition-shadow border-primary/10">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                      {audience.icon}
                    </div>
                    <CardTitle>{audience.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {audience.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-primary/5 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-background/50 via-transparent to-transparent"></div>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">What makes SkillCam different</h2>
               <p className="text-muted-foreground text-lg">Features designed for the realities of the shop floor.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {/* Feature 1 */}
               <Card className="bg-background/60 backdrop-blur border-primary/10">
                 <CardHeader>
                    <Sparkles className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Real-time Corrections</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground">AI flags mistakes mid-rep and suggests the next best adjustment while the learner is still in motion.</p>
                 </CardContent>
               </Card>

               {/* Feature 2 */}
               <Card className="bg-background/60 backdrop-blur border-primary/10">
                 <CardHeader>
                    <Gauge className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Consistent Benchmarks</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground">Every upload is scored against the same standard, giving trainers and employers a shared dashboard.</p>
                 </CardContent>
               </Card>

               {/* Feature 3 */}
               <Card className="bg-background/60 backdrop-blur border-primary/10">
                 <CardHeader>
                    <ClipboardList className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Trainer-first Workflows</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground">Timestamped clips and suggested comments help coaches respond faster without losing their voice.</p>
                 </CardContent>
               </Card>
               
               {/* Feature 4 */}
               <Card className="bg-background/60 backdrop-blur border-primary/10">
                 <CardHeader>
                    <TrendingUp className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Progress Tracking</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground">Visualize improvement over time with detailed analytics on speed, accuracy, and technique.</p>
                 </CardContent>
               </Card>

               {/* Feature 5 */}
               <Card className="bg-background/60 backdrop-blur border-primary/10">
                 <CardHeader>
                    <ShieldCheck className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Safety First</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground">Automatically detect safety violations and PPE compliance to ensure a safe training environment.</p>
                 </CardContent>
               </Card>
               
               {/* Feature 6 */}
               <Card className="bg-background/60 backdrop-blur border-primary/10">
                 <CardHeader>
                    <Video className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Video Library</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground">Build a library of best-practice demonstrations and common mistakes for trainees to review.</p>
                 </CardContent>
               </Card>
            </div>
          </div>
        </section>

        {/* Waitlist Section */}
        <section id="waitlist" className="py-32">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
               {/* Decorative background elements */}
               <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')]"></div>
               <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
               
               <CardContent className="pt-12 pb-12 relative z-10">
                  <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
                    Bring SkillCam to your shop floor
                  </h2>
                  <p className="text-primary-foreground/90 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                    We’re onboarding a limited cohort of labs and apprenticeship programs. Reserve your spot and help shape the coaching tools you’ll rely on next semester.
                  </p>

                  <form
                    onSubmit={handleWaitlistSubmit}
                    className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto"
                  >
                    <Input
                      type="email"
                      placeholder="you@program.org"
                      value={waitlistEmail}
                      onChange={(e) => {
                        setWaitlistEmail(e.target.value);
                        if (waitlistResult !== "idle") setWaitlistResult("idle");
                      }}
                      disabled={isSubmittingWaitlist}
                      className="bg-background/90 text-foreground placeholder:text-muted-foreground border-transparent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                      required
                    />
                    <Button 
                      type="submit" 
                      size="lg" 
                      variant="secondary" 
                      disabled={isSubmittingWaitlist}
                      className="font-semibold"
                    >
                      {isSubmittingWaitlist ? "Joining..." : "Join Beta"}
                      {!isSubmittingWaitlist && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </form>

                  <div className="mt-6 min-h-[20px]">
                    {waitlistResult === "success" && (
                      <div className="flex items-center justify-center gap-2 text-emerald-200 font-medium animate-in fade-in slide-in-from-bottom-2">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Thanks! We'll be in touch soon.</span>
                      </div>
                    )}
                    {waitlistResult === "duplicate" && (
                      <p className="text-amber-200 font-medium">You’re already on the list!</p>
                    )}
                    {waitlistResult === "error" && (
                      <p className="text-red-200 font-medium">Something went wrong. Please try again.</p>
                    )}
                  </div>
               </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Video className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold">SkillCam</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SkillCam. AI-Powered Skill Training Evaluation.
          </p>
          <div className="flex gap-6">
             <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
             <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
             <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
