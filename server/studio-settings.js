const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LEGACY_STATE_DIRNAMES = [".clawdbot", ".moltbot"];
const NEW_STATE_DIRNAME = ".openclaw";

const resolveUserPath = (input) => {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("~")) {
    const expanded = trimmed.replace(/^~(?=$|[\\/])/, os.homedir());
    return path.resolve(expanded);
  }
  return path.resolve(trimmed);
};

const resolveDefaultHomeDir = () => {
  const home = os.homedir();
  if (home) {
    try {
      if (fs.existsSync(home)) return home;
    } catch {}
  }
  return os.tmpdir();
};

const resolveStateDir = (env = process.env) => {
  const override =
    env.OPENCLAW_STATE_DIR?.trim() ||
    env.MOLTBOT_STATE_DIR?.trim() ||
    env.CLAWDBOT_STATE_DIR?.trim();
  if (override) return resolveUserPath(override);

  const home = resolveDefaultHomeDir();
  const newDir = path.join(home, NEW_STATE_DIRNAME);
  const legacyDirs = LEGACY_STATE_DIRNAMES.map((dir) => path.join(home, dir));
  try {
    if (fs.existsSync(newDir)) return newDir;
  } catch {}
  for (const dir of legacyDirs) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch {}
  }
  return newDir;
};

const resolveStudioSettingsPath = (env = process.env) => {
  return path.join(resolveStateDir(env), "claw3d", "settings.json");
};

const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
};

const DEFAULT_GATEWAY_URL = "ws://localhost:18789";
const OPENCLAW_CONFIG_FILENAME = "openclaw.json";

const isRecord = (value) => Boolean(value && typeof value === "object");

const normalizeAdapterType = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    normalized === "openclaw" ||
    normalized === "hermes" ||
    normalized === "demo" ||
    normalized === "custom"
  ) {
    return normalized;
  }
  return null;
};

const readEnvGatewayDefaults = (env = process.env) => {
  const url = typeof env.CLAW3D_GATEWAY_URL === "string" ? env.CLAW3D_GATEWAY_URL.trim() : "";
  if (!url) return null;
  const token =
    typeof env.CLAW3D_GATEWAY_TOKEN === "string" ? env.CLAW3D_GATEWAY_TOKEN.trim() : "";
  return {
    url,
    token,
    adapterType: normalizeAdapterType(env.CLAW3D_GATEWAY_ADAPTER_TYPE) ?? "openclaw",
  };
};

const readOpenclawGatewayDefaults = (env = process.env) => {
  try {
    const stateDir = resolveStateDir(env);
    const configPath = path.join(stateDir, OPENCLAW_CONFIG_FILENAME);
    const parsed = readJsonFile(configPath);
    if (!isRecord(parsed)) return null;
    const gateway = isRecord(parsed.gateway) ? parsed.gateway : null;
    if (!gateway) return null;
    const auth = isRecord(gateway.auth) ? gateway.auth : null;
    const token = typeof auth?.token === "string" ? auth.token.trim() : "";
    const port =
      typeof gateway.port === "number" && Number.isFinite(gateway.port) ? gateway.port : null;
    if (!token) return null;
    const url = port ? `ws://localhost:${port}` : "";
    if (!url) return null;
    return { url, token, adapterType: "openclaw" };
  } catch {
    return null;
  }
};

const loadUpstreamGatewaySettings = (env = process.env) => {
  const settingsPath = resolveStudioSettingsPath(env);
  const parsed = readJsonFile(settingsPath);
  const gateway = parsed && typeof parsed === "object" ? parsed.gateway : null;
  const url = typeof gateway?.url === "string" ? gateway.url.trim() : "";
  const token = typeof gateway?.token === "string" ? gateway.token.trim() : "";
  const adapterType = normalizeAdapterType(gateway?.adapterType) ?? "openclaw";
  const envDefaults = readEnvGatewayDefaults(env);
  if (!url && envDefaults) {
    return {
      url: envDefaults.url,
      token: token || envDefaults.token,
      adapterType: envDefaults.adapterType,
      settingsPath,
    };
  }
  if (!token && adapterType === "openclaw") {
    const defaults = readOpenclawGatewayDefaults(env);
    if (defaults) {
      return {
        url: url || defaults.url,
        token: defaults.token,
        adapterType,
        settingsPath,
      };
    }
    if (envDefaults?.adapterType === "openclaw") {
      return {
        url: url || envDefaults.url,
        token: envDefaults.token,
        adapterType,
        settingsPath,
      };
    }
  }
  return {
    url: url || envDefaults?.url || DEFAULT_GATEWAY_URL,
    token,
    adapterType,
    settingsPath,
  };
};

module.exports = {
  resolveStateDir,
  resolveStudioSettingsPath,
  loadUpstreamGatewaySettings,
};
