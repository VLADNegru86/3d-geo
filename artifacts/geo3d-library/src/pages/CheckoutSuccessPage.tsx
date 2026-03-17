import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, Crown, ArrowRight } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { refetchUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setStatus("error");
      setErrorMsg("Session ID lipsă. Contactați administratorul dacă plata a trecut.");
      return;
    }

    const token = localStorage.getItem("geo3d_token");
    fetch(`${BASE}/api/stripe/verify-checkout?session_id=${sessionId}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then(async (data) => {
        if (data.success) {
          await refetchUser();
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg(data.error || "Verificare eșuată");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Nu s-a putut verifica plata. Abonamentul va fi activat în câteva minute.");
      });
  }, [search, refetchUser]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <h2 className="text-2xl font-serif font-bold text-foreground">Verificăm plata...</h2>
            <p className="text-muted-foreground">Te rugăm să aștepți câteva secunde.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-16 h-16 text-emerald-400" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Crown className="w-4 h-4" />
              Abonament activat
            </div>
            <h2 className="text-3xl font-serif font-bold text-foreground">Bun venit!</h2>
            <p className="text-muted-foreground text-lg">
              Abonamentul tău a fost activat cu succes. Acum ai acces la toate resursele incluse în planul ales.
            </p>
            <button
              onClick={() => setLocation("/")}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
            >
              Explorează platforma
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Crown className="w-16 h-16 text-amber-400" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Plată înregistrată</h2>
            <p className="text-muted-foreground">
              {errorMsg || "Plata ta a fost înregistrată. Abonamentul va fi activat în câteva minute."}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setLocation("/subscription")}
                className="px-5 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-medium hover:bg-secondary/80 transition-colors"
              >
                Abonamente
              </button>
              <button
                onClick={() => setLocation("/")}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all"
              >
                Acasă
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
