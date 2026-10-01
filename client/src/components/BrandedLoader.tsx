import { useEffect } from "react";
import logo from "../../brand/logo-clean.svg?raw";

export function BrandedLoader() {
  return (
    <div
      className="pcb-loading-screen pcb-route-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pcb-loading-content">
        <div
          className="pcb-loading-logo"
          role="img"
          aria-label="Precision Core Builders"
          dangerouslySetInnerHTML={{ __html: logo }}
        />
        <svg
          className="pcb-loading-roof"
          viewBox="0 0 96 48"
          aria-hidden="true"
        >
          <path
            pathLength="1"
            d="M8 40V24L48 4L88 24V40M28 40V28H68V40M8 40H88"
          />
        </svg>
        <p className="pcb-loading-label">Building your experience</p>
        <p className="pcb-loading-tagline">
          Precision construction. Core values.
        </p>
        <div className="pcb-loading-track" aria-hidden="true" />
      </div>
    </div>
  );
}

/** This commits only after the route's lazy imports and styles are ready. */
export function FirstRenderReady() {
  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    // Failed or delayed CSS must never expose an unstyled prerender/app.
    const stylesReady = () =>
      [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
        .filter(link => new URL(link.href).origin === window.location.origin)
        .every(link => link.sheet !== null && link.sheet.cssRules.length > 0);
    const reveal = () => {
      if (!stylesReady()) return;
      window.clearInterval(styleCheck);
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          const html = document.documentElement;
          html.classList.add("pcb-ready");
          html.classList.remove("pcb-boot", "pcb-boot-slow");
        });
      });
    };
    const styleCheck = window.setInterval(reveal, 50);
    reveal();
    return () => {
      window.clearInterval(styleCheck);
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);
  return null;
}
