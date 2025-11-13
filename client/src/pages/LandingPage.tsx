import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";

export default function LandingPage() {
  const [isDark, setIsDark] = useState(false);
  const { toast } = useToast();
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const [waitlistResult, setWaitlistResult] = useState<
    "idle" | "success" | "duplicate" | "error"
  >("idle");

  const problemInsights = [
    "Trainees hesitate to log hours on expensive equipment, so the first real job often doubles as on-the-job training.",
    "Trainers juggle full bays and compliance paperwork, leaving little time for consistent, actionable coaching.",
    "Employers still see two to three months of ramp-up after hiring “certified” workers.",
    "Seventeen discovery interviews all pointed to the same gap: no objective, real-time signal on performance.",
  ];

  const solutionHighlights = [
    "SkillCam captures every repetition and delivers corrective cues in seconds.",
    "Computer vision spots posture, tooling, and sequencing errors before they calcify into bad habits.",
    "Trainers stay in charge—AI handles the tape review while coaches add human nuance.",
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

  const featureHighlights = [
    {
      icon: <Sparkles className="h-6 w-6 text-primary" />,
      title: "Real-time corrections",
      description: "AI flags mistakes mid-rep and suggests the next best adjustment while the learner is still in motion.",
    },
    {
      icon: <Gauge className="h-6 w-6 text-primary" />,
      title: "Consistent benchmarks",
      description: "Every upload is scored against the same standard, giving trainers and employers a shared dashboard.",
    },
    {
      icon: <ClipboardList className="h-6 w-6 text-primary" />,
      title: "Trainer-first workflows",
      description: "Timestamped clips and suggested comments help coaches respond faster without losing their voice.",
    },
  ];

  const primaryFeature = featureHighlights[0];
  const secondaryFeatures = featureHighlights.slice(1);

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

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <Video className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-heading font-semibold">SkillCam</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-100/50 via-background to-primary/10 dark:from-sky-500/20 dark:via-slate-900/70 dark:to-indigo-900/30" />
            <div className="max-w-7xl mx-auto px-6 py-24 text-center relative">
              <h1 className="text-5xl md:text-6xl font-heading font-bold mb-4 max-w-3xl mx-auto text-foreground">
                SkillCam keeps every rep on track.
              </h1>
              <p className="text-lg text-muted-foreground dark:text-slate-100 mb-10 max-w-2xl mx-auto">
                Instant coaching, faster corrections, and trainer-approved metrics so emerging talent becomes shop-floor ready in weeks, not months.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="text-base"
                  data-testid="button-cta-waitlist"
                >
                  <a href="#waitlist">
                    Join the beta waitlist
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </a>
                </Button>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base"
                    data-testid="button-see-demo"
                  >
                    Coach with SkillCam
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="relative py-20">
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-100/40 via-background to-transparent dark:from-slate-900/60 dark:via-indigo-950/80 dark:to-transparent" />
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-heading font-bold mb-6">
                  A coaching loop built around every rep
                </h2>
                <ul className="space-y-4">
                  {solutionHighlights.map((item, index) => (
                    <li key={item} className="flex gap-3" data-testid={`solution-item-${index}`}>
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <p className="text-base text-muted-foreground dark:text-slate-200">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-background/95 dark:bg-slate-900/75 border border-primary/10 dark:border-primary/40 rounded-2xl p-12 flex items-center justify-center shadow-xl shadow-primary/10 backdrop-blur">
                <div className="text-center">
                  <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Video className="h-16 w-16 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground dark:text-slate-100">
                    Clean industrial neutrals, purposeful accents, and data-forward layouts match the precision of modern training labs.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-muted/10 dark:bg-slate-900/60 py-20">
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-3xl font-heading font-bold mb-8 text-center">
                Built for the people shaping the skilled workforce
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {audienceSegments.map((audience) => (
                  <Card
                    key={audience.title}
                    className="p-6 space-y-3 border border-primary/10 dark:border-slate-700/70 bg-background/95 dark:bg-slate-900/80 shadow-lg shadow-primary/10"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                      {audience.icon}
                    </div>
                    <h3 className="text-lg font-heading font-semibold">{audience.title}</h3>
                    <p className="text-sm text-muted-foreground dark:text-slate-200 leading-relaxed">
                      {audience.description}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {primaryFeature && (
            <section className="relative py-20 bg-gradient-to-br from-sky-100/60 via-primary/10 to-emerald-100/50 dark:from-slate-900/70 dark:via-sky-900/40 dark:to-emerald-900/40">
              <div
                className="absolute inset-0 -z-10 opacity-60 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_55%)] dark:opacity-50"
                aria-hidden="true"
              />
              <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-3xl font-heading font-bold text-center mb-12">
                  What makes SkillCam different
                </h2>
                <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] items-stretch">
                  <Card
                    className="relative overflow-hidden p-8 lg:p-10 bg-background/95 dark:bg-slate-900/80 border border-primary/20 dark:border-primary/40 shadow-xl shadow-primary/25"
                    data-testid="core-feature-0"
                  >
                    <div
                      className="absolute -top-20 -right-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute -bottom-28 -left-10 h-44 w-44 rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-400/30"
                      aria-hidden="true"
                    />
                    <div className="relative space-y-4">
                      <div className="h-12 w-12 rounded-xl bg-white/80 dark:bg-slate-800/90 flex items-center justify-center shadow-sm">
                        {primaryFeature.icon}
                      </div>
                      <h3 className="text-2xl font-heading font-semibold">
                        {primaryFeature.title}
                      </h3>
                      <p className="text-base text-muted-foreground dark:text-slate-200 leading-relaxed">
                        {primaryFeature.description}
                      </p>
                    </div>
                  </Card>
                  <div className="grid gap-6">
                    {secondaryFeatures.map((feature, index) => (
                      <Card
                        key={feature.title}
                        className="p-6 bg-background/95 dark:bg-slate-900/80 border border-white/30 dark:border-slate-800/60 shadow-lg shadow-primary/10 backdrop-blur"
                        data-testid={`core-feature-${index + 1}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-lg bg-primary/15 dark:bg-primary/25 flex items-center justify-center">
                            {feature.icon}
                          </div>
                          <div>
                            <h3 className="text-lg font-heading font-semibold mb-2">
                              {feature.title}
                            </h3>
                            <p className="text-sm text-muted-foreground dark:text-slate-200 leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section
            id="why-skillcam"
            className="py-20 bg-gradient-to-br from-primary/5 via-background to-background dark:from-slate-900/40 dark:via-background"
          >
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-3xl font-heading font-bold text-center mb-12">
                Why training teams are asking for SkillCam
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {problemInsights.map((statement, index) => (
                  <li
                    key={statement}
                    className="rounded-2xl border border-primary/10 bg-background/95 p-6 shadow-lg shadow-primary/5 backdrop-blur dark:border-primary/20"
                    data-testid={`problem-item-${index}`}
                  >
                    <p className="text-base leading-relaxed text-muted-foreground dark:text-slate-200">
                      {statement}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            id="waitlist"
            className="bg-primary text-primary-foreground py-20"
          >
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className="text-3xl font-heading font-bold mb-4">
                Bring SkillCam to your shop floor
              </h2>
              <p className="text-lg mb-10 opacity-90 dark:text-slate-100">
                We’re onboarding a limited cohort of labs and apprenticeship programs. Reserve your spot and help shape the coaching tools you’ll rely on next semester.
              </p>
              <form
                onSubmit={handleWaitlistSubmit}
                className="flex flex-col justify-center gap-4 md:flex-row"
              >
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@program.org"
                  value={waitlistEmail}
                  onChange={(event) => {
                    setWaitlistEmail(event.target.value);
                    if (waitlistResult !== "idle") {
                      setWaitlistResult("idle");
                    }
                  }}
                  disabled={isSubmittingWaitlist}
                  className="h-12 bg-primary-foreground/10 dark:bg-slate-900/60 text-primary-foreground dark:text-primary-foreground placeholder:text-primary-foreground/70 dark:placeholder:text-primary-foreground/60 md:w-80"
                  aria-label="Email address"
                  required
                />
                <Button
                  type="submit"
                  size="lg"
                  variant="secondary"
                  className="text-base min-w-[200px]"
                  data-testid="button-cta-footer"
                  disabled={isSubmittingWaitlist}
                >
                  {isSubmittingWaitlist ? "Joining..." : "Join the beta waitlist"}
                  {!isSubmittingWaitlist && <ArrowRight className="h-5 w-5 ml-2" />}
                </Button>
              </form>
              <div className="mt-4 min-h-[1.5rem]" aria-live="polite">
                {waitlistResult === "success" && (
                  <p className="text-sm text-emerald-100">
                    Thanks for joining—we’ll be in touch with onboarding details soon.
                  </p>
                )}
                {waitlistResult === "duplicate" && (
                  <p className="text-sm text-amber-100">
                    You’re already on the list. Keep an eye on your inbox for updates.
                  </p>
                )}
                {waitlistResult === "error" && (
                  <p className="text-sm text-red-100">
                    We couldn’t save that email just now. Please try again in a moment.
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t py-8">
          <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
            <p>© 2024 SkillCam. AI-Powered Skill Training Evaluation.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
