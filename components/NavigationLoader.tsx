"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { subscribePageLoad } from "@/lib/page-loader";
import SukiPageLoader from "@/components/SukiPageLoader";

const MIN_VISIBLE_MS = 750;

function shouldHandleAnchor(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export default function NavigationLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const firstPathRef = useRef(true);

  const show = useCallback(() => {
    shownAtRef.current = Date.now();
    setVisible(true);
  }, []);

  useEffect(() => subscribePageLoad(show), [show]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement) || !shouldHandleAnchor(anchor)) return;
      show();
    };

    const onPopState = () => show();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [show]);

  useEffect(() => {
    if (firstPathRef.current) {
      firstPathRef.current = false;
      return;
    }

    const elapsed = Date.now() - shownAtRef.current;
    const wait = Math.max(180, MIN_VISIBLE_MS - elapsed);
    const timeout = window.setTimeout(() => setVisible(false), wait);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <SukiPageLoader caption="Loading" />
    </div>
  );
}
