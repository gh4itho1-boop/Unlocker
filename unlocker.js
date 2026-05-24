const noble = require('@abandonware/noble');

// Standard BLE UUIDs for Xiaomi/Ninebot-based scooters
const SCOOTER_SERVICE_UUIDS = ['fe95', '0000fe95-0000-1000-8000-00805f9b34fb'];
const LOCK_CHAR_UUID = '00000001-0000-1000-8000-00805f9b34fb';
const LIGHT_CHAR_UUID = '00000002-0000-1000-8000-00805f9b34fb';
const BATTERY_CHAR_UUID = '00000003-0000-1000-8000-00805f9b34fb';

// Protocol headers for Ninebot/Xiaomi
const HEADER = Buffer.from([0x55, 0xAA]);

class ScooterController {
  constructor() {
    this.connectedScooters = new Map();
    this.scanning = false;
    this.discoveredPeripherals = new Map();
    
    noble.on('stateChange', (state) => {
      console.log('BLE State:', state);
      if (state === 'poweredOn') {
        this.bleReady = true;
      }
    });
  }

  startScan(callback) {
    if (!this.bleReady) return callback({ error: 'BLE not powered on' });
    
    this.discoveredPeripherals.clear();
    this.scanning = true;
    
    noble.startScanning([], false, (error) => {
      if (error) callback({ error: 'Scan failed: ' + error });
    });

    noble.removeAllListeners('discover');
    noble.on('discover', (peripheral) => {
      // Filter for scooters by checking service UUIDs or manufacturer data
      const isScooter = peripheral.advertisement.serviceUuids.some(uuid => 
        SCOOTER_SERVICE_UUIDS.includes(uuid.toLowerCase())
      ) || (peripheral.advertisement.manufacturerData && 
            peripheral.advertisement.manufacturerData.toString('hex').includes('fe95'));
      
      if (isScooter) {
        this.discoveredPeripherals.set(peripheral.id, peripheral);
        callback({
          type: 'discovered',
          id: peripheral.id,
          name: peripheral.advertisement.localName || 'Unknown Scooter',
          rssi: peripheral.rssi,
          address: peripheral.address,
          serviceUuids: peripheral.advertisement.serviceUuids
        });
      }
    });

    // Stop scan after 15 seconds to save power
    setTimeout(() => {
      if (this.scanning) this.stopScan();
    }, 15000);
  }

  stopScan() {
    this.scanning = false;
    noble.stopScanning();
  }

  async connect(scooterId, callback) {
    const peripheral = this.discoveredPeripherals.get(scooterId) || noble._peripherals[scooterId];
    if (!peripheral) return callback({ error: 'Scooter not found in scan results' });

    try {
      await new Promise((resolve, reject) => {
        peripheral.connect((error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      // Discover services and characteristics
      const { characteristics } = await new Promise((resolve, reject) => {
        peripheral.discoverSomeServicesAndCharacteristics(
          SCOOTER_SERVICE_UUIDS,
          [LOCK_CHAR_UUID, LIGHT_CHAR_UUID, BATTERY_CHAR_UUID],
          (error, services, characteristics) => {
            if (error) reject(error);
            else resolve({ services, characteristics });
          }
        );
      });

      // Store connection with mapped characteristics
      this.connectedScooters.set(scooterId, {
        peripheral,
        characteristics: {
          lock: characteristics.find(c => c.uuid === LOCK_CHAR_UUID),
          light: characteristics.find(c => c.uuid === LIGHT_CHAR_UUID),
          battery: characteristics.find(c => c.uuid === BATTERY_CHAR_UUID)
        }
      });

      callback({ type: 'status', message: 'Connected to ' + scooterId, success: true });
    } catch (error) {
      callback({ error: 'Connection failed: ' + error.message });
    }
  }

  async disconnect(scooterId, callback) {
    const scooter = this.connectedScooters.get(scooterId);
    if (!scooter) return callback({ error: 'Not connected' });

    scooter.peripheral.disconnect((error) => {
      this.connectedScooters.delete(scooterId);
      callback({ type: 'status', message: error ? 'Disconnect error' : 'Disconnected', success: !error });
    });
  }

  async sendCommand(scooterId, commandType, callback) {
    const scooter = this.connectedScooters.get(scooterId);
    if (!scooter) return callback({ error: 'Scooter not connected. Connect first.' });

    let char, payload;
    
    switch(commandType) {
      case 'unlock':
        char = scooter.characteristics.lock;
        payload = Buffer.concat([HEADER, Buffer.from([0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])]);
        break;
      case 'lock':
        char = scooter.characteristics.lock;
        payload = Buffer.concat([HEADER, Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])]);
        break;
      case 'lightOn':
        char = scooter.characteristics.light;
        payload = Buffer.concat([HEADER, Buffer.from([0x02, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])]);
        break;
      case 'lightOff':
        char = scooter.characteristics.light;
        payload = Buffer.concat([HEADER, Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])]);
        break;
      default:
        return callback({ error: 'Unknown command' });
    }

    if (!char) return callback({ error: 'Characteristic not available for this scooter model' });

    try {
      await new Promise((resolve, reject) => {
        char.write(payload, true, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      callback({ type: 'status', message: commandType + ' executed successfully', success: true });
    } catch (error) {
      callback({ error: 'Command failed: ' + error.message });
    }
  }

  async getBattery(scooterId, callback) {
    const scooter = this.connectedScooters.get(scooterId);
    if (!scooter || !scooter.characteristics.battery) {
      return callback({ error: 'Battery characteristic unavailable' });
    }

    scooter.characteristics.battery.read((error, data) => {
      if (error) return callback({ error: 'Battery read failed' });
      const percentage = data ? data[0] : 'unknown';
      callback({ type: 'battery', percentage, message: 'Battery: ' + percentage + '%' });
    });
  }
}

module.exports = ScooterController;
