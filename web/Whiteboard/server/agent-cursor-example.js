const WebSocket = require("ws");

const WS_URL = process.env.AGENT_CURSOR_URL || "ws://localhost:3001";
const CONNECT_TIMEOUT_MS = 5000;
const ws = new WebSocket(WS_URL);

let connected = false;
let connectTimer = setTimeout(() => {
  if (!connected) {
    console.error("Connection timed out after " + CONNECT_TIMEOUT_MS + "ms");
    process.exit(1);
  }
}, CONNECT_TIMEOUT_MS);

function send(cmd) {
  const data = JSON.stringify(cmd);
  ws.send(data);
  console.log("  [tx] " + cmd.type + (cmd.x !== undefined ? " (" + cmd.x + "," + cmd.y + ")" : "") + (cmd.tool ? " tool=" + cmd.tool : ""));
}

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

async function step(label, fn, delay) {
  if (delay === undefined) delay = 600;
  console.log("\n\u25b8 " + label);
  await fn();
  await sleep(delay);
}

ws.on("open", async function () {
  clearTimeout(connectTimer);
  connected = true;
  console.log("\u2500\u2500 Agent Cursor Demo \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");

  await step("Switch to select tool", function () { send({ type: "setTool", tool: "select" }); });
  await step("Move cursor to (100, 100)", function () { send({ type: "move", x: 100, y: 100 }); });
  await step("Draw a rectangle (100,100 \u2192 360,280)", function () {
    send({ type: "drawRect", x1: 100, y1: 100, x2: 360, y2: 280 });
  });
  await step("Draw an ellipse (440,120 \u2192 640,300)", function () {
    send({ type: "drawEllipse", x1: 440, y1: 120, x2: 640, y2: 300 });
  });
  await step("Draw a diamond (120,340 \u2192 280,460)", function () {
    send({ type: "drawDiamond", x1: 120, y1: 340, x2: 280, y2: 460 });
  });
  await step("Draw an arrow (340,380 \u2192 580,440)", function () {
    send({ type: "drawArrow", x1: 340, y1: 380, x2: 580, y2: 440 });
  });
  await step("Draw a line (100,500 \u2192 640,520)", function () {
    send({ type: "drawLine", x1: 100, y1: 500, x2: 640, y2: 520 });
  });
  await step("Draw a freehand path (wavy line)", function () {
    send({
      type: "drawFreehand",
      points: [
        { x: 700, y: 140 }, { x: 720, y: 180 }, { x: 740, y: 150 },
        { x: 760, y: 190 }, { x: 780, y: 160 }, { x: 800, y: 200 },
        { x: 820, y: 170 }, { x: 840, y: 210 }, { x: 860, y: 180 },
      ],
    });
  });
  await step("Add text object at (100, 560)", function () {
    send({ type: "addText", x: 100, y: 560, text: "Hello from AI Agent" });
  });
  await step("Select the rectangle at (200, 180)", function () {
    send({ type: "select", x: 200, y: 180 });
  });
  await step("Delete selected object", function () { send({ type: "delete" }); });
  await step("Undo deletion (restore rectangle)", function () { send({ type: "undo" }); });
  await step("Select all objects", function () { send({ type: "selectAll" }); });
  await step("Delete all selected", function () { send({ type: "delete" }); });
  await step("Undo mass delete", function () { send({ type: "undo" }); });
  await step("Redo (delete again)", function () { send({ type: "redo" }); });
  await step("Undo redo (restore objects)", function () { send({ type: "undo" }); });
  await step("Draw via pointer events (batch: ellipse)", function () {
    send({
      type: "batch",
      commands: [
        { type: "setTool", tool: "ellipse" },
        { type: "move", x: 200, y: 600 },
        { type: "pointerDown" },
        { type: "pointerMove", x: 450, y: 700 },
        { type: "pointerUp" },
      ],
    });
  }, 800);
  await step("Press 'r' key to select rectangle tool", function () {
    send({ type: "keyDown", key: "r" });
  });
  await step("Wheel zoom in", function () { send({ type: "wheel", deltaX: 0, deltaY: -120 }); });
  await step("Wheel zoom out", function () { send({ type: "wheel", deltaX: 0, deltaY: 120 }); });
  await step("Rename document to 'AI Agent Whiteboard'", function () {
    send({ type: "command", command: { type: "document.rename", name: "AI Agent Whiteboard" } });
  });

  console.log("\n\u2713 Demo complete \u2014 all commands sent.\n");
  ws.close();
});

ws.on("message", function (raw) {
  let text;
  if (typeof raw === "string") {
    text = raw;
  } else if (Buffer.isBuffer(raw)) {
    text = raw.toString("utf8");
  } else if (raw instanceof ArrayBuffer) {
    text = new TextDecoder().decode(raw);
  } else if (raw instanceof Blob) {
    return;
  } else {
    return;
  }
  try {
    const msg = JSON.parse(text);
    if (msg.type === "error") console.error("  \u26a0 Server error:", msg.message);
  } catch (_) {}
});

ws.on("unexpected-response", function (_req, res) {
  console.error("Server returned status", res.statusCode);
  process.exit(1);
});

ws.on("error", function (err) {
  console.error("WebSocket error:", err.message);
  process.exit(1);
});

process.on("SIGINT", function () {
  ws.close();
  process.exit(0);
});
