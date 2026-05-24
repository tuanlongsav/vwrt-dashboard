# 🚀 VWRT Dashboard System (VWRT Admin Panel)

> **Hệ thống quản lý Router OpenWrt chuyên dụng, tối ưu hóa cho Modem 4G/5G.**

![Version](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/version.json&query=$.dashboard.version&label=version&color=blue)
![Status](https://img.shields.io/badge/status-stable-green.svg)
![License](https://img.shields.io/badge/license-Vietter%20Exclusive-red.svg)
![Platform](https://img.shields.io/badge/platform-OpenWrt%2022.03%2B-orange.svg)

<img width="100%" alt="VWRT Dashboard Preview" src="https://github.com/user-attachments/assets/05a261b4-a95b-4421-b388-cefa7a8c28fa" />

---

## 🔴 CẢNH BÁO BẢN QUYỀN (EXCLUSIVE NOTICE)

📞 **Liên Hệ & Hỗ Trợ**

- Mọi thông tin chi tiết vui lòng liên hệ qua các kênh chính thức dưới đây:

**👨‍💻 TÁC GIẢ CỦA [Vietter](https://www.facebook.com/vietter.99/)**

**🆘 HỖ TRỢ & GIẢI ĐÁP (Support) [Phạm Việt](https://www.facebook.com/pham.viet.853811)**

**© 2025 VWRT. All rights reserved.**

---

⚠️ **QUAN TRỌNG:**

- Sản phẩm được thiết kế và tối ưu riêng cho các thiết bị phần cứng do chúng tôi cung cấp/hỗ trợ.
- Nghiêm cấm mọi hành vi sao chép, chỉnh sửa, phân phối lại hoặc sử dụng cho mục đích thương mại mà không có sự đồng ý của tác giả.

---

## ✨ Tính Năng Nổi Bật (Features)

Hệ thống VWRT Dashboard mang đến trải nghiệm quản lý Router hoàn toàn mới:

### 1. 📊 Dashboard Trực Quan

- **Giao diện thẻ (Card-based):** Hiện đại, dễ nhìn.
- **Responsive:** Tương thích hoàn hảo trên cả PC & Mobile.
- **Theme:** Hỗ trợ Dark Mode / Light Mode.

### 2. 📡 Giám Sát Modem 4G/5G

- **Tối ưu hóa:** Hỗ trợ tốt dòng cardwwan sài mmcli.
- **Thông số chi tiết:** Hiển thị Real-time: RSRP, SINR, Band, CA, Nhiệt độ Modem...

### 3. 📩 Quản Lý Tin Nhắn & Hệ Thống

- **SMS:** Đọc và Gửi tin nhắn/USSD ngay trên Web.
- **Tiện ích:** Theo dõi CPU/RAM, Reboot, Reset, Đổi cổng Modem nhanh.

### 4. 🔄 Cập Nhật Tự Động (OTA)

- Tự động kiểm tra và thông báo khi có phiên bản mới từ Server.
- Hỗ trợ cập nhật riêng biệt Dashboard.

---

## 📦 Cài Đặt Nhanh

> 📖 Hướng dẫn đầy đủ + troubleshooting: xem **[INSTALL.md](INSTALL.md)**.

### ⚡ One-liner (SSH vào router OpenWrt)

```sh
wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/install.sh | sh
```

Script tự cài package thiếu (`lua`, `lua-cjson`, `luci-base`, `luci-lib-jsonc`, `uhttpd`), copy code vào `/www/vwrt/`, set làm UI mặc định trên port 80, enable services `mobile_poller` + `sms_sync`.

Cài xong → mở browser vào `http://<IP-router>/` → đăng nhập bằng password root của OpenWrt.

### 🖱️ Hoặc cài interactive (có menu)

```sh
wget -O /tmp/install.sh https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/install.sh
sh /tmp/install.sh
```

Menu hiện ra với các lựa chọn: `Install`, `Upgrade`, `Uninstall`, `Show log`.

### ⛔ KHÔNG cài lên modem 5G hoặc Linux generic

VWRT chỉ chạy trên **router OpenWrt** (procd + uci + uhttpd). Script `install.sh` có **7 lớp guard** tự refuse nếu phát hiện:

- Modem Quectel (`/usrdata`, `/dev/smd*`) — đây là modem card, không phải router
- systemd (Debian/Ubuntu/Yocto)
- Thiếu `uci`/`ubus`/`/sbin/procd`

Kiểm tra trước khi chạy:

```sh
cat /etc/openwrt_release    # phải có DISTRIB_ID='OpenWrt'
cat /proc/1/comm            # phải là 'procd'
```

### 🔄 Upgrade

Chạy lại one-liner — script tự backup bản cũ ra `/root/vwrt_backup_<timestamp>.tar.gz`:

```sh
wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/install.sh | sh -s -- upgrade
```

### 🗑️ Gỡ cài (khôi phục LuCI làm UI mặc định)

```sh
wget -O- https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/uninstall.sh | sh
```

Thêm `--purge` để xóa luôn SMS archive và config:

```sh
wget -O /tmp/uninstall.sh https://raw.githubusercontent.com/tuanlongsav/vwrt-dashboard/main/uninstall.sh
sh /tmp/uninstall.sh --purge -y
```

---

## 📋 Yêu Cầu Hệ Thống

| Item | Tối thiểu |
|---|---|
| OpenWrt | **22.03+** (LuCI dispatcher dùng ucode) |
| RAM | 64 MB |
| `/overlay` free | ≥ 2 MB |
| Modem driver | `modemmanager` **HOẶC** `sms-tool` (tùy modem) |
| Internet trên router | Để pull từ GitHub (hoặc dùng SCP offline — xem INSTALL.md) |

---
