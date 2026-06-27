(function () {
  if (window.__agentCursor) return;

  var DEBUG = window.__AGENT_CURSOR_DEBUG === true;
  var POINTER_ID = 4242;
  var RECONNECT_BASE_MS = 500;
  var RECONNECT_MAX_MS = 15000;
  var RATE_LIMIT_MS = 16;
  var worldX = 0, worldY = 0, pointerPressed = false;
  var ws = null, closed = false, connected = false;
  var reconnectAttempt = 0, reconnectTimer = null;
  var lastCmdTime = 0;

  function log() {
    if (DEBUG) console.log.apply(console, ["[agent-cursor]"].concat(Array.prototype.slice.call(arguments)));
  }
  function warn() {
    console.warn.apply(console, ["[agent-cursor]"].concat(Array.prototype.slice.call(arguments)));
  }

  function localToScreen(x, y) {
    var svg = document.querySelector("svg");
    if (svg && typeof svg.createSVGPoint === "function" && svg.getScreenCTM()) {
      var p = svg.createSVGPoint(); p.x = x; p.y = y;
      var m = svg.getScreenCTM();
      return m ? p.matrixTransform(m) : { x: x, y: y };
    }
    return { x: x, y: y };
  }

  function screenToLocal(sx, sy) {
    var svg = document.querySelector("svg");
    if (svg && typeof svg.createSVGPoint === "function" && svg.getScreenCTM()) {
      var p = svg.createSVGPoint(); p.x = sx; p.y = sy;
      var m = svg.getScreenCTM();
      if (m) { var inv = m.inverse(); return p.matrixTransform(inv); }
    }
    return { x: sx, y: sy };
  }

  var overlay = document.createElement("div");
  overlay.id = "__agentCursorOverlay";
  overlay.innerHTML = '<svg width="40" height="40" viewBox="-20 -20 40 40">' +
    '<circle r="8" fill="none" stroke="#ff3b8d" stroke-width="2.5" opacity="0.9"/>' +
    '<circle r="2" fill="#ff3b8d" opacity="0.9"/>' +
    '<line x1="0" y1="-12" x2="0" y2="12" stroke="#ff3b8d" stroke-width="1.5" opacity="0.6"/>' +
    '<line x1="-12" y1="0" x2="12" y2="0" stroke="#ff3b8d" stroke-width="1.5" opacity="0.6"/>' +
    '<circle r="20" fill="#ff3b8d" opacity="0.06"/>' +
    '</svg>';
  overlay.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;transition:transform 0.06s linear;display:none;left:0;top:0;";
  document.documentElement.append(overlay);

  var indicator = document.createElement("div");
  indicator.id = "__agentCursorIndicator";
  indicator.style.cssText = "position:fixed;bottom:12px;right:12px;width:10px;height:10px;border-radius:50%;z-index:2147483647;transition:background 0.3s;background:#ef4444;";
  indicator.title = "Agent cursor disconnected";
  document.documentElement.append(indicator);

  function showCursor(x, y) {
    worldX = x; worldY = y;
    var screen = localToScreen(x, y);
    overlay.style.display = "";
    overlay.style.transform = "translate(" + screen.x + "px, " + screen.y + "px) translate(-50%, -50%)";
  }
  function hideCursor() { overlay.style.display = "none"; }
  function setConnected(c) {
    connected = c;
    indicator.style.background = c ? "#4ade80" : "#ef4444";
    indicator.title = c ? "Agent cursor connected" : "Agent cursor disconnected";
  }

  function elementAtPoint(sx, sy) {
    try { return document.elementFromPoint(sx, sy); } catch (e) { return null; }
  }

  function dispatch(type, sx, sy, opts) {
    opts = opts || {};
    var target = elementAtPoint(sx, sy) || document.documentElement;
    target.dispatchEvent(new PointerEvent(type, {
      clientX: sx, clientY: sy,
      pointerId: POINTER_ID, pointerType: "mouse",
      isPrimary: true, bubbles: true, cancelable: true,
      button: opts.button !== undefined ? opts.button : 0,
      buttons: opts.buttons !== undefined ? opts.buttons : 1,
    }));
  }

  function rateLimit() {
    var now = Date.now();
    if (now - lastCmdTime < RATE_LIMIT_MS) return false;
    lastCmdTime = now;
    return true;
  }

  function move(x, y) {
    if (!rateLimit()) return;
    showCursor(x, y);
    log("move", x, y);
  }
  function moveToScreen(sx, sy) {
    var p = screenToLocal(sx, sy);
    move(p.x, p.y);
  }
  function pointerDown(button) {
    var screen = localToScreen(worldX, worldY);
    dispatch("pointerdown", screen.x, screen.y, { button: button || 0, buttons: 1 });
    pointerPressed = true;
    log("pointerDown", button);
  }
  function pointerUp() {
    var screen = localToScreen(worldX, worldY);
    dispatch("pointerup", screen.x, screen.y, { button: 0, buttons: 0 });
    pointerPressed = false;
    log("pointerUp");
  }
  function pointerMove(x, y, button) {
    if (!rateLimit()) return;
    showCursor(x, y);
    var screen = localToScreen(worldX, worldY);
    dispatch("pointermove", screen.x, screen.y, { button: button || 0, buttons: pointerPressed ? 1 : 0 });
    log("pointerMove", x, y);
  }
  function click(x, y, button) {
    if (x !== undefined) showCursor(x, y);
    var screen = localToScreen(worldX, worldY);
    dispatch("pointerdown", screen.x, screen.y, { button: button || 0, buttons: 1 });
    pointerPressed = true;
    setTimeout(function () {
      dispatch("pointerup", screen.x, screen.y, { button: 0, buttons: 0 });
      pointerPressed = false;
    }, 50);
    log("click", x, y, button);
  }
  function keyDown(key) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent("keypress", { key: key, bubbles: true, cancelable: true }));
    log("keyDown", key);
  }
  function keyUp(key) {
    window.dispatchEvent(new KeyboardEvent("keyup", { key: key, bubbles: true, cancelable: true }));
  }
  function type(text) {
    if (typeof text !== "string") { warn("type: expected string, got", typeof text); return; }
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      keyDown(c);
      keyUp(c);
    }
    log("type", text.length, "chars");
  }
  function wheel(dx, dy) {
    var screen = localToScreen(worldX, worldY);
    window.dispatchEvent(new WheelEvent("wheel", {
      clientX: screen.x, clientY: screen.y,
      deltaX: dx, deltaY: dy, bubbles: true, cancelable: true,
    }));
    log("wheel", dx, dy);
  }
  function scrollTo(x, y) { window.scrollTo({ left: x, top: y, behavior: "instant" }); log("scrollTo", x, y); }

  function screenshot() {
    var ipc = window.ipc;
    if (!ipc || typeof ipc.postMessage !== "function") { warn("screenshot: no ipc.postMessage available"); return; }
    try {
      var canvas = document.createElement("canvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      var ctx = canvas.getContext("2d");
      if (!ctx) { warn("screenshot: no 2d context"); return; }
      document.documentElement.style.background = "#fff";
      if (typeof ctx.drawWindow === "function") {
        ctx.drawWindow(window, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#888";
        ctx.font = "14px sans-serif";
        ctx.fillText("[agent-cursor screenshot fallback — capture via canvas-export]", 20, 40);
      }
      canvas.toBlob(function (blob) {
        if (!blob) { warn("screenshot: toBlob returned null"); return; }
        var reader = new FileReader();
        reader.onload = function () {
          ipc.postMessage(JSON.stringify({
            kind: "dx-www-canvas-export",
            data: reader.result.split(",")[1],
            mime: "image/png",
            filename: "screenshot-" + Date.now() + ".png",
            timestamp: Date.now(),
          }));
          log("screenshot captured and sent");
        };
        reader.readAsDataURL(blob);
      }, "image/png");
    } catch (e) { warn("screenshot error:", e); }
  }

  function validateNumber(v, name) {
    if (typeof v !== "number" || !isFinite(v)) { warn("invalid " + name + ":", v); return false; }
    return true;
  }

  function process(cmd) {
    if (!cmd || typeof cmd !== "object") { warn("process: invalid command", cmd); return; }
    if (cmd.type === "wait") return;
    if (cmd.type === "setTool") return;
    if (cmd.type === "command" || cmd.type === "commands") return;
    switch (cmd.type) {
      case "move":
        if (validateNumber(cmd.x, "x") && validateNumber(cmd.y, "y")) move(cmd.x, cmd.y);
        break;
      case "moveToScreen":
        if (validateNumber(cmd.x, "x") && validateNumber(cmd.y, "y")) moveToScreen(cmd.x, cmd.y);
        break;
      case "pointerDown": pointerDown(cmd.button); break;
      case "pointerUp": pointerUp(); break;
      case "pointerMove":
        if (validateNumber(cmd.x, "x") && validateNumber(cmd.y, "y")) pointerMove(cmd.x, cmd.y, cmd.button);
        break;
      case "click": click(cmd.x, cmd.y, cmd.button); break;
      case "keyDown": if (typeof cmd.key === "string") keyDown(cmd.key); break;
      case "keyUp": if (typeof cmd.key === "string") keyUp(cmd.key); break;
      case "type": type(cmd.text); break;
      case "wheel":
        if (validateNumber(cmd.deltaX, "deltaX") && validateNumber(cmd.deltaY, "deltaY")) wheel(cmd.deltaX, cmd.deltaY);
        break;
      case "scrollTo":
        if (validateNumber(cmd.x, "x") && validateNumber(cmd.y, "y")) scrollTo(cmd.x, cmd.y);
        break;
      case "screenshot": screenshot(); break;
      case "batch":
        if (Array.isArray(cmd.commands)) { for (var i = 0; i < cmd.commands.length; i++) process(cmd.commands[i]); }
        break;
      default: log("unknown command type:", cmd.type);
    }
  }

  function parse(data) {
    try {
      var cmds = Array.isArray(data) ? data : [JSON.parse(data)];
      for (var i = 0; i < cmds.length; i++) process(cmds[i]);
    } catch (e) { warn("parse error:", e); }
  }

  function connect() {
    if (closed) return;
    var url = window.__AGENT_CURSOR_WS || "ws://localhost:3001";
    try { ws = new WebSocket(url); } catch (e) {
      warn("WebSocket constructor failed:", e);
      scheduleReconnect();
      return;
    }
    ws.onopen = function () {
      reconnectAttempt = 0;
      setConnected(true);
      log("connected to", url);
    };
    ws.onmessage = function (e) {
      if (typeof e.data === "string") {
        log("recv", e.data.length + " bytes");
        parse(e.data);
      }
    };
    ws.onclose = function (e) {
      setConnected(false);
      log("disconnected (code=" + e.code + " reason=" + e.reason + ")");
      ws = null;
      scheduleReconnect();
    };
    ws.onerror = function () {
      ws.close();
    };
  }

  function scheduleReconnect() {
    if (closed) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    var delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt), RECONNECT_MAX_MS);
    delay += Math.random() * 1000;
    reconnectAttempt++;
    log("reconnecting in " + Math.round(delay) + "ms (attempt " + reconnectAttempt + ")");
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function disconnect() {
    closed = true;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws) { ws.close(); ws = null; }
    setConnected(false);
    hideCursor();
    log("disconnected");
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
      log("sent", (typeof data === "string" ? data.length + " bytes" : data));
    }
  }

  connect();

  var api = { move: move, click: click, keyDown: keyDown, keyUp: keyUp, type: type, pointerDown: pointerDown, pointerUp: pointerUp, pointerMove: pointerMove, wheel: wheel, scrollTo: scrollTo, screenshot: screenshot, parse: parse, send: send, connect: connect, disconnect: disconnect, setTool: function () {} };
  window.__agentCursor = api;
  window.dispatchEvent(new CustomEvent("agent-cursor-ready", { detail: api }));
})();
