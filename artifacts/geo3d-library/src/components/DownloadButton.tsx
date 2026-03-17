import { useState } from "react";
import { Download, Lock, Loader2, Crown } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ResourceType = "map" | "model3d" | "report" | "publication" | "dataset" | "image";

interface DownloadButtonProps {
  resourceType: ResourceType;
  downloadUrl?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const subscriptionRequired: Record<ResourceType, { plan: string; label: string; color: string }> = {
  map: { plan: "pro", label: "Pro", color: "text-primary" },
  image: { plan: "pro", label: "Pro", color: "text-primary" },
  dataset: { plan: "pro", label: "Pro", color: "text-primary" },
  model3d: { plan: "pro", label: "Pro", color: "text-primary" },
  report: { plan: "business", label: "Business", color: "text-violet-400" },
  publication: { plan: "business", label: "Business", color: "text-violet-400" },
};

export function DownloadButton({ resourceType, downloadUrl, className, size = "md", label }: DownloadButtonProps) {
  const { user, isGuest, canDownload } = useAuth();
  const [, setLocation] = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const allowed = canDownload(resourceType);
  const req = subscriptionRequired[resourceType];

  const handleClick = async () => {
    if (!user && !isGuest) {
      setLocation("/login");
      return;
    }
    if (!allowed) {
      setShowModal(true);
      return;
    }
    if (downloadUrl) {
      setDownloading(true);
      try {
        window.open(downloadUrl, "_blank");
      } finally {
        setDownloading(false);
      }
    } else {
      // Simulated download for demo
      setDownloading(true);
      await new Promise(r => setTimeout(r, 1200));
      setDownloading(false);
      alert("Download simulat - în implementarea reală, fișierul ar fi descărcat.");
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 rounded-xl font-semibold transition-all",
          sizeClasses[size],
          allowed
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
            : "bg-secondary border border-border text-muted-foreground hover:border-amber-500/30 hover:text-amber-400",
          className
        )}
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : allowed ? (
          <Download className="w-4 h-4" />
        ) : (
          <Lock className="w-4 h-4" />
        )}
        {label || (allowed ? "Descarcă" : `Necesită ${req.label}`)}
      </button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <DialogTitle className="text-xl font-serif">Abonament necesar</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              Descărcarea acestui tip de resursă ({resourceType}) necesită un abonament{" "}
              <span className={cn("font-bold", req.color)}>{req.label}</span> sau mai avansat.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 p-4 rounded-xl bg-secondary/50 border border-border text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
              <div>
                {user
                  ? `Abonamentul tău actual (${user.subscription === "none" ? "Free" : user.subscription}) nu include această resursă.`
                  : "Trebuie să ai un cont și un abonament activ pentru a descărca."}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => { setShowModal(false); setLocation("/subscription"); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              <Crown className="w-4 h-4" />
              Vezi planuri
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-medium hover:bg-secondary/80 transition-colors"
            >
              Închide
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
