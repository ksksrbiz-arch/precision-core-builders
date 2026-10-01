import type { ReactNode } from "react";
import "./marketing-design.css";

/** Public-page tokens never reach auth, admin, or the client portal. */
export function MarketingDesign({ children }: { children: ReactNode }) {
  return <div className="marketing-page">{children}</div>;
}
