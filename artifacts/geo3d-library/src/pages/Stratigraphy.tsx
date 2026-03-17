import { useListStratigraphicUnits } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, ChevronRight, Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { AdminStratigraphyPanel } from "@/components/admin/AdminStratigraphyPanel";

export default function Stratigraphy() {
  const { user } = useAuth();
  const { data: units, isLoading, refetch } = useListStratigraphicUnits() as any;
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  // Group by Era for structured display
  const groupedByEra = units?.reduce((acc: any, unit) => {
    if (!acc[unit.era]) acc[unit.era] = [];
    acc[unit.era].push(unit);
    return acc;
  }, {}) || {};

  const eras = ["Cenozoic", "Mesozoic", "Paleozoic", "Precambrian"]; // Fixed order top to bottom

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-foreground mb-3 flex items-center gap-3">
          <Layers className="w-8 h-8 text-primary" />
          Stratigraphic Column
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Interactive geological time scale showing major stratigraphic units, periods, and epochs associated with our resource database.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Column */}
        <div className="flex-1">
          <div className="glass-panel rounded-2xl p-6 border border-border/50 shadow-2xl relative overflow-hidden">
            {/* Y-axis label */}
            <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between py-8 text-[10px] text-muted-foreground font-mono font-bold w-12 text-right pr-2 border-r border-border/50">
              <span>0 Ma</span>
              <span>252 Ma</span>
              <span>541 Ma</span>
              <span>4600 Ma</span>
            </div>

            <div className="pl-14 space-y-1">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-secondary/30 rounded-xl animate-pulse" />)}
                </div>
              ) : (
                eras.map((era) => {
                  const eraUnits = groupedByEra[era];
                  if (!eraUnits) return null;

                  // Simplified colors for main eras if missing in data
                  const baseColor = 
                    era === "Cenozoic" ? "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-200" :
                    era === "Mesozoic" ? "from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-200" :
                    era === "Paleozoic" ? "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-200" :
                    "from-slate-500/20 to-slate-600/20 border-slate-500/30 text-slate-200";

                  return (
                    <div key={era} className="flex gap-1 mb-1 relative group">
                      
                      {/* Era Label side */}
                      <div className={cn(
                        "w-12 flex items-center justify-center rounded-l-xl border-y border-l bg-gradient-to-b writing-vertical rotate-180 text-xs font-bold tracking-widest",
                        baseColor
                      )}>
                        {era}
                      </div>

                      {/* Units */}
                      <div className="flex-1 flex flex-col gap-1">
                        {eraUnits.sort((a: any, b: any) => a.ageFrom - b.ageFrom).map((unit: any) => (
                          <motion.button
                            key={unit.id}
                            whileHover={{ scale: 1.01, x: 5 }}
                            onClick={() => setSelectedUnit(unit)}
                            className={cn(
                              "relative w-full text-left p-4 rounded-r-xl border transition-all duration-300 overflow-hidden",
                              selectedUnit?.id === unit.id 
                                ? "bg-primary/20 border-primary shadow-[inset_0_0_20px_rgba(245,166,35,0.2)]" 
                                : "bg-card hover:bg-secondary border-border"
                            )}
                            style={{ 
                              // Dynamic height based on age span (rough approx for visual feel)
                              minHeight: `${Math.max(60, (unit.ageFrom - unit.ageTo) * 0.5)}px`,
                              borderLeftColor: unit.color || undefined,
                              borderLeftWidth: '4px'
                            }}
                          >
                            <div className="flex justify-between items-center relative z-10">
                              <div>
                                <h4 className="font-serif font-bold text-foreground text-lg">{unit.name}</h4>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  {unit.period && <span className="bg-background/50 px-2 py-0.5 rounded">{unit.period}</span>}
                                  {unit.epoch && <span>{unit.epoch}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-background/80 px-3 py-1.5 rounded-lg border border-border">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                {unit.ageTo} - {unit.ageFrom} Ma
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Detail Sidebar */}
        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="sticky top-28">
            <AnimatePresence mode="wait">
              {selectedUnit ? (
                <motion.div
                  key={selectedUnit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-panel p-8 rounded-2xl border-t-4 shadow-2xl"
                  style={{ borderTopColor: selectedUnit.color || 'hsl(var(--primary))' }}
                >
                  <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-2">
                    {selectedUnit.era} {selectedUnit.period && `• ${selectedUnit.period}`}
                  </div>
                  <h3 className="text-3xl font-serif font-bold text-foreground mb-4">{selectedUnit.name}</h3>
                  
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-4 mb-6 border border-border">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{selectedUnit.ageFrom} to {selectedUnit.ageTo} Million Years Ago</div>
                      <div className="text-xs text-muted-foreground">Duration: {(selectedUnit.ageFrom - selectedUnit.ageTo).toFixed(1)} Ma</div>
                    </div>
                  </div>

                  <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
                    {selectedUnit.description || "Detailed stratigraphic description for this unit is currently under review by the geological survey committee. Associated resources and map points can be explored via the library."}
                  </p>

                  {selectedUnit.region && (
                    <div className="mb-6">
                      <span className="text-sm font-semibold text-foreground block mb-1">Primary Regions:</span>
                      <span className="text-sm text-muted-foreground">{selectedUnit.region}</span>
                    </div>
                  )}

                  <div className="pt-6 border-t border-border flex flex-col gap-3">
                    <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2">
                      Find Resources
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button className="w-full py-3 rounded-xl bg-secondary text-foreground font-semibold hover:bg-secondary/80 transition-all flex items-center justify-center gap-2">
                      View on Map
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel p-10 rounded-2xl text-center border-dashed border-border/50 flex flex-col items-center justify-center h-64"
                >
                  <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Select a stratigraphic unit from the column to view detailed information.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {user?.role === "admin" && (
        <AdminStratigraphyPanel onRefresh={() => { if (typeof refetch === "function") refetch(); }} />
      )}
    </div>
  );
}
