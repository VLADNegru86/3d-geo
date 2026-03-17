import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

type Mode = "choice" | "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register, continueAsGuest } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
      setLocation("/subscription");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_80%,rgba(245,166,35,0.08),transparent)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-600 shadow-lg shadow-primary/30 mb-4">
            <Compass className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Geo<span className="text-primary">3D</span> Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Platforma Geologică Digitală</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
          <AnimatePresence mode="wait">
            {mode === "choice" && (
              <motion.div
                key="choice"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <h2 className="text-xl font-serif font-bold text-foreground mb-2 text-center">Bun venit!</h2>
                <p className="text-sm text-muted-foreground text-center mb-8">
                  Alege cum dorești să accesezi biblioteca
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => setMode("login")}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5" />
                      <span>Autentifică-te cu email</span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setMode("register")}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-secondary border border-border text-foreground font-semibold hover:bg-secondary/80 hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-primary" />
                      <span>Creează cont nou</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <div className="relative flex items-center py-2">
                    <div className="flex-1 border-t border-border/50" />
                    <span className="px-3 text-xs text-muted-foreground">sau</span>
                    <div className="flex-1 border-t border-border/50" />
                  </div>

                  <button
                    onClick={handleGuest}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-border/50 text-muted-foreground text-sm hover:text-foreground hover:border-border hover:bg-secondary/30 transition-all"
                  >
                    Continuă ca vizitator (Guest)
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-6">
                  Modul Guest oferă acces limitat la resurse. <br />
                  <button onClick={() => setMode("register")} className="text-primary hover:underline">
                    Creează cont gratuit
                  </button>{" "}
                  pentru mai multe funcționalități.
                </p>
              </motion.div>
            )}

            {mode === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <button onClick={() => setMode("choice")} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
                  ← Înapoi
                </button>
                <h2 className="text-xl font-serif font-bold text-foreground mb-6">Autentificare</h2>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                        placeholder="email@exemplu.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">Parolă</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="w-full pl-10 pr-10 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-60 transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Autentifică-te
                  </button>
                </form>

                <p className="text-sm text-center text-muted-foreground mt-6">
                  Nu ai cont?{" "}
                  <button onClick={() => setMode("register")} className="text-primary hover:underline font-medium">
                    Înregistrează-te
                  </button>
                </p>
              </motion.div>
            )}

            {mode === "register" && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <button onClick={() => setMode("choice")} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
                  ← Înapoi
                </button>
                <h2 className="text-xl font-serif font-bold text-foreground mb-6">Cont nou</h2>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">Nume (opțional)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                        placeholder="Numele tău"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                        placeholder="email@exemplu.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">Parolă</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full pl-10 pr-10 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                        placeholder="Minim 6 caractere"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-60 transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Creează cont
                  </button>
                </form>

                <p className="text-sm text-center text-muted-foreground mt-6">
                  Ai deja cont?{" "}
                  <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                    Autentifică-te
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
