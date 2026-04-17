const WebSocket = require('ws');
const readline = require('readline');

const args = process.argv.slice(2);
const API_KEY = args[0] || process.env.AIS_API_KEY;

if (!API_KEY) {
    console.error("FATAL: AIS_API_KEY is not set. WebSocket proxy cannot start.");
    process.exit(1);
}

// Start with global coverage, until frontend updates it
let currentBboxes = [[[-90, -180], [90, 180]]];
let activeWs = null;

function sendSub(ws) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const subMsg = {
            APIKey: API_KEY,
            BoundingBoxes: currentBboxes,
            FilterMessageTypes: [
                "PositionReport",
                "ShipStaticData",
                "StandardClassBPositionReport"
            ]
        };
        ws.send(JSON.stringify(subMsg));
    }
}

// Listen for dynamic bounding box updates via stdin from Python orchestrator
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    try {
        const cmd = JSON.parse(line);
        if (cmd.type === "update_bbox" && cmd.bboxes) {
            currentBboxes = cmd.bboxes;
            if (activeWs) sendSub(activeWs); // Resend subscription (swap and replace)
        }
    } catch (e) {}
});

function connect() {
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    activeWs = ws;

    ws.on('open', () => {
        sendSub(ws);
    });

    ws.on('message', (data) => {
        try {
            const parsed = JSON.parse(data);
            console.log(JSON.stringify(parsed));
        } catch (e) {}
    });

    ws.on('error', (err) => {
        console.error("WebSocket Proxy Error:", err.message);
    });

    ws.on('close', () => {
        activeWs = null;
        console.error("WebSocket Proxy Closed. Reconnecting in 5s...");
        setTimeout(connect, 5000);
    });
}

connect();
