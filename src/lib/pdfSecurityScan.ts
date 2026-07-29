export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface FindingLocation {
  /** Byte offset in the raw PDF */
  offset: number;
  /** Approximate page/object hint */
  objectHint: string;
  /** Short raw evidence snippet */
  snippet: string;
}

export interface SecurityFinding {
  id: string;
  rule: string;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
  locations: FindingLocation[];
}

export interface ScanResult {
  fileName: string;
  fileSize: number;
  scannedAt: number;
  durationMs: number;
  findings: SecurityFinding[];
}

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

interface Rule {
  rule: string;
  title: string;
  severity: Severity;
  description: string;
  recommendation: string;
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    rule: "js-embedded",
    title: "Embedded JavaScript",
    severity: "critical",
    description: "The document embeds JavaScript, which some readers execute on open.",
    recommendation: "Sanitise the PDF or open it in a reader with JavaScript disabled.",
    pattern: /\/(JavaScript|JS)\b/g,
  },
  {
    rule: "auto-action",
    title: "Automatic action on open",
    severity: "critical",
    description: "An /OpenAction or /AA entry runs automatically when the file opens.",
    recommendation: "Inspect the action target before opening in a trusted reader.",
    pattern: /\/(OpenAction|AA)\b/g,
  },
  {
    rule: "launch-action",
    title: "Launch / external program action",
    severity: "high",
    description: "A /Launch action can attempt to start an external program.",
    recommendation: "Do not open this document on a machine with sensitive data.",
    pattern: /\/Launch\b/g,
  },
  {
    rule: "embedded-file",
    title: "Embedded file attachment",
    severity: "high",
    description: "The PDF carries an embedded file, a common malware delivery vector.",
    recommendation: "Extract and scan the attachment separately before opening.",
    pattern: /\/(EmbeddedFile|Filespec)\b/g,
  },
  {
    rule: "remote-goto",
    title: "Remote GoTo reference",
    severity: "medium",
    description: "A /GoToR or /SubmitForm action points outside the document.",
    recommendation: "Verify the destination before interacting with the document.",
    pattern: /\/(GoToR|SubmitForm|ImportData)\b/g,
  },
  {
    rule: "external-uri",
    title: "External link",
    severity: "low",
    description: "The document links to external URLs.",
    recommendation: "Hover links and confirm the domain before clicking.",
    pattern: /\/URI\s*\((https?:[^)]{0,180})\)/g,
  },
  {
    rule: "xfa-form",
    title: "XFA dynamic form",
    severity: "medium",
    description: "XFA forms carry scriptable logic and are deprecated in modern readers.",
    recommendation: "Flatten the form before sharing it.",
    pattern: /\/XFA\b/g,
  },
  {
    rule: "rich-media",
    title: "Rich media / embedded movie",
    severity: "medium",
    description: "Embedded media objects can trigger legacy player plugins.",
    recommendation: "Remove rich media annotations before distribution.",
    pattern: /\/(RichMedia|Movie|Sound)\b/g,
  },
  {
    rule: "encryption",
    title: "Encryption dictionary present",
    severity: "info",
    description: "The document is encrypted or password protected.",
    recommendation: "Use the PDF Unlocker if you own the document and need it open.",
    pattern: /\/Encrypt\b/g,
  },
  {
    rule: "signature-field",
    title: "Signature field present",
    severity: "info",
    description: "A signature field was detected. This is detection only, not cryptographic validation.",
    recommendation: "Validate the signature in a reader that performs PKCS#7 verification.",
    pattern: /\/ByteRange\b/g,
  },
];

const MAX_LOCATIONS_PER_RULE = 50;

function objectHintAt(text: string, offset: number): string {
  const window = text.slice(Math.max(0, offset - 4000), offset);
  const matches = [...window.matchAll(/(\d+)\s+(\d+)\s+obj\b/g)];
  const last = matches[matches.length - 1];
  return last ? `object ${last[1]} ${last[2]}` : "trailer / stream data";
}

function snippetAt(text: string, offset: number, length: number): string {
  const raw = text.slice(Math.max(0, offset - 24), offset + Math.max(length, 40) + 24);
  return raw.replace(/[^\x20-\x7E]/g, "·").trim();
}

export async function scanPdfForSecurityIssues(file: File): Promise<ScanResult> {
  const started = performance.now();
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("latin1").decode(new Uint8Array(buffer));

  const findings: SecurityFinding[] = [];

  for (const rule of RULES) {
    const locations: FindingLocation[] = [];
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (locations.length >= MAX_LOCATIONS_PER_RULE) break;
      locations.push({
        offset: match.index,
        objectHint: objectHintAt(text, match.index),
        snippet: snippetAt(text, match.index, match[0].length),
      });
      if (match[0].length === 0) re.lastIndex++;
    }
    if (locations.length > 0) {
      findings.push({
        id: `${rule.rule}-${locations[0].offset}`,
        rule: rule.rule,
        title: rule.title,
        severity: rule.severity,
        description: rule.description,
        recommendation: rule.recommendation,
        locations,
      });
    }
  }

  findings.sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return {
    fileName: file.name,
    fileSize: file.size,
    scannedAt: Date.now(),
    durationMs: Math.round(performance.now() - started),
    findings,
  };
}
