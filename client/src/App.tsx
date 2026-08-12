import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ClientDashboard from "./pages/ClientDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import Register from "./pages/Register";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import FleetDashboard from "./pages/FleetDashboard";
import DispatcherDashboard from "./pages/DispatcherDashboard";
import Payments from "./pages/Payments";
import FAQPage from "./pages/FAQ";
import NewsPage from "./pages/News";
import FooterInfoPage from "./pages/FooterInfoPage";
import DriverOnboardingPage from "./pages/DriverOnboardingPage";
import PassengerMarketplacePage from "./pages/PassengerMarketplacePage";
import { useLocalAuth } from "./contexts/LocalAuthContext";
import { useEffect, type ComponentType } from "react";

const footerInfoRoutes = [
  "/about",
  "/changelog",
  "/roadmap",
  "/blog",
  "/careers",
  "/press",
  "/docs",
  "/guides",
  "/privacy",
  "/terms",
  "/cookies",
  "/gdpr",
  "/arbitration",
  "/zero-tolerance",
  "/insurance-requirements",
  "/driver-subscription-agreement",
  "/support",
];

// Guard component: redirects to /login if not authenticated
function PrivateRoute({ component: Component, allowedRoles }: { component: ComponentType; allowedRoles?: string[] }) {
  const { user, loading } = useLocalAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role) && user.role !== "admin") {
      const roleMap: Record<string, string> = {
        client: "/client-dashboard",
        driver: "/driver-dashboard",
        fleet: "/fleet-dashboard",
        admin: "/admin",
        dispatcher: "/dispatcher",
      };
      navigate(roleMap[user.role] || "/");
    }
  }, [user, loading, allowedRoles, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== "admin") return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/register"} component={Register} />
      <Route path={"/login"} component={Login} />
      <Route path={"/faq"} component={FAQPage} />
      <Route path={"/novedades"} component={NewsPage} />
      <Route path={"/buscar-conductor"} component={PassengerMarketplacePage} />
      <Route path={"/driver-onboarding"} component={DriverOnboardingPage} />
      {footerInfoRoutes.map((path) => (
        <Route key={path} path={path} component={FooterInfoPage} />
      ))}
      <Route path={"/payments"} component={Payments} />
      <Route path={"/client-dashboard"}>
        {() => <PrivateRoute component={ClientDashboard} allowedRoles={["client", "admin"]} />}
      </Route>
      <Route path={"/driver-dashboard"}>
        {() => <PrivateRoute component={DriverDashboard} allowedRoles={["driver", "admin"]} />}
      </Route>
      <Route path={"/fleet-dashboard"}>
        {() => <PrivateRoute component={FleetDashboard} allowedRoles={["fleet", "admin"]} />}
      </Route>
      <Route path={"/admin"}>
        {() => <PrivateRoute component={AdminDashboard} allowedRoles={["admin"]} />}
      </Route>
      <Route path={"/dispatcher"}>
        {() => <PrivateRoute component={DispatcherDashboard} allowedRoles={["dispatcher", "admin"]} />}
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
