#!/usr/bin/lua
-- ============================================================================
-- VWRT Modem Database
-- ============================================================================
-- Maps USB VID:PID and AT-command identifiers to human-readable manufacturer
-- and model strings for 4G/5G WWAN modules commonly used with OpenWrt routers.
-- Used by services/mobile_poller.lua so the dashboard shows the actual modem
-- rather than the hard-coded "Fibocom FM350-GL" default.
--
-- Add new entries here; no other file needs to change.
-- ============================================================================

local M = {}

-- VID:PID → { manufacturer, model, network = "5G"|"4G", at_port_hint = N }
-- at_port_hint = which ttyUSB index typically responds to AT commands
-- (informational; the poller still probes if uncertain)
M.USB_IDS = {
    -- Quectel (VID 2c7c) — 5G
    ["2c7c:0800"] = { vendor = "Quectel", model = "RM500Q-GL",  network = "5G", at_port = 2 },
    ["2c7c:0801"] = { vendor = "Quectel", model = "RM502Q-AE",  network = "5G", at_port = 2 },
    ["2c7c:0802"] = { vendor = "Quectel", model = "RM502Q-GL",  network = "5G", at_port = 2 },
    ["2c7c:0900"] = { vendor = "Quectel", model = "RM510Q-GL",  network = "5G", at_port = 2 },
    ["2c7c:0901"] = { vendor = "Quectel", model = "RM520N-GL",  network = "5G", at_port = 2 },
    ["2c7c:0904"] = { vendor = "Quectel", model = "RM530N-GL",  network = "5G", at_port = 2 },
    -- Quectel — 4G LTE
    ["2c7c:0125"] = { vendor = "Quectel", model = "EC25",       network = "4G", at_port = 2 },
    ["2c7c:0121"] = { vendor = "Quectel", model = "EC21",       network = "4G", at_port = 2 },
    ["2c7c:0306"] = { vendor = "Quectel", model = "EP06",       network = "4G", at_port = 2 },
    ["2c7c:0512"] = { vendor = "Quectel", model = "EM12-G",     network = "4G", at_port = 2 },
    ["2c7c:0620"] = { vendor = "Quectel", model = "EM160R-GL",  network = "4G", at_port = 2 },
    ["2c7c:0700"] = { vendor = "Quectel", model = "RG500U-CN",  network = "5G", at_port = 2 },

    -- Fibocom (VID 2cb7)
    ["2cb7:0a05"] = { vendor = "Fibocom", model = "FM150-AE",   network = "5G", at_port = 3 },
    ["2cb7:0a07"] = { vendor = "Fibocom", model = "FM350-GL",   network = "5G", at_port = 3 },
    ["2cb7:01a0"] = { vendor = "Fibocom", model = "L850-GL",    network = "4G", at_port = 1 },
    ["2cb7:01a2"] = { vendor = "Fibocom", model = "L860-GL",    network = "4G", at_port = 1 },
    ["2cb7:0210"] = { vendor = "Fibocom", model = "NL668",      network = "4G", at_port = 1 },

    -- Sierra Wireless (VID 1199)
    ["1199:9079"] = { vendor = "Sierra",  model = "EM7455",     network = "4G", at_port = 3 },
    ["1199:9091"] = { vendor = "Sierra",  model = "EM7565",     network = "4G", at_port = 3 },
    ["1199:9090"] = { vendor = "Sierra",  model = "EM7565",     network = "4G", at_port = 3 },
    ["1199:9071"] = { vendor = "Sierra",  model = "MC7455",     network = "4G", at_port = 3 },
    ["1199:9078"] = { vendor = "Sierra",  model = "EM7455",     network = "4G", at_port = 3 },
    ["1199:907f"] = { vendor = "Sierra",  model = "EM7411",     network = "4G", at_port = 3 },
    ["1199:90d3"] = { vendor = "Sierra",  model = "EM9190",     network = "5G", at_port = 3 },

    -- Dell branded Sierra/Foxconn modules (VID 413c)
    ["413c:81d7"] = { vendor = "Dell",    model = "DW5821e",    network = "5G", at_port = 3 },
    ["413c:81e0"] = { vendor = "Dell",    model = "DW5829e",    network = "5G", at_port = 3 },
    ["413c:81b3"] = { vendor = "Dell",    model = "DW5811e",    network = "4G", at_port = 3 },

    -- Telit (VID 1bc7)
    ["1bc7:1050"] = { vendor = "Telit",   model = "LM960",      network = "4G", at_port = 3 },
    ["1bc7:1031"] = { vendor = "Telit",   model = "LE910C1",    network = "4G", at_port = 3 },
    ["1bc7:1101"] = { vendor = "Telit",   model = "FN980",      network = "5G", at_port = 3 },
    ["1bc7:1230"] = { vendor = "Telit",   model = "FN990",      network = "5G", at_port = 3 },

    -- SimCom (VID 1e0e)
    ["1e0e:9011"] = { vendor = "SimCom",  model = "SIM8200EA-M2", network = "5G", at_port = 3 },
    ["1e0e:9001"] = { vendor = "SimCom",  model = "SIM7600",    network = "4G", at_port = 2 },
    ["1e0e:9003"] = { vendor = "SimCom",  model = "SIM7100",    network = "4G", at_port = 2 },

    -- Huawei (VID 12d1) — Common 4G dongles
    ["12d1:15c1"] = { vendor = "Huawei",  model = "ME906s-158", network = "4G", at_port = 0 },
    ["12d1:15c3"] = { vendor = "Huawei",  model = "ME936",      network = "4G", at_port = 0 },
    ["12d1:1573"] = { vendor = "Huawei",  model = "ME909s-120", network = "4G", at_port = 0 },
    ["12d1:1442"] = { vendor = "Huawei",  model = "MS2131",     network = "4G", at_port = 0 },
    ["12d1:1506"] = { vendor = "Huawei",  model = "E398/E3372", network = "4G", at_port = 0 },
    ["12d1:14db"] = { vendor = "Huawei",  model = "E353/E3131", network = "4G", at_port = 0 },

    -- ZTE (VID 19d2)
    ["19d2:1476"] = { vendor = "ZTE",     model = "MF833",      network = "4G", at_port = 1 },
    ["19d2:1405"] = { vendor = "ZTE",     model = "MF286D",     network = "4G", at_port = 1 },

    -- Foxconn rebrands (HP/Lenovo laptops, often used in routers)
    ["0489:e0b4"] = { vendor = "Foxconn", model = "T77W968",    network = "5G", at_port = 3 },
    ["0489:e0db"] = { vendor = "Foxconn", model = "T99W175",    network = "5G", at_port = 3 },
}

-- AT response → manufacturer/model mapping (used when USB ID lookup fails,
-- e.g. modems behind serial-only bridges).
-- Order matters: more-specific patterns must come BEFORE generic ones.
-- AT+CGMM responses for the user's RM520N-GL look like "RM520NGLAA" or
-- "RM520N-GL", so the RM520N pattern must come before any RM5xx fallback.
M.AT_FALLBACK = {
    -- Quectel 5G (specific models first)
    { pattern = "RM500Q",  vendor = "Quectel", model = "RM500Q-GL",  network = "5G" },
    { pattern = "RM502Q",  vendor = "Quectel", model = "RM502Q-AE",  network = "5G" },
    { pattern = "RM510Q",  vendor = "Quectel", model = "RM510Q-GL",  network = "5G" },
    { pattern = "RM520N",  vendor = "Quectel", model = "RM520N-GL",  network = "5G" },
    { pattern = "RM530N",  vendor = "Quectel", model = "RM530N-GL",  network = "5G" },
    { pattern = "RG500U",  vendor = "Quectel", model = "RG500U-CN",  network = "5G" },
    -- Quectel 4G LTE
    { pattern = "EC25",    vendor = "Quectel", model = "EC25",       network = "4G" },
    { pattern = "EC21",    vendor = "Quectel", model = "EC21",       network = "4G" },
    { pattern = "EP06",    vendor = "Quectel", model = "EP06",       network = "4G" },
    { pattern = "EM12",    vendor = "Quectel", model = "EM12-G",     network = "4G" },
    { pattern = "EM160",   vendor = "Quectel", model = "EM160R-GL",  network = "4G" },
    -- Quectel generic fallback (must be LAST among Quectel patterns)
    { pattern = "RM5%d%dN", vendor = "Quectel", model = "RM5xx",      network = "5G" },
    { pattern = "RM5%d%dQ", vendor = "Quectel", model = "RM5xx",      network = "5G" },
    -- Fibocom
    { pattern = "FM350",   vendor = "Fibocom", model = "FM350-GL",   network = "5G" },
    { pattern = "FM150",   vendor = "Fibocom", model = "FM150-AE",   network = "5G" },
    { pattern = "L850",    vendor = "Fibocom", model = "L850-GL",    network = "4G" },
    { pattern = "L860",    vendor = "Fibocom", model = "L860-GL",    network = "4G" },
    -- Sierra
    { pattern = "EM7565",  vendor = "Sierra",  model = "EM7565",     network = "4G" },
    { pattern = "EM7455",  vendor = "Sierra",  model = "EM7455",     network = "4G" },
    { pattern = "EM7411",  vendor = "Sierra",  model = "EM7411",     network = "4G" },
    { pattern = "EM9190",  vendor = "Sierra",  model = "EM9190",     network = "5G" },
    { pattern = "MC7455",  vendor = "Sierra",  model = "MC7455",     network = "4G" },
    -- Dell (rebrand)
    { pattern = "DW5821e", vendor = "Dell",    model = "DW5821e",    network = "5G" },
    { pattern = "DW5829e", vendor = "Dell",    model = "DW5829e",    network = "5G" },
    { pattern = "DW5811e", vendor = "Dell",    model = "DW5811e",    network = "4G" },
    -- Telit
    { pattern = "FN980",   vendor = "Telit",   model = "FN980",      network = "5G" },
    { pattern = "FN990",   vendor = "Telit",   model = "FN990",      network = "5G" },
    { pattern = "LM960",   vendor = "Telit",   model = "LM960",      network = "4G" },
    -- SimCom
    { pattern = "SIM8200", vendor = "SimCom",  model = "SIM8200EA-M2", network = "5G" },
    { pattern = "SIM7600", vendor = "SimCom",  model = "SIM7600",    network = "4G" },
}

-- Look up a modem entry by USB VID:PID string (e.g. "2c7c:0800")
-- Returns: table or nil
function M.find_by_usb(id)
    if not id then return nil end
    return M.USB_IDS[id:lower()]
end

-- Look up by AT response (e.g. output of AT+CGMM)
-- Returns: table or nil
function M.find_by_at_response(text)
    if not text then return nil end
    for _, entry in ipairs(M.AT_FALLBACK) do
        if text:find(entry.pattern) then
            return {
                vendor = entry.vendor,
                model = entry.model,
                network = entry.network,
            }
        end
    end
    return nil
end

-- Scan all attached USB devices via /sys/bus/usb/devices, return first known modem
-- Returns: { id, vendor, model, network, at_port, syspath } or nil
function M.scan_usb()
    local handle = io.popen("ls /sys/bus/usb/devices/ 2>/dev/null")
    if not handle then return nil end

    for dev in handle:lines() do
        -- Only top-level devices (e.g. "1-1.2"), skip controllers ("usb1") and interfaces ("1-1.2:1.0")
        if dev:match("^%d+%-[%d%.]+$") then
            local f_vid = io.open("/sys/bus/usb/devices/" .. dev .. "/idVendor", "r")
            local f_pid = io.open("/sys/bus/usb/devices/" .. dev .. "/idProduct", "r")
            if f_vid and f_pid then
                local vid = (f_vid:read("*l") or ""):lower():gsub("%s", "")
                local pid = (f_pid:read("*l") or ""):lower():gsub("%s", "")
                f_vid:close(); f_pid:close()
                local key = vid .. ":" .. pid
                local entry = M.USB_IDS[key]
                if entry then
                    handle:close()
                    return {
                        id = key,
                        vendor = entry.vendor,
                        model = entry.model,
                        network = entry.network,
                        at_port = entry.at_port,
                        syspath = "/sys/bus/usb/devices/" .. dev,
                    }
                end
            end
        end
    end
    handle:close()
    return nil
end

-- Probe modem identity via AT command, falling back to "Unknown"
-- exec_at: function(port, cmd) -> string
-- port:    AT port path
function M.probe_at(exec_at, port)
    if not exec_at or not port then return nil end
    local resp = exec_at(port, "AT+CGMM")  -- query model
    if resp then
        local entry = M.find_by_at_response(resp)
        if entry then return entry end
        -- Save raw model name even if unrecognized
        local model = resp:gsub("[\r\n]+", " "):match("AT%+CGMM%s+(.-)%s+OK") or resp:match("([%w%-]+)%s+OK")
        if model and model ~= "" then
            return { vendor = "Unknown", model = model, network = "?" }
        end
    end
    return nil
end

-- Convenience: try USB scan first, fall back to AT probe
-- exec_at:  optional function(port, cmd) -> string
-- port:     optional AT port
function M.detect(exec_at, port)
    local found = M.scan_usb()
    if found then return found end
    if exec_at and port then return M.probe_at(exec_at, port) end
    return nil
end

return M
