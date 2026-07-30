import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Send } from "lucide-react";
import { z } from "zod";
import { StaticPage } from "@/components/StaticPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100, "Name must be under 100 characters."),
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters.")
    .max(2000, "Message must be under 2000 characters."),
});

const SUPPORT_EMAIL = "hello@free-my-pdf.example";

const Contact = () => {
  const { toast } = useToast();
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[String(i.path[0])] = i.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    const subject = encodeURIComponent(`ImageTools Hub — message from ${parsed.data.name}`);
    const body = encodeURIComponent(`${parsed.data.message}\n\nReply to: ${parsed.data.email}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    toast({
      title: "Opening your email client",
      description: "Send the pre-filled message and we'll reply as soon as we can.",
    });
  };

  return (
    <StaticPage
      title="Contact"
      metaTitle="Contact ImageTools Hub — Support, Feedback & Feature Requests"
      metaDescription="Get in touch with the ImageTools Hub team about bugs, feature requests, partnerships or privacy questions."
      path="/contact"
    >
      <p>
        Questions, bug reports and feature requests are all welcome. There is no support queue and
        no ticket system — messages go straight to a person.
      </p>
      <p className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" aria-hidden />
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>

      <form onSubmit={submit} className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 space-y-4 not-prose">
        <div className="space-y-1">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={values.name}
            maxLength={100}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            maxLength={255}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            rows={6}
            value={values.message}
            maxLength={2000}
            onChange={(e) => setValues({ ...values, message: e.target.value })}
            aria-invalid={!!errors.message}
          />
          {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
        </div>
        <Button type="submit">
          <Send className="w-4 h-4 mr-2" /> Send message
        </Button>
        <p className="text-xs text-muted-foreground">
          The form opens your email client with the message pre-filled — nothing is sent to or
          stored on our servers.
        </p>
      </form>

      <h2>Before you write</h2>
      <ul>
        <li>
          Tool not behaving? Note your browser and the image format — most issues come from a
          codec the browser cannot decode.
        </li>
        <li>
          Privacy questions are answered in the <Link to="/privacy">privacy policy</Link>.
        </li>
        <li>
          Usage terms live on the <Link to="/terms">terms of use</Link> page.
        </li>
      </ul>
    </StaticPage>
  );
};

export default Contact;
