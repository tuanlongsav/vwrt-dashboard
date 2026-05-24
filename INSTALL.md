# Cài đặt VWRT Dashboard lên OpenWrt

> Sau khi cài, vào `http://<IP-router>/` sẽ ra **VWRT Dashboard** thay cho LuCI homepage.
> LuCI vẫn truy cập được qua `http://<IP-router>/cgi-bin/luci`.

---

## ⛔ KHÔNG cài lên modem 5G

VWRT là UI cho **router chạy OpenWrt** (procd + uci + uhttpd). Đừng cài lên các môi trường sau:

| Loại thiết bị | Lý do | Dấu hiệu |
|---|---|---|
| **Modem 5G Quectel** (RM5xx, SDX series, FM350-GL standalone) | Dùng Yocto + systemd + Entware + `/usrdata`, không có procd/uci. Khác hẳn OpenWrt. | Có `/usrdata`, `/dev/smd7`, systemd, `/opt/bin/opkg` |
| **Generic Linux** (Debian/Ubuntu/Alpine/...) | Không có uhttpd-ubus stack, không có LuCI dispatcher | Có `/run/systemd/system`, không có `/etc/openwrt_release` |
| **Modem firmware hãng khác** (Telit, Sierra...) | Tương tự Quectel | Khác procd/uci layout |

Script `install.sh` **tự refuse** nếu phát hiện môi trường không phải OpenWrt và in lý do. Bạn cũng nên tự kiểm tra trước khi chạy:

```sh
cat /etc/openwrt_release    # phải có DISTRIB_ID='OpenWrt' (hoặc fork: ImmortalWrt, …)
cat /proc/1/comm            # phải là 'procd' hoặc 'init'
which uci ubus uhttpd       # phải có cả 3
ls -d /usrdata 2>/dev/null  # KHÔNG được tồn tại (modem Quectel mới có)
```

> **Nhầm lẫn thường gặp**: repo `quectel-rgmii-toolkit/SDXLEMUR` (style mà installer này tham khảo) là cho **modem card**, KHÔNG phải cho router. VWRT đi ngược lại — chỉ cho **router phía sau modem**.

---

## 🚀 Cài nhanh (one-liner)

SSH vào router OpenWrt và chạy:

```sh
wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/install.sh | sh
```

Script sẽ tự:

1. Kiểm tra & cài các package OpenWrt cần thiết (`lua`, `lua-cjson`, `luci-lib-jsonc`, `uhttpd`, `wget-ssl`).
2. Backup install cũ (nếu có) ra `/root/vwrt_backup_<timestamp>.tar.gz`.
3. Tải tarball từ GitHub, copy vào `/www/vwrt/`.
4. Tạo symlink LuCI (`luci-static`, `cgi-bin/luci`).
5. Cài 2 daemon `mobile_poller` và `sms_sync` vào `/etc/init.d/`.
6. Khởi tạo storage (`/overlay/vwrt_sms_archive.json`, `/etc/config/vwrt`).
7. Set `uhttpd.main.home='/www/vwrt'` → VWRT thành UI mặc định.
8. Restart uhttpd, start services.

---

## 📋 Yêu cầu hệ thống

| Item              | Tối thiểu                                    |
|-------------------|----------------------------------------------|
| OpenWrt           | 22.03+ (vì LuCI dispatcher dùng ucode)       |
| RAM               | 64 MB                                        |
| /overlay free     | ≥ 2 MB (script abort nếu thiếu)              |
| Internet          | Router phải reach được `raw.githubusercontent.com` |
| Packages          | `lua` `lua-cjson` `luci-base` `luci-lib-jsonc` `uhttpd` `wget-ssl` (script tự cài) |
| Modem driver      | `modemmanager` **HOẶC** `sms-tool` (tùy modem) |

---

## 🔧 Cài đặt thay thế

### Cài interactive (có menu)

```sh
wget -O /tmp/install.sh https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/install.sh
sh /tmp/install.sh
```

Menu sẽ hiện:

```
=== VWRT Dashboard ===
  1) Install / Reinstall
  2) Upgrade (keep data)
  3) Uninstall
  4) Show install log
  5) Exit
```

### Cài không có internet (offline)

Trên máy local:
```sh
git clone https://github.com/tuanlongsav/vwrt-dashboard.git
tar -czf vwrt.tar.gz -C vwrt-dashboard .
scp vwrt.tar.gz root@<router-ip>:/tmp/
```

Trên router:
```sh
mkdir -p /tmp/vwrt_install && cd /tmp/vwrt_install
tar -xzf /tmp/vwrt.tar.gz
sh install.sh install
```

### Skip backup (router quá ít RAM)

```sh
SKIP_BACKUP=1 sh install.sh install
```

---

## 🔐 Đăng nhập lần đầu

1. Mở browser → `http://<IP-router>/`
2. Username: `root` (hoặc `admin` nếu để trống, script tự thử cả hai).
3. Password: **mật khẩu root của OpenWrt** (VWRT dùng `ubus session login`, không có account riêng).
4. Đổi mật khẩu (nếu cần) qua tab **Settings → Đổi mật khẩu**.

---

## 🔄 Upgrade lên bản mới

Chạy lại one-liner — script tự backup config cũ rồi cài mới:

```sh
wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/install.sh | sh -s -- upgrade
```

Hoặc dùng nút **Cập nhật** trong tab Settings của Dashboard (gọi `cgi-bin/system/update_run` — tương đương script này).

---

## 🗑️ Gỡ cài

```sh
wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/uninstall.sh | sh
```

Script sẽ:
- Stop & disable `mobile_poller`, `sms_sync`
- Restore `uhttpd.main.home='/www'` → LuCI trở lại làm UI mặc định
- Xóa `/www/vwrt/`
- Giữ data: `/overlay/vwrt_sms_archive.json` và `/etc/config/vwrt`

Để xóa luôn cả data:
```sh
wget -O /tmp/uninstall.sh https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/uninstall.sh
sh /tmp/uninstall.sh --purge -y
```

---

## 🐛 Troubleshooting

### Vào IP router không thấy VWRT, vẫn ra LuCI

```sh
uci get uhttpd.main.home    # phải in '/www/vwrt'
# Nếu không phải:
uci set uhttpd.main.home='/www/vwrt'
uci commit uhttpd
/etc/init.d/uhttpd restart
```

### Dashboard hiển thị `--` cho CPU/RAM/Mobile

Service `mobile_poller` không chạy. Kiểm tra:

```sh
/etc/init.d/mobile_poller status
logread | grep mobile_poller | tail -20
ls -la /tmp/vwrt_mobile.json   # phải được update mỗi vài giây
```

Restart thủ công:
```sh
/etc/init.d/mobile_poller restart
```

### SMS không hiển thị

```sh
/etc/init.d/sms_sync status
cat /overlay/vwrt_sms_archive.json | head -50
logread | grep -E "sms_sync|VWRT_SMS" | tail -20
```

Một số modem không phản hồi AT port mặc định `/dev/ttyUSB3`. Sửa thủ công trong:
```sh
vi /www/vwrt/cgi-bin/drivers/fm350.lua
# Tìm hàm get_fm350_port — sửa port cho đúng modem
```

### CSRF lỗi liên tục

Xóa token cũ:
```sh
rm /tmp/vwrt_csrf_token
# Reload trang web
```

### Tạm thời cần dùng LuCI làm homepage trở lại (không gỡ cài)

```sh
uci set uhttpd.main.home='/www'
uci commit uhttpd
/etc/init.d/uhttpd restart
```

Đảo ngược lại:
```sh
uci set uhttpd.main.home='/www/vwrt'
uci commit uhttpd
/etc/init.d/uhttpd restart
```

### Xem log install/uninstall

```sh
cat /tmp/vwrt_install.log
cat /tmp/vwrt_uninstall.log
```

---

## 📂 Cấu trúc sau khi cài

```
/www/vwrt/                          ← UI + backend
├── index.html, dashboard.html
├── css/  js/  lib/
├── cgi-bin/                        ← Lua/uhttpd CGI endpoints
├── services/                       ← Lua daemons
├── luci-static  → /www/luci-static (symlink)
└── cgi-bin/luci → /www/cgi-bin/luci (symlink)

/etc/init.d/mobile_poller           ← Daemon: poll modem mỗi 5s
/etc/init.d/sms_sync                ← Daemon: đồng bộ SMS modem ↔ archive
/etc/uci-defaults/99-vwrt-init      ← Auto-enable services khi factory reset

/etc/config/vwrt                    ← UCI config (blocked clients, …)
/overlay/vwrt_sms_archive.json      ← SMS lưu trữ (persistent)

/tmp/vwrt_mobile.json               ← Cache modem info (RAM, refresh ~5s)
/tmp/sysinfo_output.json            ← Cache system info
/tmp/vwrt_csrf_token                ← CSRF token (RAM)
```

---

## ⚠️ Lưu ý quan trọng

- **Đừng `uci commit` trong khi VWRT đang cài** — script đã handle, nhưng tránh chạy song song lệnh uci ở SSH khác.
- **OpenWrt < 22.03**: LuCI dispatcher là Lua thay vì ucode. Symlink `cgi-bin/luci` có thể không trỏ đúng → một số API gọi LuCI ubus sẽ lỗi. Khuyến nghị nâng cấp OpenWrt.
- **VWRT Exclusive License**: Project có ghi rõ trong [README](README.md) — đọc kỹ trước khi phân phối.
- **Modem hard-coded port**: `drivers/fm350.lua` mặc định dùng `/dev/ttyUSB3`. Nếu modem của bạn dùng port khác phải sửa thủ công (xem phần Troubleshooting).
