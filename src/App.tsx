import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

const Index = lazy(() => import("./pages/Index"));
const Signature = lazy(() => import("./pages/Signature"));
const Editor = lazy(() => import("./pages/Editor"));
const Compressor = lazy(() => import("./pages/Compressor"));
const Merger = lazy(() => import("./pages/Merger"));
const Splitter = lazy(() => import("./pages/Splitter"));
const ImageToPdf = lazy(() => import("./pages/ImageToPdf"));
const ImageCompressor = lazy(() => import("./pages/ImageCompressor"));
const ImageUpscaler = lazy(() => import("./pages/ImageUpscaler"));
const PassportPhoto = lazy(() => import("./pages/PassportPhoto"));
const PdfSecurity = lazy(() => import("./pages/PdfSecurity"));
const ImageToolsHub = lazy(() => import("./pages/ImageToolsHub"));
const BackgroundRemover = lazy(() => import("./pages/BackgroundRemover"));
const ImageResizer = lazy(() => import("./pages/ImageResizer"));
const WebpConverter = lazy(() => import("./pages/WebpConverter"));
const ImageOcr = lazy(() => import("./pages/ImageOcr"));
const AiPdfAssistant = lazy(() => import("./pages/AiPdfAssistant"));
const CardPrintStudio = lazy(() => import("./pages/CardPrintStudio"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/unlock-pdf" element={<Index />} />
            <Route path="/signature" element={<Signature />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/compress" element={<Compressor />} />
            <Route path="/merge" element={<Merger />} />
            <Route path="/split" element={<Splitter />} />
            <Route path="/image-to-pdf" element={<ImageToPdf />} />
            <Route path="/image-compress" element={<ImageCompressor />} />
            <Route path="/image-upscale" element={<ImageUpscaler />} />
            <Route path="/passport-photo" element={<PassportPhoto />} />
            <Route path="/pdf-security" element={<PdfSecurity />} />
            <Route path="/image-tools" element={<ImageToolsHub />} />
            <Route path="/background-remover" element={<BackgroundRemover />} />
            <Route path="/image-resize" element={<ImageResizer />} />
            <Route path="/webp-converter" element={<WebpConverter />} />
            <Route path="/image-to-text" element={<ImageOcr />} />
            <Route path="/ai-pdf-assistant" element={<AiPdfAssistant />} />
            <Route path="/card-print-studio" element={<CardPrintStudio />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
