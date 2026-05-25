// data.js — fake realtime data + i18n strings for VWRT prototype

window.I18N = {
  vi: {
    appName: "VWRT",
    appSub: "Router Admin Panel",
    login: "Đăng nhập",
    loginSub: "Hệ thống quản lý Router",
    username: "Tài khoản",
    password: "Mật khẩu",
    signIn: "Đăng nhập ngay",
    dashboard: "Tổng quan",
    dashboardSub: "Trạng thái hệ thống",
    modem: "Modem 4G/5G",
    modemSub: "Chi tiết tín hiệu",
    sms: "Tin nhắn",
    smsSub: "SMS & USSD",
    clients: "Thiết bị",
    clientsSub: "Đang kết nối",
    multiwan: "MultiWAN",
    multiwanSub: "Giám sát interface",
    adguard: "AdGuard",
    adguardSub: "Chặn quảng cáo",
    wifi: "WiFi",
    wifiSub: "SSID & mật khẩu",
    tailscale: "Tailscale",
    tailscaleSub: "VPN mesh",
    settings: "Cài đặt",
    settingsSub: "Hệ thống & lịch reboot",
    system: "Hệ thống",
    operator: "Nhà mạng",
    signal: "Tín hiệu",
    band: "Băng tần",
    temp: "Nhiệt độ",
    uptime: "Hoạt động",
    cpu: "CPU",
    ram: "RAM",
    rom: "ROM",
    publicIp: "IP công cộng",
    ping: "Ping",
    ttl: "TTL",
    compose: "Soạn tin",
    inbox: "Hộp thư",
    sent: "Đã gửi",
    ussd: "USSD",
    search: "Tìm kiếm...",
    online: "online",
    offline: "offline",
    queries: "Truy vấn DNS",
    blocked: "Đã chặn",
    blockedPct: "Tỉ lệ chặn",
    avgTime: "Thời gian TB",
    topQueried: "Top tên miền truy vấn",
    topBlocked: "Top tên miền bị chặn",
    reboot: "Khởi động lại",
    rebootSched: "Lịch reboot tự động",
    language: "Ngôn ngữ",
    theme: "Giao diện",
    accent: "Màu chủ đạo",
    variant: "Phong cách",
    palette: "Mở bảng lệnh",
    sendSms: "Gửi tin",
    to: "Đến",
    message: "Nội dung",
    cancel: "Huỷ",
    save: "Lưu",
    connected: "Đã kết nối",
    disconnected: "Mất kết nối",
    primary: "Chính",
    backup: "Dự phòng",
    realtime: "Realtime",
    last60s: "60 giây qua",
    last24h: "24 giờ qua",
    cmdHint: "Gõ lệnh hoặc tên màn hình",
    actions: "Hành động",
    screens: "Màn hình",
    logout: "Đăng xuất",
    welcome: "Chào",
  },
  en: {
    appName: "VWRT",
    appSub: "Router Admin Panel",
    login: "Sign in",
    loginSub: "Router management system",
    username: "Username",
    password: "Password",
    signIn: "Sign in now",
    dashboard: "Overview",
    dashboardSub: "System status",
    modem: "4G/5G Modem",
    modemSub: "Signal details",
    sms: "Messages",
    smsSub: "SMS & USSD",
    clients: "Devices",
    clientsSub: "Connected now",
    multiwan: "MultiWAN",
    multiwanSub: "Interface monitor",
    adguard: "AdGuard",
    adguardSub: "Ad blocker",
    wifi: "WiFi",
    wifiSub: "SSID & password",
    tailscale: "Tailscale",
    tailscaleSub: "Mesh VPN",
    settings: "Settings",
    settingsSub: "System & reboot",
    system: "System",
    operator: "Operator",
    signal: "Signal",
    band: "Band",
    temp: "Temp",
    uptime: "Uptime",
    cpu: "CPU",
    ram: "RAM",
    rom: "ROM",
    publicIp: "Public IP",
    ping: "Ping",
    ttl: "TTL",
    compose: "Compose",
    inbox: "Inbox",
    sent: "Sent",
    ussd: "USSD",
    search: "Search…",
    online: "online",
    offline: "offline",
    queries: "DNS queries",
    blocked: "Blocked",
    blockedPct: "Block rate",
    avgTime: "Avg time",
    topQueried: "Top queried domains",
    topBlocked: "Top blocked domains",
    reboot: "Reboot",
    rebootSched: "Scheduled reboot",
    language: "Language",
    theme: "Theme",
    accent: "Accent",
    variant: "Style",
    palette: "Open command palette",
    sendSms: "Send",
    to: "To",
    message: "Message",
    cancel: "Cancel",
    save: "Save",
    connected: "Connected",
    disconnected: "Disconnected",
    primary: "Primary",
    backup: "Backup",
    realtime: "Realtime",
    last60s: "Last 60 seconds",
    last24h: "Last 24 hours",
    cmdHint: "Type a command or screen name",
    actions: "Actions",
    screens: "Screens",
    logout: "Sign out",
    welcome: "Welcome",
  },
};

// ─── timeseries store ────────────────────────────────────────────────────────
// Each series is a fixed-size ring buffer of recent values.
function makeSeries(size, seed) {
  const arr = new Array(size);
  for (let i = 0; i < size; i++) arr[i] = seed;
  return arr;
}
function pushSeries(arr, v) {
  arr.shift();
  arr.push(v);
  return arr;
}

window.VData = (function () {
  const N = 60; // 60 samples
  const state = {
    cpu: makeSeries(N, 18),
    ram: makeSeries(N, 42),
    rom: makeSeries(N, 31),
    temp: makeSeries(N, 48),
    rsrp: makeSeries(N, -82),
    sinr: makeSeries(N, 14),
    rsrq: makeSeries(N, -10),
    rssi: makeSeries(N, -62),
    ping: makeSeries(N, 24),
    rx: makeSeries(N, 1.2),
    tx: makeSeries(N, 0.3),
    dnsQ: makeSeries(N, 120),
    dnsB: makeSeries(N, 32),
    // long-form 24h
    dns24: (function () {
      const a = [];
      for (let i = 0; i < 24; i++) {
        const peak = 1 - Math.abs(i - 14) / 14;
        const q = Math.round(800 + peak * 4200 + Math.random() * 400);
        const b = Math.round(q * (0.18 + Math.random() * 0.08));
        a.push({ q, b });
      }
      return a;
    })(),
    // sms inbox
    sms: [
      { id: 1, sender: "Viettel", phone: "Viettel", time: "2 phút trước", body: "Tai khoan goc: 28.500d. TKKM 200.000d. Han KM 30/05/2026. Soan TK gui 191 de KT chi tiet.", unread: true, type: "operator" },
      { id: 2, sender: "+84912345678", phone: "+84912345678", time: "12 phút", body: "Ban da nhan duoc 50.000 VND vao Vietcombank. So du: 8.250.000 VND. Ma GD: 998877.", unread: true, type: "personal" },
      { id: 3, sender: "MyVNPT", phone: "MyVNPT", time: "1 giờ", body: "Goi cuoc 4G/5G da kich hoat. Dung luong: 60GB / 30 ngay. Cam on quy khach.", unread: false, type: "operator" },
      { id: 4, sender: "BIDV", phone: "BIDV", time: "3 giờ", body: "OTP: 482910. Khong chia se OTP voi bat ky ai. Hieu luc 60 giay.", unread: false, type: "otp" },
      { id: 5, sender: "+84987654321", phone: "+84987654321", time: "Hôm qua", body: "Toi vua chuyen 200k. Check gium nha.", unread: false, type: "personal" },
      { id: 6, sender: "Mobifone", phone: "Mobifone", time: "Hôm qua", body: "Tai khoan chinh con 12.300d. Nap them de su dung dich vu.", unread: false, type: "operator" },
    ],
    // clients
    clients: [
      { name: "Macbook Pro 14", mac: "A4:83:E7:11:22:33", ip: "192.168.1.102", iface: "WiFi 5G", rx: 142.3, tx: 18.7, lease: "8h 14m", vendor: "Apple", icon: "laptop" },
      { name: "iPhone 15 Pro", mac: "C8:B5:CA:44:55:66", ip: "192.168.1.108", iface: "WiFi 5G", rx: 28.1, tx: 4.2, lease: "11h 02m", vendor: "Apple", icon: "phone" },
      { name: "Samsung S24", mac: "F8:54:B8:77:88:99", ip: "192.168.1.115", iface: "WiFi 5G", rx: 8.9, tx: 1.1, lease: "2h 45m", vendor: "Samsung", icon: "phone" },
      { name: "PS5", mac: "D0:BF:9C:AA:BB:CC", ip: "192.168.1.120", iface: "LAN1", rx: 512.0, tx: 22.3, lease: "stable", vendor: "Sony", icon: "tv" },
      { name: "Xiaomi Camera", mac: "78:11:DC:DD:EE:FF", ip: "192.168.1.140", iface: "WiFi 2.4G", rx: 4.1, tx: 12.8, lease: "stable", vendor: "Xiaomi", icon: "cam" },
      { name: "Echo Dot", mac: "44:65:0D:01:23:45", ip: "192.168.1.155", iface: "WiFi 2.4G", rx: 0.3, tx: 0.1, lease: "3h 08m", vendor: "Amazon", icon: "speaker" },
      { name: "ESP32-thermo", mac: "EC:62:60:67:89:AB", ip: "192.168.1.171", iface: "WiFi 2.4G", rx: 0.01, tx: 0.02, lease: "stable", vendor: "Espressif", icon: "chip" },
    ],
    // multiwan
    wans: [
      { name: "wwan0", label: "4G Modem", status: "online", role: "primary", weight: 4, rx: 1.21, tx: 0.31, latency: 24, loss: 0, ip: "10.41.23.18" },
      { name: "eth1", label: "Fiber WAN", status: "online", role: "backup", weight: 2, rx: 0.04, tx: 0.02, latency: 8, loss: 0, ip: "118.69.12.4" },
      { name: "tun_ts", label: "Tailscale Exit", status: "offline", role: "manual", weight: 1, rx: 0, tx: 0, latency: 0, loss: 100, ip: "—" },
    ],
    // top domains
    topQueried: [
      { d: "googleapis.com", n: 8421 },
      { d: "icloud.com", n: 6210 },
      { d: "github.com", n: 4187 },
      { d: "apple.com", n: 3920 },
      { d: "fbcdn.net", n: 2871 },
      { d: "akamai.net", n: 2410 },
    ],
    topBlocked: [
      { d: "doubleclick.net", n: 1284 },
      { d: "googlesyndication.com", n: 1041 },
      { d: "facebook.com/tr", n: 802 },
      { d: "amazon-adsystem.com", n: 612 },
      { d: "scorecardresearch.com", n: 401 },
      { d: "tracking.miui.com", n: 318 },
    ],
    // tailscale peers
    tsPeers: [
      { name: "macbook-tuanlong", ip: "100.81.12.4", os: "macOS", online: true, last: "active" },
      { name: "iphone-15", ip: "100.81.12.18", os: "iOS", online: true, last: "1m ago" },
      { name: "office-server", ip: "100.81.12.41", os: "Linux", online: true, last: "active" },
      { name: "homelab-nas", ip: "100.81.12.55", os: "Linux", online: false, last: "2h ago" },
    ],
  };

  function clip(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function tick() {
    pushSeries(state.cpu, clip(state.cpu[state.cpu.length - 1] + (Math.random() - 0.5) * 18, 3, 92));
    pushSeries(state.ram, clip(state.ram[state.ram.length - 1] + (Math.random() - 0.5) * 4, 28, 88));
    pushSeries(state.rom, clip(state.rom[state.rom.length - 1] + (Math.random() - 0.5) * 0.4, 25, 60));
    pushSeries(state.temp, clip(state.temp[state.temp.length - 1] + (Math.random() - 0.5) * 1.4, 38, 72));
    pushSeries(state.rsrp, clip(state.rsrp[state.rsrp.length - 1] + (Math.random() - 0.5) * 3, -110, -65));
    pushSeries(state.sinr, clip(state.sinr[state.sinr.length - 1] + (Math.random() - 0.5) * 1.6, -2, 28));
    pushSeries(state.rsrq, clip(state.rsrq[state.rsrq.length - 1] + (Math.random() - 0.5) * 0.8, -18, -6));
    pushSeries(state.rssi, clip(state.rssi[state.rssi.length - 1] + (Math.random() - 0.5) * 2.5, -85, -45));
    pushSeries(state.ping, clip(state.ping[state.ping.length - 1] + (Math.random() - 0.5) * 6, 8, 80));
    pushSeries(state.rx, clip(state.rx[state.rx.length - 1] + (Math.random() - 0.5) * 0.4, 0.05, 6));
    pushSeries(state.tx, clip(state.tx[state.tx.length - 1] + (Math.random() - 0.5) * 0.15, 0.02, 2.4));
    pushSeries(state.dnsQ, clip(state.dnsQ[state.dnsQ.length - 1] + (Math.random() - 0.5) * 50, 30, 400));
    pushSeries(state.dnsB, clip(state.dnsB[state.dnsB.length - 1] + (Math.random() - 0.5) * 14, 5, 120));
  }

  // subscribers — set of callbacks invoked on tick
  const subs = new Set();
  setInterval(() => { tick(); subs.forEach(f => f()); }, 1500);

  function subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }
  function last(name) { return state[name][state[name].length - 1]; }

  return { state, subscribe, last };
})();

// React hook: re-render every time data ticks
window.useLiveData = function () {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => window.VData.subscribe(force), []);
  return window.VData.state;
};
