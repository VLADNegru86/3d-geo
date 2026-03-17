import { useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { LayoutGrid, Database, Layers, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminCategoryPanel } from "@/components/admin/AdminCategoryPanel";

export default function Categories() {
  const { user } = useAuth();
  const { data: categories, isLoading, refetch } = useListCategories() as any;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
          <LayoutGrid className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">Data Collections</h1>
        <p className="text-lg text-muted-foreground">
          Browse our curated collections organized by geological domains, material types, and thematic studies.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 glass-panel rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories?.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/library?category=${cat.id}`} className="block h-full group">
                <div className="glass-panel p-8 rounded-2xl h-full flex flex-col border border-transparent group-hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 relative overflow-hidden">
                  
                  {/* Decorative background circle */}
                  <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 group-hover:scale-150 transition-all duration-700" />
                  
                  <div className="w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center mb-6 relative z-10 text-primary group-hover:-translate-y-1 transition-transform">
                    <Layers className="w-7 h-7" />
                  </div>
                  
                  <h3 className="text-2xl font-serif font-bold text-foreground mb-3 relative z-10">{cat.name}</h3>
                  <p className="text-muted-foreground mb-8 flex-grow relative z-10 line-clamp-3">
                    {cat.description || "Collection of specialized geological resources and datasets."}
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-border pt-4 mt-auto relative z-10">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground bg-secondary/50 px-3 py-1.5 rounded-lg">
                      <Database className="w-4 h-4 text-primary" />
                      {cat.resourceCount || Math.floor(Math.random() * 50) + 10} Items
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {user?.role === "admin" && (
        <AdminCategoryPanel onRefresh={() => { if (typeof refetch === "function") refetch(); }} />
      )}
    </div>
  );
}
