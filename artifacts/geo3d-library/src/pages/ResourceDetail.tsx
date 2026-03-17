import { useParams, Link } from "wouter";
import { useGetResource } from "@workspace/api-client-react";
import { ArrowLeft, MapPin, Calendar, User, Tag, Share2, Layers, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { DownloadButton } from "@/components/DownloadButton";

export default function ResourceDetail() {
  const params = useParams();
  const id = Number(params.id);
  
  const { data: resource, isLoading, isError } = useGetResource(id);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading resource details...</p>
      </div>
    );
  }

  if (isError || !resource) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
          <Layers className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-foreground mb-4">Resource Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md">The resource you are looking for does not exist or has been removed from the library.</p>
        <Link href="/library" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
          Return to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      <Link href="/library" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group font-medium">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Library
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-semibold uppercase tracking-wider">
                {resource.type}
              </span>
              {resource.categoryName && (
                <span className="px-3 py-1 rounded-full bg-secondary border border-border text-foreground text-sm font-medium">
                  {resource.categoryName}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
              {resource.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground py-4 border-y border-border/50">
              {resource.author && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{resource.author}</span>
                </div>
              )}
              {resource.year && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{resource.year}</span>
                </div>
              )}
              {resource.region && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{resource.region}</span>
                </div>
              )}
            </div>

            <div className="prose prose-invert prose-lg max-w-none prose-headings:font-serif prose-p:text-muted-foreground prose-p:leading-relaxed">
              <h3>Abstract / Description</h3>
              <p>
                {resource.description || "No detailed description is available for this resource in the current database. Please download the attached files for full information."}
              </p>
            </div>

            {resource.tags && resource.tags.length > 0 && (
              <div className="pt-6">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground text-sm hover:text-foreground hover:bg-secondary cursor-pointer transition-colors">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6 rounded-2xl sticky top-28"
          >
            {/* Visual Preview */}
            <div className="w-full aspect-video rounded-xl bg-secondary overflow-hidden mb-6 border border-border relative">
              {resource.thumbnailUrl ? (
                <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-background">
                  <Layers className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <DownloadButton
                resourceType={resource.type as any}
                className="w-full py-4 text-base font-bold"
                size="lg"
                label={`Descarcă ${resource.type === "map" ? "Harta" : resource.type === "model3d" ? "Modelul 3D" : "Resursa"}`}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 rounded-xl bg-secondary text-foreground font-semibold hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button className="py-3 rounded-xl bg-secondary text-foreground font-semibold hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Map View
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/50 text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added to Library</span>
                <span className="text-foreground font-medium">{formatDate(resource.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Internal ID</span>
                <span className="text-foreground font-mono bg-background/50 px-2 rounded">GEO-{resource.id.toString().padStart(4, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nivel Acces</span>
                <span className={
                  resource.type === "map" || resource.type === "image" ? "text-blue-400 font-medium" :
                  resource.type === "model3d" || resource.type === "dataset" ? "text-amber-400 font-medium" :
                  "text-violet-400 font-medium"
                }>
                  {resource.type === "map" || resource.type === "image" ? "Basic+" :
                   resource.type === "model3d" || resource.type === "dataset" ? "Pro+" :
                   "Business"}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
