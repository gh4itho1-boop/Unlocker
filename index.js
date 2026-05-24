const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8080;

// Store connected clients and their scooter data
const clients = new Map();

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
    .container { max-width: 1000px; margin: 0 auto; }
    h1 { text-align: center; font-size: 2.5em; margin-bottom: 10px; text-shadow: 0 0 20px #00ff41; }
    .subtitle { text-align: center; color: #888; margin-bottom: 30px; font-size: 1.1em; }
    .warning { background: #221; border: 1px solid #aa0; color: #ff0; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
    .controls { display: flex; gap: 15px; justify-content: center; margin-bottom: 30px; flex-wrap: wrap; }
    button { background: #00ff41; color: #000; border: none; padding: 15px 30px; font-size: 16px; font-weight: bold; cursor: pointer; border-radius: 8px; transition: all 0.3s; text-transform: uppercase; letter-spacing: 1px; }
    button:hover { background: #00cc33; box-shadow: 0 0 20px rgba(0,255,65,0.4); transform: translateY(-2px); }
    button:disabled { background: #333; color: #666; cursor: not-allowed; transform: none; }
    button.danger { background: #ff0040; color: #fff; }
    button.danger:hover { background: #cc0033; box-shadow: 0 0 20px rgba(255,0,64,0.4); }
    button.info { background: #0088ff; color: #fff; }
    button.info:hover { background: #0066cc; }
    .scooter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .scooter-card { background: #111; border: 2px solid #222; border-radius: 12px; padding: 20px; transition: all 0.3s; position: relative; overflow: hidden; }
    .scooter-card:hover { border-color: #00ff41; transform: translateY(-3px); }
    .scooter-card.connected { border-color: #00ff41; box-shadow: 0 0 20px rgba(0,255,65,0.3); }
    .scooter-card.connected::before { content: 'CONNECTED'; position: absolute; top: 10px; right: -30px; background: #00ff41; color: #000; padding: 5px 40px; font-size: 10px; font-weight: bold; transform: rotate(45deg); }
    .scooter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .scooter-name { font-size: 1.3em; font-weight: bold; color: #fff; }
    .rssi { background: #222; padding: 5px 12px; border-radius: 20px; font-size: 0.85em; color: #0f0; }
    .scooter-info { color: #888; font-size: 0.9em; margin-bottom: 15px; line-height: 1.8; }
    .scooter-info strong { color: #ccc; }
    .scooter-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .scooter-actions button { padding: 10px 16px; font-size: 12px; flex: 1; min-width: 80px; }
    .status-bar { background: #111; border: 1px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
    .status-dot { width: 14px; height: 14px; border-radius: 50%; background: #333; transition: all 0.3s; }
    .status-dot.active { background: #00ff41; box-shadow: 0 0 15px #00ff41; }
    .status-dot.error { background: #ff0040; box-shadow: 0 0 15px #ff0040; }
    .status-dot.scanning { background: #ffaa00; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .log-container { background: #000; border: 2px solid #222; border-radius: 12px; overflow: hidden; }
    .log-header { background: #111; padding: 15px 20px; border-bottom: 2px solid #222; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
    .log-body { height: 350px; overflow-y: auto; padding: 15px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; }
    .log-entry { margin-bottom: 6px; padding: 4px 0; border-bottom: 1px solid #111; animation: fadeIn 0.3s; }
    @keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
    .log-entry.error { color: #ff4444; }
    .log-entry.success { color: #00ff41; }
    .log-entry.info { color: #44aaff; }
    .log-entry.warn { color: #ffaa00; }
    .empty-state { text-align: center; padding: 60px 20px; color: #444; }
    .protocol-selector { background: #111; border: 1px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .protocol-selector label { color: #888; margin-right: 15px; }
    .protocol-selector select { background: #222; color: #0f0; border: 1px solid #333; padding: 8px 15px; border-radius: 5px; font-size: 14px; }
    .battery-display { display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; }
    .battery-bar { width: 50px; height: 20px; border: 2px solid #00ff41; border-radius: 4px; position: relative; overflow: hidden; background: #000; }
    .battery-fill { height: 100%; background: linear-gradient(90deg, #ff0040, #ffaa00, #00ff41); transition: width 0.5s ease; }
    .speed-display { font-size: 2em; font-weight: bold; color: #00ff41; text-align: center; margin: 10px 0; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>BLE Scooter Controller</h1>
    <p class="subtitle">Web Bluetooth API — No server-side BLE required</p>
    
    <div class="warning">
      Requires Chrome/Edge on Windows, macOS, Android, or Chromebook with Bluetooth enabled
    </div>

    <div class="protocol-selector">
      <label>Scooter Protocol:</label>
      <select id="protocolSelect">
        <option value="ninebot">Ninebot / Xiaomi (FE95)</option>
        <option value="xiaomi">Xiaomi M365</option>
        <option value="segway">Segway-Ninebot Max</option>
        <option value="generic">Generic BLE</option>
      </select>
    </div>
    
    <div class="status-bar">
      <div class="status-dot" id="bleStatus"></div>
      <span id="statusText">Web Bluetooth: Not Connected</span>
      <span id="deviceCount" style="margin-left:auto;color:#666">0 devices</span>
    </div>

    <div class="controls">
      <button id="scanBtn" onclick="scanScooters()">Scan & Connect</button>
      <button class="info" onclick="disconnectAll()">Disconnect All</button>
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
          <p>Click "Scan & Connect" to discover nearby scooters via Web Bluetooth API</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    let connectedDevices = new Map();
    let logEntries = 0;
    let isScanning = false;

    // Protocol definitions
    const PROTOCOLS = {
      ninebot: {
        serviceUuid: 0xFE95,
        lockChar: '0001',
        unlockChar: '0001',
        lightChar: '0002',
        batteryChar: '0003',
        namePrefix: 'NB'
      },
      xiaomi: {
        serviceUuid: 0xFE95,
        lockChar: '0001',
        unlockChar: '0001',
        lightChar: '0002',
        batteryChar: '0003',
        namePrefix: 'M365'
      },
      segway: {
        serviceUuid: 0xFE95,
        lockChar: '0001',
        unlockChar: '0001',
        lightChar: '0002',
        batteryChar: '0003',
        namePrefix: 'Ninebot'
      },
      generic: {
        serviceUuid: 0x180F,
        lockChar: '2A19',
        unlockChar: '2A19',
        lightChar: '2A19',
        batteryChar: '2A19',
        namePrefix: ''
      }
    };

    function log(message, type = 'info') {
      const body = document.getElementById('logBody');
      if (logEntries === 0) body.innerHTML = '';
      
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + type;
      const time = new Date().toLocaleTimeString();
      entry.innerHTML = '<span style="color:#555">[' + time + ']</span> ' + message;
      body.appendChild(entry);
      body.scrollTop = body.scrollHeight;
      logEntries++;
      document.getElementById('logCount').textContent = logEntries + ' entries';
    }

    async function scanScooters() {
      if (!navigator.bluetooth) {
        log('Web Bluetooth API not supported. Use Chrome/Edge on desktop or Android.', 'error');
        updateStatus('error', 'Browser not supported');
        return;
      }

      const protocol = PROTOCOLS[document.getElementById('protocolSelect').value];
      
      try {
        isScanning = true;
        updateStatus('scanning', 'Scanning for scooters...');
        document.getElementById('scanBtn').disabled = true;
        log('Requesting Bluetooth device...', 'info');

        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['battery_service', 'device_information', protocol.serviceUuid]
        });

        log('Found device: ' + device.name + ' [' + device.id + ']', 'success');
        await connectDevice(device, protocol);
        
      } catch (error) {
        log('Scan failed: ' + error.message, 'error');
        updateStatus('error', 'Scan cancelled or failed');
      } finally {
        isScanning = false;
        document.getElementById('scanBtn').disabled = false;
        updateDeviceCount();
      }
    }

    async function connectDevice(device, protocol) {
      try {
        log('Connecting to GATT server...', 'info');
        const server = await device.gatt.connect();
        log('GATT connected. Discovering services...', 'info');

        const services = await server.getPrimaryServices();
        log('Found ' + services.length + ' services', 'info');

        // Try to get battery service
        let batteryLevel = '?';
        try {
          const batteryService = await server.getPrimaryService('battery_service');
          const batteryChar = await batteryService.getCharacteristic('battery_level');
          const value = await batteryChar.readValue();
          batteryLevel = value.getUint8(0) + '%';
          log('Battery level: ' + batteryLevel, 'success');
        } catch (e) {
          log('Battery service not available', 'warn');
        }

        // Store device info
        const deviceInfo = {
          device,
          server,
          protocol,
          batteryLevel,
          connected: true,
          services: services.map(s => s.uuid)
        };
        connectedDevices.set(device.id, deviceInfo);

        // Add UI card
        addScooterCard(device, deviceInfo);
        updateStatus('active', 'Connected to ' + device.name);
        log('Successfully connected to ' + device.name, 'success');

        // Set up disconnect listener
        device.addEventListener('gattserverdisconnected', () => {
          deviceInfo.connected = false;
          updateCardStatus(device.id, false);
          log('Device disconnected: ' + device.name, 'warn');
          updateDeviceCount();
        });

      } catch (error) {
        log('Connection failed: ' + error.message, 'error');
        updateStatus('error', 'Connection failed');
      }
    }

    function addScooterCard(device, info) {
      const container = document.getElementById('scooterContainer');
      
      const card = document.createElement('div');
      card.className = 'scooter-card connected';
      card.id = 'card-' + device.id;
      
      card.innerHTML = 
        '<div class="scooter-header">' +
          '<span class="scooter-name">' + (device.name || 'Unknown Device') + '</span>' +
          '<span class="rssi">ID: ' + device.id.substring(0,8) + '</span>' +
        '</div>' +
        '<div class="scooter-info">' +
          '<strong>Protocol:</strong> ' + document.getElementById('protocolSelect').value + '<br>' +
          '<strong>Services:</strong> ' + info.services.length + ' found<br>' +
          '<div class="battery-display">' +
            'Battery: <div class="battery-bar"><div class="battery-fill" id="battery-' + device.id + '" style="width:' + (info.batteryLevel !== '?' ? info.batteryLevel : '0') + '"></div></div> <span id="batteryText-' + device.id + '">' + info.batteryLevel + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="scooter-actions">' +
          '<button onclick="sendCommand(\\'' + device.id + '\\', \\'unlock\\')">Unlock</button>' +
          '<button class="danger" onclick="sendCommand(\\'' + device.id + '\\', \\'lock\\')">Lock</button>' +
          '<button onclick="sendCommand(\\'' + device.id + '\\', \\'lightOn\\')">Light ON</button>' +
          '<button onclick="sendCommand(\\'' + device.id + '\\', \\'lightOff\\')">Light OFF</button>' +
          '<button class="info" onclick="readBattery(\\'' + device.id + '\\')">Read Battery</button>' +
          '<button class="danger" onclick="disconnectDevice(\\'' + device.id + '\\')">Disconnect</button>' +
        '</div>';
      
      container.appendChild(card);
      updateDeviceCount();
    }

    function updateCardStatus(deviceId, connected) {
      const card = document.getElementById('card-' + deviceId);
      if (card) {
        if (connected) card.classList.add('connected');
        else card.classList.remove('connected');
      }
    }

    async function sendCommand(deviceId, command) {
      const info = connectedDevices.get(deviceId);
      if (!info || !info.connected) {
        log('Device not connected', 'error');
        return;
      }

      try {
        log('Sending ' + command + ' to ' + info.device.name + '...', 'info');
        
        // Get the protocol-specific service
        const serviceUuid = info.protocol.serviceUuid;
        let service;
        
        try {
          service = await info.server.getPrimaryService(serviceUuid);
        } catch (e) {
          // Fallback to first available service
          const services = await info.server.getPrimaryServices();
          if (services.length > 0) service = services[0];
        }

        if (!service) {
          log('No writable service found', 'error');
          return;
        }

        const characteristics = await service.getCharacteristics();
        if (characteristics.length === 0) {
          log('No characteristics available', 'error');
          return;
        }

        // Write command to first writable characteristic
        const writableChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse) || characteristics[0];
        
        // Command payloads based on Ninebot/Xiaomi protocol
        let payload;
        switch(command) {
          case 'unlock':
            payload = new Uint8Array([0x55, 0xAA, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00]);
            break;
          case 'lock':
            payload = new Uint8Array([0x55, 0xAA, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
            break;
          case 'lightOn':
            payload = new Uint8Array([0x55, 0xAA, 0x02, 0x01, 0x00, 0x00, 0x00, 0x00]);
            break;
          case 'lightOff':
            payload = new Uint8Array([0x55, 0xAA, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]);
            break;
          default:
            payload = new Uint8Array([0x00]);
        }

        await writableChar.writeValue(payload);
        log(command + ' command sent successfully to ' + info.device.name, 'success');
        
      } catch (error) {
        log('Command failed: ' + error.message, 'error');
      }
    }

    async function readBattery(deviceId) {
      const info = connectedDevices.get(deviceId);
      if (!info || !info.connected) return;

      try {
        const service = await info.server.getPrimaryService('battery_service');
        const char = await service.getCharacteristic('battery_level');
        const value = await char.readValue();
        const level = value.getUint8(0);
        
        info.batteryLevel = level + '%';
        document.getElementById('battery-' + deviceId).style.width = level + '%';
        document.getElementById('batteryText-' + deviceId).textContent = level + '%';
        log('Battery updated: ' + level + '%', 'success');
      } catch (error) {
        log('Battery read failed: ' + error.message, 'error');
      }
    }

    async function disconnectDevice(deviceId) {
      const info = connectedDevices.get(deviceId);
      if (info && info.device.gatt.connected) {
        info.device.gatt.disconnect();
      }
      connectedDevices.delete(deviceId);
      const card = document.getElementById('card-' + deviceId);
      if (card) card.remove();
      updateDeviceCount();
      log('Disconnected device', 'info');
    }

    async function disconnectAll() {
      for (const [id, info] of connectedDevices) {
        if (info.device.gatt.connected) info.device.gatt.disconnect();
      }
      connectedDevices.clear();
      document.getElementById('scooterContainer').innerHTML = '';
      updateDeviceCount();
      updateStatus('active', 'All devices disconnected');
      log('Disconnected all devices', 'info');
    }

    function updateStatus(state, text) {
      const dot = document.getElementById('bleStatus');
      const statusText = document.getElementById('statusText');
      dot.className = 'status-dot ' + state;
      statusText.textContent = text;
    }

    function updateDeviceCount() {
      document.getElementById('deviceCount').textContent = connectedDevices.size + ' device' + (connectedDevices.size !== 1 ? 's' : '');
    }

    function clearLog() {
      document.getElementById('logBody').innerHTML = '<div class="empty-state"><p>Log cleared. Ready for new events.</p></div>';
      logEntries = 0;
      document.getElementById('logCount').textContent = '0 entries';
    }

    // Auto-check Web Bluetooth support on load
    window.addEventListener('load', () => {
      if (!navigator.bluetooth) {
        updateStatus('error', 'Web Bluetooth not supported');
        log('WARNING: This browser does not support Web Bluetooth API. Use Chrome, Edge, or Opera on supported platforms.', 'error');
      } else {
        updateStatus('active', 'Web Bluetooth ready');
        log('Web Bluetooth API detected. Click Scan & Connect to begin.', 'success');
      }
    });
  </script>
</body>
</html>`);
});

// WebSocket for real-time status updates (optional enhancement)
wss.on('connection', (ws) => {
  log('Client connected via WebSocket');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      // Handle any server-side commands if needed
      ws.send(JSON.stringify({ type: 'ack', received: data }));
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });
  
  ws.on('close', () => {
    log('Client disconnected');
  });
});

function log(message) {
  console.log('[' + new Date().toISOString() + '] ' + message);
}

server.listen(PORT, () => {
  log('Server running on port ' + PORT);
  log('Web Bluetooth Scooter Controller ready');
  log('Open in Chrome/Edge with Bluetooth support');
});
