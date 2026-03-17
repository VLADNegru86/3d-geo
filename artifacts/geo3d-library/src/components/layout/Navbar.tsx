import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Compass, BookOpen, Map as MapIcon, Layers, LayoutGrid, Search,
  Menu, X, LogOut, Crown, Shield, User, ChevronDown, CreditCard, Box, Pencil
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteContent } from "@/contexts/SiteContentContext";

const navItems = [
  { name: "Library", href: "/library", icon: BookOpen },
  { name: "Harta", href: "/map", icon: MapIcon },
  { name: "Stratigrafie", href: "/stratigraphy", icon: Layers },
  { name: "Categorii", href: "/categories", icon: LayoutGrid },
  { name: "3D Viewer", href: "/3d-viewer", icon: Box },
];

const subscriptionBadge: Record<string, { label: string; className: string }> = {
  none: { label: "Free", className: "bg-secondary text-muted-foreground" },
  basic: { label: "Basic", className: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  pro: { label: "Pro", className: "bg-primary/20 text-primary border border-primary/30" },
  business: { label: "Business", className: "bg-violet-500/20 text-violet-400 border border-violet-500/30" },
};

export function Navbar() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isGuest, logout } = useAuth();
  const { editMode, setEditMode } = useSiteContent();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  const badge = user ? subscriptionBadge[user.subscription] : null;

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300 border-b",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-border/50 shadow-lg shadow-black/20 py-3"
          : "bg-transparent border-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
              <Compass className="w-6 h-6 text-primary-foreground group-hover:rotate-45 transition-transform duration-500" />
            </div>
            <span className="font-serif font-bold text-xl tracking-wide text-foreground">
              Geo<span className="text-primary">3D</span> Library
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 relative group",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/library"
              className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Auth UI */}
            {isGuest ? (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
              >
                Autentifică-te
              </Link>
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border hover:border-primary/30 hover:bg-secondary transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-semibold text-foreground leading-none mb-0.5">
                      {user.name || user.email.split("@")[0]}
                    </div>
                    {badge && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", badge.className)}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", userMenuOpen ? "rotate-180" : "")} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl shadow-black/30 overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {user.role === "admin" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                          {badge && (
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1", badge.className)}>
                              <Crown className="w-2.5 h-2.5" /> {badge.label}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/subscription"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          Abonament
                        </Link>
                        {user.role === "admin" && (
                          <>
                            <Link
                              href="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                            >
                              <Shield className="w-4 h-4" />
                              Panou Admin
                            </Link>
                            <button
                              onClick={() => { setEditMode(!editMode); setUserMenuOpen(false); }}
                              className={cn("flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm transition-colors", editMode ? "text-primary bg-primary/5" : "text-foreground hover:bg-primary/5 hover:text-primary")}
                            >
                              <Pencil className="w-4 h-4" />
                              {editMode ? "Dezactivează editare text" : "Editare text pagini"}
                            </button>
                          </>
                        )}
                        <div className="border-t border-border my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Deconectare
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-border space-y-2">
                <Link
                  href="/subscription"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 w-full px-5 py-3 rounded-xl text-base font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                >
                  <Crown className="w-5 h-5" />
                  Abonament
                </Link>
                {user?.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-5 py-3 rounded-xl text-base font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/5 transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    Admin Panel
                  </Link>
                )}
                {user ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className="flex items-center gap-2 w-full px-5 py-3 rounded-xl text-base font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Deconectare
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center w-full px-5 py-3 rounded-xl text-base font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  >
                    Autentifică-te
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
