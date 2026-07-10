import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, Shield, Zap, FileKey } from "lucide-react";
import { Layout } from "@/components/Layout";
import { DropZone } from "@/components/DropZone";
import { PasswordInput } from "@/components/PasswordInput";
import { UnlockButton } from "@/components/UnlockButton";
import { UnlockProgress } from "@/components/UnlockProgress";
import { usePdfUnlocker } from "@/hooks/usePdfUnlocker";
import { usePageHead } from "@/hooks/usePageHead";

const Index = () => {
  usePageHead({
    title: "Unlock PDF — Free My PDF",
    description: "Remove password protection from PDF files instantly in your browser. 100% client-side — your files never leave your device.",
    canonical: "https://free-my-pdf.lovable.app/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Free My PDF Unlocker",
      applicationCategory: "Utility",
      operatingSystem: "Any",
      url: "https://free-my-pdf.lovable.app/",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const { status, error, progress, unlockPdf, downloadUnlockedPdf, reset } = usePdfUnlocker();

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    reset();
  }, [reset]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setPassword("");
    reset();
  }, [reset]);

  const handleUnlock = useCallback(() => {
    if (selectedFile && password) {
      unlockPdf(selectedFile, password);
    }
  }, [selectedFile, password, unlockPdf]);

  const handleDownload = useCallback(() => {
    if (selectedFile) {
      downloadUnlockedPdf(selectedFile.name);
    }
  }, [selectedFile, downloadUnlockedPdf]);

  return (
    <Layout>
      <Helmet>
        <title>Unlock PDF — Free My PDF</title>
        <meta name="description" content="Remove password protection from PDF files instantly in your browser. 100% client-side — your files never leave your device." />
        <link rel="canonical" href="https://free-my-pdf.lovable.app/" />
        <meta property="og:title" content="Unlock PDF — Free My PDF" />
        <meta property="og:description" content="Remove password protection from PDF files instantly in your browser." />
        <meta property="og:url" content="https://free-my-pdf.lovable.app/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Free My PDF Unlocker",
          "applicationCategory": "Utility",
          "operatingSystem": "Any",
          "url": "https://free-my-pdf.lovable.app/",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
        })}</script>
      </Helmet>
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl" />
        </div>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <FileKey className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Free & Secure</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-6">
            Unlock Your{" "}
            <span className="gradient-text">Protected PDFs</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Remove password protection from your PDF files instantly. 
            Your files never leave your device—100% client-side processing.
          </p>
        </motion.header>

        {/* Main unlock card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass-card p-6 md:p-8 space-y-6">
            <DropZone
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onClear={handleClear}
            />

            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  disabled={status === "unlocking" || status === "success"}
                />

                {progress && status === "unlocking" ? (
                  <UnlockProgress progress={progress} />
                ) : (
                  <UnlockButton
                    status={status}
                    onUnlock={handleUnlock}
                    onDownload={handleDownload}
                    disabled={!password}
                  />
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-destructive text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Features */}
        <h2 className="sr-only">Features</h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="100% Private"
            description="Your files are processed locally in your browser. Nothing is uploaded to any server."
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Instant Processing"
            description="Unlock PDFs in seconds with our optimized client-side processing engine."
          />
          <FeatureCard
            icon={<Lock className="w-6 h-6" />}
            title="Secure Removal"
            description="Safely remove password protection while preserving all original content."
          />
        </motion.div>
      </div>
      </div>
    </Layout>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => (
  <div className="text-center p-6">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
      {icon}
    </div>
    <h3 className="font-semibold text-lg mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

export default Index;
