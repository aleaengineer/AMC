const axios = require('axios');
const { RouterOSAPI } = require('node-routeros');

class MikrotikConnector {
  constructor(device) {
    this.device = device; // decrypted
    this.host = device.host;
    this.port = device.port || 8728;
    this.username = device.username;
    this.password = device.password;
    this.apiType = device.apiType || 'api';
  }

  // Test connection - try REST then API
  async testConnection() {
    if (this.apiType === 'rest') {
      return this.testRest();
    }
    // default api (8728)
    return this.testApi();
  }

  async testRest() {
    const url = `http://${this.host}:${this.port || 80}/rest/system/resource`;
    try {
      const res = await axios.get(url, {
        auth: { username: this.username, password: this.password },
        timeout: 5000
      });
      return { success: true, method: 'rest', data: res.data };
    } catch (e) {
      throw new Error(`REST failed: ${e.message} url=${url}`);
    }
  }

  async testApi() {
    const conn = new RouterOSAPI({
      host: this.host,
      port: this.port,
      user: this.username,
      password: this.password,
      timeout: 5
    });
    try {
      await conn.connect();
      const result = await conn.write('/system/resource/print');
      await conn.close();
      return { success: true, method: 'api', data: result };
    } catch (e) {
      try { await conn.close(); } catch (_) {}
      throw new Error(`API failed: ${e.message}`);
    }
  }

  async getInterfaces() {
    if (this.apiType === 'rest') {
      return this.getInterfacesRest();
    }
    return this.getInterfacesApi();
  }

  async getInterfacesRest() {
    const base = `http://${this.host}:${this.port || 80}`;
    try {
      const res = await axios.get(`${base}/rest/interface/print`, {
        auth: { username: this.username, password: this.password },
        timeout: 5000
      });
      // RouterOS REST returns array of objects with .id, name, type, etc
      const data = Array.isArray(res.data) ? res.data : [];
      return data.map(i => ({
        name: i.name,
        type: i.type,
        running: i.running,
        disabled: i.disabled,
        mac: i['mac-address'] || i.macAddress || '',
        id: i['.id'] || i.id
      }));
    } catch (e) {
      throw new Error(`REST getInterfaces failed: ${e.message}`);
    }
  }

  async getInterfacesApi() {
    const conn = new RouterOSAPI({
      host: this.host,
      port: this.port,
      user: this.username,
      password: this.password,
      timeout: 5
    });
    try {
      await conn.connect();
      const result = await conn.write('/interface/print');
      await conn.close();
      return result.map(i => ({
        name: i.name,
        type: i.type,
        running: i.running,
        disabled: i.disabled,
        mac: i['mac-address'] || '',
        id: i['.id']
      }));
    } catch (e) {
      try { await conn.close(); } catch (_) {}
      throw e;
    }
  }

  async getTraffic(iface) {
    if (this.apiType === 'rest') {
      return this.getTrafficRest(iface);
    }
    return this.getTrafficApi(iface);
  }

  async getTrafficRest(iface) {
    const base = `http://${this.host}:${this.port || 80}`;
    try {
      // RouterOS REST monitor-traffic: POST /rest/interface/monitor-traffic  { interface: "ether1", once: true }
      const res = await axios.post(`${base}/rest/interface/monitor-traffic`, {
        interface: iface,
        once: true
      }, {
        auth: { username: this.username, password: this.password },
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });
      const data = Array.isArray(res.data) ? res.data[0] : res.data;
      // fields: rx-bits-per-second, tx-bits-per-second, rx-packets-per-second etc
      const rx = parseInt(data['rx-bits-per-second'] || data['rx-bits-per-second'] || data.rxBitsPerSecond || 0);
      const tx = parseInt(data['tx-bits-per-second'] || data['tx-bits-per-second'] || data.txBitsPerSecond || 0);
      return { rx, tx, raw: data };
    } catch (e) {
      throw new Error(`REST traffic failed for ${iface}: ${e.message}`);
    }
  }

  async getTrafficApi(iface) {
    const conn = new RouterOSAPI({
      host: this.host,
      port: this.port,
      user: this.username,
      password: this.password,
      timeout: 5
    });
    try {
      await conn.connect();
      // /interface/monitor-traffic with =interface=ether1 =once=true
      const result = await conn.write('/interface/monitor-traffic', [
        `=interface=${iface}`,
        '=once=true'
      ]);
      await conn.close();
      const data = Array.isArray(result) ? result[0] : result;
      if (!data) return { rx: 0, tx: 0, raw: {} };
      const rx = parseInt(data['rx-bits-per-second'] || 0);
      const tx = parseInt(data['tx-bits-per-second'] || 0);
      return { rx, tx, raw: data };
    } catch (e) {
      try { await conn.close(); } catch (_) {}
      throw e;
    }
  }

  async getDhcpClient() {
    if (this.apiType === 'rest') {
      const base = `http://${this.host}:${this.port || 80}`;
      const res = await axios.get(`${base}/rest/ip/dhcp-client`, {
        auth: { username: this.username, password: this.password },
        timeout: 5000
      });
      return Array.isArray(res.data) ? res.data : [];
    }
    const conn = new RouterOSAPI({ host: this.host, port: this.port, user: this.username, password: this.password, timeout: 5 });
    try {
      await conn.connect();
      const result = await conn.write('/ip/dhcp-client/print');
      await conn.close();
      return result;
    } catch (e) { try{await conn.close()}catch(_){} throw e; }
  }

  async getRoutes() {
    if (this.apiType === 'rest') {
      const base = `http://${this.host}:${this.port || 80}`;
      const res = await axios.get(`${base}/rest/ip/route`, {
        auth: { username: this.username, password: this.password },
        timeout: 5000
      });
      return Array.isArray(res.data) ? res.data : [];
    }
    const conn = new RouterOSAPI({ host: this.host, port: this.port, user: this.username, password: this.password, timeout: 5 });
    try {
      await conn.connect();
      const result = await conn.write('/ip/route/print');
      await conn.close();
      return result;
    } catch (e) { try{await conn.close()}catch(_){} throw e; }
  }

  // Uplink detection: cek dhcp-client dulu, jika tidak ada cek ip route 0.0.0.0/0 AS
  async getUplinkInterface() {
    // 1. Cek DHCP Client (uplink biasanya bound)
    try {
      const dhcp = await this.getDhcpClient();
      // console.log('DHCP', dhcp)
      for (const entry of dhcp) {
        const disabled = entry.disabled === true || entry.disabled === 'true' || entry.disabled === 'yes';
        const iface = entry.interface || entry['interface'] || entry.iface;
        const status = (entry.status || entry.Status || '').toString().toLowerCase();
        // prioritaskan yang bound, tapi jika disabled false tetap pakai
        if (!disabled && iface) {
          if (status === 'bound' || status === '' || status === 'searching') {
            // jika ada multiple, prefer bound
            if (status === 'bound') return iface;
          }
        }
      }
      // second pass if no bound found, return first enabled
      for (const entry of dhcp) {
        const disabled = entry.disabled === true || entry.disabled === 'true' || entry.disabled === 'yes';
        const iface = entry.interface || entry['interface'];
        if (!disabled && iface) return iface;
      }
    } catch (e) {
      console.warn(`[Mikrotik ${this.host}] dhcp-client check failed: ${e.message}`);
    }

    // 2. Cek IP Route default 0.0.0.0/0 dengan flag AS (active static)
    try {
      const routes = await this.getRoutes();
      const candidates = routes.filter(r => {
        const dst = r['dst-address'] || r.dstAddress || r['dstAddress'] || r.dst || '';
        return dst === '0.0.0.0/0';
      });
      // Filter active && !disabled && no routing-mark (prefer main table)
      let filtered = candidates.filter(r => {
        const disabled = r.disabled === true || r.disabled === 'true' || r.disabled === 'yes';
        const active = r.active === true || r.active === 'true' || r.active === 'yes' || (r.flags && r.flags.includes('A'));
        const hasActiveFlag = r.active !== undefined ? active : true; // if no active field, assume active
        if (disabled) return false;
        if (!hasActiveFlag && r.flags && !r.flags.includes('A')) return false;
        // skip routes with routing-mark (tunel/policy)
        if (r['routing-mark'] || r.routingMark) return false;
        return true;
      });
      // If all have routing-mark, fallback to any active
      if (filtered.length === 0) {
        filtered = candidates.filter(r => {
          const disabled = r.disabled === true || r.disabled === 'true';
          const active = r.active === true || r.active === 'true' || (r.flags && r.flags.includes('A'));
          return !disabled && active;
        });
      }
      for (const rt of filtered) {
        // Direct interface field?
        if (rt.interface && !String(rt.interface).match(/^\d+\.\d+\.\d+\.\d+/)) {
          return rt.interface;
        }
        // gateway field could be interface name
        const gw = rt.gateway || rt['gateway'] || '';
        if (gw && !String(gw).match(/^\d+\.\d+\.\d+\.\d+/)) {
          // if gateway is not IP, it's likely interface (e.g., 'tunnel')
          // But for uplink we prefer ether iface, skip tunnel if possible
          if (gw !== 'tunnel' && !gw.includes('pppoe') && !gw.includes('bridge')) return gw;
        }
        // gateway-status contains "reachable via ether1"
        const gwStatus = rt['gateway-status'] || rt.gatewayStatus || rt['gatewayStatus'] || '';
        if (gwStatus) {
          const m = String(gwStatus).match(/via\s+(\S+)/);
          if (m) {
            const iface = m[1].replace(',', '').trim();
            // skip tunnel/bridge if we have better, but return if that's the only
            if (iface) return iface;
          }
        }
        // fallback to gateway if it's IP? We still need interface, so try to infer via immediate-gw?
        const immediateGw = rt['immediate-gw'] || rt.immediateGw || '';
        if (immediateGw) {
          const m = String(immediateGw).match(/via\s+(\S+)/);
          if (m) return m[1];
        }
      }
      // If still not found, try any candidate's gateway-status
      for (const rt of candidates) {
        const gwStatus = rt['gateway-status'] || rt.gatewayStatus || '';
        const m = String(gwStatus).match(/via\s+(\S+)/);
        if (m) return m[1].replace(',', '').trim();
      }
    } catch (e) {
      console.warn(`[Mikrotik ${this.host}] route check failed: ${e.message}`);
    }
    return null;
  }

  async getResource() {
    if (this.apiType === 'rest') {
      const base = `http://${this.host}:${this.port || 80}`;
      const res = await axios.get(`${base}/rest/system/resource`, {
        auth: { username: this.username, password: this.password },
        timeout: 5000
      });
      const data = Array.isArray(res.data) ? res.data[0] : res.data;
      return {
        cpuLoad: parseInt(data['cpu-load'] ?? data.cpuLoad ?? 0),
        freeMemory: parseInt(data['free-memory'] ?? data.freeMemory ?? 0),
        totalMemory: parseInt(data['total-memory'] ?? data.totalMemory ?? 0),
        uptime: data['uptime'] || data.uptime || '',
        version: data['version'] || data.version || '',
        boardName: data['board-name'] || data.boardName || '',
        cpuCount: parseInt(data['cpu-count'] ?? data.cpuCount ?? 0),
        cpuFrequency: parseInt(data['cpu-frequency'] ?? data.cpuFrequency ?? 0),
        raw: data
      };
    }
    const conn = new RouterOSAPI({ host: this.host, port: this.port, user: this.username, password: this.password, timeout: 5 });
    try {
      await conn.connect();
      const result = await conn.write('/system/resource/print');
      await conn.close();
      const data = Array.isArray(result) ? result[0] : result;
      return {
        cpuLoad: parseInt(data['cpu-load'] ?? 0),
        freeMemory: parseInt(data['free-memory'] ?? 0),
        totalMemory: parseInt(data['total-memory'] ?? 0),
        uptime: data['uptime'] || '',
        version: data['version'] || '',
        boardName: data['board-name'] || '',
        cpuCount: parseInt(data['cpu-count'] ?? 0),
        cpuFrequency: parseInt(data['cpu-frequency'] ?? 0),
        raw: data
      };
    } catch (e) { try{await conn.close()}catch(_){} throw e; }
  }

  async getHealth() {
    if (this.apiType === 'rest') {
      const base = `http://${this.host}:${this.port || 80}`;
      try {
        const res = await axios.get(`${base}/rest/system/health`, {
          auth: { username: this.username, password: this.password },
          timeout: 5000
        });
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        if (!data) return null;
        const temp = data['temperature'] ?? data.temperature ?? data['cpu-temperature'] ?? null;
        const volt = data['voltage'] ?? data.voltage ?? null;
        return { temperature: temp !== null ? parseFloat(temp) : null, voltage: volt !== null ? parseFloat(volt) : null, raw: data };
      } catch (e) {
        if (String(e.message).includes('404') || String(e.message).includes('UNKNOWNREPLY') || String(e.message).includes('!empty')) return null;
        throw e;
      }
    }
    const conn = new RouterOSAPI({ host: this.host, port: this.port, user: this.username, password: this.password, timeout: 5 });
    try {
      await conn.connect();
      const result = await conn.write('/system/health/print');
      await conn.close();
      if (!result || result.length === 0) return null;
      const data = result[0];
      const temp = data['temperature'] ?? data['temperature'] ?? null;
      const volt = data['voltage'] ?? null;
      return { temperature: temp !== null ? parseFloat(String(temp).replace(/[^0-9.-]/g,'')) : null, voltage: volt !== null ? parseFloat(String(volt).replace(/[^0-9.-]/g,'')) : null, raw: data };
    } catch (e) { try{await conn.close()}catch(_){} 
      if (String(e.message).includes('no such command') || String(e.message).includes('failure') || String(e.message).includes('UNKNOWNREPLY') || String(e.message).includes('!empty')) return null;
      throw e;
    }
  }

  // Auto-detect: try both and return working method
  async autoDetect() {
    // try API first
    try {
      await this.testApi();
      return 'api';
    } catch (e1) {
      try {
        // try REST on port 80 if api port is 8728, REST may be on 80
        const restConn = new MikrotikConnector({ ...this.device, port: 80, apiType: 'rest' });
        await restConn.testRest();
        return 'rest';
      } catch (e2) {
        throw new Error(`Both API and REST failed. API:${e1.message} REST:${e2.message}`);
      }
    }
  }
}

module.exports = MikrotikConnector;
