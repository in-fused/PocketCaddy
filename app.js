(function () {
  "use strict";

  const RUNTIME_SCRIPT_PATH = "src/js/core/appRuntimeLegacy.js";

  const state = {
    runtimeLoaded: false,
    runtimeLoading: false,
    runtimeBootQueued: false,
    eventsWired: false
  };

  // INIT
  function init() {
    wireEvents();
    queueRuntimeBoot();
  }

  // EVENT LISTENERS
  function wireEvents() {
    if (state.eventsWired) return;
    state.eventsWired = true;
    document.addEventListener("pocketcaddy:runtime-ready", onRuntimeReady);
  }

  // HANDLERS
  function onRuntimeReady() {
    queueRuntimeBoot();
  }

  // ROUTING HELPERS
  function queueRuntimeBoot() {
    state.runtimeBootQueued = true;
    if (isRuntimeAvailable()) {
      bootRuntime();
      return;
    }
    loadRuntimeScript();
  }

  function isRuntimeAvailable() {
    return Boolean(
      window.PocketCaddyAppRuntimeLegacy
      && typeof window.PocketCaddyAppRuntimeLegacy.boot === "function"
    );
  }

  function loadRuntimeScript() {
    if (state.runtimeLoaded || state.runtimeLoading) return;
    state.runtimeLoading = true;

    const script = document.createElement("script");
    script.src = RUNTIME_SCRIPT_PATH;
    script.async = true;
    script.addEventListener("load", onRuntimeScriptLoaded, { once: true });
    script.addEventListener("error", onRuntimeScriptError, { once: true });
    document.head.appendChild(script);
  }

  function onRuntimeScriptLoaded() {
    state.runtimeLoaded = true;
    state.runtimeLoading = false;
    bootRuntime();
  }

  function onRuntimeScriptError() {
    state.runtimeLoading = false;
    console.error("PocketCaddy runtime failed to load.");
  }

  function bootRuntime() {
    if (!state.runtimeBootQueued || !isRuntimeAvailable()) return;
    state.runtimeBootQueued = false;
    window.PocketCaddyAppRuntimeLegacy.boot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
