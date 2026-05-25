"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

/** Supported locales with native display names */
const LANGUAGES = [
  { code: "en", label: "English",  flag: "EN" },
  { code: "hi", label: "हिंदी",     flag: "HI" },
  { code: "te", label: "తెలుగు",    flag: "TE" },
  { code: "ta", label: "தமிழ்",     flag: "TA" },
  { code: "mr", label: "मराठी",     flag: "MR" },
  { code: "bn", label: "বাংলা",     flag: "BN" },
  { code: "kn", label: "ಕನ್ನಡ",     flag: "KN" },
  { code: "gu", label: "ગુજરાતી",   flag: "GU" },
] as const;

type LocaleCode = (typeof LANGUAGES)[number]["code"];

const COOKIE_KEY = "NEXT_LOCALE";
const DEFAULT_LOCALE: LocaleCode = "en";

/** Read the saved locale from cookies, falling back to "en". */
function getSavedLocale(): LocaleCode {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_KEY}=`));
  const value = match?.split("=")[1] as LocaleCode | undefined;
  return LANGUAGES.some((l) => l.code === value) ? value! : DEFAULT_LOCALE;
}

/** Persist locale choice in a cookie (365-day expiry, SameSite=Lax). */
function setLocaleCookie(code: LocaleCode) {
  document.cookie = `${COOKIE_KEY}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/**
 * Sets the googtrans cookie used by Google Translate to auto-translate.
 * Must be set on both root and domain-scoped paths.
 */
function setGoogTransCookie(code: LocaleCode) {
  if (code === "en") {
    // Clear googtrans cookies to restore English
    document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    document.cookie = `googtrans=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
  } else {
    document.cookie = `googtrans=/en/${code}; path=/`;
    document.cookie = `googtrans=/en/${code}; path=/; domain=.${window.location.hostname}`;
  }
}

/**
 * Hides the Google Translate toolbar/banner that appears at the top.
 * We inject a <style> once to keep it permanently hidden.
 */
function hideGoogleTranslateUI() {
  if (document.getElementById("gt-hide-style")) return;
  const style = document.createElement("style");
  style.id = "gt-hide-style";
  style.textContent = `
    .goog-te-banner-frame, .skiptranslate,
    #goog-gt-tt, .goog-te-balloon-frame,
    .goog-tooltip, .goog-tooltip:hover {
      display: none !important;
    }
    body { top: 0 !important; }
  `;
  document.head.appendChild(style);
}

/**
 * LanguageSwitcher
 *
 * A compact language selector for the top navbar.
 * Persists the user's choice in the NEXT_LOCALE cookie and
 * applies Google Translate–powered auto-translation client-side.
 *
 * Styling mirrors existing navbar icon-buttons (ThemeToggle / NotificationBell).
 */
export function LanguageSwitcher() {
  const [locale, setLocale] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [isOpen, setIsOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  /** Load the Google Translate script once and hide the default UI. */
  const ensureGoogleTranslateLoaded = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      hideGoogleTranslateUI();

      // Already loaded
      if ((window as any).google?.translate?.TranslateElement) {
        resolve();
        return;
      }

      // Already loading (script tag exists but not yet executed)
      if (document.getElementById("google-translate-script")) {
        const check = setInterval(() => {
          if ((window as any).google?.translate?.TranslateElement) {
            clearInterval(check);
            resolve();
          }
        }, 100);
        return;
      }

      // First time — inject the script
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "google_translate_element"
        );
        resolve();
      };

      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.head.appendChild(script);
    });
  }, []);

  /**
   * Trigger translation by programmatically selecting the target language
   * in the hidden Google Translate <select> element.
   */
  const triggerTranslation = useCallback(
    async (code: LocaleCode) => {
      if (code === "en") {
        // Restore original page
        setGoogTransCookie("en");

        // Try clicking the "Show original" button inside the Translate banner
        const frame = document.querySelector<HTMLIFrameElement>(
          ".goog-te-banner-frame"
        );
        if (frame) {
          try {
            const innerDoc =
              frame.contentDocument || frame.contentWindow?.document;
            const btns = innerDoc?.querySelectorAll("button");
            btns?.forEach((btn) => {
              if (
                btn.textContent?.includes("Show original") ||
                btn.id?.includes("restore")
              ) {
                btn.click();
              }
            });
          } catch {
            // cross-origin — fallback to reload
          }
        }

        // Fallback: clean up and reload
        const combo = document.querySelector<HTMLSelectElement>(
          ".goog-te-combo"
        );
        if (combo) {
          combo.value = "en";
          combo.dispatchEvent(new Event("change"));
          return;
        }
        window.location.reload();
        return;
      }

      setGoogTransCookie(code);
      await ensureGoogleTranslateLoaded();

      // Wait a tick for Google Translate to render its <select>
      await new Promise((r) => setTimeout(r, 600));

      const combo = document.querySelector<HTMLSelectElement>(
        ".goog-te-combo"
      );
      if (combo) {
        combo.value = code;
        combo.dispatchEvent(new Event("change"));
      } else {
        // If <select> didn't appear, re-init and reload
        const el = document.getElementById("google_translate_element");
        if (el) el.innerHTML = "";
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "google_translate_element"
        );
        await new Promise((r) => setTimeout(r, 800));
        const retryCombo = document.querySelector<HTMLSelectElement>(
          ".goog-te-combo"
        );
        if (retryCombo) {
          retryCombo.value = code;
          retryCombo.dispatchEvent(new Event("change"));
        } else {
          // Last resort — reload with cookie already set
          window.location.reload();
        }
      }
    },
    [ensureGoogleTranslateLoaded]
  );

  /* Hydrate from cookie on mount & apply saved translation */
  useEffect(() => {
    const saved = getSavedLocale();
    setLocale(saved);
    if (saved !== DEFAULT_LOCALE) {
      triggerTranslation(saved);
    }
    // Hide Google Translate UI preemptively
    hideGoogleTranslateUI();
    // Also monitor for it re-appearing
    const observer = new MutationObserver(() => hideGoogleTranslateUI());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = async (code: LocaleCode) => {
    if (code === locale) {
      setIsOpen(false);
      return;
    }
    setLocale(code);
    setLocaleCookie(code);
    setIsOpen(false);
    setTranslating(true);
    await triggerTranslation(code);
    // Small delay so the page has time to translate
    setTimeout(() => setTranslating(false), 1200);
  };

  const currentLang = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return (
    <>
      {/* Hidden container for Google Translate (invisible, required by API) */}
      <div id="google_translate_element" style={{ display: "none" }} />

      <div className="relative" ref={dropdownRef}>
        {/* Trigger — matches h-8 rounded-lg icon-button pattern */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="relative flex h-8 items-center justify-center gap-1 rounded-lg px-1.5 theme-text-muted transition-all hover:bg-[var(--bg-elevated-hover)] hover:theme-text"
          aria-label="Change language"
          title="Change language"
        >
          {/* Globe icon (with spin animation while translating) */}
          <svg
            className={`h-4 w-4 ${translating ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.777.516-3.434 1.404-4.83"
            />
          </svg>
          <span className="text-[10px] font-semibold tracking-wide notranslate" translate="no">
            {currentLang.flag}
          </span>
          {/* Down chevron */}
          <svg
            className={`h-3 w-3 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>

        {/* Dropdown — mirrors NotificationBell dropdown styling */}
        {isOpen && (
          <div
            className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl border p-2 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50 notranslate"
            translate="no"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border-primary)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider theme-text-dimmed">
              Select Language
            </p>

            <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-0.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                    locale === lang.code
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      : "theme-text-muted hover:bg-[var(--bg-elevated-hover)] hover:theme-text border border-transparent"
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold bg-[var(--bg-elevated)]">
                    {lang.flag}
                  </span>
                  <span className="truncate">{lang.label}</span>
                  {locale === lang.code && (
                    <svg
                      className="ml-auto h-3.5 w-3.5 shrink-0 text-violet-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
