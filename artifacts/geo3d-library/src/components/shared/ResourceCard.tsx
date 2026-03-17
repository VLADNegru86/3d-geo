import { Resource } from "@workspace/api-client-react/src/generated/api.schemas";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookText, Database, Map as MapIcon, Cuboid, FileText, Image as ImageIcon, Calendar, MapPin, User, Lock, Download } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const typeIcons: Record<string, any> = {
  publication: BookText,
  dataset: Database,
  map: MapIcon,
  model3d: Cuboid,
  report: FileText,
  image: ImageIcon,
};

const typeColors: Record<string, string> = {
  publication: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  dataset: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  map: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  model3d: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  report: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  image: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

const subscriptionRequired: Record<string, { label: string; color: string }> = {
  map: { label: "Basic", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  image: { label: "Basic", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  dataset: { label: "Pro", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  model3d: { label: "Pro", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  report: { label: "Business", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
  publication: { label: "Business", color: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
};

interface ResourceCardProps {
  resource: Resource;
  index?: number;
}

export function ResourceCard({ resource, index = 0 }: ResourceCardProps) {
  const Icon = typeIcons[resource.type] || FileText;
  const colorClass = typeColors[resource.type] || typeColors.report;
  const subReq = subscriptionRequired[resource.type];
  const { canDownload } = useAuth();
  const hasAccess = canDownload(resource.type as any);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group"
    >
      <Link href={`/resources/${resource.id}`} className="block h-full">
        <div className="h-full glass-panel rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-primary/10 transition-all duration-300 flex flex-col relative">

          {/* Top image placeholder if no thumbnail */}
          <div className="h-40 w-full bg-secondary/50 relative overflow-hidden flex items-center justify-center">
            {resource.thumbnailUrl ? (
              <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-secondary to-background flex items-center justify-center">
                <Icon className="w-16 h-16 text-white/10" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 backdrop-blur-md", colorClass)}>
                <Icon className="w-3.5 h-3.5" />
                <span className="capitalize">{resource.type}</span>
              </span>
            </div>

            {/* Subscription badge top-right */}
            {subReq && (
              <div className="absolute top-4 right-4">
                <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 backdrop-blur-md", subReq.color)}>
                  {hasAccess ? (
                    <Download className="w-2.5 h-2.5" />
                  ) : (
                    <Lock className="w-2.5 h-2.5" />
                  )}
                  {subReq.label}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5 flex flex-col flex-grow">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="font-serif text-lg font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {resource.title}
              </h3>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
              {resource.description || "No description provided for this resource."}
            </p>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-muted-foreground mt-auto">
              {resource.author && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary/70" />
                  <span className="truncate">{resource.author}</span>
                </div>
              )}
              {resource.region && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary/70" />
                  <span className="truncate">{resource.region}</span>
                </div>
              )}
              {resource.year && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary/70" />
                  <span>{resource.year}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border/50">
                {resource.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground">
                    {tag}
                  </span>
                ))}
                {resource.tags.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground">
                    +{resource.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Download indicator */}
            <div className={cn(
              "mt-4 pt-3 border-t border-border/50 flex items-center gap-1.5 text-xs font-medium",
              hasAccess ? "text-emerald-400" : "text-muted-foreground"
            )}>
              {hasAccess ? (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Disponibil pentru descărcare
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Necesită abonament {subReq?.label}
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
