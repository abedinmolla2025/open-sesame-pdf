import { Header } from "./Header";
import { Footer } from "./Footer";
import { CookieConsent } from "./CookieConsent";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
};
