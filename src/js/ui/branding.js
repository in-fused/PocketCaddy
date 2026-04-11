(function () {
  "use strict";

  const DEFAULT_BRANDING = Object.freeze({
    displayName: "PocketCaddy",
    subtitle: "Create, join, and score rounds in real time.",
    accentColor: "#1f7a3e",
    accentStrongColor: "#155f30",
    accentSoftColor: "#d9ecdf",
    logoPath: "",
    surfaceTint: "",
    inkColor: ""
  });

  function getBrandingSource() {
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

  function rgbaString(rgb, alpha) {
    if (!rgb) return "";
    const safeAlpha = Number.isFinite(Number(alpha)) ? Math.max(0, Math.min(1, Number(alpha))) : 1;
    return `rgba(${clampChannel(rgb.r)}, ${clampChannel(rgb.g)}, ${clampChannel(rgb.b)}, ${safeAlpha})`;
  }

  function resolveBranding() {
    const source = getBrandingSource();
    const displayName = normalizeText(source && source.displayName, DEFAULT_BRANDING.displayName);
    const subtitle = normalizeText(source && source.subtitle, DEFAULT_BRANDING.subtitle);
    const accentColor = normalizeColor(
      source && (source.accentColor || source.accent || source.brandColor),
      DEFAULT_BRANDING.accentColor
    );
    const accentRgb = parseHexColor(accentColor);
    const derivedStrong = accentRgb ? rgbToHex(adjustColor(accentRgb, -26)) : DEFAULT_BRANDING.accentStrongColor;
    const derivedSoft = accentRgb ? rgbaString(accentRgb, 0.17) : DEFAULT_BRANDING.accentSoftColor;
    const accentStrongColor = normalizeColor(
      source && (source.accentStrongColor || source.brandStrongColor),
      derivedStrong || DEFAULT_BRANDING.accentStrongColor
    );
    const accentSoftColor = normalizeColor(
      source && (source.accentSoftColor || source.brandSoftColor),
      derivedSoft || DEFAULT_BRANDING.accentSoftColor
    );
    return {
      displayName: displayName,
      subtitle: subtitle,
      accentColor: accentColor,
      accentStrongColor: accentStrongColor,
      accentSoftColor: accentSoftColor,
      logoPath: source && typeof source.logoPath === "string" ? source.logoPath.trim() : "",
      surfaceTint: normalizeColor(source && source.surfaceTint, ""),
      inkColor: normalizeColor(source && source.inkColor, "")
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
      if (branding.surfaceTint) {
        root.style.setProperty("--pc-brand-surface", branding.surfaceTint);
      }
      if (branding.inkColor) {
        root.style.setProperty("--pc-brand-ink", branding.inkColor);
      }
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
    if (!logoSlot || !logoImage) return;

    if (!branding.logoPath) {
      logoImage.removeAttribute("src");
      logoImage.alt = "";
      logoSlot.classList.add("hidden");
      return;
    }

    logoImage.alt = `${branding.displayName || DEFAULT_BRANDING.displayName} logo`;
    logoImage.addEventListener("error", () => {
      logoImage.removeAttribute("src");
      logoImage.alt = "";
      logoSlot.classList.add("hidden");
    }, { once: true });
    logoImage.src = branding.logoPath;
    logoSlot.classList.remove("hidden");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyBranding, { once: true });
  } else {
    applyBranding();
  }
})();
