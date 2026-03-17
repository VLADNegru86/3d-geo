import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useListResources, useListCategories } from "@workspace/api-client-react";
import { ResourceCard } from "@/components/shared/ResourceCard";
import { Search, Filter, Layers, MapPin, Loader2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { AdminResourcePanel } from "@/components/admin/AdminResourcePanel";

export default function Library() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useState(new URLSearchParams(window.location.search));
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedType) params.set("type", selectedType);
    if (selectedCategory) params.set("category", selectedCategory);
    if (page > 1) params.set("page", page.toString());
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [searchTerm, selectedType, selectedCategory, page]);

  const { data, isLoading, isError } = useListResources({
    search: searchTerm || undefined,
    type: selectedType || undefined,
    category: selectedCategory || undefined,
    page,
    limit: 12
  });

  const { data: categories } = useListCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on new search
  };

  const types = ["publication", "dataset", "map", "model3d", "report", "image"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-border/50 pb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Resource Library</h1>
          <p className="text-muted-foreground max-w-2xl">
            Search and filter through our comprehensive collection of geological data, including 3D models, maps, and academic publications.
          </p>
        </div>
        <button
          onClick={() => setLocation('/library/new')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Resource
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-8">
          
          <div className="glass-panel p-5 rounded-2xl space-y-6">
            <div className="flex items-center gap-2 text-foreground font-serif font-semibold border-b border-border pb-3">
              <Filter className="w-5 h-5 text-primary" />
              Filters
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-3 block">Resource Type</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="type" 
                    checked={selectedType === ""} 
                    onChange={() => { setSelectedType(""); setPage(1); }}
                    className="accent-primary w-4 h-4 bg-secondary border-border"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">All Types</span>
                </label>
                {types.map(t => (
                  <label key={t} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="type" 
                      checked={selectedType === t} 
                      onChange={() => { setSelectedType(t); setPage(1); }}
                      className="accent-primary w-4 h-4 bg-secondary border-border"
                    />
                    <span className="text-sm text-foreground capitalize group-hover:text-primary transition-colors">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-3 block">Category</label>
              <select 
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="w-full bg-secondary border border-border text-foreground text-sm rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              >
                <option value="">All Categories</option>
                {categories?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-8 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all glass-panel"
              placeholder="Search resources by title, author, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              type="submit"
              className="absolute inset-y-2 right-2 px-6 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Search
            </button>
          </form>

          {/* Results Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p>Loading resources...</p>
            </div>
          ) : isError ? (
            <div className="glass-panel p-8 rounded-2xl text-center border-destructive/30">
              <p className="text-destructive font-semibold text-lg mb-2">Failed to load resources</p>
              <p className="text-muted-foreground">Please try adjusting your filters or try again later.</p>
            </div>
          ) : data?.resources.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center border-dashed border-border flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-foreground mb-2">No resources found</h3>
              <p className="text-muted-foreground max-w-md">
                We couldn't find any resources matching your current search criteria. Try using broader terms or clearing some filters.
              </p>
              <button 
                onClick={() => { setSearchTerm(""); setSelectedType(""); setSelectedCategory(""); }}
                className="mt-6 px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-6 font-medium">
                Showing <span className="text-foreground">{data?.resources.length}</span> of <span className="text-foreground">{data?.total}</span> resources
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {data?.resources.map((resource, index) => (
                  <ResourceCard key={resource.id} resource={resource} index={index} />
                ))}
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex justify-center mt-12 gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-lg bg-card border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 flex items-center text-muted-foreground text-sm">
                    Page {page} of {data.totalPages}
                  </span>
                  <button
                    disabled={page === data.totalPages}
                    onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                    className="px-4 py-2 rounded-lg bg-card border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {user?.role === "admin" && (
        <AdminResourcePanel onRefresh={() => window.location.reload()} />
      )}
    </div>
  );
}
