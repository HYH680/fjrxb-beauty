"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { LanguageMenuItem } from "@/components/LanguageMenuItem";
import "./PillNav.css";

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
  /** Special pill that opens the language menu instead of navigating */
  action?: "language";
};

type PillNavProps = {
  logo: string;
  logoAlt?: string;
  /** Where the circular logo navigates (account / login / home). */
  logoHref?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
  /** Optional control rendered after the pill track. */
  trailing?: ReactNode;
  menuAriaLabel?: string;
};

function isExternalLink(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  );
}

function isRouterLink(href?: string) {
  return Boolean(href && !isExternalLink(href));
}

export default function PillNav({
  logo,
  logoAlt = "Avatar",
  logoHref = "/",
  items,
  activeHref,
  className = "",
  ease = "power3.easeOut",
  baseColor = "#fff",
  pillColor = "#000000",
  hoveredPillTextColor = "#000000",
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true,
  trailing,
  menuAriaLabel = "Toggle menu",
}: PillNavProps) {
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([]);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        if (w <= 0 || h <= 0) return;

        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta =
          Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });

        const label = pill.querySelector(".pill-label");
        const white = pill.querySelector(".pill-label-hover");

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(
          circle,
          { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" },
          0
        );

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0);
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(
            white,
            { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" },
            0
          );
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener("resize", onResize);

    if (document.fonts?.ready) {
      void document.fonts.ready.then(layout).catch(() => undefined);
    }

    const menu = mobileMenuRef.current;
    if (menu) {
      gsap.set(menu, { visibility: "hidden", opacity: 0, scaleY: 1 });
    }

    if (initialLoadAnimation) {
      const logoEl = logoRef.current;
      const navItems = navItemsRef.current;

      if (logoEl) {
        gsap.set(logoEl, { scale: 0 });
        gsap.to(logoEl, {
          scale: 1,
          duration: 0.6,
          ease,
        });
      }

      if (navItems) {
        gsap.set(navItems, { width: 0, overflow: "hidden" });
        gsap.to(navItems, {
          width: "auto",
          duration: 0.6,
          ease,
          onComplete: () => {
            gsap.set(navItems, { clearProps: "width,overflow" });
          },
        });
      }
    }

    return () => window.removeEventListener("resize", onResize);
  }, [items, ease, initialLoadAnimation]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: "auto",
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);

    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;

    if (hamburger) {
      const lines = hamburger.querySelectorAll(".hamburger-line");
      if (newState) {
        gsap.to(lines[0] ?? null, { rotation: 45, y: 3, duration: 0.3, ease });
        gsap.to(lines[1] ?? null, { rotation: -45, y: -3, duration: 0.3, ease });
      } else {
        gsap.to(lines[0] ?? null, { rotation: 0, y: 0, duration: 0.3, ease });
        gsap.to(lines[1] ?? null, { rotation: 0, y: 0, duration: 0.3, ease });
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: "visible" });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10, scaleY: 1 },
          {
            opacity: 1,
            y: 0,
            scaleY: 1,
            duration: 0.3,
            ease,
            transformOrigin: "top center",
          }
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
          duration: 0.2,
          ease,
          transformOrigin: "top center",
          onComplete: () => {
            gsap.set(menu, { visibility: "hidden" });
          },
        });
      }
    }

    onMobileMenuClick?.();
  };

  const cssVars = {
    ["--base"]: baseColor,
    ["--pill-bg"]: pillColor,
    ["--hover-text"]: hoveredPillTextColor,
    ["--pill-text"]: resolvedPillTextColor,
  } as CSSProperties;

  const safeItems = Array.isArray(items)
    ? items.filter((item) => item?.label && (item.action === "language" || item?.href))
    : [];
  const logoSrc = logo || "/avatars/presets/avatar-01.png";
  const resolvedLogoHref = logoHref || "/";

  const renderPillContent = (item: PillNavItem, i: number) => {
    const circleRef = (el: HTMLSpanElement | null) => {
      circleRefs.current[i] = el;
    };

    if (item.action === "language") {
      return (
        <LanguageMenuItem
          variant="pill"
          onPillEnter={() => handleEnter(i)}
          onPillLeave={() => handleLeave(i)}
          circleRef={circleRef}
          onPicked={() => setIsMobileMenuOpen(false)}
        />
      );
    }

    const active = activeHref === item.href;
    const classNamePill = `pill${active ? " is-active" : ""}`;
    const labelStack = (
      <>
        <span className="hover-circle" aria-hidden="true" ref={circleRef} />
        <span className="label-stack">
          <span className="pill-label">{item.label}</span>
          <span className="pill-label-hover" aria-hidden="true">
            {item.label}
          </span>
        </span>
      </>
    );

    if (isRouterLink(item.href)) {
      return (
        <Link
          role="menuitem"
          href={item.href}
          className={classNamePill}
          aria-label={item.ariaLabel || item.label}
          onMouseEnter={() => handleEnter(i)}
          onMouseLeave={() => handleLeave(i)}
        >
          {labelStack}
        </Link>
      );
    }

    return (
      <a
        role="menuitem"
        href={item.href}
        className={classNamePill}
        aria-label={item.ariaLabel || item.label}
        onMouseEnter={() => handleEnter(i)}
        onMouseLeave={() => handleLeave(i)}
      >
        {labelStack}
      </a>
    );
  };

  return (
    <div className="pill-nav-container">
      <nav className={`pill-nav ${className}`.trim()} aria-label="Primary" style={cssVars}>
        {isRouterLink(resolvedLogoHref) ? (
          <Link
            className="pill-logo"
            href={resolvedLogoHref}
            aria-label="Home"
            onMouseEnter={handleLogoEnter}
            ref={logoRef}
          >
            <img src={logoSrc} alt={logoAlt} ref={logoImgRef} />
          </Link>
        ) : (
          <a
            className="pill-logo"
            href={resolvedLogoHref}
            aria-label="Home"
            onMouseEnter={handleLogoEnter}
            ref={logoRef}
          >
            <img src={logoSrc} alt={logoAlt} ref={logoImgRef} />
          </a>
        )}

        <div className="pill-nav-items desktop-only" ref={navItemsRef}>
          <ul className="pill-list" role="menubar">
            {safeItems.map((item, i) => (
              <li
                key={item.action === "language" ? "lang" : item.href || `item-${i}`}
                role="none"
              >
                {renderPillContent(item, i)}
              </li>
            ))}
          </ul>
        </div>

        {trailing ? <div className="desktop-only">{trailing}</div> : null}

        <button
          type="button"
          className="mobile-menu-button mobile-only"
          onClick={toggleMobileMenu}
          aria-label={menuAriaLabel}
          aria-expanded={isMobileMenuOpen}
          ref={hamburgerRef}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      <div
        className="mobile-menu-popover mobile-only"
        ref={mobileMenuRef}
        style={cssVars}
      >
        <ul className="mobile-menu-list">
          {safeItems.map((item, i) => (
            <li
              key={
                item.action === "language"
                  ? "mobile-lang"
                  : item.href || `mobile-item-${i}`
              }
            >
              {item.action === "language" ? (
                <LanguageMenuItem
                  variant="menu-row"
                  onPicked={() => setIsMobileMenuOpen(false)}
                />
              ) : isRouterLink(item.href) ? (
                <Link
                  href={item.href}
                  className={`mobile-menu-link${activeHref === item.href ? " is-active" : ""}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  href={item.href}
                  className={`mobile-menu-link${activeHref === item.href ? " is-active" : ""}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
        {trailing ? (
          <div
            className="px-2 pb-2 pt-1"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}
