import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Signature from "./pages/Signature";
import Editor from "./pages/Editor";
import Compressor from "./pages/Compressor";
import Merger from "./pages/Merger";
import Splitter from "./pages/Splitter";
import ImageToPdf from "./pages/ImageToPdf";
import ImageCompressor from "./pages/ImageCompressor";
import ImageUpscaler from "./pages/ImageUpscaler";
import PassportPhoto from "./pages/PassportPhoto";
import PdfSecurity from "./pages/PdfSecurity";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signature" element={<Signature />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/compress" element={<Compressor />} />
          <Route path="/merge" element={<Merger />} />
          <Route path="/split" element={<Splitter />} />
          <Route path="/image-to-pdf" element={<ImageToPdf />} />
          <Route path="/image-compress" element={<ImageCompressor />} />
          <Route path="/image-upscale" element={<ImageUpscaler />} />
          <Route path="/passport-photo" element={<PassportPhoto />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
