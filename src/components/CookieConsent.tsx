import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const KEY = "imagetools-cookie-consent";

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* storage blocked — stay hidden */
    }
  }, []);

  const decide = (value: "accepted" | "rejected") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 backdrop-blur p-4 shadow-lg"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Cookie className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">
          We use essential cookies to run the site and optional cookies for advertising and
          analytics. Your files never leave your device.{" "}
          <Link to="/privacy" className="text-primary underline underline-offset-4">
            Privacy policy
          </Link>
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => decide("rejected")}>
            Essential only
          </Button>
          <Button size="sm" onClick={() => decide("accepted")}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
};
