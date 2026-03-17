import { Compass } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/50 bg-background/50 backdrop-blur-sm relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <Compass className="w-6 h-6 text-primary" />
              <span className="font-serif font-bold text-lg text-foreground">
                Geo<span className="text-primary">3D</span> Library
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              A comprehensive open-access digital library for geological sciences, 
              providing interactive maps, stratigraphic data, and 3D visualization resources 
              for researchers and educators worldwide.
            </p>
          </div>
          
          <div>
            <h4 className="font-serif font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/library" className="text-muted-foreground hover:text-primary transition-colors">Digital Library</Link></li>
              <li><Link href="/map" className="text-muted-foreground hover:text-primary transition-colors">Interactive Map</Link></li>
              <li><Link href="/stratigraphy" className="text-muted-foreground hover:text-primary transition-colors">Stratigraphic Chart</Link></li>
              <li><Link href="/categories" className="text-muted-foreground hover:text-primary transition-colors">Collections</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-serif font-semibold text-foreground mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/library/new" className="text-muted-foreground hover:text-primary transition-colors">Submit Data</Link></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">API Documentation</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">About Project</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Use</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Geo3D Library Platform. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Built for scientific research</span>
            <span className="w-1 h-1 rounded-full bg-border self-center" />
            <span>Open Access</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
