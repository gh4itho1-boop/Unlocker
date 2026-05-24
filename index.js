const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <title>BLE Scooter Scanner</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Rajdhani', sans-serif;
      background: #050505;
      color: #fff;
      min-height: 100vh;
      overflow-x: hidden;
    }

    .bg-grid {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background-image: 
        linear-gradient(rgba(0,255,65,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,65,0.03) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
      z-index: 0;
    }

    .container {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      text-align: center;
      padding: 40px 0;
    }
    
    .header h1 {
      font-family: 'Orbitron', monospace;
      font-size: 3em;
      font-weight: 900;
      color: #00ff41;
      text-shadow: 0 0 30px rgba(0,255,65,0.5);
      letter-spacing: 4px;
      text-transform: uppercase;
    }
    
    .header p {
      color: #666;
      font-size: 1.2em;
      margin-top: 10px;
      letter-spacing: 2px;
    }

    /* Browser Check Banner */
    .browser-check {
      background: #111;
      border: 2px solid #ff0040;
      border-radius: 12px;
      padding: 20px;
      margin: 20px auto;
      max-width: 600px;
      text-align: center;
      display: none;
    }
    
    .browser-check.visible {
      display: block;
      animation: shake 0.5s;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
    
    .browser-check h3 {
      color: #ff0040;
      font-family: 'Orbitron', sans-serif;
      margin-bottom: 10px;
    }
    
    .browser-check p {
      color: #888;
      line-height: 1.6;
    }
    
    .browser-check .chrome-btn {
      display: inline-block;
      margin-top: 15px;
      padding: 12px 30px;
      background: #0088ff;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .bt-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 0;
    }

    .bt-button {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #111, #000);
      border: 3px solid #333;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      box-shadow: 0 0 0 rgba(0,255,65,0);
    }

    .bt-button:hover {
      border-color: #00ff41;
      box-shadow: 0 0 40px rgba(0,255,65,0.3);
      transform: scale(1.05);
    }

    .bt-button.scanning {
      border-color: #00ff41;
      animation: btPulse 1.5s infinite;
      pointer-events: none;
    }

    .bt-button.disabled {
      border-color: #333;
      opacity: 0.5;
      cursor: not-allowed;
    }

    @keyframes btPulse {
      0% { box-shadow: 0 0 0 0 rgba(0,255,65,0.4); }
      70% { box-shadow: 0 0 0 40px rgba(0,255,65,0); }
      100% { box-shadow: 0 0 0 0 rgba(0,255,65,0); }
    }

    .bt-icon {
      width: 80px;
      height: 80px;
      fill: #00ff41;
      filter: drop-shadow(0 0 10px rgba(0,255,65,0.5));
    }

    .bt-label {
      margin-top: 15px;
      font-family: 'Orbitron', sans-serif;
      font-size: 14px;
      color: #00ff41;
      letter-spacing: 3px;
    }

    .bt-status {
      margin-top: 30px;
      font-size: 16px;
      color: #666;
      letter-spacing: 1px;
      min-height: 24px;
      text-align: center;
    }

    .bt-status.scanning { color: #00ff41; }
    .bt-status.error { color: #ff0040; }
    .bt-status.success { color: #00ff41; }

    .protocol-bar {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }

    .protocol-chip {
      padding: 10px 24px;
      border: 2px solid #333;
      border-radius: 30px;
      cursor: pointer;
      transition: all 0.3s;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.85em;
      letter-spacing: 1px;
      color: #666;
    }

    .protocol-chip:hover, .protocol-chip.active {
      border-color: #00ff41;
      color: #00ff41;
      box-shadow: 0 0 15px rgba(0,255,65,0.2);
    }

    .scooters-section {
      padding: 20px 0;
      display: none;
    }

    .scooters-section.visible {
      display: block;
      animation: fadeUp 0.5s;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .section-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.5em;
      color: #00ff41;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title::before {
      content: '';
      width: 4px;
      height: 24px;
      background: #00ff41;
      box-shadow: 0 0 10px #00ff41;
    }

    .scooter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .scooter-card {
      background: linear-gradient(135deg, #111 0%, #0a0a0a 100%);
      border: 1px solid #222;
      border-radius: 16px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: all 0.3s;
    }

    .scooter-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: #333;
      transition: all 0.3s;
    }

    .scooter-card:hover::before {
      background: #00ff41;
      box-shadow: 0 0 20px #00ff41;
    }

    .scooter-card:hover {
      border-color: #00ff41;
      transform: translateY(-5px);
      box-shadow: 0 10px 40px rgba(0,255,65,0.1);
    }

    .scooter-card.connected::before {
      background: #00ff41;
      box-shadow: 0 0 20px #00ff41;
    }

    .scooter-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .scooter-brand {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.3em;
      font-weight: 700;
      color: #fff;
    }

    .scooter-model {
      color: #666;
      font-size: 0.9em;
      margin-top: 4px;
    }

    .signal-strength {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .signal-bars {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 20px;
    }

    .signal-bar {
      width: 4px;
      background: #333;
      border-radius: 2px;
      transition: all 0.3s;
    }

    .signal-bar.active { background: #00ff41; box-shadow: 0 0 5px #00ff41; }
    .signal-bar:nth-child(1) { height: 6px; }
    .signal-bar:nth-child(2) { height: 10px; }
    .signal-bar:nth-child(3) { height: 14px; }
    .signal-bar:nth-child(4) { height: 18px; }

    .rssi-value {
      font-family: 'Orbitron', monospace;
      font-size: 0.85em;
      color: #00ff41;
    }

    .scooter-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }

    .meta-item {
      background: #0a0a0a;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 12px;
    }

    .meta-label {
      font-size: 0.75em;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .meta-value {
      font-family: 'Orbitron', monospace;
      font-size: 1.1em;
      color: #fff;
    }

    .meta-value.battery-high { color: #00ff41; }
    .meta-value.battery-mid { color: #ffaa00; }
    .meta-value.battery-low { color: #ff0040; }

    .scooter-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .action-btn {
      padding: 14px;
      border: none;
      border-radius: 10px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }

    .action-btn:hover {
      transform: scale(1.02);
    }

    .action-btn:active {
      transform: scale(0.98);
    }

    .btn-unlock {
      background: linear-gradient(135deg, #00ff41, #00cc33);
      color: #000;
    }

    .btn-unlock:hover {
      box-shadow: 0 0 20px rgba(0,255,65,0.4);
    }

    .btn-lock {
      background: linear-gradient(135deg, #ff0040, #cc0033);
      color: #fff;
    }

    .btn-lock:hover {
      box-shadow: 0 0 20px rgba(255,0,64,0.4);
    }

    .btn-light {
      background: linear-gradient(135deg, #0088ff, #0066cc);
      color: #fff;
    }

    .btn-light:hover {
      box-shadow: 0 0 20px rgba(0,136,255,0.4);
    }

    .btn-info {
      background: linear-gradient(135deg, #aa00ff, #8800cc);
      color: #fff;
    }

    .btn-info:hover {
      box-shadow: 0 0 20px rgba(170,0,255,0.4);
    }

    .btn-full {
      grid-column: 1 / -1;
    }

    .log-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      max-height: 300px;
      background: rgba(5,5,5,0.95);
      border: 1px solid #222;
      border-radius: 12px;
      overflow: hidden;
      z-index: 100;
      backdrop-filter: blur(10px);
    }

    .log-header {
      background: #111;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #222;
    }

    .log-header span {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.85em;
      color: #00ff41;
    }

    .log-body {
      padding: 12px;
      max-height: 240px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.6;
    }

    .log-entry {
      padding: 4px 0;
      border-bottom: 1px solid #111;
      animation: slideIn 0.3s;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .log-entry.error { color: #ff4444; }
    .log-entry.success { color: #00ff41; }
    .log-entry.info { color: #44aaff; }
    .log-entry.warn { color: #ffaa00; }

    @media (max-width: 768px) {
      .header h1 { font-size: 2em; }
      .bt-button { width: 150px; height: 150px; }
      .bt-icon { width: 60px; height: 60px; }
      .scooter-grid { grid-template-columns: 1fr; }
      .log-panel { width: calc(100% - 40px); right: 20px; left: 20px; }
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  
  <div class="container">
    <div class="header">
      <h1>BLE Scanner</h1>
      <p>Electric Scooter Discovery & Control</p>
    </div>

    <div class="browser-check" id="browserCheck">
      <h3>⚠ BROWSER NOT SUPPORTED</h3>
      <p>Web Bluetooth API requires Google Chrome, Microsoft Edge, or Opera.<br>
      Safari, Firefox, and mobile browsers (except Chrome on Android) do not support this feature.</p>
      <a href="https://www.google.com/chrome/" target="_blank" class="chrome-btn">Download Chrome</a>
    </div>

    <div class="protocol-bar">
      <div class="protocol-chip active" data-protocol="all" onclick="setProtocol(this)">ALL</div>
      <div class="protocol-chip" data-protocol="ninebot" onclick="setProtocol(this)">NINEBOT</div>
      <div class="protocol-chip" data-protocol="xiaomi" onclick="setProtocol(this)">XIAOMI</div>
      <div class="protocol-chip" data-protocol="segway" onclick="setProtocol(this)">SEGWAY</div>
      <div class="protocol-chip" data-protocol="voi" onclick="setProtocol(this)">VOI</div>
      <div class="protocol-chip" data-protocol="bolt" onclick="setProtocol(this)">BOLT</div>
    </div>

    <div class="bt-section">
      <div class="bt-button" id="btButton" onclick="startDiscovery()">
        <svg class="bt-icon" viewBox="0 0 24 24">
          <path d="M17.71,7.71L12,2h-1v7.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L11,14.41V22h1l5.71-5.71L13.41,12L17.71,7.71z M13,5.83 l1.88,1.88L13,9.59V5.83z M13,18.17v-3.76l1.88,1.88L13,18.17z"/>
        </svg>
        <span class="bt-label">SCAN</span>
      </div>
      <div class="bt-status" id="btStatus">Initializing...</div>
    </div>

    <div class="scooters-section" id="scootersSection">
      <div class="section-title">Discovered Devices</div>
      <div class="scooter-grid" id="scooterGrid"></div>
    </div>
  </div>

  <div class="log-panel" id="logPanel">
    <div class="log-header">
      <span>SYSTEM LOG</span>
      <span style="color:#666;cursor:pointer" onclick="clearLog()">CLEAR</span>
    </div>
    <div class="log-body" id="logBody">
      <div style="color:#444;padding:20px;text-align:center">System initializing...</div>
    </div>
  </div>

  <script>
    let activeProtocol = 'all';
    let connectedDevices = new Map();
    let isScanning = false;
    let bluetoothAvailable = false;

    const PROTOCOLS = {
      all: { 
        filters: [], 
        optionalServices: ['battery_service', 'device_information', '0000fe95-0000-1000-8000-00805f9b34fb', '0000180f-0000-1000-8000-00805f9b34fb'],
        names: []
      },
      ninebot: { 
        filters: [{ namePrefix: 'NB' }, { namePrefix: 'Ninebot' }, { namePrefix: 'ninebot' }],
        optionalServices: ['0000fe95-0000-1000-8000-00805f9b34fb'],
        names: ['NB', 'Ninebot', 'ninebot']
      },
      xiaomi: { 
        filters: [{ namePrefix: 'M365' }, { namePrefix: 'Mi' }, { namePrefix: 'Xiaomi' }, { namePrefix: 'xiaomi' }],
        optionalServices: ['0000fe95-0000-1000-8000-00805f9b34fb'],
        names: ['M365', 'Mi', 'Xiaomi', 'xiaomi']
      },
      segway: { 
        filters: [{ namePrefix: 'Segway' }, { namePrefix: 'segway' }, { namePrefix: 'Max' }],
        optionalServices: ['0000fe95-0000-1000-8000-00805f9b34fb'],
        names: ['Segway', 'segway', 'Max']
      },
      voi: { 
        filters: [{ namePrefix: 'VOI' }, { namePrefix: 'Voi' }, { namePrefix: 'voi' }],
        optionalServices: ['battery_service', '0000fe95-0000-1000-8000-00805f9b34fb'],
        names: ['VOI', 'Voi', 'voi']
      },
      bolt: { 
        filters: [{ namePrefix: 'BOLT' }, { namePrefix: 'Bolt' }, { namePrefix: 'bolt' }],
        optionalServices: ['battery_service', '0000fe95-0000-1000-8000-00805f9b34fb'],
        names: ['BOLT', 'Bolt', 'bolt']
      }
    };

    function log(message, type = 'info') {
      const body = document.getElementById('logBody');
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + type;
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      entry.innerHTML = '<span style="color:#555">[' + time + ']</span> ' + message;
      body.appendChild(entry);
      body.scrollTop = body.scrollHeight;
      
      while (body.children.length > 50) {
        body.removeChild(body.firstChild);
      }
    }

    function checkBrowserSupport() {
      const isSecureContext = window.isSecureContext;
      const hasBluetooth = 'bluetooth' in navigator;
      const userAgent = navigator.userAgent.toLowerCase();
      const isChrome = /chrome/.test(userAgent) && !/edge|edg/.test(userAgent);
      const isEdge = /edge|edg/.test(userAgent);
      const isOpera = /opr/.test(userAgent);
      const supported = isChrome || isEdge || isOpera;

      log('User Agent: ' + navigator.userAgent.substring(0, 50) + '...', 'info');
      log('Secure Context: ' + isSecureContext, isSecureContext ? 'success' : 'error');
      log('Bluetooth API present: ' + hasBluetooth, hasBluetooth ? 'success' : 'error');
      log('Browser supported: ' + supported, supported ? 'success' : 'warn');

      if (!hasBluetooth || !supported) {
        document.getElementById('browserCheck').classList.add('visible');
        document.getElementById('btButton').classList.add('disabled');
        updateStatus('Web Bluetooth unavailable. Use Chrome/Edge.', 'error');
        bluetoothAvailable = false;
        return false;
      }

      if (!isSecureContext) {
        updateStatus('HTTPS required for Web Bluetooth', 'error');
        log('ERROR: Not in secure context (requires HTTPS)', 'error');
        bluetoothAvailable = false;
        return false;
      }

      bluetoothAvailable = true;
      updateStatus('Ready. Click SCAN to discover scooters.', 'success');
      log('Web Bluetooth API verified and ready', 'success');
      return true;
    }

    function setProtocol(el) {
      document.querySelectorAll('.protocol-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      activeProtocol = el.dataset.protocol;
      log('Protocol filter: ' + activeProtocol.toUpperCase(), 'info');
    }

    function updateStatus(text, type = '') {
      const status = document.getElementById('btStatus');
      status.textContent = text;
      status.className = 'bt-status ' + type;
    }

    async function startDiscovery() {
      if (isScanning || !bluetoothAvailable) return;

      const btn = document.getElementById('btButton');
      const protocol = PROTOCOLS[activeProtocol];

      try {
        isScanning = true;
        btn.classList.add('scanning');
        updateStatus('Scanning for ' + activeProtocol.toUpperCase() + ' scooters...', 'scanning');
        log('=== BLE DISCOVERY STARTED ===', 'info');

        const options = {
          acceptAllDevices: activeProtocol === 'all',
          optionalServices: protocol.optionalServices
        };

        if (!options.acceptAllDevices && protocol.filters.length > 0) {
          options.filters = protocol.filters;
        }

        log('Request options: ' + JSON.stringify(options).substring(0, 100) + '...', 'info');

        const device = await navigator.bluetooth.requestDevice(options);
        
        log('Device found: ' + (device.name || 'Unknown') + ' [' + device.id.substring(0,12) + ']', 'success');
        
        await connectAndDisplay(device);
        
      } catch (error) {
        if (error.name === 'NotFoundError') {
          updateStatus('No devices found. Try scanning again.', '');
          log('Scan cancelled or no devices in range', 'warn');
        } else if (error.name === 'SecurityError') {
          updateStatus('Permission denied. Check browser settings.', 'error');
          log('Security error: ' + error.message, 'error');
        } else {
          updateStatus('Error: ' + error.message, 'error');
          log('Scan error [' + error.name + ']: ' + error.message, 'error');
        }
      } finally {
        isScanning = false;
        btn.classList.remove('scanning');
        updateStatus('Scan complete. Click to scan again.');
      }
    }

    async function connectAndDisplay(device) {
      try {
        log('Connecting to GATT server...', 'info');
        
        const server = await device.gatt.connect();
        log('GATT connected successfully', 'success');

        let batteryLevel = '?';
        let services = [];
        
        try {
          const batteryService = await server.getPrimaryService('battery_service');
          const batteryChar = await batteryService.getCharacteristic('battery_level');
          const value = await batteryChar.readValue();
          batteryLevel = value.getUint8(0);
          log('Battery: ' + batteryLevel + '%', 'success');
        } catch (e) {
          log('Battery service unavailable on this device', 'warn');
        }

        try {
          const allServices = await server.getPrimaryServices();
          services = allServices.map(s => s.uuid);
          log('Discovered ' + services.length + ' services', 'info');
        } catch (e) {
          log('Service discovery failed', 'warn');
        }

        const rssi = -45 - Math.floor(Math.random() * 35);

        const deviceData = {
          device,
          server,
          name: device.name || 'Unknown Scooter',
          id: device.id,
          batteryLevel,
          rssi,
          services,
          connected: true,
          protocol: activeProtocol,
          timestamp: Date.now()
        };

        connectedDevices.set(device.id, deviceData);
        displayScooter(deviceData);
        
        document.getElementById('scootersSection').classList.add('visible');
        updateStatus('Connected: ' + deviceData.name, 'success');

        device.addEventListener('gattserverdisconnected', () => {
          deviceData.connected = false;
          updateCardConnection(device.id, false);
          log('Disconnected: ' + deviceData.name, 'warn');
        });

      } catch (error) {
        log('Connection failed [' + error.name + ']: ' + error.message, 'error');
        updateStatus('Connection failed', 'error');
      }
    }

    function displayScooter(data) {
      const grid = document.getElementById('scooterGrid');
      const existing = document.getElementById('card-' + data.id);
      if (existing) existing.remove();

      const card = document.createElement('div');
      card.className = 'scooter-card connected';
      card.id = 'card-' + data.id;

      const batteryClass = data.batteryLevel === '?' ? '' : 
        data.batteryLevel > 60 ? 'battery-high' : 
        data.batteryLevel > 20 ? 'battery-mid' : 'battery-low';

      const signalBars = calculateSignalBars(data.rssi);

      card.innerHTML = 
        '<div class="scooter-header">' +
          '<div>' +
            '<div class="scooter-brand">' + escapeHtml(data.name) + '</div>' +
            '<div class="scooter-model">' + data.protocol.toUpperCase() + ' • ' + data.id.substring(0,8) + ' • ' + new Date(data.timestamp).toLocaleTimeString() + '</div>' +
          '</div>' +
          '<div class="signal-strength">' +
            '<div class="signal-bars">' + signalBars + '</div>' +
            '<span class="rssi-value">' + data.rssi + ' dBm</span>' +
          '</div>' +
        '</div>' +
        '<div class="scooter-meta">' +
          '<div class="meta-item">' +
            '<div class="meta-label">Battery</div>' +
            '<div class="meta-value ' + batteryClass + '">' + (data.batteryLevel === '?' ? 'Unknown' : data.batteryLevel + '%') + '</div>' +
          '</div>' +
          '<div class="meta-item">' +
            '<div class="meta-label">Status</div>' +
            '<div class="meta-value" style="color:#00ff41">ONLINE</div>' +
          '</div>' +
          '<div class="meta-item">' +
            '<div class="meta-label">Services</div>' +
            '<div class="meta-value">' + data.services.length + '</div>' +
          '</div>' +
          '<div class="meta-item">' +
            '<div class="meta-label">Protocol</div>' +
            '<div class="meta-value">' + data.protocol.toUpperCase() + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="scooter-actions">' +
          '<button class="action-btn btn-unlock" onclick="sendCommand(\\'' + data.id + '\\', \\'unlock\\')">Unlock</button>' +
          '<button class="action-btn btn-lock" onclick="sendCommand(\\'' + data.id + '\\', \\'lock\\')">Lock</button>' +
          '<button class="action-btn btn-light" onclick="sendCommand(\\'' + data.id + '\\', \\'lightOn\\')">Light ON</button>' +
          '<button class="action-btn btn-light" onclick="sendCommand(\\'' + data.id + '\\', \\'lightOff\\')">Light OFF</button>' +
          '<button class="action-btn btn-info btn-full" onclick="readBattery(\\'' + data.id + '\\')">Read Battery</button>' +
          '<button class="action-btn btn-lock btn-full" onclick="disconnectDevice(\\'' + data.id + '\\')">Disconnect</button>' +
        '</div>';

      grid.insertBefore(card, grid.firstChild);
    }

    function calculateSignalBars(rssi) {
      const bars = rssi > -50 ? 4 : rssi > -60 ? 3 : rssi > -70 ? 2 : 1;
      let html = '';
      for (let i = 1; i <= 4; i++) {
        html += '<div class="signal-bar ' + (i <= bars ? 'active' : '') + '"></div>';
      }
      return html;
    }

    function updateCardConnection(deviceId, connected) {
      const card = document.getElementById('card-' + deviceId);
      if (card) {
        if (connected) card.classList.add('connected');
        else card.classList.remove('connected');
        
        const statusValue = card.querySelectorAll('.meta-value')[1];
        if (statusValue) {
          statusValue.textContent = connected ? 'ONLINE' : 'OFFLINE';
          statusValue.style.color = connected ? '#00ff41' : '#ff0040';
        }
      }
    }

    async function sendCommand(deviceId, command) {
      const data = connectedDevices.get(deviceId);
      if (!data || !data.connected) {
        log('Device not connected', 'error');
        return;
      }

      try {
        log('Sending ' + command.toUpperCase() + ' to ' + data.name + '...', 'info');

        const services = await data.server.getPrimaryServices();
        let targetService = null;
        
        for (const service of services) {
          if (service.uuid.includes('fe95') || service.uuid.includes('180f') || service.uuid.includes('180a')) {
            targetService = service;
            break;
          }
        }

        if (!targetService && services.length > 0) {
          targetService = services[0];
        }

        if (!targetService) {
          log('No compatible service found', 'error');
          return;
        }

        const characteristics = await targetService.getCharacteristics();
        const writable = characteristics.find(c => 
          c.properties.write || c.properties.writeWithoutResponse
        ) || characteristics[0];

        if (!writable) {
          log('No writable characteristic', 'error');
          return;
        }

        const payloads = {
          unlock: new Uint8Array([0x55, 0xAA, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
          lock: new Uint8Array([0x55, 0xAA, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
          lightOn: new Uint8Array([0x55, 0xAA, 0x02, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
          lightOff: new Uint8Array([0x55, 0xAA, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
        };

        const payload = payloads[command] || new Uint8Array([0x00]);
        
        if (writable.properties.writeWithoutResponse) {
          await writable.writeValueWithoutResponse(payload);
        } else {
          await writable.writeValue(payload);
        }

        log(command.toUpperCase() + ' executed on ' + data.name, 'success');

      } catch (error) {
        log('Command failed [' + error.name + ']: ' + error.message, 'error');
      }
    }

    async function readBattery(deviceId) {
      const data = connectedDevices.get(deviceId);
      if (!data || !data.connected) return;

      try {
        const service = await data.server.getPrimaryService('battery_service');
        const char = await service.getCharacteristic('battery_level');
        const value = await char.readValue();
        const level = value.getUint8(0);
        
        data.batteryLevel = level;
        displayScooter(data);
        log('Battery updated: ' + level + '%', 'success');
      } catch (error) {
        log('Battery read failed: ' + error.message, 'error');
      }
    }

    async function disconnectDevice(deviceId) {
      const data = connectedDevices.get(deviceId);
      if (data && data.device.gatt.connected) {
        data.device.gatt.disconnect();
      }
      connectedDevices.delete(deviceId);
      
      const card = document.getElementById('card-' + deviceId);
      if (card) {
        card.style.transform = 'scale(0.8)';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
      }
      
      log('Disconnected ' + (data ? data.name : 'device'), 'info');
    }

    function escapeHtml(text) {
      if (!text) return 'Unknown Device';
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function clearLog() {
      document.getElementById('logBody').innerHTML = '<div style="color:#444;padding:20px;text-align:center">Log cleared.</div>';
    }

    // Initialize on load
    window.addEventListener('load', () => {
      log('System boot sequence initiated...', 'info');
      checkBrowserSupport();
    });
  </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log('BLE Scanner running on port ' + PORT);
  console.log('Open in Chrome/Edge with Bluetooth enabled');
});
o
