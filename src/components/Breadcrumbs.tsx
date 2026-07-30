import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  /** Route path. Omit for the current page. */
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs = ({ items, className = "" }: BreadcrumbsProps) => (
  <nav aria-label="Breadcrumb" className={className}>
    <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <li key={item.name} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3" aria-hidden />}
          {item.to ? (
            <Link to={item.to} className="hover:text-foreground transition-colors">
              {item.name}
            </Link>
          ) : (
            <span aria-current="page" className="text-foreground">
              {item.name}
            </span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);
