/**
 * Velvet Ledger reminder: the app opens directly into the left-anchored Aurelia desk, keeping navigation and focus visible.
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
