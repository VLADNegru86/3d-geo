import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Building2, Map, Loader2, Crown, Lock, Star, ExternalLink, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "Gratuit",
    period: "",
    description: "Acces la harta geologică interactivă",
    icon: Map,
    color: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    iconColor: "text-blue-400",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    features: [
      { text: "Vizualizare hartă geologică interactivă", included: true },
      { text: "Vizualizare stratigrafie", included: true },
      { text: "Acces la lista de resurse", included: true },
      { text: "Download hărți / imagini / date", included: false },
      { text: "Acces la modele 3D geologice", included: false },
      { text: "Seturi de date geofizice", included: false },
      { text: "Rapoarte și cărți detaliate", included: false },
      { text: "Baze de date geologice", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "€400",
    period: "/lună",
    description: "Acces complet + descărcare date geologice",
    icon: Star,
    color: "from-primary/20 to-amber-600/20 border-primary/40",
    iconColor: "text-primary",
    badgeColor: "bg-primary/10 text-primary border-primary/30",
    popular: true,
    features: [
      { text: "Toate funcțiile Basic", included: true },
      { text: "Download hărți în format PDF/PNG", included: true },
      { text: "Acces la modele 3D geologice", included: true },
      { text: "Download modele 3D (toate formatele)", included: true },
      { text: "Seturi de date geofizice", included: true },
      { text: "Imagini satelitare procesate", included: true },
      { text: "Rapoarte și cărți detaliate", included: false },
      { text: "Baze de date geologice complete", included: false },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "€2.000",
    period: "/lună",
    description: "Acces complet la toate datele geologice",
    icon: Building2,
    color: "from-violet-500/20 to-purple-600/20 border-violet-500/30",
    iconColor: "text-violet-400",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    features: [
      { text: "Toate funcțiile Pro", included: true },
      { text: "Rapoarte geologice detaliate", included: true },
      { text: "Download cărți și publicații", included: true },
      { text: "Baze de date geologice complete", included: true },
      { text: "Date de foraj și analize chimice", included: true },
      { text: "Export date în formate multiple", included: true },
      { text: "API access pentru integrări", included: true },
      { text: "Suport dedicat 24/7", included: true },
    ],
  },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("geo3d_token");
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function SubscriptionPage() {
  const { user, refetchUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (planId === "basic") {
      setLocation("/");
      return;
    }

    setLoading(planId);
    try {
      const data = await apiFetch("/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(err.message || "Eroare la inițierea plății. Contactați administratorul.");
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const data = await apiFetch("/stripe/portal", { method: "POST" });
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      alert(err.message || "Portalul de abonament este indisponibil.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Crown className="w-4 h-4" />
            Planuri de Subscripție
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
            Alege planul <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-500">potrivit</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Accesează date geologice de calitate în funcție de nevoile tale profesionale sau instituționale.
          </p>
          {user && (
            <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Abonamentul tău actual:{" "}
                <span className="text-primary font-semibold capitalize">
                  {user.subscription === "none" ? "Fără abonament" : user.subscription}
                </span>
              </p>
              {(user.subscription === "pro" || user.subscription === "business") && (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {portalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
                  Gestionează abonament
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan, i) => {
          const Icon = plan.icon;
          const isCurrentPlan = user?.subscription === plan.id;
          const isLoading = loading === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative rounded-2xl border bg-gradient-to-b p-8 flex flex-col",
                plan.color,
                plan.popular ? "ring-2 ring-primary shadow-2xl shadow-primary/10 scale-105" : ""
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    ⭐ Cel mai popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className={cn("inline-flex p-3 rounded-xl border mb-4", plan.badgeColor)}>
                  <Icon className={cn("w-6 h-6", plan.iconColor)} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-3">
                    {f.included ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={cn("text-sm", f.included ? "text-foreground" : "text-muted-foreground/50")}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <div className="w-full py-3 rounded-xl bg-secondary/50 text-center text-sm font-semibold text-muted-foreground border border-border">
                  ✓ Planul tău actual
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!loading}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                    plan.popular
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                      : "bg-secondary border border-border text-foreground hover:bg-primary/10 hover:border-primary/30"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : plan.id === "basic" ? (
                    <>
                      <Zap className="w-4 h-4" />
                      {user ? "Rămâi pe Basic" : "Înregistrează-te gratuit"}
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      {user ? `Activează ${plan.name}` : `Abonează-te la ${plan.name}`}
                    </>
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="text-center mt-12 text-sm text-muted-foreground space-y-1">
        <p>Plățile sunt procesate securizat prin Stripe. Plata apare sub numele <strong className="text-foreground">GeoViewer</strong>.</p>
        <p>Poți anula oricând din portalul de abonament.</p>
        <p className="mt-2">
          Ai întrebări?{" "}
          <a href="mailto:contact@geo3d.ro" className="text-primary hover:underline">
            Contactează-ne
          </a>
        </p>
      </div>
    </div>
  );
}
