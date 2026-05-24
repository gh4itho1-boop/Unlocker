const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const ScooterController = require('./unlocker');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const controller = new ScooterController();

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BLE Scooter Controller</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #00ff41; min-height: 100vh; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { text-align: center; font-size: 2.5em; margin-bottom: 10px; text-shadow: 0 0 20px #00ff41; }
    .subtitle { text-align: center; color: #888; margin-bottom: 30px; }
    .controls { display: flex; gap: 15px; justify-content: center; margin-bottom: 30px; flex-wrap: wrap; }
    button { background: #00ff41; color: #000; border: none; padding: 15px 30px; font-size: 16px; font-weight: bold; cursor: pointer; border-radius: 8px; transition: all 0.3s; text-transform: uppercase; }
    button:hover { background: #00cc33; box-shadow: 0 0 20px rgba(0,255,65,0.4); transform: translateY(-2px); }
    button:disabled { background: #333; color: #666; cursor: not-allowed; }
    button.danger { background: #ff0040; color: #fff; }
    button.danger:hover { background: #cc0033; box-shadow: 0 0 20px rgba(255,0,64,0.4); }
    .scooter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .scooter-card { background: #111; border: 2px solid #222; border-radius: 12px; padding: 20px; transition: border-color 0.3s; }
    .scooter-card:hover { border-color: #00ff41; }
    .scooter-card.connected { border-color: #00ff41; box-shadow: 0 0 15px rgba(0,255,65,0.2); }
    .scooter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .scooter-name { font-size: 1.3em; font-weight: bold; }
    .rssi { background: #222; padding: 5px 12px; border-radius: 20px; font-size: 0.85em; }
    .scooter-info { color: #888; font-size: 0.9em; margin-bottom: 15px; line-height: 1.6; }
    .scooter-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .scooter-actions button { padding: 10px 18px; font-size: 13px; }
    .status-bar { background: #111; border: 1px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; background: #333; }
    .status-dot.active { background: #00ff41; box-shadow: 0 0 10px #00ff41; }
    .status-dot.scanning { background: #ffaa00; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .log-container { background: #000; border: 2px solid #222; border-radius: 12px; overflow: hidden; }
    .log-header { background: #111; padding: 15px; border-bottom: 2px solid #222; font-weight: bold; display: flex; justify-content: space-between; }
    .log-body { height: 300px; overflow-y: auto; padding: 15px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; }
    .log-entry { margin-bottom: 8px; padding: 5px 0; border-bottom: 1px solid #111; }
    .log-entry.error { color: #ff0040; }
    .log-entry.success { color: #00ff41; }
    .log-entry.info { color: #00aaff; }
    .empty-state { text-align: center; padding: 60px 20px; color: #444; }
    .empty-state svg { width: 80px; height: 80px; margin-bottom: 20px; opacity: 0.3; }
    .battery-indicator { display: inline-flex; align-items: center; gap: 5px; margin-left: 10px; }
    .battery-bar { width: 30px; height: 15px; border: 2px solid #00ff41; border-radius: 3px; position: relative; overflow: hidden; }
    .battery-fill { height: 100%; background: #00ff41; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="container">
    <h1>BLE Scooter Controller</h1>
    <p class="subtitle">Connect to nearby electric scooters via Bluetooth Low Energy</p>
    
    <div class="status-bar">
      <div class="status-dot" id="bleStatus"></div>
      <span id="statusText">BLE Status: Unknown</span>
    </div>

    <div class="controls">
      <button id="scanBtn" onclick="startScan()">Scan for Scooters</button>
      <button onclick="clearLog()">Clear Log</button>
    </div>

    <div id="scooterContainer" class="scooter-grid"></div>

    <div class="log-container">
      <div class="log-header">
        <span>Event Log</span>
        <span id="logCount">0 entries</span>
      </div>
      <div class="log-body" id="logBody">
        <div class="empty-state">
          <p>Press "Scan for Scooters" to begin discovering nearby devices</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    const ws = new WebSocket('ws://' + window.location.host);
    let logEntries = 0;
    let scanActive = false;

    ws.onopen = () => log('WebSocket connected', 'success');
    ws.onclose = () => log('WebSocket disconnected', 'error');
    ws.onerror = (e) => log('WebSocket error', 'error');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'discovered') {
        addScooterCard(data);
        log('Discovered: ' + data.name + ' [' + data.id + '] @ ' + data.rssi + 'dBm', 'info');
      }
      
      if (data.type === 'status') {
        log(data.message, data.success ? 'success' : 'error');
        if (data.message.includes('Connected')) updateScooterStatus(data.id || getLastScooterId(), true);
      }
      
      if (data.type === 'battery') {
        updateBattery(data.id, data.percentage);
        log('Battery level: ' + data.percentage + '%', 'info');
      }
      
      if (data.error) {
        log('ERROR: ' + data.error, 'error');
      }
    };

    function log(message, type = 'info') {
      const body = document.getElementById('logBody');
      if (logEntries === 0) body.innerHTML = '';
      
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + type;
      entry.innerHTML = '<span style="color:#666">[' + new Date().toLocaleTimeString() + ']</span> ' + message;
      body.appendChild(entry);
      body.scrollTop = body.scrollHeight;
      logEntries++;
      document.getElementById('logCount').textContent = logEntries + ' entries';
    }

    function addScooterCard(data) {
      const container = document.getElementById('scooterContainer');
      const existing = document.getElementById('card-' + data.id);
      if (existing) return; // Prevent duplicates

      const card = document.createElement('div');
      card.className = 'scooter-card';
      card.id = 'card-' + data.id;
      card.innerHTML = 
        '<div class="scooter-header">' +
          '<span class="scooter-name">' + (data.name || 'Unknown') + '</span>' +
          '<span class="rssi">' + data.rssi + ' dBm</span>' +
        '</div>' +
        '<div class="scooter-info">' +
          'ID: ' + data.id + '<br>' +
          'MAC: ' + (data.address || 'N/A') + '<br>' +
          '<span class="battery-indicator" id="battery-' + data.id + '">' +
            'Battery: <div class="battery-bar"><div class="battery-fill" style="width:0%"></div></div> ?%' +
          '</span>' +
        '</div>' +
        '<div class="scooter-actions">' +
          '<button onclick="connectScooter(\\'' + data.id + '\\')">Connect</button>' +
          '<button onclick="unlock(\\'' + data.id + '\\')">Unlock</button>' +
          '<button class="danger" onclick="lockScooter(\\'' + data.id + '\\')">Lock</button>' +
          '<button onclick="lightOn(\\'' + data.id + '\\')">Light ON</button>' +
          '<button onclick="lightOff(\\'' + data.id + '\\')">Light OFF</button>' +
          '<button onclick="getBattery(\\'' + data.id + '\\')">Battery</button>' +
          '<button class="danger" onclick="disconnectScooter(\\'' + data.id + '\\')">Disconnect</button>' +
        '</div>';
      
      container.appendChild(card);
    }

    function updateScooterStatus(id, connected) {
      const card = document.getElementById('card-' + id);
      if (card) {
        if (connected) card.classList.add('connected');
        else card.classList.remove('connected');
      }
    }

    function updateBattery(id, percentage) {
      const indicator = document.getElementById('battery-' + id);
      if (indicator) {
        indicator.innerHTML = 'Battery: <div class="battery-bar"><div class="battery-fill" style="width:' + percentage + '%"></div></div> ' + percentage + '%';
      }
    }

    function getLastScooterId() {
      const cards = document.querySelectorAll('.scooter-card');
      return cards.length > 0 ? cards[cards.length - 1].id.replace('card-', '') : null;
    }

    function startScan() {
      if (scanActive) return;
      scanActive = true;
      document.getElementById('scanBtn').disabled = true;
      document.getElementById('bleStatus').className = 'status-dot scanning';
      document.getElementById('statusText').textContent = 'BLE Status: Scanning...';
      ws.send(JSON.stringify({ action: 'scan' }));
      log('Scanning for nearby scooters...', 'info');
      
      setTimeout(() => {
        scanActive = false;
        document.getElementById('scanBtn').disabled = false;
        document.getElementById('bleStatus').className = 'status-dot active';
        document.getElementById('statusText').textContent = 'BLE Status: Ready';
      }, 15000);
    }

    function connectScooter(id) { ws.send(JSON.stringify({ action: 'connect', id: id })); log('Connecting to ' + id + '...', 'info'); }
    function disconnectScooter(id) { ws.send(JSON.stringify({ action: 'disconnect', id: id })); }
    function unlock(id) { ws.send(JSON.stringify({ action: 'unlock', id: id })); log('Sending unlock command...', 'info'); }
    function lockScooter(id) { ws.send(JSON.stringify({ action: 'lock', id: id })); log('Sending lock command...', 'info'); }
    function lightOn(id) { ws.send(JSON.stringify({ action: 'lightOn', id: id })); log('Turning headlight ON...', 'info'); }
    function lightOff(id) { ws.send(JSON.stringify({ action: 'lightOff', id: id })); log('Turning headlight OFF...', 'info'); }
    function getBattery(id) { ws.send(JSON.stringify({ action: 'battery', id: id })); log('Reading battery level...', 'info'); }
    function clearLog() { document.getElementById('logBody').innerHTML = '<div class="empty-state"><p>Log cleared. Ready for new events.</p></div>'; logEntries = 0; document.getElementById('logCount').textContent = '0 entries'; }
  </script>
</body>
</html>`);
});

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const cmd = JSON.parse(message);
      
      const callback = (response) => {
        ws.send(JSON.stringify({ ...response, id: cmd.id }));
      };

      switch(cmd.action) {
        case 'scan':
          controller.startScan(callback);
          break;
        case 'connect':
          await controller.connect(cmd.id, callback);
          break;
        case 'disconnect':
          await controller.disconnect(cmd.id, callback);
          break;
        case 'unlock':
          await controller.sendCommand(cmd.id, 'unlock', callback);
          break;
        case 'lock':
          await controller.sendCommand(cmd.id, 'lock', callback);
          break;
        case 'lightOn':
          await controller.sendCommand(cmd.id, 'lightOn', callback);
          break;
        case 'lightOff':
          await controller.sendCommand(cmd.id, 'lightOff', callback);
          break;
        case 'battery':
          await controller.getBattery(cmd.id, callback);
          break;
        default:
          callback({ error: 'Unknown command: ' + cmd.action });
      }
    } catch (error) {
      ws.send(JSON.stringify({ error: 'Server error: ' + error.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log('BLE Scooter Controller running on port ' + PORT);
  console.log('Web interface: http://localhost:' + PORT);
});
