(function () {
  "use strict";

  const BRANDING_UPDATE_EVENT = "pocketcaddy:branding-update";

  const DEFAULT_BRANDING = Object.freeze({
    displayName: "PocketCaddy",
    subtitle: "Create, join, and score rounds in real time.",
    accentColor: "#1f7a3e",
    accentStrongColor: "#155f30",
    accentSoftColor: "#d9ecdf",
    logoPath: "",
    surfaceTint: "#f5faf6",
    inkColor: "#17231a"
  });

  const state = {
    runtimeBranding: null
  };

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function getBaseBrandingSource() {
    const projectConfig = window.PocketCaddyProjectConfig;
    if (projectConfig && typeof projectConfig === "object" && projectConfig.branding && typeof projectConfig.branding === "object") {
      return projectConfig.branding;
    }
    const appConfig = window.PocketCaddyAppConfig;
    if (appConfig && typeof appConfig === "object" && appConfig.branding && typeof appConfig.branding === "object") {
      return appConfig.branding;
    }
    const direct = window.PocketCaddyBranding;
    if (direct && typeof direct === "object") {
      return direct;
    }
    return null;
  }

  function getBrandingSource() {
    const base = getBaseBrandingSource();
    if (!state.runtimeBranding || !Object.keys(state.runtimeBranding).length) {
      return base;
    }
    return Object.assign({}, base || {}, state.runtimeBranding);
  }

  function normalizeText(value, fallback) {
    if (value == null) return fallback;
    const text = String(value).trim();
    return text || fallback;
  }

  function isValidCssColor(value) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return false;
    if (typeof CSS !== "undefined" && CSS && typeof CSS.supports === "function") {
      return CSS.supports("color", text);
    }
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text);
  }

  function normalizeColor(value, fallback) {
    return isValidCssColor(value) ? String(value).trim() : fallback;
  }

  function parseHexColor(value) {
    const text = typeof value === "string" ? value.trim() : "";
    const match = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return null;
    const hex = match[1].length === 3
      ? match[1].split("").map((part) => `${part}${part}`).join("")
      : match[1];
    const n = Number.parseInt(hex, 16);
    if (!Number.isFinite(n)) return null;
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255
    };
  }

  function parseRgbColor(value) {
    const text = typeof value === "string" ? value.trim() : "";
    const match = text.match(/^rgba?\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*(?:,|\/)\s*[\d.]+\s*)?\)$/i);
    if (!match) return null;
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    if (![r, g, b].every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) return null;
    return { r, g, b };
  }

  function parseCssColorToRgb(value) {
    const hex = parseHexColor(value);
    if (hex) return hex;
    const rgb = parseRgbColor(value);
    if (rgb) return rgb;
    const text = typeof value === "string" ? value.trim() : "";
    if (!text || typeof document === "undefined" || typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
      return null;
    }
    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = text;
    if (!probe.style.color) return null;
    probe.style.position = "absolute";
    probe.style.opacity = "0";
    probe.style.pointerEvents = "none";
    const root = document.documentElement || document.body;
    if (!root || typeof root.appendChild !== "function") return null;
    root.appendChild(probe);
    const computed = window.getComputedStyle(probe).color;
    probe.remove();
    return parseRgbColor(computed);
  }

  function clampChannel(n) {
    return Math.max(0, Math.min(255, Math.round(n)));
  }

  function rgbToHex(rgb) {
    if (!rgb) return "";
    const toHex = (n) => clampChannel(n).toString(16).padStart(2, "0");
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  function adjustColor(rgb, amount) {
    if (!rgb) return null;
    return {
      r: clampChannel(rgb.r + amount),
      g: clampChannel(rgb.g + amount),
      b: clampChannel(rgb.b + amount)
    };
  }

  function mixColor(base, target, ratio) {
    if (!base || !target) return null;
    const safeRatio = Number.isFinite(Number(ratio))
      ? Math.max(0, Math.min(1, Number(ratio)))
      : 0;
    return {
      r: clampChannel(base.r + (target.r - base.r) * safeRatio),
      g: clampChannel(base.g + (target.g - base.g) * safeRatio),
      b: clampChannel(base.b + (target.b - base.b) * safeRatio)
    };
  }

  function relativeLuminance(rgb) {
    if (!rgb) return 0;
    const channel = (n) => {
      const v = clampChannel(n) / 255;
      return v <= 0.03928 ? (v / 12.92) : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const r = channel(rgb.r);
    const g = channel(rgb.g);
    const b = channel(rgb.b);
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
  }

  function contrastRatio(a, b) {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const lighter = Math.max(la, lb);
    const darker = Math.min(la, lb);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function deriveInkColor(accentRgb, surfaceRgb) {
    const defaultInkRgb = parseCssColorToRgb(DEFAULT_BRANDING.inkColor);
    if (!accentRgb || !surfaceRgb) return DEFAULT_BRANDING.inkColor;
    const candidates = [
      mixColor(accentRgb, { r: 0, g: 0, b: 0 }, 0.82),
      mixColor(accentRgb, { r: 0, g: 0, b: 0 }, 0.72),
      adjustColor(accentRgb, -160),
      defaultInkRgb
    ].filter(Boolean);
    let best = candidates[0];
    let bestRatio = contrastRatio(candidates[0], surfaceRgb);
    for (let i = 1; i < candidates.length; i += 1) {
      const ratio = contrastRatio(candidates[i], surfaceRgb);
      if (ratio > bestRatio) {
        best = candidates[i];
        bestRatio = ratio;
      }
    }
    return rgbToHex(best) || DEFAULT_BRANDING.inkColor;
  }

  function escapeForCssUrl(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function rgbaString(rgb, alpha) {
    if (!rgb) return "";
    const safeAlpha = Number.isFinite(Number(alpha)) ? Math.max(0, Math.min(1, Number(alpha))) : 1;
    return `rgba(${clampChannel(rgb.r)}, ${clampChannel(rgb.g)}, ${clampChannel(rgb.b)}, ${safeAlpha})`;
  }

  function sanitizeRuntimeBranding(input) {
    if (!isObject(input)) return {};
    const next = {};

    if (Object.prototype.hasOwnProperty.call(input, "displayName")) {
      next.displayName = String(input.displayName == null ? "" : input.displayName);
    }
    if (Object.prototype.hasOwnProperty.call(input, "subtitle")) {
      next.subtitle = String(input.subtitle == null ? "" : input.subtitle);
    }
    if (Object.prototype.hasOwnProperty.call(input, "logoPath")) {
      next.logoPath = String(input.logoPath == null ? "" : input.logoPath).trim();
    }

    const accentCandidate = Object.prototype.hasOwnProperty.call(input, "accentColor")
      ? input.accentColor
      : (Object.prototype.hasOwnProperty.call(input, "accent") ? input.accent : input.brandColor);
    if (isValidCssColor(accentCandidate)) {
      next.accentColor = String(accentCandidate).trim();
    }

    if (isValidCssColor(input.accentStrongColor)) {
      next.accentStrongColor = String(input.accentStrongColor).trim();
    } else if (isValidCssColor(input.brandStrongColor)) {
      next.accentStrongColor = String(input.brandStrongColor).trim();
    }

    if (isValidCssColor(input.accentSoftColor)) {
      next.accentSoftColor = String(input.accentSoftColor).trim();
    } else if (isValidCssColor(input.brandSoftColor)) {
      next.accentSoftColor = String(input.brandSoftColor).trim();
    }

    if (isValidCssColor(input.surfaceTint)) {
      next.surfaceTint = String(input.surfaceTint).trim();
    }

    if (isValidCssColor(input.inkColor)) {
      next.inkColor = String(input.inkColor).trim();
    }

    return next;
  }

  function getStateApi() {
    const api = window.PocketCaddyState;
    return isObject(api) ? api : null;
  }

  function persistBrandingToSession(branding) {
    const stateApi = getStateApi();
    if (!stateApi || typeof stateApi.getSession !== "function") return;
    const session = stateApi.getSession();
    if (!session || !session.roundId) return;

    if (isObject(branding) && Object.keys(branding).length) {
      if (typeof stateApi.persistSessionBranding === "function") {
        stateApi.persistSessionBranding(branding, session.roundId);
      } else if (typeof stateApi.saveSession === "function") {
        stateApi.saveSession({
          roundId: session.roundId,
          branding: branding
        });
      }
      return;
    }

    if (typeof stateApi.saveSession === "function") {
      stateApi.saveSession({
        roundId: session.roundId,
        branding: null
      });
    }
  }

  function restoreRuntimeBrandingFromSession() {
    const stateApi = getStateApi();
    if (!stateApi || typeof stateApi.getSessionBranding !== "function") return;
    const stored = stateApi.getSessionBranding();
    if (!stored || !isObject(stored)) return;
    state.runtimeBranding = sanitizeRuntimeBranding(stored);
  }

  function resolveBranding() {
    const source = getBrandingSource();
    const displayName = normalizeText(source && source.displayName, DEFAULT_BRANDING.displayName);
    const subtitle = normalizeText(source && source.subtitle, DEFAULT_BRANDING.subtitle);
    const accentColor = normalizeColor(
      source && (source.accentColor || source.accent || source.brandColor),
      DEFAULT_BRANDING.accentColor
    );
    const accentRgb = parseCssColorToRgb(accentColor);
    const derivedStrongRgb = accentRgb ? mixColor(accentRgb, { r: 0, g: 0, b: 0 }, 0.23) : null;
    const derivedSoftRgb = accentRgb ? mixColor(accentRgb, { r: 255, g: 255, b: 255 }, 0.8) : null;
    const derivedSurfaceRgb = accentRgb ? mixColor(accentRgb, { r: 255, g: 255, b: 255 }, 0.9) : null;
    const derivedStrong = derivedStrongRgb ? rgbToHex(derivedStrongRgb) : DEFAULT_BRANDING.accentStrongColor;
    const derivedSoft = derivedSoftRgb ? rgbToHex(derivedSoftRgb) : DEFAULT_BRANDING.accentSoftColor;
    const accentStrongColor = normalizeColor(
      source && (source.accentStrongColor || source.brandStrongColor),
      derivedStrong || DEFAULT_BRANDING.accentStrongColor
    );
    const accentSoftColor = normalizeColor(
      source && (source.accentSoftColor || source.brandSoftColor),
      derivedSoft || DEFAULT_BRANDING.accentSoftColor
    );
    const surfaceTint = normalizeColor(
      source && source.surfaceTint,
      (derivedSurfaceRgb ? rgbToHex(derivedSurfaceRgb) : DEFAULT_BRANDING.surfaceTint) || DEFAULT_BRANDING.surfaceTint
    );
    const surfaceRgb = parseCssColorToRgb(surfaceTint) || parseCssColorToRgb(DEFAULT_BRANDING.surfaceTint);
    const inkColor = normalizeColor(
      source && source.inkColor,
      deriveInkColor(accentRgb, surfaceRgb)
    );
    return {
      displayName: displayName,
      subtitle: subtitle,
      accentColor: accentColor,
      accentStrongColor: accentStrongColor,
      accentSoftColor: accentSoftColor,
      logoPath: source && typeof source.logoPath === "string" ? source.logoPath.trim() : "",
      surfaceTint: surfaceTint || DEFAULT_BRANDING.surfaceTint,
      inkColor: inkColor || DEFAULT_BRANDING.inkColor
    };
  }

  function applyBranding() {
    const branding = resolveBranding();
    window.PocketCaddyResolvedBranding = branding;

    const root = document.documentElement;
    if (root && root.style) {
      root.style.setProperty("--pc-accent", branding.accentColor || DEFAULT_BRANDING.accentColor);
      root.style.setProperty("--pc-accent-strong", branding.accentStrongColor || DEFAULT_BRANDING.accentStrongColor);
      root.style.setProperty("--pc-accent-soft", branding.accentSoftColor || DEFAULT_BRANDING.accentSoftColor);
      root.style.setProperty("--pc-brand-surface", branding.surfaceTint || DEFAULT_BRANDING.surfaceTint);
      root.style.setProperty("--pc-brand-ink", branding.inkColor || DEFAULT_BRANDING.inkColor);
      root.style.setProperty("--pc-brand-logo-url", "none");
      root.classList.remove("pc-has-logo");
    }

    const displayNameNode = document.getElementById("app-display-name");
    if (displayNameNode) {
      displayNameNode.textContent = branding.displayName || DEFAULT_BRANDING.displayName;
    }
    const subtitleNode = document.getElementById("app-brand-subtitle");
    if (subtitleNode) {
      subtitleNode.textContent = branding.subtitle || DEFAULT_BRANDING.subtitle;
    }
    const statusTitleNode = document.getElementById("home-status-title");
    if (statusTitleNode) {
      statusTitleNode.textContent = `${branding.displayName || DEFAULT_BRANDING.displayName} Status`;
    }
    if (document.title && branding.displayName) {
      document.title = branding.displayName;
    }

    const logoSlot = document.getElementById("app-logo-slot");
    const logoImage = document.getElementById("app-logo-image");
    if (!logoSlot || !logoImage) return branding;

    if (!branding.logoPath) {
      logoImage.onload = null;
      logoImage.onerror = null;
      logoImage.removeAttribute("src");
      logoImage.alt = "";
      logoSlot.classList.add("hidden");
      if (root && root.classList) root.classList.remove("pc-has-logo");
      return branding;
    }

    logoImage.alt = `${branding.displayName || DEFAULT_BRANDING.displayName} logo`;
    logoImage.onerror = () => {
      logoImage.removeAttribute("src");
      logoImage.alt = "";
      logoSlot.classList.add("hidden");
      if (root && root.style) root.style.setProperty("--pc-brand-logo-url", "none");
      if (root && root.classList) root.classList.remove("pc-has-logo");
    };
    logoImage.onload = () => {
      if (root && root.classList) root.classList.add("pc-has-logo");
    };
    if (root && root.style) {
      root.style.setProperty("--pc-brand-logo-url", `url("${escapeForCssUrl(branding.logoPath)}")`);
      root.classList.add("pc-has-logo");
    }
    logoImage.src = branding.logoPath;
    logoSlot.classList.remove("hidden");
    return branding;
  }

  function updateBranding(newBranding) {
    state.runtimeBranding = sanitizeRuntimeBranding(newBranding);
    persistBrandingToSession(state.runtimeBranding);
    return applyBranding();
  }

  function getRuntimeBranding() {
    return Object.assign({}, state.runtimeBranding || {});
  }

  function onBrandingUpdateEvent(event) {
    const payload = event && isObject(event.detail) ? event.detail : {};
    updateBranding(payload);
  }

  window.PocketCaddyBrandingAPI = {
    applyBranding: applyBranding,
    updateBranding: updateBranding,
    getRuntimeBranding: getRuntimeBranding
  };

  window.addEventListener(BRANDING_UPDATE_EVENT, onBrandingUpdateEvent);

  function initializeBranding() {
    restoreRuntimeBrandingFromSession();
    applyBranding();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBranding, { once: true });
  } else {
    initializeBranding();
  }
})();
