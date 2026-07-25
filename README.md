# PUNCHER

A local MERN MVP that synchronizes attendance events from a Hikvision terminal
using HTTP Digest Authentication, deduplicates them in MongoDB, and displays the
50 latest punches in a responsive React dashboard.

## Prerequisites

- Node.js 20 or newer
- MongoDB Community Server running locally
- The computer and Hikvision terminal on the same reachable network
- A terminal account with permission to call the ISAPI access-control endpoint

## Run locally

1. Install dependencies from the project root:

   ```powershell
   npm install
   ```

2. Create the server configuration:

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

3. Edit `server/.env` with the terminal IP, username, and password.
   If the terminal uses HTTPS or a custom web port, also set
   `DEVICE_PROTOCOL`, `DEVICE_PORT`, and optionally `DEVICE_TIMEOUT_MS`.

4. Start MongoDB. On a standard Windows service installation:

   ```powershell
   Start-Service MongoDB
   ```

5. Start both applications:

   ```powershell
   npm run dev
   ```

6. Open `http://localhost:5173`. The API runs on `http://localhost:5000`.

## How the implementation works

The dashboard calls `GET /api/sync-punches` on mount and whenever **Sync now** is
pressed. The server sends the required event-search body to the Hikvision ISAPI
endpoint through `digest-fetch`. Each valid event receives a deterministic
`logId` made from `employeeNoString` and `time`.

MongoDB's unique index on `logId`, together with an unordered bulk upsert, makes
syncing idempotent: calling the route repeatedly does not create duplicates.
After each synchronization, the server returns the latest 50 records sorted by
`punchTime` descending. If the terminal cannot be reached, the frontend tries
the read-only `/api/punches` route and displays cached database records.

## Proper deployment guidelines

### Vercel deployment confirmation

The Express application exports its `app` for the Vercel Functions runtime and
continues to use `app.listen()` during local development. Configure
`SYNC_MODE=agent` on Vercel so the cloud function never attempts to connect
directly to the terminal's private office IP address.

After deploying the backend, open:

```text
https://YOUR-API-PROJECT.vercel.app/api/deployment-status
```

A successful deployment returns HTTP 200 with `status: "ready"`, confirms the
Atlas connection, and identifies whether synchronization is running in
`agent` or `direct` mode. HTTP 503 means the function is deployed but Atlas
could not be reached.

- Keep device credentials only in `.env`; never commit that file.
- Put this service on the same protected LAN or VLAN as the terminal. Do not
  expose a Hikvision ISAPI endpoint directly to the public internet.
- Create a dedicated, least-privileged terminal user for this integration.
- Set the terminal and host to the same NTP source so punch times are reliable.
- Replace permissive CORS with an explicit frontend origin before deployment.
- Run synchronization on a background schedule for production; keep the route
  for manual refresh, but do not depend on browser visits to ingest events.
- Implement pagination by advancing `searchResultPosition` when more than 50
  unseen events may accumulate between syncs.
- Add authentication and role-based access before storing real employee data.
- Use HTTPS at the application boundary, encrypted backups, retention rules,
  and access logs because attendance records are personal data.
- Add automated tests around device response mapping, invalid dates,
  deduplication, and terminal/network failure behavior.

## API

- `GET /api/health` — server and MongoDB status
- `GET /api/punches` — latest 50 locally stored punches
- `GET /api/sync-punches` — synchronize the latest terminal events, then return
  the latest 50 stored punches

## HR portal authentication

Set a unique HR email, strong password, and long random JWT secret in
`server/.env` before use:

```env
HR_EMAIL=hr@company.local
HR_PASSWORD=replace-with-a-strong-password
JWT_SECRET=replace-with-at-least-32-random-characters
```

The HR password is stored in MongoDB as a bcrypt hash. Login sessions expire
after eight hours. Attendance, employee, history, analytics, synchronization,
and Excel-export APIs require a valid HR bearer token.

After the first login, press **Sync terminal**. This imports the complete
Hikvision employee directory and today's punches. The Employees view then
classifies each person as punched today, did not punch today, inactive for
7+ days, inactive for 30+ days, or never punched, and shows the last punch.

## Troubleshooting `fetch failed`

`fetch failed` means Node did not receive a usable HTTP response. Start with:

```powershell
Test-Connection 192.168.100.43 -Count 2
Test-NetConnection 192.168.100.43 -Port 80
```

Then open `http://localhost:5000/api/health`. Its `device` section reports
whether the configured TCP port is reachable and includes the network error.

1. Confirm the terminal's current IPv4 address on its network settings screen.
2. Confirm the PC is on the same subnet or has a route to the device VLAN.
3. Confirm the terminal web service is enabled and note its HTTP/HTTPS port.
4. Open the terminal address in a browser from the same PC.
5. For HTTPS, set `DEVICE_PROTOCOL=https` and `DEVICE_PORT=443`.
6. If TCP succeeds but the API reports HTTP 401, correct the credentials. For
   HTTP 403, grant the account ISAPI/access-control rights.
7. Confirm ISAPI is enabled if the firmware exposes an integration toggle.
8. Restart the API after every `.env` change.

Port 8000 is commonly Hikvision's SDK/server protocol port, not its HTTP API
port. This application must use the configured HTTP or HTTPS port.

## Same-Wi-Fi secondary-address alternative

If changing the terminal's static `192.168.100.43` address is not practical,
Windows can keep its normal `192.168.1.x` Wi-Fi address and add a secondary
`192.168.100.10/24` address. This only works when the PC and terminal are on the
same physical LAN and the access point does not enable client isolation.

Run the following command from the project:

```powershell
npm run network:connect
```

The script requests Administrator permission through the standard Windows UAC
dialog. Approve that prompt to continue. If elevation is restricted by an
organization policy, open PowerShell with **Run as administrator** first.

The helper checks for an address conflict, adds the secondary address without a
gateway, and tests TCP port 80. Because it adds no second gateway, the existing
internet route remains unchanged.

To remove the alternative configuration:

```powershell
Remove-NetIPAddress -InterfaceAlias "Wi-Fi" -IPAddress "192.168.100.10" -Confirm:$false
```

## Detailed console diagnosis

Run the read-only network doctor at any time:

```powershell
npm run diagnose
```

It prints the application target, active IPv4 interfaces, subnet comparison,
selected route, ping and ARP state, common Hikvision TCP ports, an ISAPI HTTP
probe, and a final root-cause assessment. It never prints the device password
and does not require Administrator permission.
