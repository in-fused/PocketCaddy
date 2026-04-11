(function () {
  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function extractSessionBranding(round) {
    if (!isObject(round)) return null;
    const candidates = [
      round.sessionBranding,
      round.session_branding,
      round.branding,
      round.branding_payload,
      round.brandingPayload,
      isObject(round.metadata) ? round.metadata.branding : null,
      isObject(round.sessionMetadata) ? round.sessionMetadata.branding : null,
      isObject(round.session_metadata) ? round.session_metadata.branding : null
    ];
    for (let i = 0; i < candidates.length; i += 1) {
      if (isObject(candidates[i])) return candidates[i];
    }
    return null;
  }

  function applySessionBrandingIfAvailable(deps) {
    if (!deps || !deps.state || !deps.state.round) return;
    const api = window.PocketCaddyBrandingAPI;
    if (!api || typeof api.updateBranding !== "function") return;
    const branding = extractSessionBranding(deps.state.round);
    if (!branding) return;
    api.updateBranding(branding);
  }

  function applyStoredSessionBranding(session) {
    if (!isObject(session) || !isObject(session.branding)) return;
    const api = window.PocketCaddyBrandingAPI;
    if (!api || typeof api.updateBranding !== "function") return;
    api.updateBranding(session.branding);
  }

  function injectBrandingIntoCreateInput(input) {
    if (!isObject(input)) return input;
    const brandingApi = window.PocketCaddyBrandingAPI;
    if (!brandingApi || typeof brandingApi.getRuntimeBranding !== "function") return input;
    const payload = brandingApi.getRuntimeBranding();
    if (!isObject(payload) || !Object.keys(payload).length) return input;

    if (isObject(input.sessionMetadata)) {
      input.sessionMetadata.branding = { ...payload };
    } else if (isObject(input.session_metadata)) {
      input.session_metadata.branding = { ...payload };
    } else if (isObject(input.metadata)) {
      input.metadata.branding = { ...payload };
    }
    return input;
  }

  async function joinRoundById(roundId, deps) {
    await deps.loadRound(roundId);
    deps.saveSession({ roundId: roundId });
    applySessionBrandingIfAvailable(deps);
    deps.updateUrlRoundParam(roundId);
    deps.showView("score");
  }

  async function createRound(deps) {
    const input = deps.validateCreateInputs();
    if (input.error) {
      deps.showError(deps.dom.homeError, input.error);
      return;
    }
    deps.dom.createRoundBtn.disabled = true;
    deps.showError(deps.dom.homeError, "");
    try {
      const created = await deps.createRoundWithPlayers(injectBrandingIntoCreateInput(input));
      await joinRoundById(created.round.id, deps);
    } catch (err) {
      deps.showError(deps.dom.homeError, "Could not create round. Please try again.");
      console.error(err);
    } finally {
      deps.dom.createRoundBtn.disabled = false;
    }
  }

  async function joinRound(deps) {
    const text = deps.dom.joinInput.value.trim();
    deps.dom.joinInput.value = text;
    if (!text) {
      deps.showError(deps.dom.joinError, "Enter a Round Link or Full Round ID.");
      return;
    }
    deps.dom.joinRoundBtn.disabled = true;
    deps.showError(deps.dom.joinError, "");
    try {
      const round = await deps.findRoundByCodeOrLink(text);
      if (!round) {
        deps.showError(deps.dom.joinError, "Round not found.");
        return;
      }
      await joinRoundById(round.id, deps);
    } catch (err) {
      deps.showError(deps.dom.joinError, "Could not join that round.");
      console.error(err);
    } finally {
      deps.dom.joinRoundBtn.disabled = false;
    }
  }

  async function resumeSession(deps) {
    const session = deps.getSession();
    if (!session || !session.roundId) {
      deps.showView("home");
      return;
    }
    try {
      applyStoredSessionBranding(session);
      await joinRoundById(session.roundId, deps);
    } catch (err) {
      deps.clearLocalSavedSessionState(session.roundId);
      deps.showView("home");
      deps.showError(deps.dom.homeError, "Could not resume saved session.");
      console.error(err);
    }
  }

  function cancelSession(deps) {
    const session = deps.getSession();
    if (!session || !session.roundId) {
      deps.updateHomeQuickActions();
      return;
    }
    const ok = window.confirm("Remove this saved round from this device? The shared round will still exist for anyone with the link.");
    if (!ok) return;
    deps.clearLocalSavedSessionState(session.roundId);
    deps.updateHomeQuickActions();
    deps.showFeedback("Saved round removed from this device.");
    if (!deps.dom.homeView.classList.contains("hidden")) {
      deps.showError(deps.dom.homeError, "");
    }
  }

  function initializeAppFlow(deps) {
    console.log("PocketCaddy v1 live");
    deps.wireEvents();
    deps.ensureRoundHistorySection();
    deps.state.roundHistory = deps.loadRoundHistoryFromStorage();
    deps.renderSetupPlayers();
    deps.renderSelectedCourseCard();
    deps.renderCourseSuggestions([]);
    deps.ensureShareActionButtons();
    deps.renderRoundHistorySection();

    const fromUrl = deps.getRoundIdFromUrl();
    if (fromUrl) {
      joinRoundById(fromUrl, deps).catch((err) => {
        deps.showError(deps.dom.homeError, "Could not open that shared round link.");
        deps.showFeedback("Unable to open round from link.", true);
        deps.showView("home");
        console.error(err);
      });
      return;
    }

    deps.showView("home");
  }

  window.PocketCaddyRoundLifecycle = {
    createRound: createRound,
    joinRound: joinRound,
    resumeSession: resumeSession,
    cancelSession: cancelSession,
    initializeAppFlow: initializeAppFlow
  };
})();
