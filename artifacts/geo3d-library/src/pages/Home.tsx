import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Globe, Layers, BookOpen, Database, Search, ShieldCheck, Plus } from "lucide-react";
import { useGetStats, useListCategories, useListResources } from "@workspace/api-client-react";
import { ResourceCard } from "@/components/shared/ResourceCard";
import { useAuth } from "@/contexts/AuthContext";
import { EditableText } from "@/components/shared/EditableText";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { user } = useAuth();
  const { data: categories, isLoading: categoriesLoading } = useListCategories();
  const { data: recentRes, isLoading: recentLoading } = useListResources({ limit: 4 });

  return (
    <div className="pb-24">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background Image requested in requirements.yaml */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Geological strata visualization" 
            className="w-full h-full object-cover opacity-40 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Open Access Platform
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold font-serif leading-tight text-white mb-6">
                <EditableText contentKey="hero.title.prefix" fallback="Global" className="text-white" />{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-500">
                  <EditableText contentKey="hero.title.brand" fallback="Geo3D" />
                </span>{" "}
                <EditableText contentKey="hero.title.suffix" fallback="Library" className="text-white" />
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl">
                <EditableText
                  contentKey="hero.subtitle"
                  fallback="Explore a comprehensive digital repository of geological data, interactive maps, stratigraphic models, and scientific publications designed for researchers and institutions worldwide."
                  multiline
                />
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/library"
                  className="px-8 py-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-[0_0_40px_-10px_rgba(245,166,35,0.5)] hover:shadow-[0_0_60px_-15px_rgba(245,166,35,0.7)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Explore Repository
                </Link>
                <Link
                  href="/map"
                  className="px-8 py-4 rounded-xl font-semibold glass-panel hover:bg-white/10 transition-all duration-300 flex items-center gap-2 text-foreground"
                >
                  <Globe className="w-5 h-5 text-primary" />
                  Interactive Map
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-20 -mt-16 mb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border/50">
          {[
            { label: "Total Resources", value: stats?.totalResources || "12,450+", icon: Database, delay: 0.1 },
            { label: "Data Categories", value: stats?.totalCategories || "24", icon: Layers, delay: 0.2 },
            { label: "Map Data Points", value: stats?.totalMapPoints || "8,300+", icon: Globe, delay: 0.3 },
            { label: "Total Downloads", value: stats?.totalDownloads || "145K+", icon: BookOpen, delay: 0.4 },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: stat.delay }}
              className="flex flex-col items-center text-center px-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <stat.icon className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-serif font-bold text-foreground mb-1">
                {statsLoading ? <div className="h-8 w-20 bg-secondary/50 rounded animate-pulse" /> : stat.value}
              </h3>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories Overview */}
      <section className="py-16 bg-secondary/20 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground mb-2">Browse by Category</h2>
              <p className="text-muted-foreground">Discover structured geological datasets and literature.</p>
            </div>
            <Link href="/categories" className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 group">
              View all <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {categoriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories?.slice(0, 4).map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link href={`/library?category=${cat.id}`} className="block h-full">
                    <div className="h-full bg-card hover:bg-secondary/40 border border-border rounded-2xl p-6 transition-all duration-300 group">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                        <Layers className="w-6 h-6" />
                      </div>
                      <h3 className="font-serif font-semibold text-lg text-foreground mb-2">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Admin Quick-Access Bar */}
      {user?.role === "admin" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-4 flex-wrap"
          >
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-semibold">Panou Admin</span>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { href: "/library", label: "Adaugă Resursă", icon: BookOpen },
                { href: "/categories", label: "Adaugă Categorie", icon: Layers },
                { href: "/stratigraphy", label: "Adaugă Unitate", icon: Database },
                { href: "/map", label: "Adaugă Punct Hartă", icon: Globe },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors cursor-pointer">
                    <Plus className="w-3 h-3" />
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                </Link>
              ))}
            </div>
            <div className="ml-auto text-xs text-muted-foreground hidden md:block">
              Logat ca <span className="text-primary font-medium">{user.email}</span>
            </div>
          </motion.div>
        </section>
      )}

      {/* Recent Resources */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-serif font-bold text-foreground mb-2">Recently Added</h2>
            <p className="text-muted-foreground">Latest publications, models, and datasets.</p>
          </div>
          <Link href="/library" className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 group">
            Go to Library <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {recentLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[...Array(4)].map((_, i) => (
                <div key={i} className="h-80 rounded-2xl bg-card border border-border animate-pulse" />
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentRes?.resources.map((res, i) => (
              <ResourceCard key={res.id} resource={res} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
