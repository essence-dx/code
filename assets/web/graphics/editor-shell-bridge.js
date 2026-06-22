(function () {
  const toolbarSelector = 'nav[aria-label="Editor tools"]';
  const toolSelector = "[data-editor-tool]";
  const activeAttribute = "data-editor-tool-active";
  const hydratedAttribute = "data-editor-client-ready";

  const cursorByTool = {
    hand: "grab",
    text: "text",
    select: "default",
    comment: "copy",
  };

  function isReactReady() {
    return document.body?.dataset.editorClientReady === "true";
  }

  function closestTool(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const tool = target.closest(toolSelector);
    const toolbar = tool?.closest(toolbarSelector);

    return toolbar ? tool : null;
  }

  function activateTool(toolName) {
    if (!toolName) {
      return;
    }

    document.documentElement.dataset.editorTool = toolName;

    for (const item of document.querySelectorAll(`${toolbarSelector} ${toolSelector}`)) {
      if (item.getAttribute("data-editor-tool") === toolName) {
        item.setAttribute(activeAttribute, "true");
        item.setAttribute("aria-pressed", "true");
      } else {
        item.removeAttribute(activeAttribute);
        item.removeAttribute("aria-pressed");
      }
    }

    for (const menu of document.querySelectorAll(`${toolbarSelector} details`)) {
      const active = Boolean(
        menu.querySelector(`${toolSelector}[${activeAttribute}="true"]`),
      );

      if (active) {
        menu.setAttribute(activeAttribute, "true");
      } else {
        menu.removeAttribute(activeAttribute);
      }
    }

    const cursor = cursorByTool[toolName] || "crosshair";

    for (const surface of document.querySelectorAll("[data-canvas-surface='true']")) {
      surface.style.cursor = cursor;
    }
  }

  function closeMenu(element) {
    element.closest("details")?.removeAttribute("open");
  }

  function handleToolActivation(event) {
    if (isReactReady()) {
      return;
    }

    if (
      event.type === "keydown" &&
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    const tool = closestTool(event.target);

    if (!tool || tool.hasAttribute("disabled")) {
      return;
    }

    const eventWithButton = event;

    if (
      (event.type === "pointerdown" || event.type === "mousedown") &&
      eventWithButton.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    activateTool(tool.getAttribute("data-editor-tool"));
    closeMenu(tool);
  }

  function markReady() {
    if (!document.body || document.body.hasAttribute(hydratedAttribute)) {
      return;
    }

    document.body.setAttribute(hydratedAttribute, "fallback");

    const current =
      document.querySelector(`${toolbarSelector} ${toolSelector}[${activeAttribute}="true"]`) ??
      document.querySelector(`${toolbarSelector} .bg-secondary${toolSelector}`) ??
      document.querySelector(`${toolbarSelector} ${toolSelector}[data-editor-tool='select']`);

    activateTool(current?.getAttribute("data-editor-tool") || "select");
  }

  document.addEventListener("pointerdown", handleToolActivation, true);
  document.addEventListener("mousedown", handleToolActivation, true);
  document.addEventListener("click", handleToolActivation, true);
  document.addEventListener("keydown", handleToolActivation, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markReady, { once: true });
  } else {
    markReady();
  }
})();
