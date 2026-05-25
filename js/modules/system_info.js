const SystemModule = {
    lastCpu: 0,

    init: function() {
        // Passive mode: No loop.
        // Waiting for dashboard.js to call render()
    },

    formatBytes: function(bytes, decimals = 2) {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },
    
    // Format Speed (KB/s)
    formatSpeed: function(bytes, decimals = 1) {
        if (!+bytes) return '0 B/s';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    formatUptime: function(seconds) {
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return (d>0 ? `${d}d ` : "") + `${h}h ${m}m`;
    },

    render: function(data) {
        // --- 1. MODEL NAME ---
        const elModel = document.getElementById('sys-model');
        if (elModel && data.model) {
            elModel.innerText = data.model;
        }

        // --- 2. SYSTEM ---
        const elUptime = document.getElementById('sys-uptime');
        if(elUptime) elUptime.innerText = this.formatUptime(data.uptime);
        
        const elTemp = document.getElementById('sys-temp');
        if(elTemp) {
            const tempVal = parseFloat(data.temp);
            if (!isNaN(tempVal) && tempVal > 0) {
                elTemp.innerText = `${tempVal}°C`;
            } else {
                elTemp.innerText = "--"; 
            }
        }

        const elIp = document.getElementById('sys-public-ip');
        if (elIp) {
            const labelEl = elIp.parentElement.querySelector('.sb-label');
            if(labelEl) labelEl.innerText = "Data";

            // Hiển thị tổng dung lượng
            if (data.lan_total) {
                elIp.innerText = this.formatBytes(data.lan_total);
            } else {
                elIp.innerText = "--";
            }
        }

        // --- 3. CPU ---
        let smoothCpu = Math.round((data.cpu * 0.7) + (this.lastCpu * 0.3));
        this.lastCpu = smoothCpu;
        // Legacy progress bar (kept hidden in HTML for backward compat)
        const elCpuBar = document.getElementById('cpu-bar');
        if (elCpuBar) {
            elCpuBar.style.width = `${smoothCpu}%`;
            const elCpuText = document.getElementById('cpu-text');
            if (elCpuText) elCpuText.innerText = `${smoothCpu}%`;
        }
        // New: phase-3 gauge (SVG circular)
        const elCpuGauge = document.getElementById('sys-gauge-cpu');
        if (elCpuGauge && window.UI) {
            elCpuGauge.innerHTML = UI.gauge(smoothCpu, {
                color: 'var(--accent)', size: 90, thickness: 8, label: '',
            });
        }

        // --- 4. RAM (Used / Total) ---
        const ramPct = data.ram.percent;
        const usedR = this.formatBytes(data.ram.used);
        const totalR = this.formatBytes(data.ram.total);

        const elRamBar = document.getElementById('ram-bar');
        if (elRamBar) {
            elRamBar.style.width = `${ramPct}%`;
            const elRamText = document.getElementById('ram-text');
            if (elRamText) elRamText.innerText = `${usedR} / ${totalR}`;
        }
        const elRamGauge = document.getElementById('sys-gauge-ram');
        if (elRamGauge && window.UI) {
            elRamGauge.innerHTML = UI.gauge(ramPct, {
                color: 'var(--info)', size: 90, thickness: 8, label: '',
            });
        }
        const elRamDetail = document.getElementById('ram-text-detail');
        if (elRamDetail) elRamDetail.innerText = `${usedR} / ${totalR}`;

        // --- 5. ROM (Used / Total) ---
        const romPct = data.rom.percent;
        const usedRo = this.formatBytes(data.rom.used);
        const totalRo = this.formatBytes(data.rom.total);

        const elRomBar = document.getElementById('rom-bar');
        if (elRomBar) {
            elRomBar.style.width = `${romPct}%`;
            const elRomText = document.getElementById('rom-text');
            if (elRomText) elRomText.innerText = `${usedRo} / ${totalRo}`;
        }
        const elRomGauge = document.getElementById('sys-gauge-rom');
        if (elRomGauge && window.UI) {
            elRomGauge.innerHTML = UI.gauge(romPct, {
                color: 'var(--warn)', size: 90, thickness: 8, label: '',
            });
        }
        const elRomDetail = document.getElementById('rom-text-detail');
        if (elRomDetail) elRomDetail.innerText = `${usedRo} / ${totalRo}`;
    },

    freeRam: function() {
        if(!confirm("Bạn có muốn giải phóng bộ nhớ RAM không?")) return;
        
        if(typeof Toast !== 'undefined') Toast.show("Đang dọn dẹp bộ nhớ...", "info");
        
        fetch('/cgi-bin/system/action?action=free_ram')
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    if(typeof Toast !== 'undefined') Toast.show(data.message, "success");
                    // Refresh data after 1s
                    setTimeout(() => {
                        if(typeof Dashboard !== 'undefined') Dashboard.fetchSystemInfo();
                    }, 1000);
                } else {
                    if(typeof Toast !== 'undefined') Toast.show(data.message || "Lỗi", "error");
                }
            })
            .catch(err => {
                if(typeof Toast !== 'undefined') Toast.show("Lỗi kết nối!", "error");
            });
    }
};