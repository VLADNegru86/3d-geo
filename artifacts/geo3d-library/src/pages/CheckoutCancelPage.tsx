import { motion } from "framer-motion";
import { XCircle, ArrowLeft, Crown } from "lucide-react";
import { useLocation } from "wouter";

export default function CheckoutCancelPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
            <XCircle className="w-16 h-16 text-red-400" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-foreground">Plată anulată</h2>
          <p className="text-muted-foreground text-lg">
            Procesul de plată a fost anulat. Nu a fost efectuată nicio tranzacție.
          </p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setLocation("/subscription")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-medium hover:bg-secondary/80 transition-colors"
            >
              <Crown className="w-4 h-4" />
              Alege un plan
            </button>
            <button
              onClick={() => setLocation("/")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Acasă
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
