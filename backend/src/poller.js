const MikrotikConnector = require('./mikrotik');
const deviceManager = require('./deviceManager');

class PollerService {
  constructor(io) {
    this.io = io;
    this.intervals = new Map(); // deviceId -> traffic interval
    this.healthIntervals = new Map(); // deviceId -> health interval
    this.deviceInterfaces = new Map();
    this.pollInterval = parseInt(process.env.POLL_INTERVAL) || 5000;
    this.healthInterval = parseInt(process.env.HEALTH_POLL_INTERVAL) || 15000;
    this.retryTimers = new Map();
  }

  startAll() {
    const devices = deviceManager.loadDevices();
    devices.forEach(d => { this.startPolling(d.id); this.startHealthPolling(d.id); });
  }

  startPolling(deviceId) {
    this.stopPolling(deviceId);
    const interval = setInterval(async () => {
      await this.pollDevice(deviceId);
    }, this.pollInterval);
    this.intervals.set(deviceId, interval);
    this.pollDevice(deviceId);
    console.log(`[Poller] Started polling ${deviceId} every ${this.pollInterval}ms`);
  }

  startHealthPolling(deviceId) {
    this.stopHealthPolling(deviceId);
    const interval = setInterval(async () => {
      await this.pollHealth(deviceId);
    }, this.healthInterval);
    this.healthIntervals.set(deviceId, interval);
    this.pollHealth(deviceId);
    console.log(`[Poller] Started health polling ${deviceId} every ${this.healthInterval}ms`);
  }

  stopPolling(deviceId) {
    if (this.intervals.has(deviceId)) {
      clearInterval(this.intervals.get(deviceId));
      this.intervals.delete(deviceId);
      console.log(`[Poller] Stopped polling ${deviceId}`);
    }
    if (this.retryTimers.has(deviceId)) {
      clearTimeout(this.retryTimers.get(deviceId));
      this.retryTimers.delete(deviceId);
    }
  }

  stopHealthPolling(deviceId) {
    if (this.healthIntervals.has(deviceId)) {
      clearInterval(this.healthIntervals.get(deviceId));
      this.healthIntervals.delete(deviceId);
      console.log(`[Poller] Stopped health polling ${deviceId}`);
    }
  }

  stopAll() {
    for (const id of this.intervals.keys()) this.stopPolling(id);
    for (const id of this.healthIntervals.keys()) this.stopHealthPolling(id);
  }

  async pollHealth(deviceId) {
    const deviceDecrypted = deviceManager.getDeviceDecrypted(deviceId);
    if (!deviceDecrypted) { this.stopHealthPolling(deviceId); return; }
    const connector = new MikrotikConnector(deviceDecrypted);
    try {
      const resource = await connector.getResource();
      let health = null;
      try { health = await connector.getHealth(); } catch (_) { health = null; }
      const freeMem = resource.freeMemory;
      const totalMem = resource.totalMemory;
      const memUsed = totalMem ? Math.round((1 - freeMem/totalMem)*100) : null;
      const payload = {
        deviceId,
        cpu: resource.cpuLoad,
        freeMemory: resource.freeMemory,
        totalMemory: resource.totalMemory,
        memUsed,
        uptime: resource.uptime,
        version: resource.version,
        boardName: resource.boardName,
        temperature: health?.temperature ?? null,
        voltage: health?.voltage ?? null,
        timestamp: Date.now()
      };
      deviceManager.addHealthHistory(deviceId, payload);
      this.io.emit(`health:${deviceId}`, payload);
      this.io.emit('health', payload);
      // console.log(`[Health] ${deviceId} cpu ${payload.cpu}% temp ${payload.temperature}`);
    } catch (e) {
      console.warn(`[Poller] health failed ${deviceId} ${deviceDecrypted.host}: ${e.message}`);
    }
  }

  // Set which interfaces to poll for a device (if null, poll all up interfaces? For MVP poll ether1, or all)
  setInterfaces(deviceId, ifaces) {
    this.deviceInterfaces.set(deviceId, ifaces);
  }

  async pollDevice(deviceId) {
    const deviceDecrypted = deviceManager.getDeviceDecrypted(deviceId);
    if (!deviceDecrypted) {
      this.stopPolling(deviceId);
      return;
    }
    const connector = new MikrotikConnector(deviceDecrypted);
    let interfaces = this.deviceInterfaces.get(deviceId);
    // If not set, auto-detect uplink interface (dhcp-client or default route)
    if (!interfaces || interfaces.length === 0) {
      try {
        // Try to detect uplink first
        let uplink = null;
        try {
          uplink = await connector.getUplinkInterface();
          if (uplink) console.log(`[Poller] Uplink detected for ${deviceId} ${deviceDecrypted.host}: ${uplink}`);
        } catch (e) {
          console.warn(`[Poller] uplink detect failed for ${deviceId}: ${e.message}`);
        }
        if (uplink) {
          interfaces = [uplink];
          // Also fetch all interfaces to emit for detail page
          try {
            const allIfaces = await connector.getInterfaces();
            this.io.emit(`device:${deviceId}:interfaces`, allIfaces);
          } catch (_) {}
        } else {
          const allIfaces = await connector.getInterfaces();
          // fallback to previous logic: first running interfaces
          const running = allIfaces.filter(i => i.running !== 'false' && i.running !== false);
          interfaces = (running.length ? running : allIfaces).map(i => i.name).slice(0, 3);
          if (interfaces.length === 0) interfaces = ['ether1'];
          this.io.emit(`device:${deviceId}:interfaces`, allIfaces);
        }
        this.deviceInterfaces.set(deviceId, interfaces);
        // emit uplink info
        if (uplink) this.io.emit(`device:${deviceId}:uplink`, { uplink, interfaces });
        console.log(`[Poller] Polling interfaces for ${deviceId}: ${interfaces.join(', ')}`);
      } catch (e) {
        console.error(`[Poller] getInterfaces/uplink failed ${deviceId} ${deviceDecrypted.host}: ${e.message}`);
        deviceManager.updateDeviceStatus(deviceId, 'offline');
        this.io.emit('device:status', { deviceId, status: 'offline', error: e.message });
        return;
      }
    }

    let anySuccess = false;
    for (const iface of interfaces) {
      try {
        const { rx, tx } = await connector.getTraffic(iface);
        anySuccess = true;
        // save history
        deviceManager.addHistory(deviceId, iface, rx, tx);
        // emit via socket
        const payload = { deviceId, interface: iface, rx, tx, timestamp: Date.now() };
        this.io.emit(`traffic:${deviceId}:${iface}`, payload);
        this.io.emit(`traffic:${deviceId}`, payload); // generic
        this.io.emit(`traffic`, payload); // global
      } catch (e) {
        console.error(`[Poller] traffic failed ${deviceId} ${iface}: ${e.message}`);
        // don't spam offline, but mark if all fail
      }
    }
    if (anySuccess) {
      deviceManager.updateDeviceStatus(deviceId, 'online');
      this.io.emit('device:status', { deviceId, status: 'online' });
    } else {
      deviceManager.updateDeviceStatus(deviceId, 'offline');
      this.io.emit('device:status', { deviceId, status: 'offline' });
    }
  }

  restartPolling(deviceId) {
    this.stopPolling(deviceId);
    this.stopHealthPolling(deviceId);
    setTimeout(() => { this.startPolling(deviceId); this.startHealthPolling(deviceId); }, 500);
  }
}

module.exports = PollerService;
