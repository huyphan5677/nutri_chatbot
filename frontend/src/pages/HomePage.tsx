import {
  ArrowRight,
  CheckCircle,
  ChefHat,
  Heart,
  Menu,
  Quote,
  ShoppingCart,
  Star,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Footer } from "../components/ui/Footer";
import { AuthModal } from "../features/auth";

const reviews = [
  {
    quote:
      "Nutri completely changed my weekdays. I used to order takeout 3 times a week from pure exhaustion. Now everything is pre-planned and ready.",
    name: "Sarah Jenkins",
    role: "Working Mom, NY",
    avatar: "https://i.pravatar.cc/150?u=1",
  },
  {
    quote:
      "As someone trying to hit specific protein macros, the automated nutrition tracking combined with the grocery lists is basically magic. Highly recommend!",
    name: "Mark Thompson",
    role: "Fitness Coach, CA",
    avatar: "https://i.pravatar.cc/150?u=2",
  },
  {
    quote:
      "The 'fridge awareness' feature alone paid for the app in a month. We no longer throw away wilted spinach because the app finds a recipe for it.",
    name: "Emily & Dave",
    role: "Homeowners, TX",
    avatar: "https://i.pravatar.cc/150?u=3",
  },
  {
    quote:
      "We went from spending 2 hours planning weekend menus to literally clicking one button. The AI understands our picky toddler perfectly.",
    name: "Maria Garcia",
    role: "Teacher, FL",
    avatar: "https://i.pravatar.cc/150?u=4",
  },
  {
    quote:
      "I've tried 5 different meal planners. None of them actually connect directly to my local local supermarkets to auto-fill my cart. Absolute game changer.",
    name: "Kevin Tran",
    role: "Software Engineer, WA",
    avatar: "https://i.pravatar.cc/150?u=5",
  },
  {
    quote:
      "Healthy eating finally feels effortless. The recipes are genuinely restaurant quality but take less than 30 minutes to prep.",
    name: "Jessica L.",
    role: "Designer, OR",
    avatar: "https://i.pravatar.cc/150?u=6",
  },
];

const PressLogos = () => (
  <>
    <div className="text-2xl font-display font-bold mb-0">TechCrunch</div>
    <div className="flex items-center gap-1 text-2xl font-display font-bold mb-0">
      <Zap className="w-6 h-6 fill-current" /> BuzzFeed
    </div>
    <div className="text-2xl font-display font-bold mb-0">Forbes</div>
    <div className="text-2xl font-display font-bold italic mb-0">Vogue</div>
    <div className="text-2xl font-mono font-bold tracking-widest mb-0">
      WIRED
    </div>
    <div className="flex items-center gap-2 text-2xl font-serif font-bold mb-0">
      <Heart className="w-6 h-6 fill-current text-primary" /> HealthMag
    </div>
    <div className="text-2xl font-display font-black tracking-tighter mb-0">
      The Verge
    </div>
    <div className="text-2xl font-sans font-extrabold italic mb-0">
      FastCompany
    </div>
    <div className="text-2xl font-serif italic font-bold mb-0">Eater</div>
  </>
);

export const HomePage = () => {
  // State for Modals & Nav
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authRedirect, setAuthRedirect] = useState<string>("/dashboard");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Animation triggers on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-up");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Handlers
  const handleStartShopping = () => {
    setAuthRedirect("/onboarding");
    setAuthMode("signup");
    setShowAuth(true);
  };

  const handleLoginClick = () => {
    setAuthRedirect("/dashboard");
    setAuthMode("login");
    setShowAuth(true);
  };

  const handleAuthSuccess = async (token: string) => {
    console.log("Auth Success.");
    window.location.href = authRedirect;
  };

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col font-sans text-slate-800 selection:bg-primary/20">
      {/* 1. Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="text-3xl font-extrabold text-primary font-display tracking-tight flex items-center gap-2">
            <span className="bg-primary text-white p-1 rounded-lg">
              <ChefHat className="w-6 h-6" />
            </span>
            Nutri.
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
            <a
              href="#how-it-works"
              className="relative py-1 transition-colors hover:text-primary after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:after:origin-bottom-left hover:after:scale-x-100"
            >
              How it works
            </a>
            <a
              href="#features"
              className="relative py-1 transition-colors hover:text-primary after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:after:origin-bottom-left hover:after:scale-x-100"
            >
              Features
            </a>
            <a
              href="#testimonials"
              className="relative py-1 transition-colors hover:text-primary after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:after:origin-bottom-left hover:after:scale-x-100"
            >
              Reviews
            </a>
          </div>

          <div className="hidden md:flex gap-3">
            <Button
              variant="ghost"
              onClick={handleLoginClick}
              className="text-gray-600 hover:text-primary font-medium"
            >
              Log in
            </Button>
            <Button
              onClick={handleStartShopping}
              className="rounded-full px-6 shadow-md shadow-primary/20 font-medium"
            >
              Sign up
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-gray-600 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 p-6 flex flex-col gap-4 animate-fade-in absolute w-full left-0 top-20 shadow-xl">
            <a
              href="#how-it-works"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 text-lg font-medium text-gray-700 bg-gray-50/50 rounded-xl hover:bg-primary/10 hover:text-primary hover:translate-x-1 transition-all duration-300"
            >
              How it works
            </a>
            <a
              href="#features"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 text-lg font-medium text-gray-700 bg-gray-50/50 rounded-xl hover:bg-primary/10 hover:text-primary hover:translate-x-1 transition-all duration-300"
            >
              Features
            </a>
            <a
              href="#testimonials"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 text-lg font-medium text-gray-700 bg-gray-50/50 rounded-xl hover:bg-primary/10 hover:text-primary hover:translate-x-1 transition-all duration-300"
            >
              Reviews
            </a>
            <div className="flex flex-col gap-3 mt-4">
              <Button
                variant="ghost"
                onClick={handleLoginClick}
                className="w-full justify-center text-lg h-12"
              >
                Log in
              </Button>
              <Button
                onClick={handleStartShopping}
                className="w-full justify-center text-lg h-12 rounded-full"
              >
                Sign up
              </Button>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="relative pt-5 pb-8 md:pt-8 md:pb-12 overflow-hidden bg-gradient-to-b from-warm-50 to-white">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-left z-10 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-semibold mb-6 border border-accent/20 text-sm">
                <Star className="w-4 h-4 fill-current" />
                <span>Meal Planning App</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-display text-gray-900 mb-6 leading-tight">
                Your groceries, <br className="hidden md:block" />
                <span className="text-primary relative mt-2">
                  done in 1 minute.
                  <svg
                    className="absolute w-full h-3 -bottom-1 left-0 text-primary/20 -z-10"
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 5 Q 50 10 100 5 L 100 10 L 0 10 Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                We create personalized menus tailored to your tastes and
                automatically fill your cart with exactly what you need. Eat
                better, save time, waste less.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  onClick={handleStartShopping}
                  className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/30 hover:scale-105 transition-transform duration-300 flex items-center gap-2 font-semibold"
                >
                  Start Shopping <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  variant="secondary"
                  className="h-14 px-8 text-lg rounded-full bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-100 font-semibold transition-colors"
                  onClick={() =>
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  See How It Works
                </Button>
              </div>

              <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500 font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" /> No credit
                  card required
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Sign up for
                  free
                </span>
              </div>
            </div>

            {/* Hero Image */}
            <div
              className="relative animate-fade-in opacity-0"
              style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
            >
              <div className="relative aspect-square md:aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white transform rotate-1 hover:rotate-0 transition-transform duration-700 bg-gray-100">
                <img
                  src="/hero-food.png"
                  alt="Fresh healthy ingredients and meals"
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=1000&auto=format&fit=crop";
                  }}
                />

                {/* Floating Badge 1 */}
                <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-white/50 flex items-center gap-3 animate-float">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="pr-2">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                      Cart Filled
                    </div>
                    <div className="text-gray-900 font-bold text-sm">
                      24 Items Added
                    </div>
                  </div>
                </div>

                {/* Floating Badge 2 */}
                <div
                  className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-white/50 flex items-center gap-3 animate-float"
                  style={{ animationDelay: "1.5s" }}
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <div className="pr-2">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                      Generated
                    </div>
                    <div className="text-gray-900 font-bold text-sm">
                      Smart Weekly Menu
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Blobs */}
              <div className="absolute -top-12 -right-12 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
              <div className="absolute -bottom-8 -left-12 w-64 h-64 bg-accent/15 rounded-full blur-3xl -z-10"></div>
            </div>
          </div>
        </section>

        {/* 3. Social Proof Bar */}
        <section className="border-y border-gray-100 bg-white py-10 overflow-hidden">
          <div className="max-w-[100vw] mx-auto relative z-10">
            <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 px-6">
              Trusted by 10,000+ healthy families
            </p>
            <div
              className="flex overflow-hidden relative w-full"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
              }}
            >
              <div className="flex items-center gap-16 md:gap-24 w-max animate-marquee py-2 opacity-60 grayscale hover:grayscale-0 transition-all duration-500 hover:[animation-play-state:paused]">
                <PressLogos />
                <PressLogos />
              </div>
            </div>
          </div>
        </section>

        {/* 4. How It Works */}
        <section
          id="how-it-works"
          className="py-5 md:py-8 bg-gray-50 relative overflow-hidden"
        >
          <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold reveal-on-scroll opacity-0">
              Simple Process
            </div>
            <h2
              className="text-3xl md:text-5xl font-bold font-display text-gray-900 mb-6 reveal-on-scroll opacity-0"
              style={{ animationDelay: "100ms" }}
            >
              How Nutri Works
            </h2>
            <p
              className="text-xl text-gray-500 max-w-2xl mx-auto mb-20 reveal-on-scroll opacity-0"
              style={{ animationDelay: "200ms" }}
            >
              A seamless experience from meal discovery to groceries arriving at
              your door.
            </p>

            <div className="grid md:grid-cols-3 gap-12 relative max-w-5xl mx-auto">
              {/* Connecting Line (Desktop only) */}
              <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10 -z-0"></div>

              {/* Step 1 */}
              <div
                className="flex flex-col items-center group relative z-10 reveal-on-scroll opacity-0"
                style={{ animationDelay: "300ms" }}
              >
                <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary mb-8 group-hover:-translate-y-2 transition-transform duration-300 relative border border-gray-100">
                  <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    1
                  </div>
                  <Utensils className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold font-display text-gray-900 mb-3 group-hover:text-primary transition-colors">
                  Tell us what you like
                </h3>
                <p className="text-gray-500 leading-relaxed text-center px-4">
                  Take a quick 60-second quiz about your dietary goals,
                  allergies, and family size.
                </p>
              </div>

              {/* Step 2 */}
              <div
                className="flex flex-col items-center group relative z-10 reveal-on-scroll opacity-0"
                style={{ animationDelay: "400ms" }}
              >
                <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary mb-8 group-hover:-translate-y-2 transition-transform duration-300 relative border border-gray-100">
                  <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    2
                  </div>
                  <ChefHat className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold font-display text-gray-900 mb-3 group-hover:text-primary transition-colors">
                  Get your smart menu
                </h3>
                <p className="text-gray-500 leading-relaxed text-center px-4">
                  Our core AI instantly creates a balanced, delicious weekly
                  meal plan optimized for variety.
                </p>
              </div>

              {/* Step 3 */}
              <div
                className="flex flex-col items-center group relative z-10 reveal-on-scroll opacity-0"
                style={{ animationDelay: "500ms" }}
              >
                <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary mb-8 group-hover:-translate-y-2 transition-transform duration-300 relative border border-gray-100">
                  <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    3
                  </div>
                  <ShoppingCart className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold font-display text-gray-900 mb-3 group-hover:text-primary transition-colors">
                  1-Click Groceries
                </h3>
                <p className="text-gray-500 leading-relaxed text-center px-4">
                  We match ingredients to your local store. Review your cart and
                  check out instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Features Showcase */}
        <section id="features" className="py-5 md:py-8 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6 reveal-on-scroll opacity-0">
              <div className="max-w-2xl">
                <div className="inline-block mb-4 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-semibold">
                  Everything you need
                </div>
                <h2 className="text-3xl md:text-5xl font-bold font-display text-gray-900 leading-tight">
                  Smarter eating, <br />
                  powered by technology
                </h2>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div
                className="bg-warm-50 rounded-[2rem] p-8 border border-warm-100 hover:shadow-xl hover:border-warm-200 transition-all duration-300 reveal-on-scroll opacity-0"
                style={{ animationDelay: "100ms" }}
              >
                <div className="w-14 h-14 bg-white text-primary rounded-xl flex items-center justify-center shadow-sm mb-8">
                  <Zap className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold font-display text-gray-900 mb-4">
                  AI Recipe Matching
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We don't just give you random recipes. Our algorithm learns
                  your palate and suggests meals you're guaranteed to love,
                  while keeping macros balanced.
                </p>
              </div>

              {/* Feature 2 */}
              <div
                className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all duration-300 reveal-on-scroll opacity-0"
                style={{ animationDelay: "200ms" }}
              >
                <div className="w-14 h-14 bg-white text-blue-500 rounded-xl flex items-center justify-center shadow-sm mb-8">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold font-display text-gray-900 mb-4">
                  Pantry Awareness
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Tell Nutri what's already in your fridge. We'll prioritize
                  recipes using those ingredients to reduce food waste and save
                  you money.
                </p>
              </div>

              {/* Feature 3 */}
              <div
                className="bg-orange-50 rounded-[2rem] p-8 border border-orange-100 hover:shadow-xl hover:border-orange-200 transition-all duration-300 reveal-on-scroll opacity-0"
                style={{ animationDelay: "300ms" }}
              >
                <div className="w-14 h-14 bg-white text-accent rounded-xl flex items-center justify-center shadow-sm mb-8">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold font-display text-gray-900 mb-4">
                  Nutrition Tracking
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Every meal plan comes with detailed macronutrient and calorie
                  breakdowns, making it effortless to hit your fitness and
                  health goals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Benefits Split Section */}
        <section className="py-5 md:py-8 bg-gray-900 text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
            <div className="relative reveal-on-scroll opacity-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-[2.5rem] transform -rotate-3 scale-105"></div>
              <img
                src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop"
                alt="Family cooking together"
                className="relative rounded-[2.5rem] object-cover aspect-[4/5] md:aspect-square w-full shadow-2xl border border-white/10"
              />
            </div>

            <div
              className="reveal-on-scroll opacity-0"
              style={{ animationDelay: "200ms" }}
            >
              <div className="inline-block mb-4 px-3 py-1 rounded-full bg-white/10 text-white/80 text-sm font-semibold border border-white/10">
                Why Choose Nutri
              </div>
              <h2 className="text-3xl md:text-5xl font-bold font-display mb-8 leading-tight">
                Spend less time planning, more time{" "}
                <span className="text-primary">living</span>.
              </h2>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="mt-1 bg-primary/20 p-2 rounded-lg text-primary h-fit">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-display mb-2">
                      Save 4+ hours a week
                    </h4>
                    <p className="text-gray-400 leading-relaxed">
                      Stop wandering supermarket aisles and scrolling Pinterest
                      for dinner ideas. It's fully automated.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 bg-accent/20 p-2 rounded-lg text-accent h-fit">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-display mb-2">
                      Cut grocery bills by 20%
                    </h4>
                    <p className="text-gray-400 leading-relaxed">
                      We only buy exactly what you need for the week's recipes.
                      No more impulse buys or rotting produce.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1 bg-blue-500/20 p-2 rounded-lg text-blue-400 h-fit">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-display mb-2">
                      Discover new favorites
                    </h4>
                    <p className="text-gray-400 leading-relaxed">
                      Break out of your cooking rut with new, highly-rated
                      recipes tailored to your skill level.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Testimonials */}
        <section
          id="testimonials"
          className="py-5 md:py-8 bg-warm-50 relative overflow-hidden"
        >
          {/* Decorative SVG background */}
          <svg
            className="absolute top-0 right-0 w-1/3 h-full text-warm-100 opacity-50 -z-0"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path
              d="M100 0 L100 100 L0 100 Q50 50 100 0 Z"
              fill="currentColor"
            />
          </svg>

          <div className="max-w-[100vw] mx-auto relative z-10">
            <div className="text-center mb-16 reveal-on-scroll opacity-0 px-6">
              <h2 className="text-3xl md:text-5xl font-bold font-display text-gray-900 mb-6">
                Loved by home chefs
              </h2>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                Don't just take our word for it. Here's what our community says.
              </p>
            </div>

            <div
              className="flex overflow-hidden relative reveal-on-scroll opacity-0 w-full"
              style={{
                animationDelay: "100ms",
                maskImage:
                  "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
              }}
            >
              <div className="flex gap-8 w-max animate-marquee py-4 px-4 hover:[animation-play-state:paused]">
                {/* We render the array twice to create a seamless infinite looping marquee */}
                {[...reviews, ...reviews].map((review, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 w-[350px] shrink-0 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div>
                      <div className="flex text-accent mb-4">
                        <Star className="w-5 h-5 fill-current" />
                        <Star className="w-5 h-5 fill-current" />
                        <Star className="w-5 h-5 fill-current" />
                        <Star className="w-5 h-5 fill-current" />
                        <Star className="w-5 h-5 fill-current" />
                      </div>
                      <Quote className="w-8 h-8 text-primary/20 mb-4" />
                      <p className="text-gray-700 text-lg mb-8 leading-relaxed font-medium">
                        "{review.quote}"
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-auto">
                      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0">
                        <img
                          src={review.avatar}
                          alt={review.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold font-display text-gray-900">
                          {review.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {review.role}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 8. CTA Banner */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto bg-primary rounded-[3rem] px-6 py-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl reveal-on-scroll opacity-0">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold font-display mb-6 tracking-tight">
                Ready to eat better?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto font-medium">
                Join thousands of users who have transformed their weekly
                grocery routine. First week is on us.
              </p>
              <Button
                onClick={handleStartShopping}
                className="bg-white text-primary hover:bg-gray-50 h-14 sm:h-16 w-full sm:w-auto px-4 sm:px-10 text-lg sm:text-xl rounded-full shadow-xl hover:scale-105 transition-transform duration-300 font-bold"
              >
                Create My Free Account
              </Button>
              <p className="mt-6 text-white/70 text-sm font-medium">
                No credit card required to start
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* --- MODALS --- */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onLoginSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </div>
  );
};
