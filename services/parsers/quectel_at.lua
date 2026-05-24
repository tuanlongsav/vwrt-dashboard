--
-- Quectel AT-response parser for VWRT mobile_poller
--
-- Targets the RM5xx / EC25 / EM12 / RG500U family of Quectel modems.
-- These all expose the same `+QENG`, `+QCAINFO`, `+QTEMP`, `+CSQ` formats.
--
-- Verified against:
--   Quectel RM520N-GL (firmware RM520NGLAAR03A03M4G_A0.303.A0.303)
--   in 5G NSA mode on VinaPhone (MCC 452, MNC 02), LTE B3 anchor +
--   NR5G B78 secondary.
--

local M = {}

-- Trim helper. Parens around gsub limit it to one return value so the trimmed
-- string isn't followed by gsub's substitution count when called as a function
-- argument (table.insert in Lua 5.4+ rejects (table, string, number) as positional).
local function trim(s)
    return ((s or ""):gsub("^%s*(.-)%s*$", "%1"))
end

-- Split a comma-separated AT body into a list of trimmed tokens.
local function split_csv(s)
    local out = {}
    for tok in (s or ""):gmatch("([^,]+)") do
        table.insert(out, trim(tok))
    end
    return out
end

-- Map raw +CSQ index (0-31) to dBm. 99 means "unknown".
local function csq_to_dbm(rssi)
    rssi = tonumber(rssi)
    if not rssi or rssi == 99 then return nil end
    if rssi < 0 or rssi > 31 then return nil end
    -- 3GPP TS 27.007: rssi = (dBm + 113) / 2, so dBm = -113 + 2*rssi
    return -113 + 2 * rssi
end

-- Convert RSRP (dBm) to a 0-100 "signal" percentage for the dashboard bar.
-- Mapping is intentionally generous: -70 dBm or better → 100%, -120 → 0%.
local function rsrp_to_percent(rsrp)
    local v = tonumber(rsrp)
    if not v then return 0 end
    if v >= -70  then return 100 end
    if v <= -120 then return 0 end
    return math.floor((v + 120) * 100 / 50 + 0.5)
end

-- ============================================================================
-- AT+CSQ parser
--   Input:  "\r\n+CSQ: 30,99\r\nOK\r\n"
--   Output: { rssi_index = 30, ber = 99, dbm = -53 }
-- ============================================================================
function M.parse_csq(raw)
    if not raw then return nil end
    local idx, ber = raw:match("%+CSQ:%s*(%d+),(%d+)")
    if not idx then return nil end
    return {
        rssi_index = tonumber(idx),
        ber        = tonumber(ber),
        dbm        = csq_to_dbm(idx),
    }
end

-- ============================================================================
-- AT+QENG="servingcell" parser
--   Body can have multiple +QENG lines depending on RAT:
--     LTE only:        +QENG: "servingcell","NOCONN" / "LIMSRV" / "NOSRV"
--                      +QENG: "LTE","FDD",MCC,MNC,cellID,PCID,EARFCN,band,...,
--                              TAC,RSRP,RSRQ,RSSI,SINR,CQI,tx_power,srxlev
--     5G NSA:          (same LTE line) PLUS
--                      +QENG: "NR5G-NSA",MCC,MNC,PCID,RSRP,SINR,RSRQ,
--                              NR_ARFCN,band,NR_DL_BW,scs
--     5G SA:           +QENG: "NR5G-SA","TDD",MCC,MNC,cellID,PCID,TAC,
--                              ARFCN,band,DL_BW,RSRP,RSRQ,SINR,...
--   Output: a flat record with the strongest carrier as primary signal.
-- ============================================================================
function M.parse_qeng(raw)
    if not raw then return nil end

    local res = {
        mode      = nil,    -- "LTE" / "5G-NSA" / "5G-SA"
        mcc       = nil,
        mnc       = nil,
        cell_id   = nil,
        band_lte  = nil,    -- "B3" etc.
        band_nr   = nil,    -- "n78" etc.
        rsrp      = nil,    -- chosen RSRP (NR if NSA, else LTE)
        rsrq      = nil,
        sinr      = nil,
        rssi      = nil,    -- LTE RSSI is what dashboard wants
        -- raw per-RAT for callers that want both
        lte_rsrp = nil, lte_rsrq = nil, lte_sinr = nil, lte_rssi = nil,
        nr_rsrp  = nil, nr_rsrq  = nil, nr_sinr  = nil,
    }

    -- 1. LTE serving cell line
    -- Strip the type prefix, then split by comma. Format:
    --   "LTE","FDD",MCC,MNC,cellID,PCID,EARFCN,band,UL_BW,DL_BW,TAC,
    --    RSRP,RSRQ,RSSI,SINR,CQI,tx_power,srxlev
    do
        local lte_line = raw:match('%+QENG:%s*"LTE",[^\n\r]*')
        if lte_line then
            local body = lte_line:gsub('%+QENG:%s*', '')
            -- Strip quotes for type tokens
            body = body:gsub('"', '')
            local f = split_csv(body)
            -- f[1]="LTE", f[2]=duplex, f[3..]=fields above
            if #f >= 14 then
                res.mode      = res.mode or "LTE"
                res.mcc       = f[3]
                res.mnc       = f[4]
                res.cell_id   = f[5]
                res.band_lte  = "B" .. (f[8] or "?")
                res.lte_rsrp  = tonumber(f[12])
                res.lte_rsrq  = tonumber(f[13])
                res.lte_rssi  = tonumber(f[14])
                res.lte_sinr  = tonumber(f[15])
            end
        end
    end

    -- 2. NR5G-NSA secondary carrier
    -- Format: "NR5G-NSA",MCC,MNC,PCID,RSRP,SINR,RSRQ,ARFCN,band,DL_BW,scs
    do
        local nr_line = raw:match('%+QENG:%s*"NR5G%-NSA"[^\n\r]*')
        if nr_line then
            local body = nr_line:gsub('%+QENG:%s*', ''):gsub('"', '')
            local f = split_csv(body)
            if #f >= 9 then
                res.mode    = "5G-NSA"
                res.band_nr = "n" .. (f[9] or "?")
                res.nr_rsrp = tonumber(f[5])
                res.nr_sinr = tonumber(f[6])
                res.nr_rsrq = tonumber(f[7])
            end
        end
    end

    -- 3. NR5G-SA (standalone)
    -- Format: "NR5G-SA","TDD",MCC,MNC,cellID,PCID,TAC,ARFCN,band,DL_BW,
    --          RSRP,RSRQ,SINR,...
    do
        local sa_line = raw:match('%+QENG:%s*"NR5G%-SA"[^\n\r]*')
        if sa_line then
            local body = sa_line:gsub('%+QENG:%s*', ''):gsub('"', '')
            local f = split_csv(body)
            if #f >= 13 then
                res.mode    = "5G-SA"
                res.mcc     = res.mcc or f[3]
                res.mnc     = res.mnc or f[4]
                res.cell_id = res.cell_id or f[5]
                res.band_nr = "n" .. (f[9] or "?")
                res.nr_rsrp = tonumber(f[11])
                res.nr_rsrq = tonumber(f[12])
                res.nr_sinr = tonumber(f[13])
            end
        end
    end

    -- Choose primary signal: NR if present (5G NSA or SA), else LTE
    if res.nr_rsrp then
        res.rsrp = res.nr_rsrp
        res.rsrq = res.nr_rsrq
        res.sinr = res.nr_sinr
        res.rssi = res.lte_rssi   -- LTE anchor RSSI in NSA; nothing useful in SA
    elseif res.lte_rsrp then
        res.rsrp = res.lte_rsrp
        res.rsrq = res.lte_rsrq
        res.sinr = res.lte_sinr
        res.rssi = res.lte_rssi
    end

    return res
end

-- ============================================================================
-- AT+QCAINFO parser — Carrier Aggregation breakdown
--   Lines:
--     +QCAINFO: "PCC",EARFCN,BW,"LTE BAND 3",state,PCID,RSRP,RSRQ,RSSI,SINR
--     +QCAINFO: "SCC",ARFCN,BW,"NR5G BAND 78",PCID  (5G NSA secondary)
--     +QCAINFO: "SCC",EARFCN,BW,"LTE BAND 7",state,PCID,...  (LTE CA)
--   Used to build a friendly mode/band string like:
--     "5G NSA | LTE B3 + NR5G n78"
--     "LTE CA | B3 + B7"
-- ============================================================================
function M.parse_qcainfo(raw)
    if not raw then return nil end

    local pcc_band, scc_bands = nil, {}
    local has_nr = false

    for line in raw:gmatch("%+QCAINFO:[^\n\r]+") do
        -- Parse "TYPE", ARFCN, BW, "BAND name", ...
        local typ, _arfcn, _bw, band = line:match(
            '%+QCAINFO:%s*"([^"]+)",(%d+),(%d+),"([^"]+)"'
        )
        if typ and band then
            -- Convert "LTE BAND 3" → "B3", "NR5G BAND 78" → "n78"
            local short
            local lte_n  = band:match("LTE BAND (%d+)")
            local nr_n   = band:match("NR5G BAND (%d+)")
            if lte_n then short = "B" .. lte_n
            elseif nr_n then short = "n" .. nr_n; has_nr = true
            else short = band end

            if typ == "PCC" then pcc_band = short
            elseif typ == "SCC" then table.insert(scc_bands, short)
            end
        end
    end

    return {
        pcc      = pcc_band,
        scc      = scc_bands,
        has_nr   = has_nr,
    }
end

-- ============================================================================
-- AT+QTEMP parser
--   Lines: +QTEMP:"sensor-name","42"
--   Picks the most representative sensor (ambient if available, else modem PA).
-- ============================================================================
function M.parse_qtemp(raw)
    if not raw then return nil end
    -- Prefer ambient, then sub6 PA1, then any non-zero PA
    local ambient, sub6, fallback = nil, nil, nil
    for sensor, val in raw:gmatch('%+QTEMP:%s*"([^"]+)","([%-%d]+)"') do
        local n = tonumber(val)
        if n and n > -100 and n < 200 then
            if sensor == "modem-ambient-usr" then
                ambient = n
            elseif sensor:find("modem%-lte%-sub6%-pa1") then
                sub6 = n
            elseif sensor:find("pa[12]?$") and n > 0 and not fallback then
                fallback = n
            end
        end
    end
    return ambient or sub6 or fallback
end

-- ============================================================================
-- AT+QGMR parser — firmware revision
--   Output:  "RM520NGLAAR03A03M4G_A0.303.A0.303\r\nOK"
-- ============================================================================
function M.parse_qgmr(raw)
    if not raw then return nil end
    -- Strip command echo + OK; first non-empty line is the version
    for raw_line in raw:gmatch("[^\r\n]+") do
        local line = trim(raw_line)
        if line ~= "" and line ~= "OK" and not line:find("^AT") then
            return line
        end
    end
    return nil
end

-- ============================================================================
-- Build a friendly mode/band display string by combining QENG mode + QCAINFO.
-- Examples:
--   "5G NSA | B3 + n78"
--   "LTE | B3"
--   "LTE CA | B3 + B7"
--   "5G SA | n78"
-- ============================================================================
function M.format_mode(qeng, qca)
    local mode = (qeng and qeng.mode) or "LTE"
    local bands = {}

    if qca then
        if qca.pcc then table.insert(bands, qca.pcc) end
        for _, b in ipairs(qca.scc or {}) do
            table.insert(bands, b)
        end
    end

    local mode_label
    if mode == "5G-NSA" then mode_label = "5G NSA"
    elseif mode == "5G-SA" then mode_label = "5G SA"
    elseif #bands > 1 then mode_label = "LTE CA"
    else mode_label = "LTE"
    end

    if #bands > 0 then
        return mode_label .. " | " .. table.concat(bands, " + ")
    end
    return mode_label
end

-- Re-export the percent helper so callers don't reimplement it
M.rsrp_to_percent = rsrp_to_percent

return M
