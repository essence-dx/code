(function () {
  if (window.__agentCursor) return;
  const POINTER_ID = 4242;
  let worldX = 0, worldY = 0, pointerPressed = false;
  let ws = null, closed = false, connected = false;

  function localToScreen(x, y) {
    const svg = document.querySelector("svg");
    if (svg && typeof svg.createSVGPoint === "function" && svg.getScreenCTM()) {
      const p = svg.createSVGPoint(); p.x = x; p.y = y;
      const m = svg.getScreenCTM();
      return m ? p.matrixTransform(m) : { x, y };
    }
    return { x, y };
  }

  function screenToLocal(sx, sy) {
    const svg = document.querySelector("svg");
    if (svg && typeof svg.createSVGPoint === "function" && svg.getScreenCTM()) {
      const p = svg.createSVGPoint(); p.x = sx; p.y = sy;
      const m = svg.getScreenCTM();
      if (m) { const inv = m.inverse(); return p.matrixTransform(inv); }
    }
    return { x: sx, y: sy };
  }

  const overlay = document.createElement("div");
  overlay.id = "__agentCursorOverlay";
  overlay.innerHTML = '<svg width="40" height="40" viewBox="-20 -20 40 40">' +
    '<circle r="8" fill="none" stroke="#ff3b8d" stroke-width="2.5" opacity="0.9"/>' +
    '<circle r="2" fill="#ff3b8d" opacity="0.9"/>' +
    '<line x1="0" y1="-12" x2="0" y2="12" stroke="#ff3b8d" stroke-width="1.5" opacity="0.6"/>' +
    '<line x1="-12" y1="0" x2="12" y2="0" stroke="#ff3b8d" stroke-width="1.5" opacity="0.6"/>' +
    '<circle r="20" fill="#ff3b8d" opacity="0.06"/>' +
    '</svg>';
  overlay.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;transition:transform 0.06s linear;display:none;";
  document.documentElement.append(overlay);

  const indicator = document.createElement("div");
  indicator.id = "__agentCursorIndicator";
  indicator.style.cssText = "position:fixed;bottom:12px;right:12px;width:10px;height:10px;border-radius:50%;z-index:2147483647;transition:background 0.3s;background:#ef4444;";
  indicator.title = "Agent cursor disconnected";
  document.documentElement.append(indicator);

  function showCursor(x, y) {
    worldX = x; worldY = y;
    const screen = localToScreen(x, y);
    overlay.style.display = "";
    overlay.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -50%)`;
  }
  function hideCursor() { overlay.style.display = "none"; }
  function setConnected(c) {
    connected = c;
    indicator.style.background = c ? "#4ade80" : "#ef4444";
    indicator.title = c ? "Agent cursor connected" : "Agent cursor disconnected";
  }

  function dispatch(type, x, y, opts = {}) {
    const screen = localToScreen(x, y);
    const target = type === "pointerdown" ? document.documentElement : window;
    target.dispatchEvent(new PointerEvent(type, {
      clientX: screen.x, clientY: screen.y,
      pointerId: POINTER_ID, pointerType: "mouse",
      isPrimary: true, bubbles: true, cancelable: true,
      button: opts.button ?? 0, buttons: opts.buttons ?? 1,
    }));
  }

  // --- Commands ---
  function move(x, y) { showCursor(x, y); }
  function moveToScreen(sx, sy) { const p = screenToLocal(sx, sy); move(p.x, p.y); }
  function pointerDown(button) { dispatch("pointerdown", worldX, worldY, { button: button ?? 0, buttons: 1 }); pointerPressed = true; }
  function pointerUp() { dispatch("pointerup", worldX, worldY, { button: 0, buttons: 0 }); pointerPressed = false; }
  function pointerMove(x, y, button) {
    move(x, y);
    dispatch("pointermove", worldX, worldY, { button: button ?? 0, buttons: pointerPressed ? 1 : 0 });
  }
  function click(x, y, button) {
    if (x !== undefined) move(x, y);
    pointerDown(button);
    setTimeout(() => pointerUp(), 50);
  }
  function keyDown(key) { window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })); }
  function type(text) { for (const c of text) keyDown(c); }
  function wheel(dx, dy) {
    const screen = localToScreen(worldX, worldY);
    window.dispatchEvent(new WheelEvent("wheel", {
      clientX: screen.x, clientY: screen.y,
      deltaX: dx, deltaY: dy, bubbles: true, cancelable: true,
    }));
  }
  function scrollTo(x, y) { window.scrollTo(x, y); }

  function screenshot() {
    const ipc = window.ipc;
    if (!ipc || typeof ipc.postMessage !== "function") return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawWindow ? ctx.drawWindow(window, 0, 0, canvas.width, canvas.height) : null;
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          ipc.postMessage(JSON.stringify({ kind: "dx-www-canvas-export", data: reader.result.split(",")[1], mime: "image/png", timestamp: Date.now() }));
        };
        reader.readAsDataURL(blob);
      }, "image/png");
    } catch {}
  }

  function parse(data) {
    try {
      const cmds = Array.isArray(data) ? data : [JSON.parse(data)];
      for (const cmd of cmds) process(cmd);
    } catch (e) { console.error("[agent-cursor] parse error:", e); }
  }

  function process(cmd) {
    switch (cmd.type) {
      case "move": move(cmd.x, cmd.y); break;
      case "moveToScreen": moveToScreen(cmd.x, cmd.y); break;
      case "pointerDown": pointerDown(cmd.button); break;
      case "pointerUp": pointerUp(); break;
      case "pointerMove": pointerMove(cmd.x, cmd.y, cmd.button); break;
      case "click": click(cmd.x, cmd.y, cmd.button); break;
      case "setTool": break;
      case "keyDown": keyDown(cmd.key); break;
      case "type": type(cmd.text); break;
      case "wheel": wheel(cmd.deltaX, cmd.deltaY); break;
      case "scrollTo": scrollTo(cmd.x, cmd.y); break;
      case "wait": break;
      case "screenshot": screenshot(); break;
      case "batch": if (cmd.commands) for (const c of cmd.commands) process(c); break;
    }
  }

  // --- WebSocket ---
  function connect() {
    if (closed) return;
    const url = window.__AGENT_CURSOR_WS || "ws://localhost:3001";
    try { ws = new WebSocket(url); } catch { return setTimeout(connect, 2000); }
    ws.onopen = () => setConnected(true);
    ws.onmessage = (e) => { if (typeof e.data === "string") parse(e.data); };
    ws.onclose = () => { setConnected(false); ws = null; setTimeout(connect, 2000); };
    ws.onerror = () => ws?.close();
  }
  function disconnect() { closed = true; ws?.close(); ws = null; setConnected(false); }
  function send(data) { if (ws?.readyState === WebSocket.OPEN) ws.send(data); }

  connect();

  window.__agentCursor = { move, click, setTool(){}, keyDown, type, parse, send, connect, disconnect, screenshot };
  window.dispatchEvent(new CustomEvent("agent-cursor-ready", { detail: window.__agentCursor }));
})();
