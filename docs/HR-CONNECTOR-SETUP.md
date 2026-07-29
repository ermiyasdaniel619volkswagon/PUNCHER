# PUNCHER Office Connector — HR Computer Setup

This guide installs only the lightweight synchronization service on the office
HR computer. HR continues to use the deployed Vercel website. Visual Studio
Code, a local React server, and a local MongoDB installation are not required.

## 1. Before copying the project

Confirm that the HR computer:

- runs 64-bit Windows 10 or Windows 11;
- has internet access to MongoDB Atlas;
- is connected to the office LAN containing the Hikvision terminal;
- can reach the terminal's configured HTTP or HTTPS port;
- will normally remain powered on while attendance should synchronize.

Use `C:\PUNCHER` as the installation directory. The included automatic-startup
scripts expect Node.js to be installed system-wide at
`C:\Program Files\nodejs\node.exe`.

## 2. Install Node.js

Install the 64-bit Node.js LTS MSI for all users. Visual Studio Code is not
needed. Open CMD and verify:

```cmd
node --version
npm --version
```

Node.js must report version 20 or newer.

## 3. Copy the project

Copy the complete project to:

```text
C:\PUNCHER
```

Do not copy an existing `node_modules` directory from another computer. Do not
place the installation inside Downloads, OneDrive, or a temporary directory.

## 4. Install only server dependencies

Open CMD:

```cmd
cd /d C:\PUNCHER
npm install --omit=dev --workspace=server
```

The frontend does not run on this computer.

## 5. Create the connector environment

Create `C:\PUNCHER\server\.env` from `server\.env.example`. Set:

```env
PORT=5000
RUNTIME_ROLE=connector
SYNC_MODE=direct
SYNC_ON_STARTUP=true

MONGODB_URI=PASTE_THE_WORKING_ATLAS_CONNECTION_STRING
APP_TIMEZONE=Africa/Addis_Ababa

CONNECTOR_ID=office-main
PUNCH_SYNC_INTERVAL_SECONDS=60
EMPLOYEE_SYNC_INTERVAL_HOURS=6
MAX_BACKFILL_DAYS=31

DEVICE_IP=192.168.100.43
DEVICE_PROTOCOL=http
DEVICE_PORT=80
DEVICE_TIMEOUT_MS=10000
DEVICE_MAX_PAGES=100
API_USER=PASTE_TERMINAL_USERNAME
API_PASS=PASTE_TERMINAL_PASSWORD

WORK_START=08:30
ARRIVAL_GRACE_END=08:45
WORK_END=17:30
DEPARTURE_MODERATE_START=17:15
REGULAR_LUNCH_START=12:30
REGULAR_LUNCH_END=13:30
FRIDAY_LUNCH_START=11:30
FRIDAY_LUNCH_END=13:30
EARLIEST_CHECKOUT=15:30
MIN_LUNCH_SEPARATION_MINUTES=20
DUPLICATE_WINDOW_MINUTES=5
```

Connector mode deliberately does not create or update the HR login account.
`HR_EMAIL`, `HR_PASSWORD`, and `JWT_SECRET` can remain absent on this computer.

## 6. Diagnose the network

Run:

```cmd
cd /d C:\PUNCHER
powershell -ExecutionPolicy Bypass -File scripts\diagnose-puncher.ps1
```

The required result is:

```text
NETWORK PATH IS WORKING.
TCP 80: OPEN
```

If the PC and terminal are on the same physical LAN but different `/24`
addresses, run CMD as Administrator:

```cmd
cd /d C:\PUNCHER
npm run network:connect
```

Do not proceed until the configured terminal port is reachable.

## 7. Test the connector manually

Open CMD:

```cmd
cd /d C:\PUNCHER
set RUNTIME_ROLE=connector
set SYNC_MODE=direct
npm run connector
```

Expected startup output includes:

```text
PUNCHER OFFICE CONNECTOR
Atlas database      : connected
Punch interval      : 60 seconds
Employee interval   : 6 hours
Automatic synchronization scheduler is active
```

On startup, the connector synchronizes employees and backfills attendance from
its last successful date, up to `MAX_BACKFILL_DAYS`. It then synchronizes
today's punches every minute.

Leave the test running for at least three minutes. Confirm repeated lines such
as:

```text
[connector:punches] SUCCESS: 0 new, 8 existing
```

Stop the manual test with `Ctrl+C`. The connector writes no duplicate records
because every punch uses a deterministic unique `logId`.

## 8. Install automatic startup

Close the manual connector first. Then run:

```cmd
cd /d C:\PUNCHER
scripts\install-office-connector.cmd
```

Approve the Windows Administrator prompt. The installer:

1. validates Node.js, `server.js`, `.env`, and the runner;
2. checks required connector settings without printing passwords;
3. creates `C:\PUNCHER\logs`;
4. registers `PUNCHER Office Connector` in Task Scheduler;
5. configures startup execution as Windows `SYSTEM`;
6. configures restart after unexpected failures;
7. starts the connector immediately.

## 9. Verify automatic operation

Run:

```cmd
cd /d C:\PUNCHER
scripts\connector-status.cmd
```

Or query Windows directly:

```cmd
schtasks /Query /TN "PUNCHER Office Connector" /V /FO LIST
```

Read recent logs:

```cmd
type C:\PUNCHER\logs\connector.log
```

Follow the live log:

```cmd
powershell -Command "Get-Content C:\PUNCHER\logs\connector.log -Wait -Tail 40"
```

Press `Ctrl+C` to stop watching the log. This does not stop synchronization.

## 10. Confirm the Vercel website

Open:

```text
https://puncher-web-three.vercel.app
```

Sign in and verify Today's Attendance, Employees, History, and Last Punch.
The Vercel API reads the same Atlas database populated by the office connector.

## 11. Restart test

Restart Windows. After startup, wait two minutes and run:

```cmd
C:\PUNCHER\scripts\connector-status.cmd
```

Confirm that the scheduled task is running and the log contains a successful
post-restart synchronization.

## 12. Start, stop, and remove the connector

Start:

```cmd
schtasks /Run /TN "PUNCHER Office Connector"
```

Stop:

```cmd
schtasks /End /TN "PUNCHER Office Connector"
```

Remove automatic startup from an Administrator CMD:

```cmd
C:\PUNCHER\scripts\uninstall-office-connector.cmd
```

Uninstalling the task does not delete project files, logs, Vercel deployments,
or MongoDB Atlas attendance records.

## 13. Troubleshooting

### No connector log

Confirm Node.js exists at:

```text
C:\Program Files\nodejs\node.exe
```

Confirm:

```text
C:\PUNCHER\server\.env
```

### Atlas connection failure

Test the exact Atlas URI locally and confirm Atlas Network Access permits the
office internet connection.

### Terminal timeout

Run:

```cmd
powershell -Command "Test-NetConnection 192.168.100.43 -Port 80"
```

Then run `scripts\diagnose-puncher.ps1`.

### Data does not appear immediately

Wait for the next 60-second interval, refresh the Vercel page, and check
`connector.log`. The connector status is also available to authenticated API
clients at `/api/connector/status`.

### Update the connector later

Stop the task, replace the project files, install dependencies, manually test,
and start the task again:

```cmd
schtasks /End /TN "PUNCHER Office Connector"
cd /d C:\PUNCHER
npm install --omit=dev --workspace=server
set RUNTIME_ROLE=connector
set SYNC_MODE=direct
npm run connector
```

After the manual test, press `Ctrl+C` and run:

```cmd
schtasks /Run /TN "PUNCHER Office Connector"
```
