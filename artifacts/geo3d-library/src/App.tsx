import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SiteContentProvider } from "@/contexts/SiteContentContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Library from "@/pages/Library";
import MapPage from "@/pages/MapPage";
import Stratigraphy from "@/pages/Stratigraphy";
import Categories from "@/pages/Categories";
import ResourceDetail from "@/pages/ResourceDetail";
import CreateResource from "@/pages/CreateResource";
import LoginPage from "@/pages/LoginPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import AdminPanel from "@/pages/AdminPanel";
import Viewer3DPage from "@/pages/Viewer3DPage";
import CheckoutSuccessPage from "@/pages/CheckoutSuccessPage";
import CheckoutCancelPage from "@/pages/CheckoutCancelPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRouter() {
  const { isLoading, user, isGuest } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // If not logged in and not guest, show login page for non-public routes
  if (!user && !isGuest) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route component={LoginPage} />
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={LoginPage} />
        <Route path="/library" component={Library} />
        <Route path="/library/new" component={CreateResource} />
        <Route path="/resources/:id" component={ResourceDetail} />
        <Route path="/map" component={MapPage} />
        <Route path="/stratigraphy" component={Stratigraphy} />
        <Route path="/categories" component={Categories} />
        <Route path="/subscription" component={SubscriptionPage} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/3d-viewer" component={Viewer3DPage} />
        <Route path="/checkout/success" component={CheckoutSuccessPage} />
        <Route path="/checkout/cancel" component={CheckoutCancelPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SiteContentProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRouter />
            </WouterRouter>
            <Toaster />
          </SiteContentProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
