import bcrypt from "bcryptjs";
import cors from "cors";
import DigestClient from "digest-fetch";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import net from "node:net";
import os from "node:os";

dotenv.config();

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Africa/Addis_Ababa";
process.env.TZ = APP_TIMEZONE;

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/attendanceDB";
const DEVICE_IP = process.env.DEVICE_IP || "192.168.1.64";
const DEVICE_PROTOCOL = process.env.DEVICE_PROTOCOL || "http";
const DEVICE_PORT = Number(
  process.env.DEVICE_PORT || (DEVICE_PROTOCOL === "https" ? 443 : 80)
);
const DEVICE_TIMEOUT_MS = Number(process.env.DEVICE_TIMEOUT_MS) || 10000;
const DEVICE_PAGE_SIZE = 50;
const DEVICE_MAX_PAGES = Number(process.env.DEVICE_MAX_PAGES) || 100;
const API_USER = process.env.API_USER || "admin";
const API_PASS = process.env.API_PASS || "replace-with-device-password";
const DEVICE_URL = `${DEVICE_PROTOCOL}://${DEVICE_IP}:${DEVICE_PORT}/ISAPI/AccessControl/AcsEvent?format=json`;
const WORK_START = process.env.WORK_START || "08:30";
const WORK_END = process.env.WORK_END || "17:30";
const ARRIVAL_GRACE_END = process.env.ARRIVAL_GRACE_END || "08:45";
const DEPARTURE_MODERATE_START =
  process.env.DEPARTURE_MODERATE_START || "17:15";
const REGULAR_LUNCH_START = process.env.REGULAR_LUNCH_START || "12:30";
const REGULAR_LUNCH_END = process.env.REGULAR_LUNCH_END || "13:30";
const FRIDAY_LUNCH_START = process.env.FRIDAY_LUNCH_START || "11:30";
const FRIDAY_LUNCH_END = process.env.FRIDAY_LUNCH_END || "13:30";
const EARLIEST_CHECKOUT = process.env.EARLIEST_CHECKOUT || "15:30";
const MIN_LUNCH_SEPARATION_MINUTES =
  Number(process.env.MIN_LUNCH_SEPARATION_MINUTES) || 20;
const DUPLICATE_WINDOW_MINUTES =
  Number(process.env.DUPLICATE_WINDOW_MINUTES) || 5;
const JWT_SECRET = process.env.JWT_SECRET || "development-only-change-this-secret";
const HR_EMAIL = process.env.HR_EMAIL || "hr@company.local";
const HR_PASSWORD = process.env.HR_PASSWORD || "ChangeMe123!";
const IS_VERCEL = Boolean(process.env.VERCEL);
const RUNTIME_ROLE =
  process.env.RUNTIME_ROLE || (IS_VERCEL ? "api" : "server");
const SYNC_MODE =
  process.env.SYNC_MODE || (IS_VERCEL ? "agent" : "direct");
const IS_CONNECTOR = RUNTIME_ROLE === "connector";
const SYNC_ON_STARTUP =
  String(process.env.SYNC_ON_STARTUP || "true").toLowerCase() === "true";
const PUNCH_SYNC_INTERVAL_SECONDS = Math.max(
  15,
  Number(process.env.PUNCH_SYNC_INTERVAL_SECONDS) || 60
);
const EMPLOYEE_SYNC_INTERVAL_HOURS = Math.max(
  1,
  Number(process.env.EMPLOYEE_SYNC_INTERVAL_HOURS) || 6
);
const MAX_BACKFILL_DAYS = Math.min(
  90,
  Math.max(1, Number(process.env.MAX_BACKFILL_DAYS) || 31)
);
const CONNECTOR_ID = process.env.CONNECTOR_ID || os.hostname() || "office-main";

app.use(cors());
app.use(express.json());

const punchSchema = new mongoose.Schema(
  {
    employeeId: { type: String, default: "Unknown" },
    employeeName: { type: String, default: "Unknown employee" },
    punchTime: { type: Date, required: true, index: true },
    verifyMode: { type: Number, default: 0 },
    logId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const Punch = mongoose.model("Punch", punchSchema);

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    employeeName: { type: String, required: true },
    userType: { type: String, default: "normal" },
    validFrom: Date,
    validTo: Date,
    deviceData: mongoose.Schema.Types.Mixed,
    lastSyncedAt: Date,
  },
  { timestamps: true }
);
const Employee = mongoose.model("Employee", employeeSchema);

const hrUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "HR Administrator" },
    role: { type: String, default: "hr", enum: ["hr"] },
  },
  { timestamps: true }
);
const HrUser = mongoose.model("HrUser", hrUserSchema);

const connectorStateSchema = new mongoose.Schema(
  {
    connectorId: { type: String, required: true, unique: true },
    computerName: String,
    status: { type: String, default: "starting" },
    terminalReachable: { type: Boolean, default: false },
    lastAttemptAt: Date,
    lastSuccessfulSyncAt: Date,
    lastEmployeeSyncAt: Date,
    lastHeartbeatAt: Date,
    nextPunchSyncAt: Date,
    addedPunches: { type: Number, default: 0 },
    existingPunches: { type: Number, default: 0 },
    lastError: String,
  },
  { timestamps: true }
);
const ConnectorState = mongoose.model("ConnectorState", connectorStateSchema);

let databaseInitialization;

app.get("/", (_req, res) => {
  res
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>PUNCHER API — Deployment Ready</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
        color: #d9fffa;
        background:
          radial-gradient(circle at 50% 0%, rgba(45, 212, 191, .18), transparent 38rem),
          #061416;
      }
      main {
        width: min(680px, 100%);
        padding: clamp(28px, 6vw, 56px);
        text-align: center;
        border: 1px solid rgba(94, 234, 212, .18);
        border-radius: 24px;
        background: linear-gradient(145deg, rgba(12, 42, 44, .96), rgba(6, 25, 28, .96));
        box-shadow: 0 32px 90px rgba(0, 0, 0, .38);
      }
      .mark {
        display: grid;
        place-items: center;
        width: 72px;
        height: 72px;
        margin: 0 auto 24px;
        border-radius: 22px;
        font-size: 34px;
        background: rgba(45, 212, 191, .12);
        border: 1px solid rgba(94, 234, 212, .22);
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 12px;
        border-radius: 999px;
        color: #5eead4;
        background: rgba(45, 212, 191, .09);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #2dd4bf;
        box-shadow: 0 0 16px #2dd4bf;
      }
      h1 { margin: 22px 0 12px; font-size: clamp(30px, 6vw, 46px); }
      p { margin: 0 auto; max-width: 510px; color: #94a3b8; line-height: 1.7; }
      a {
        display: inline-block;
        margin-top: 30px;
        padding: 13px 20px;
        border-radius: 12px;
        color: #042f2e;
        background: #2dd4bf;
        font-weight: 750;
        text-decoration: none;
      }
      a:hover { background: #5eead4; }
      footer { margin-top: 30px; color: #52676c; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true">✓</div>
      <div class="status"><span class="dot"></span> API function online</div>
      <h1>PUNCHER API is deployed</h1>
      <p>
        The attendance backend is running successfully. Verify the MongoDB
        Atlas connection and synchronization mode to complete the deployment check.
      </p>
      <a href="/api/deployment-status">Verify deployment status</a>
      <footer>Secure HR attendance and workforce reporting API</footer>
    </main>
  </body>
</html>`);
});

async function initializeDatabase() {
  if (mongoose.connection.readyState === 1 && databaseInitialization) {
    return databaseInitialization;
  }

  if (!databaseInitialization) {
    databaseInitialization = (async () => {
      await mongoose.connect(MONGODB_URI);
      console.log(
        `[database] Connected successfully (${IS_VERCEL ? "Vercel" : "local"} runtime).`
      );

      if (!IS_CONNECTOR) {
        const normalizedEmail = HR_EMAIL.toLowerCase();
        const existingHr = await HrUser.findOne({ email: normalizedEmail });
        if (!existingHr) {
          await HrUser.create({
            email: normalizedEmail,
            passwordHash: await bcrypt.hash(HR_PASSWORD, 12),
            name: "HR Administrator",
            role: "hr",
          });
          console.log(`[database] Initial HR account created for ${HR_EMAIL}.`);
        } else if (!(await bcrypt.compare(HR_PASSWORD, existingHr.passwordHash))) {
          existingHr.passwordHash = await bcrypt.hash(HR_PASSWORD, 12);
          await existingHr.save();
          console.log(
            `[database] HR account password synchronized from the environment for ${HR_EMAIL}.`
          );
        }
      } else {
        console.log(
          "[connector] HR account initialization skipped in connector runtime."
        );
      }

      return mongoose.connection;
    })().catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }

  return databaseInitialization;
}

async function requireDatabase(_req, res, next) {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error("[database] Request blocked because Atlas is unavailable:", error.message);
    res.status(503).json({
      status: "unavailable",
      message: "The PUNCHER API is running, but the database connection failed.",
      database: "disconnected",
      detail: error.message,
    });
  }
}

app.get("/api/deployment-status", async (_req, res) => {
  try {
    await initializeDatabase();
    const platform = IS_VERCEL ? "Vercel" : "Local";
    const message = `PUNCHER API deployment is operational on ${platform}. MongoDB Atlas is connected.`;
    console.log(`[deployment] READY: ${message}`);
    res.json({
      status: "ready",
      message,
      checkedAt: new Date().toISOString(),
      deployment: {
        platform,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
        region: process.env.VERCEL_REGION || "local",
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
        timezone: APP_TIMEZONE,
      },
      database: {
        status: "connected",
        name: mongoose.connection.name || "attendanceDB",
      },
      synchronization: {
        mode: SYNC_MODE,
        directDeviceAccess: SYNC_MODE === "direct",
        message:
          SYNC_MODE === "agent"
            ? "Cloud deployment is ready. Live terminal data must be uploaded by the office synchronization agent."
            : "Direct terminal synchronization is enabled for this runtime.",
      },
    });
  } catch (error) {
    console.error("[deployment] NOT READY:", error.message);
    res.status(503).json({
      status: "not_ready",
      message:
        "The PUNCHER API function is running, but MongoDB Atlas is not connected.",
      checkedAt: new Date().toISOString(),
      database: { status: "disconnected" },
      detail: error.message,
    });
  }
});

app.use("/api", requireDatabase);

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication required." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Your session is invalid or expired." });
  }
}

function requireDirectDevice(req, res, next) {
  if (SYNC_MODE === "direct") return next();
  res.status(409).json({
    message: "Direct terminal synchronization is disabled in this deployment.",
    detail:
      "The cloud API is running in office-agent mode. Synchronization must originate from a computer on the terminal's office network.",
    synchronization: {
      mode: SYNC_MODE,
      deploymentReady: true,
      deviceNetworkRequired: true,
    },
  });
}

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await HrUser.findOne({ email });
    if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.passwordHash))) {
      return res.status(401).json({ message: "Invalid HR email or password." });
    }
    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    res.json({
      token,
      user: { email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Unable to sign in." });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use("/api", requireAuth);

function getTodayRange() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

function getSyncDayRange(dateValue) {
  if (!dateValue) return getTodayRange();
  const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const error = new Error("Sync date must use YYYY-MM-DD format.");
    error.status = 400;
    throw error;
  }

  const [, year, month, day] = match;
  const dayStart = new Date(Number(year), Number(month) - 1, Number(day));
  dayStart.setHours(0, 0, 0, 0);
  if (
    dayStart.getFullYear() !== Number(year) ||
    dayStart.getMonth() !== Number(month) - 1 ||
    dayStart.getDate() !== Number(day)
  ) {
    const error = new Error("Sync date is not a valid calendar date.");
    error.status = 400;
    throw error;
  }

  const { dayEnd: todayEnd } = getTodayRange();
  if (dayStart >= todayEnd) {
    const error = new Error("Future attendance dates cannot be synchronized.");
    error.status = 400;
    throw error;
  }

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

function localDateKey(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function connectorBackfillDates(lastSuccessfulSyncAt) {
  const { dayStart: today } = getTodayRange();
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - (MAX_BACKFILL_DAYS - 1));

  const start = lastSuccessfulSyncAt
    ? new Date(lastSuccessfulSyncAt)
    : new Date(today);
  start.setHours(0, 0, 0, 0);
  if (start < earliest) start.setTime(earliest.getTime());
  if (start > today) start.setTime(today.getTime());

  const dates = [];
  for (const cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(localDateKey(cursor));
  }
  return dates;
}

function formatDeviceDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetRemainder = pad(Math.abs(offsetMinutes) % 60);

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${offsetSign}${offsetHours}:${offsetRemainder}`
  );
}

function timeOnDate(date, clockTime) {
  const [hours, minutes] = clockTime.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function buildAttendanceRows(punches) {
  const employees = new Map();

  for (const punch of punches) {
    const key = punch.employeeId;
    if (!employees.has(key)) {
      employees.set(key, {
        employeeId: punch.employeeId,
        employeeName: punch.employeeName,
        punches: [],
      });
    }
    employees.get(key).punches.push(new Date(punch.punchTime));
  }

  return [...employees.values()]
    .map((employee) => {
      const sortedPunches = employee.punches.sort((a, b) => a - b);
      const checkIn = sortedPunches[0];
      const isFriday = checkIn.getDay() === 5;
      const lunchStartClock = isFriday
        ? FRIDAY_LUNCH_START
        : REGULAR_LUNCH_START;
      const lunchEndClock = isFriday ? FRIDAY_LUNCH_END : REGULAR_LUNCH_END;
      const scheduledLunchStart = timeOnDate(checkIn, lunchStartClock);
      const scheduledLunchEnd = timeOnDate(checkIn, lunchEndClock);
      const lunchSearchStart = new Date(
        scheduledLunchStart.getTime() - 30 * 60 * 1000
      );
      const earliestCheckout = timeOnDate(checkIn, EARLIEST_CHECKOUT);
      let lunchOut = null;
      let lunchIn = null;
      let checkOut = null;
      const eventAudit = [
        { time: checkIn, event: "Work check-in", accepted: true },
      ];

      for (const punch of sortedPunches.slice(1)) {
        const minutesSincePrevious =
          (punch - sortedPunches[sortedPunches.indexOf(punch) - 1]) / 60000;
        let event = "Ignored punch";
        let reason = "Outside an available attendance event slot";
        let accepted = false;

        if (punch < lunchSearchStart) {
          reason =
            minutesSincePrevious < DUPLICATE_WINDOW_MINUTES
              ? "Rapid duplicate work check-in"
              : "Repeated work check-in";
        } else if (punch < earliestCheckout) {
          if (!lunchOut && punch <= scheduledLunchEnd) {
            lunchOut = punch;
            event = "Lunch out";
            accepted = true;
            reason = null;
          } else if (
            lunchOut &&
            !lunchIn &&
            punch - lunchOut >= MIN_LUNCH_SEPARATION_MINUTES * 60000
          ) {
            lunchIn = punch;
            event = "Lunch return";
            accepted = true;
            reason = null;
          } else if (!lunchOut && punch > scheduledLunchEnd) {
            lunchIn = punch;
            event = "Lunch return";
            accepted = true;
            reason = "Lunch exit was not recorded";
          } else {
            reason =
              minutesSincePrevious < DUPLICATE_WINDOW_MINUTES
                ? "Rapid duplicate lunch punch"
                : lunchIn
                  ? "Repeated lunch return"
                  : `Lunch return is less than ${MIN_LUNCH_SEPARATION_MINUTES} minutes after lunch out`;
          }
        } else if (!checkOut) {
          checkOut = punch;
          event = "Work check-out";
          accepted = true;
          reason = null;
        } else {
          reason =
            minutesSincePrevious < DUPLICATE_WINDOW_MINUTES
              ? "Rapid duplicate work check-out"
              : "Repeated work check-out";
        }

        eventAudit.push({ time: punch, event, accepted, reason });
      }
      const scheduledStart = timeOnDate(checkIn, WORK_START);
      const moderateArrivalEnd = timeOnDate(checkIn, ARRIVAL_GRACE_END);
      const moderateDepartureStart = timeOnDate(
        checkIn,
        DEPARTURE_MODERATE_START
      );
      const scheduledEnd = timeOnDate(checkIn, WORK_END);
      const workedMinutes = checkOut
        ? Math.max(
            0,
            Math.round((checkOut - checkIn) / 60000) -
              (lunchOut && lunchIn
                ? Math.round((lunchIn - lunchOut) / 60000)
                : 0)
          )
        : null;
      const lunchMinutes =
        lunchOut && lunchIn ? Math.round((lunchIn - lunchOut) / 60000) : null;
      const expectedLunchMinutes = Math.round(
        (scheduledLunchEnd - scheduledLunchStart) / 60000
      );
      let lunchStatus = "Lunch not recorded";
      if (lunchOut && !lunchIn) lunchStatus = "Lunch return missing";
      if (!lunchOut && lunchIn) lunchStatus = "Lunch exit missing";
      if (lunchMinutes != null) {
        if (lunchMinutes < expectedLunchMinutes - 10)
          lunchStatus = "Lunch shorter than schedule";
        else if (lunchMinutes > expectedLunchMinutes + 10)
          lunchStatus = "Lunch longer than schedule";
        else lunchStatus = "Lunch complete";
      }

      let arrivalStatus = "Moderate comer";
      if (checkIn < scheduledStart) arrivalStatus = "Early comer";
      if (checkIn > moderateArrivalEnd) arrivalStatus = "Late comer";

      let departureStatus = "Not punched out";
      if (checkOut) {
        if (checkOut < moderateDepartureStart) {
          departureStatus = "Early leaver";
        } else if (checkOut <= scheduledEnd) {
          departureStatus = "Moderate leaver";
        } else {
          departureStatus = "Late leaver";
        }
      }

      return {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        checkIn,
        checkOut,
        lunchOut,
        lunchIn,
        lunchMinutes,
        expectedLunchMinutes,
        lunchStatus,
        lunchSchedule: `${lunchStartClock}-${lunchEndClock}`,
        isFriday,
        arrivalStatus,
        departureStatus,
        workedMinutes,
        workedHours: workedMinutes == null ? null : workedMinutes / 60,
        rawPunchCount: sortedPunches.length,
        acceptedPunchCount: eventAudit.filter((event) => event.accepted).length,
        ignoredDuplicateCount: eventAudit.filter((event) => !event.accepted)
          .length,
        eventAudit,
      };
    })
    .sort((a, b) => a.checkIn - b.checkIn);
}

async function getTodayAttendance() {
  const { dayStart, dayEnd } = getTodayRange();
  const punches = await Punch.find({
    punchTime: { $gte: dayStart, $lt: dayEnd },
  })
    .sort({ punchTime: 1 })
    .lean();

  return {
    attendanceDate: dayStart,
    punches,
    attendance: buildAttendanceRows(punches),
  };
}

function tcpProbe(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...result, latencyMs: Date.now() - startedAt });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish({ reachable: true }));
    socket.once("timeout", () =>
      finish({ reachable: false, code: "ETIMEDOUT", message: "TCP probe timed out" })
    );
    socket.once("error", (error) =>
      finish({ reachable: false, code: error.code, message: error.message })
    );
  });
}

function networkErrorDetails(error) {
  const cause = error?.cause;
  return {
    name: error?.name,
    message: error?.message,
    code: error?.code || cause?.code || null,
    cause: cause?.message || null,
    address: cause?.address || null,
    port: cause?.port || null,
  };
}

function diagnosticHint(code, status) {
  if (status === 401)
    return "The device is reachable, but the username or password was rejected.";
  if (status === 403)
    return "The device account lacks permission to use this ISAPI endpoint.";
  if (code === "ECONNREFUSED")
    return "The IP answered, but the configured HTTP port is closed. Check the terminal HTTP/HTTPS port.";
  if (["ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH"].includes(code))
    return "The terminal is unreachable. Check its IP, subnet/VLAN, cable or Wi-Fi, and firewall.";
  return "Check device reachability, HTTP/HTTPS settings, ISAPI support, and credentials.";
}

function normalizeVerifyMode(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value);
  }

  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("finger")) return 1;
  if (normalized.includes("face") || normalized.includes("card")) return 3;
  if (normalized.includes("password") || normalized.includes("pwd")) return 4;
  return 0;
}

function getLocalIpv4Addresses() {
  return Object.entries(os.networkInterfaces()).flatMap(([interfaceName, addresses]) =>
    (addresses ?? [])
      .filter((address) => address.family === "IPv4" && !address.internal)
      .map((address) => ({
        interface: interfaceName,
        address: address.address,
        netmask: address.netmask,
      }))
  );
}

function isSameClassCSubnet(firstIp, secondIp) {
  return firstIp.split(".").slice(0, 3).join(".") ===
    secondIp.split(".").slice(0, 3).join(".");
}

async function logDeviceDiagnostics(reason = "startup") {
  const localAddresses = getLocalIpv4Addresses();
  const sameSubnet = localAddresses.some((item) =>
    isSameClassCSubnet(item.address, DEVICE_IP)
  );
  const ports = [...new Set([DEVICE_PORT, 80, 443, 8000])];

  console.log("\n============================================================");
  console.log(`PUNCHER DEVICE DIAGNOSTICS (${reason.toUpperCase()})`);
  console.log("============================================================");
  console.log("Local IPv4 interfaces:");
  console.table(
    localAddresses.length
      ? localAddresses
      : [{ interface: "none", address: "none", netmask: "none" }]
  );
  console.log(`Configured terminal : ${DEVICE_PROTOCOL}://${DEVICE_IP}:${DEVICE_PORT}`);
  console.log(
    `Subnet assessment   : ${sameSubnet ? "LIKELY SAME /24 SUBNET" : "DIFFERENT /24 SUBNETS"}`
  );

  if (!sameSubnet) {
    console.warn(
      `[NETWORK WARNING] No local PC address shares the first three IP segments with ${DEVICE_IP}.`
    );
    console.warn(
      `[NETWORK WARNING] The device needs routing, a secondary PC address, or an IP on ${localAddresses[0]?.address.split(".").slice(0, 3).join(".") ?? "the PC subnet"}.x.`
    );
  }

  const results = await Promise.all(
    ports.map(async (port) => {
      const result = await tcpProbe(DEVICE_IP, port, 1500);
      return {
        port,
        purpose:
          port === 80
            ? "HTTP / ISAPI"
            : port === 443
              ? "HTTPS / ISAPI"
              : port === 8000
                ? "Hikvision SDK"
                : "Configured port",
        status: result.reachable ? "OPEN" : "UNREACHABLE",
        code: result.code ?? "OK",
        latency: `${result.latencyMs}ms`,
      };
    })
  );

  console.log("Terminal port checks:");
  console.table(results);

  const configuredResult = results.find((result) => result.port === DEVICE_PORT);
  if (configuredResult?.status !== "OPEN") {
    console.error(
      "[DIAGNOSTIC RESULT] At the time of this check, the backend could not open a TCP connection to the terminal."
    );
    console.error(
      `[NEXT ACTION] Retry synchronization. If it still fails, fix reachability to ${DEVICE_IP}:${DEVICE_PORT}; Digest authentication has not started.`
    );
  } else {
    console.log(
      "[NETWORK OK] The configured terminal port is open. Authentication can proceed."
    );
  }
  console.log("============================================================\n");
}

app.get("/api/health", async (_req, res) => {
  const device =
    SYNC_MODE === "direct"
      ? {
          host: DEVICE_IP,
          port: DEVICE_PORT,
          protocol: DEVICE_PROTOCOL,
          ...(await tcpProbe(DEVICE_IP, DEVICE_PORT)),
        }
      : {
          status: "managed_by_office_agent",
          reachable: null,
          message:
            "Device reachability is checked by the office synchronization agent, not by Vercel.",
        };
  res.json({
    status: "ok",
    runtime: IS_VERCEL ? "vercel" : "local",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    synchronizationMode: SYNC_MODE,
    device,
  });
});

app.get("/api/connector/status", async (_req, res) => {
  const connectors = await ConnectorState.find()
    .sort({ lastHeartbeatAt: -1 })
    .lean();
  const now = Date.now();
  res.json({
    connectors: connectors.map((connector) => ({
      ...connector,
      online:
        connector.lastHeartbeatAt &&
        now - new Date(connector.lastHeartbeatAt).getTime() <
          Math.max(PUNCH_SYNC_INTERVAL_SECONDS * 3, 180) * 1000,
    })),
  });
});

app.get("/api/punches", async (_req, res) => {
  try {
    const { dayStart, dayEnd } = getTodayRange();
    const punches = await Punch.find({
      punchTime: { $gte: dayStart, $lt: dayEnd },
    })
      .sort({ punchTime: -1 })
      .lean();

    res.json({
      punches,
      attendanceDate: dayStart.toISOString(),
      totalStored: await Punch.countDocuments(),
    });
  } catch {
    res.status(500).json({ message: "Unable to load attendance records." });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    const punches = await Punch.find({ punchTime: { $gte: from } })
      .sort({ punchTime: -1 })
      .limit(5000)
      .lean();
    res.json({ punches, days, total: punches.length });
  } catch (error) {
    res.status(500).json({ message: "Unable to load attendance history." });
  }
});

app.post("/api/employees/sync", requireDirectDevice, async (_req, res) => {
  try {
    const countClient = new DigestClient(API_USER, API_PASS);
    const countResponse = await countClient.fetch(
      `${DEVICE_PROTOCOL}://${DEVICE_IP}:${DEVICE_PORT}/ISAPI/AccessControl/UserInfo/Count?format=json`,
      {
        method: "GET",
        signal: AbortSignal.timeout(DEVICE_TIMEOUT_MS),
      }
    );
    let deviceReportedCount = null;
    if (countResponse.ok) {
      const countData = await countResponse.json();
      deviceReportedCount = Number(
        countData?.UserInfoCount?.userNumber ??
          countData?.UserInfoCount?.totalNumber
      );
      if (!Number.isFinite(deviceReportedCount)) deviceReportedCount = null;
    }

    const searchID = `employees-${Date.now()}`;
    const employees = [];
    let position = 0;
    let totalMatches = null;

    for (let page = 1; page <= 100; page += 1) {
      const client = new DigestClient(API_USER, API_PASS);
      const response = await client.fetch(
        `${DEVICE_PROTOCOL}://${DEVICE_IP}:${DEVICE_PORT}/ISAPI/AccessControl/UserInfo/Search?format=json`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(DEVICE_TIMEOUT_MS),
          body: JSON.stringify({
            UserInfoSearchCond: {
              searchID,
              searchResultPosition: position,
              maxResults: 30,
            },
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`Employee directory returned HTTP ${response.status}`);
      }
      const data = await response.json();
      const result = data.UserInfoSearch ?? {};
      const pageEmployees = result.UserInfo ?? [];
      totalMatches = Number(result.totalMatches ?? totalMatches);
      employees.push(...pageEmployees);
      if (!pageEmployees.length) break;
      position += pageEmployees.length;
      if (Number.isFinite(totalMatches) && position >= totalMatches) break;
    }

    for (const employee of employees) {
      const employeeId = String(employee.employeeNo ?? employee.employeeNoString ?? "");
      if (!employeeId) continue;
      await Employee.updateOne(
        { employeeId },
        {
          $set: {
            employeeId,
            employeeName: employee.name || `Employee ${employeeId}`,
            userType: employee.userType || "normal",
            validFrom: employee.Valid?.beginTime || null,
            validTo: employee.Valid?.endTime || null,
            deviceData: employee,
            lastSyncedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    res.json({
      received: employees.length,
      stored: await Employee.countDocuments(),
      deviceReportedCount,
      complete:
        deviceReportedCount == null || employees.length >= deviceReportedCount,
    });
  } catch (error) {
    console.error("Employee synchronization failed:", error);
    res.status(502).json({
      message: "Unable to synchronize the employee directory.",
      detail: error.message,
    });
  }
});

app.get("/api/employees", async (req, res) => {
  try {
    const employees = await Employee.find().sort({ employeeName: 1 }).lean();
    const lastPunches = await Punch.aggregate([
      { $sort: { punchTime: -1 } },
      {
        $group: {
          _id: "$employeeId",
          lastPunch: { $first: "$punchTime" },
          employeeName: { $first: "$employeeName" },
          lastVerificationMode: { $first: "$verifyMode" },
        },
      },
    ]);
    const lastPunchMap = new Map(lastPunches.map((item) => [item._id, item]));
    const { dayStart } = getTodayRange();
    const weekAgo = new Date(dayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(dayStart);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const activeRows = employees.map((employee) => {
      const punch = lastPunchMap.get(employee.employeeId);
      const lastPunch = punch?.lastPunch ?? null;
      let activityCategory = "Punched today";
      if (!lastPunch) activityCategory = "Never punched";
      else if (lastPunch < monthAgo) activityCategory = "Inactive 30+ days";
      else if (lastPunch < weekAgo) activityCategory = "Inactive 7+ days";
      else if (lastPunch < dayStart) activityCategory = "Did not punch today";

      return {
        ...employee,
        activeOnDevice: true,
        lastPunch,
        lastVerificationMode: punch?.lastVerificationMode ?? null,
        punchedToday: Boolean(lastPunch && lastPunch >= dayStart),
        activityCategory,
      };
    });
    const rows = [...activeRows].sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName)
    );

    const filter = String(req.query.category || "all");
    const search = String(req.query.search || "").trim().toLowerCase();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 20));
    const filtered = rows.filter(
      (row) =>
        (filter === "all" ||
          (filter === "Punched today" && row.punchedToday) ||
          (filter === "Not punched today" && !row.punchedToday) ||
          row.activityCategory === filter) &&
        (!search ||
          row.employeeName.toLowerCase().includes(search) ||
          row.employeeId.toLowerCase().includes(search))
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
    const currentPage = Math.min(page, totalPages);
    const paginated = filtered.slice(
      (currentPage - 1) * limit,
      currentPage * limit
    );

    res.json({
      employees: paginated,
      summary: {
        total: rows.length,
        activeDirectory: activeRows.length,
        punchedToday: activeRows.filter((row) => row.punchedToday).length,
        notToday: activeRows.filter((row) => !row.punchedToday).length,
        inactiveWeek: activeRows.filter(
          (row) =>
            row.activityCategory === "Inactive 7+ days" ||
            row.activityCategory === "Inactive 30+ days"
        ).length,
        inactiveMonth: activeRows.filter((row) => row.activityCategory === "Inactive 30+ days").length,
        neverPunched: activeRows.filter((row) => row.activityCategory === "Never punched").length,
      },
      pagination: {
        page: currentPage,
        limit,
        totalItems: filtered.length,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Employee directory query failed:", error);
    res.status(500).json({ message: "Unable to load employees." });
  }
});

app.get("/api/attendance/today", async (_req, res) => {
  try {
    const { attendanceDate, punches, attendance } =
      await getTodayAttendance();
    res.json({
      attendanceDate,
      attendance,
      summary: {
        employees: attendance.length,
        rawPunches: punches.length,
        checkedOut: attendance.filter((row) => row.checkOut).length,
        incomplete: attendance.filter((row) => !row.checkOut).length,
        earlyComers: attendance.filter(
          (row) => row.arrivalStatus === "Early comer"
        ).length,
        lateComers: attendance.filter(
          (row) => row.arrivalStatus === "Late comer"
        ).length,
        moderateComers: attendance.filter(
          (row) => row.arrivalStatus === "Moderate comer"
        ).length,
        earlyLeavers: attendance.filter(
          (row) => row.departureStatus === "Early leaver"
        ).length,
        moderateLeavers: attendance.filter(
          (row) => row.departureStatus === "Moderate leaver"
        ).length,
        lateLeavers: attendance.filter(
          (row) => row.departureStatus === "Late leaver"
        ).length,
        lunchComplete: attendance.filter(
          (row) => row.lunchStatus === "Lunch complete"
        ).length,
        lunchIssues: attendance.filter(
          (row) => row.lunchStatus !== "Lunch complete"
        ).length,
      },
      policy: {
        workStart: WORK_START,
        arrivalGraceEnd: ARRIVAL_GRACE_END,
        departureModerateStart: DEPARTURE_MODERATE_START,
        workEnd: WORK_END,
        regularLunch: `${REGULAR_LUNCH_START}-${REGULAR_LUNCH_END}`,
        fridayLunch: `${FRIDAY_LUNCH_START}-${FRIDAY_LUNCH_END}`,
        earliestCheckout: EARLIEST_CHECKOUT,
        minimumLunchSeparationMinutes: MIN_LUNCH_SEPARATION_MINUTES,
        duplicateWindowMinutes: DUPLICATE_WINDOW_MINUTES,
      },
    });
  } catch (error) {
    console.error("Attendance calculation failed:", error);
    res.status(500).json({ message: "Unable to calculate today's attendance." });
  }
});

app.get("/api/attendance/today/export", async (req, res) => {
  try {
    const { attendanceDate, attendance } = await getTodayAttendance();
    const amharic = req.query.lang === "am";
    const headers = amharic
      ? {
          employeeId: "የሰራተኛ መለያ",
          employeeName: "የሰራተኛ ስም",
          date: "ቀን",
          checkIn: "የገባበት ሰዓት",
          arrivalStatus: "የመግቢያ ሁኔታ",
          lunchOut: "የምሳ መውጫ",
          lunchIn: "ከምሳ መመለሻ",
          lunchMinutes: "የምሳ ደቂቃ",
          lunchStatus: "የምሳ ሁኔታ",
          checkOut: "የወጣበት ሰዓት",
          departureStatus: "የመውጫ ሁኔታ",
          workedHours: "የሰራው ሰዓት",
          rawPunchCount: "ጥሬ ምዝገባ",
          ignoredDuplicateCount: "የተተወ ድግግሞሽ",
          auditNotes: "የምርመራ ማስታወሻ",
        }
      : {
          employeeId: "Employee ID",
          employeeName: "Employee Name",
          date: "Date",
          checkIn: "Check In",
          arrivalStatus: "Arrival Status",
          lunchOut: "Lunch Out",
          lunchIn: "Lunch Return",
          lunchMinutes: "Lunch Minutes",
          lunchStatus: "Lunch Status",
          checkOut: "Check Out",
          departureStatus: "Departure Status",
          workedHours: "Worked Hours",
          rawPunchCount: "Raw Punches",
          ignoredDuplicateCount: "Ignored Duplicates",
          auditNotes: "Audit Notes",
        };
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PUNCHER Attendance Console";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Today's Attendance", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: headers.employeeId, key: "employeeId", width: 16 },
      { header: headers.employeeName, key: "employeeName", width: 28 },
      { header: headers.date, key: "date", width: 18 },
      { header: headers.checkIn, key: "checkIn", width: 18 },
      { header: headers.arrivalStatus, key: "arrivalStatus", width: 20 },
      { header: headers.lunchOut, key: "lunchOut", width: 18 },
      { header: headers.lunchIn, key: "lunchIn", width: 18 },
      { header: headers.lunchMinutes, key: "lunchMinutes", width: 16 },
      { header: headers.lunchStatus, key: "lunchStatus", width: 26 },
      { header: headers.checkOut, key: "checkOut", width: 18 },
      { header: headers.departureStatus, key: "departureStatus", width: 22 },
      { header: headers.workedHours, key: "workedHours", width: 18 },
      { header: headers.rawPunchCount, key: "rawPunchCount", width: 16 },
      { header: headers.ignoredDuplicateCount, key: "ignoredDuplicateCount", width: 22 },
      { header: headers.auditNotes, key: "auditNotes", width: 45 },
    ];

    const exportLocale = amharic ? "am-ET-u-ca-ethiopic" : "en-US";
    const amharicStatuses = {
      "Early comer": "ቀድሞ የገባ",
      "On time": "በሰዓቱ የገባ",
      "Late comer": "ዘግይቶ የገባ",
      "Not punched out": "መውጫ አልመዘገበም",
      "Early leaver": "ቀድሞ የወጣ",
      "Moderate leaver": "በመካከለኛ ሰዓት የወጣ",
      "Late leaver": "ዘግይቶ የወጣ",
      "Moderate comer": "በመካከለኛ ሰዓት የገባ",
      "Lunch not recorded": "የምሳ ሰዓት አልተመዘገበም",
      "Lunch return missing": "ከምሳ መመለሻ አልተመዘገበም",
      "Lunch exit missing": "የምሳ መውጫ አልተመዘገበም",
      "Lunch shorter than schedule": "የምሳ እረፍት ከተወሰነው ያነሰ",
      "Lunch longer than schedule": "የምሳ እረፍት ከተወሰነው የበለጠ",
      "Lunch complete": "የምሳ እረፍት ተሟልቷል",
    };
    const localizeStatus = (status) =>
      amharic ? amharicStatuses[status] || status : status;
    const formatTime = (date) =>
      date
        ? new Intl.DateTimeFormat(exportLocale, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }).format(new Date(date))
        : "";

    for (const row of attendance) {
      sheet.addRow({
        ...row,
        date: attendanceDate.toLocaleDateString(exportLocale),
        checkIn: formatTime(row.checkIn),
        lunchOut: formatTime(row.lunchOut),
        lunchIn: formatTime(row.lunchIn),
        lunchStatus: localizeStatus(row.lunchStatus),
        checkOut: formatTime(row.checkOut),
        arrivalStatus: localizeStatus(row.arrivalStatus),
        departureStatus: localizeStatus(row.departureStatus),
        workedHours:
          row.workedHours == null ? "" : Number(row.workedHours.toFixed(2)),
        auditNotes: row.eventAudit
          .filter((event) => !event.accepted)
          .map(
            (event) =>
              `${formatTime(event.time)} - ${event.reason || "Ignored"}`
          )
          .join("; "),
      });
    }

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" },
    };
    sheet.autoFilter = { from: "A1", to: "O1" };
    sheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: "middle" };
      if (rowNumber > 1 && rowNumber % 2 === 1) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" },
        };
      }
    });

    const dateLabel = attendanceDate.toLocaleDateString("en-CA");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-${dateLabel}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel export failed:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Unable to export today's attendance." });
    }
  }
});

app.get("/api/sync-punches", requireDirectDevice, async (req, res) => {
  const syncStartedAt = Date.now();
  const requestId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  console.log(
    `[sync:${requestId}] Starting terminal sync: ${DEVICE_PROTOCOL}://${DEVICE_IP}:${DEVICE_PORT} (timeout ${DEVICE_TIMEOUT_MS}ms)`
  );

  try {
    const { dayStart: syncDayStart, dayEnd: syncDayEnd } = getSyncDayRange(
      req.query.date
    );
    const syncDate = localDateKey(syncDayStart);
    const probe = await tcpProbe(DEVICE_IP, DEVICE_PORT);
    console.log(
      `[sync:${requestId}] TCP probe: ${probe.reachable ? "reachable" : "unreachable"} in ${probe.latencyMs}ms${probe.code ? ` (${probe.code})` : ""}`
    );
    if (!probe.reachable) {
      await logDeviceDiagnostics(`failed sync ${requestId}`);
      const probeError = new Error(probe.message || "Device TCP port is unreachable");
      probeError.code = probe.code;
      throw probeError;
    }

    const searchID = `puncher-${Date.now()}`;
    const logs = [];
    const seenPageSignatures = new Set();
    let searchResultPosition = 0;
    let reportedTotalMatches = null;
    const deviceStartTime = formatDeviceDateTime(syncDayStart);
    const deviceEndTime = formatDeviceDateTime(
      new Date(syncDayEnd.getTime() - 1000)
    );

    console.log(
      `[sync:${requestId}] Fetching today's terminal events from ${deviceStartTime} through ${deviceEndTime} (up to ${DEVICE_MAX_PAGES} pages)`
    );

    for (let pageNumber = 1; pageNumber <= DEVICE_MAX_PAGES; pageNumber += 1) {
      console.log(
        `[sync:${requestId}] Requesting page ${pageNumber} at position ${searchResultPosition}`
      );
      // Some Hikvision firmware invalidates a Digest nonce after one request.
      // A fresh client performs a new challenge-response for each result page.
      const client = new DigestClient(API_USER, API_PASS);
      const deviceResponse = await client.fetch(DEVICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(DEVICE_TIMEOUT_MS),
        body: JSON.stringify({
          AcsEventCond: {
            searchID,
            searchResultPosition,
            maxResults: DEVICE_PAGE_SIZE,
            major: 0,
            minor: 0,
            startTime: deviceStartTime,
            endTime: deviceEndTime,
          },
        }),
      });

      console.log(
        `[sync:${requestId}] Page ${pageNumber}: HTTP ${deviceResponse.status} ${deviceResponse.statusText}`
      );
      if (!deviceResponse.ok) {
        const responseText = await deviceResponse.text();
        const terminalError = new Error(
          `Hikvision terminal returned ${deviceResponse.status} ${deviceResponse.statusText}`
        );
        terminalError.status = deviceResponse.status;
        terminalError.responsePreview = responseText.slice(0, 500);
        throw terminalError;
      }

      const deviceData = await deviceResponse.json();
      const acsEvent = deviceData?.AcsEvent ?? {};
      const pageLogs = acsEvent.InfoList ?? [];
      if (acsEvent.totalMatches != null) {
        const parsedTotalMatches = Number(acsEvent.totalMatches);
        if (Number.isFinite(parsedTotalMatches)) {
          reportedTotalMatches = parsedTotalMatches;
        }
      }

      const pageSignature = pageLogs
        .map((log) => `${log.employeeNoString ?? ""}|${log.time ?? ""}|${log.minor ?? ""}`)
        .join(";");
      if (pageLogs.length && seenPageSignatures.has(pageSignature)) {
        console.warn(
          `[sync:${requestId}] Terminal repeated page data; stopping to avoid an infinite pagination loop`
        );
        break;
      }
      seenPageSignatures.add(pageSignature);
      logs.push(...pageLogs);

      console.log(
        `[sync:${requestId}] Page ${pageNumber}: ${pageLogs.length} event(s), ${logs.length} accumulated${Number.isFinite(reportedTotalMatches) ? `, ${reportedTotalMatches} reported total` : ""}`
      );

      if (!pageLogs.length) break;
      searchResultPosition += pageLogs.length;

      const responseStatus = String(acsEvent.responseStatusStr ?? "").toUpperCase();
      if (
        responseStatus !== "MORE" &&
        Number.isFinite(reportedTotalMatches) &&
        searchResultPosition >= reportedTotalMatches
      ) {
        break;
      }
    }

    console.log(
      `[sync:${requestId}] Received ${logs.length} total event(s) across ${seenPageSignatures.size} page(s)`
    );

    const eventSummary = logs.reduce(
      (summary, log) => {
        if (!log.employeeNoString) {
          summary.skippedMissingEmployee += 1;
        } else if (!log.time) {
          summary.skippedMissingTime += 1;
        } else if (Number.isNaN(new Date(log.time).getTime())) {
          summary.skippedInvalidTime += 1;
        } else {
          summary.validAttendanceEvents += 1;
        }
        return summary;
      },
      {
        validAttendanceEvents: 0,
        skippedMissingEmployee: 0,
        skippedMissingTime: 0,
        skippedInvalidTime: 0,
      }
    );

    console.log(`[sync:${requestId}] Event classification:`);
    console.table(eventSummary);

    // Each deterministic employee/time logId is upserted explicitly. This keeps
    // synchronization idempotent and lets us verify every database write.
    const attendanceEvents = logs
      .filter(
        (log) =>
          log.employeeNoString &&
          log.time &&
          !Number.isNaN(new Date(log.time).getTime())
      )
      .map((log) => {
        const employeeId = String(log.employeeNoString);
        const punchTime = new Date(log.time);
        const logId = `${employeeId}_${log.time}`;

        return {
          employeeId,
          employeeName:
            log.name || log.employeeName || `Employee ${employeeId}`,
          punchTime,
          verifyMode: normalizeVerifyMode(
            log.currentVerifyMode ?? log.verifyMode
          ),
          logId,
        };
      });

    const databaseSummary = {
      inserted: 0,
      alreadyExisting: 0,
      failed: 0,
    };

    for (const attendanceEvent of attendanceEvents) {
      try {
        const writeResult = await Punch.updateOne(
          { logId: attendanceEvent.logId },
          { $setOnInsert: attendanceEvent },
          { upsert: true, runValidators: true }
        );
        if (writeResult.upsertedCount === 1) {
          databaseSummary.inserted += 1;
        } else if (writeResult.matchedCount === 1) {
          databaseSummary.alreadyExisting += 1;
        } else {
          databaseSummary.failed += 1;
          console.warn(
            `[sync:${requestId}] MongoDB returned no insert or match for logId ${attendanceEvent.logId}`
          );
        }
      } catch (writeError) {
        databaseSummary.failed += 1;
        console.error(`[sync:${requestId}] MongoDB upsert failed`, {
          logId: attendanceEvent.logId,
          code: writeError.code,
          message: writeError.message,
        });
      }
    }

    const attendanceDate = syncDayStart.toISOString();
    const punches = await Punch.find({
      punchTime: { $gte: syncDayStart, $lt: syncDayEnd },
    })
      .sort({ punchTime: -1 })
      .lean();
    const totalStored = await Punch.countDocuments();
    console.log(`[sync:${requestId}] MongoDB write result:`);
    console.table({ ...databaseSummary, totalStored });
    console.log(
      `[sync:${requestId}] SUCCESS: ${databaseSummary.inserted} new, ${databaseSummary.alreadyExisting} duplicates already stored, ${logs.length - attendanceEvents.length} non-attendance/invalid events skipped, ${punches.length} returned to frontend, ${Date.now() - syncStartedAt}ms`
    );

    res.json({
      punches,
      attendanceDate,
      sync: {
        date: syncDate,
        received: logs.length,
        valid: attendanceEvents.length,
        added: databaseSummary.inserted,
        existing: databaseSummary.alreadyExisting,
        failed: databaseSummary.failed,
        totalStored,
      },
    });
  } catch (error) {
    const details = networkErrorDetails(error);
    const hint = diagnosticHint(details.code, error.status);
    console.error(`[sync:${requestId}] Punch synchronization failed`, {
      elapsedMs: Date.now() - syncStartedAt,
      target: `${DEVICE_PROTOCOL}://${DEVICE_IP}:${DEVICE_PORT}`,
      ...details,
      httpStatus: error.status || null,
      responsePreview: error.responsePreview || null,
      hint,
    });
    res.status(error.status === 400 ? 400 : 502).json({
      message: "Could not synchronize with the attendance terminal.",
      detail: error.message,
      diagnostic: {
        requestId,
        target: `${DEVICE_PROTOCOL}://${DEVICE_IP}:${DEVICE_PORT}`,
        code: details.code,
        hint,
      },
    });
  }
});

let localServer;
let punchTimer;
let employeeTimer;
let heartbeatTimer;
let punchSyncRunning = false;
let employeeSyncRunning = false;
let shuttingDown = false;

function connectorAuthorization() {
  return `Bearer ${jwt.sign(
    {
      sub: `connector:${CONNECTOR_ID}`,
      role: "connector",
      name: CONNECTOR_ID,
    },
    JWT_SECRET,
    { expiresIn: "10m" }
  )}`;
}

async function callLocalConnectorApi(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: connectorAuthorization(),
    },
    signal: AbortSignal.timeout(
      Math.max(DEVICE_TIMEOUT_MS * 2, 30000)
    ),
  });
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { detail: responseText.slice(0, 500) };
  }
  if (!response.ok) {
    const error = new Error(
      data.detail || data.message || `Connector API returned HTTP ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function updateConnectorState(values) {
  try {
    await ConnectorState.updateOne(
      { connectorId: CONNECTOR_ID },
      {
        $set: {
          connectorId: CONNECTOR_ID,
          computerName: os.hostname(),
          lastHeartbeatAt: new Date(),
          ...values,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("[connector] Could not update connector status:", error.message);
  }
}

async function runEmployeeConnectorSync(reason = "scheduled") {
  if (employeeSyncRunning || shuttingDown) {
    console.log(
      `[connector:employees] ${employeeSyncRunning ? "Skipped because a previous employee sync is active" : "Skipped during shutdown"}.`
    );
    return;
  }
  employeeSyncRunning = true;
  const startedAt = Date.now();
  console.log(`[connector:employees] Starting ${reason} employee directory sync.`);
  try {
    const result = await callLocalConnectorApi("/api/employees/sync", {
      method: "POST",
    });
    console.log(
      `[connector:employees] SUCCESS: ${result.received || 0} received, ${result.stored || 0} stored, ${Date.now() - startedAt}ms.`
    );
    await updateConnectorState({
      status: "online",
      terminalReachable: true,
      lastEmployeeSyncAt: new Date(),
      lastError: null,
    });
  } catch (error) {
    console.error(`[connector:employees] FAILED: ${error.message}`);
    await updateConnectorState({
      status: "degraded",
      terminalReachable: false,
      lastError: `Employee sync: ${error.message}`,
    });
  } finally {
    employeeSyncRunning = false;
  }
}

async function runPunchConnectorSync({ backfill = false, reason = "scheduled" } = {}) {
  if (punchSyncRunning || shuttingDown) {
    console.log(
      `[connector:punches] ${punchSyncRunning ? "Skipped because a previous punch sync is active" : "Skipped during shutdown"}.`
    );
    return;
  }
  punchSyncRunning = true;
  const startedAt = Date.now();
  await updateConnectorState({
    status: "synchronizing",
    lastAttemptAt: new Date(),
    nextPunchSyncAt: new Date(
      Date.now() + PUNCH_SYNC_INTERVAL_SECONDS * 1000
    ),
  });

  try {
    const currentState = await ConnectorState.findOne({
      connectorId: CONNECTOR_ID,
    }).lean();
    const dates = backfill
      ? connectorBackfillDates(currentState?.lastSuccessfulSyncAt)
      : [localDateKey(new Date())];
    let added = 0;
    let existing = 0;

    console.log(
      `[connector:punches] Starting ${reason} sync for ${dates.length} date(s): ${dates.join(", ")}.`
    );
    for (const date of dates) {
      if (shuttingDown) break;
      const result = await callLocalConnectorApi(
        `/api/sync-punches?date=${encodeURIComponent(date)}`
      );
      added += Number(result.sync?.added || 0);
      existing += Number(result.sync?.existing || 0);
      console.log(
        `[connector:punches] ${date}: ${result.sync?.added || 0} new, ${result.sync?.existing || 0} existing.`
      );
    }

    const completedAt = new Date();
    await updateConnectorState({
      status: "online",
      terminalReachable: true,
      lastSuccessfulSyncAt: completedAt,
      addedPunches: added,
      existingPunches: existing,
      lastError: null,
      nextPunchSyncAt: new Date(
        Date.now() + PUNCH_SYNC_INTERVAL_SECONDS * 1000
      ),
    });
    console.log(
      `[connector:punches] SUCCESS: ${added} new, ${existing} existing, ${Date.now() - startedAt}ms.`
    );
  } catch (error) {
    console.error(`[connector:punches] FAILED: ${error.message}`);
    await updateConnectorState({
      status: "degraded",
      terminalReachable: false,
      lastError: error.message,
      nextPunchSyncAt: new Date(
        Date.now() + PUNCH_SYNC_INTERVAL_SECONDS * 1000
      ),
    });
  } finally {
    punchSyncRunning = false;
  }
}

async function startConnectorScheduler() {
  console.log("\n============================================================");
  console.log("PUNCHER OFFICE CONNECTOR");
  console.log("============================================================");
  console.log(`Connector ID        : ${CONNECTOR_ID}`);
  console.log(`Computer            : ${os.hostname()}`);
  console.log(`Atlas database      : connected`);
  console.log(
    `Terminal            : ${DEVICE_PROTOCOL}://${DEVICE_IP}:${DEVICE_PORT}`
  );
  console.log(`Punch interval      : ${PUNCH_SYNC_INTERVAL_SECONDS} seconds`);
  console.log(`Employee interval   : ${EMPLOYEE_SYNC_INTERVAL_HOURS} hours`);
  console.log(`Maximum backfill    : ${MAX_BACKFILL_DAYS} days`);
  console.log(`Timezone            : ${APP_TIMEZONE}`);
  console.log("============================================================\n");

  await updateConnectorState({
    status: "starting",
    terminalReachable: false,
    lastError: null,
    nextPunchSyncAt: new Date(),
  });

  if (SYNC_ON_STARTUP) {
    await runEmployeeConnectorSync("startup");
    await runPunchConnectorSync({ backfill: true, reason: "startup/backfill" });
  } else {
    console.log("[connector] Startup synchronization is disabled.");
  }

  punchTimer = setInterval(
    () => runPunchConnectorSync({ reason: "interval" }),
    PUNCH_SYNC_INTERVAL_SECONDS * 1000
  );
  employeeTimer = setInterval(
    () => runEmployeeConnectorSync("interval"),
    EMPLOYEE_SYNC_INTERVAL_HOURS * 60 * 60 * 1000
  );
  heartbeatTimer = setInterval(
    () =>
      updateConnectorState({
        status:
          punchSyncRunning || employeeSyncRunning ? "synchronizing" : "online",
      }),
    Math.min(PUNCH_SYNC_INTERVAL_SECONDS, 60) * 1000
  );
  console.log("[connector] Automatic synchronization scheduler is active.");
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] ${signal} received; stopping PUNCHER cleanly.`);
  clearInterval(punchTimer);
  clearInterval(employeeTimer);
  clearInterval(heartbeatTimer);
  if (IS_CONNECTOR) {
    await updateConnectorState({
      status: "offline",
      nextPunchSyncAt: null,
    });
  }
  if (localServer) {
    await new Promise((resolve) => localServer.close(resolve));
  }
  await mongoose.disconnect();
  process.exit(0);
}

async function startServer() {
  try {
    await initializeDatabase();
    const listenHost = IS_CONNECTOR ? "127.0.0.1" : "0.0.0.0";
    localServer = app.listen(PORT, listenHost, () => {
      console.log(
        `PUNCHER ${IS_CONNECTOR ? "connector API" : "API"} running at http://127.0.0.1:${PORT}`
      );
      console.log(
        `Deployment confirmation: http://localhost:${PORT}/api/deployment-status`
      );
      console.log(
        `Hikvision target: ${DEVICE_PROTOCOL}://${DEVICE_IP}:${DEVICE_PORT} (user: ${API_USER}, password: configured but hidden)`
      );
      console.log(`Device diagnostics: http://localhost:${PORT}/api/health`);
      if (IS_CONNECTOR) {
        startConnectorScheduler().catch((error) => {
          console.error("[connector] Scheduler startup failed:", error);
        });
      } else if (SYNC_MODE === "direct") {
        logDeviceDiagnostics().catch((error) => {
          console.error("Startup device diagnostics failed:", error.message);
        });
      } else {
        console.log(
          "[sync] Office-agent mode enabled; startup terminal diagnostics skipped."
        );
      }
    });
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exit(1);
  }
}

if (!IS_VERCEL) {
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  startServer();
}

export default app;
