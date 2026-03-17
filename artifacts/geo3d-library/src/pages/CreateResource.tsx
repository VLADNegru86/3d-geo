import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useCreateResource, useListCategories } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Upload, Loader2, Save, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

// Schema for form validation
const createResourceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  type: z.enum(["publication", "dataset", "map", "model3d", "report", "image"]),
  categoryId: z.coerce.number().optional(),
  region: z.string().optional(),
  author: z.string().optional(),
  year: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof createResourceSchema>;

export default function CreateResource() {
  const [, setLocation] = useLocation();
  const { data: categories } = useListCategories();
  
  const createMutation = useCreateResource();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createResourceSchema),
    defaultValues: {
      type: "dataset"
    }
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: (newResource) => {
        setLocation(`/resources/${newResource.id}`);
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/library" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Submit Resource</h1>
          <p className="text-muted-foreground">Add a new geological dataset, publication, or 3D model to the public repository.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="glass-panel p-8 rounded-2xl space-y-6">
            <h3 className="text-xl font-serif font-semibold text-foreground border-b border-border pb-4">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Resource Title *</label>
              <input 
                {...register("title")}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                placeholder="e.g., Seismic Data for Carpathian Basin 2024"
              />
              {errors.title && <p className="text-destructive text-sm mt-1.5 flex items-center gap-1"><AlertCircle className="w-4 h-4"/>{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Resource Type *</label>
                <select 
                  {...register("type")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none capitalize"
                >
                  {["publication", "dataset", "map", "model3d", "report", "image"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Category</label>
                <select 
                  {...register("categoryId")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                >
                  <option value="">Select a category...</option>
                  {categories?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
              <textarea 
                {...register("description")}
                rows={4}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none resize-y"
                placeholder="Provide a detailed abstract or description..."
              />
            </div>
          </div>

          <div className="glass-panel p-8 rounded-2xl space-y-6">
            <h3 className="text-xl font-serif font-semibold text-foreground border-b border-border pb-4">Metadata</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Author / Institution</label>
                <input 
                  {...register("author")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                  placeholder="e.g., Dr. Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Year</label>
                <input 
                  type="number"
                  {...register("year")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                  placeholder="2024"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Region</label>
                <input 
                  {...register("region")}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                  placeholder="e.g., Transylvania"
                />
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-2xl">
            <h3 className="text-xl font-serif font-semibold text-foreground mb-4">File Upload</h3>
            <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-secondary/20 hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary-foreground" />
              </div>
              <p className="text-foreground font-semibold mb-1">Click to upload or drag and drop</p>
              <p className="text-muted-foreground text-sm">ZIP, PDF, LAS, GeoJSON (Max 500MB)</p>
            </div>
          </div>

          {createMutation.isError && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Failed to submit resource. Please check the form and try again.</p>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => setLocation('/library')}
              className="px-6 py-3 rounded-xl text-foreground font-semibold hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Publish Resource
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
