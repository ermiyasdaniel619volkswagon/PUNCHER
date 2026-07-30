import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Clock3,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  History,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  SlidersHorizontal,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const apiUrl = (path) => `${API_BASE_URL}${path}`;

const text = {
  en: {
    title: "HR Attendance Portal",
    subtitle: "Secure workforce attendance and payroll reporting",
    signIn: "Sign in to continue",
    email: "HR email",
    password: "Password",
    login: "Sign in",
    overview: "Overview",
    attendance: "Today's Attendance",
    employees: "Employees",
    history: "History",
    analytics: "Analytics",
    exporting: "Exporting",
    logout: "Sign out",
    sync: "Sync terminal",
    export: "Export Excel",
    search: "Search employee...",
    totalEmployees: "All known employees",
    activeDirectory: "Active terminal users",
    punchedToday: "Punched today",
    notToday: "Not punched today",
    inactiveWeek: "Inactive 7+ days",
    inactiveMonth: "Inactive 30+ days",
    neverPunched: "Never punched",
    checkIn: "Check in",
    checkOut: "Check out",
    arrival: "Arrival status",
    departure: "Departure status",
    hours: "Worked hours",
    lastPunch: "Last punch",
    activity: "Activity category",
    employee: "Employee",
    id: "Employee ID",
    loading: "Loading secure HR data...",
    noData: "No records match this view.",
    rawPunches: "Raw punches today",
    early: "Early comers",
    moderate: "Moderate comers",
    late: "Late comers",
    exportHint: "Download today's organized attendance register for payroll processing.",
    punchStatus: "Today's punch status",
    punched: "Punched in",
    notPunched: "Not punched in",
    showing: "Showing",
    of: "of",
    page: "Page",
    previous: "Previous",
    next: "Next",
    perPage: "Per page",
    syncEmployees: "Sync employee directory",
    allArrivals: "All arrival categories",
    allDepartures: "All departure categories",
    earlyLeaver: "Early leaver",
    moderateLeaver: "Moderate leaver",
    lateLeaver: "Late leaver",
    lunchOut: "Lunch out",
    lunchReturn: "Lunch return",
    lunchDuration: "Lunch minutes",
    lunchStatus: "Lunch status",
    allLunchStatuses: "All lunch statuses",
    lunchComplete: "Lunch complete",
    lunchIssues: "Lunch issues",
    punchAudit: "Punch audit",
    ignoredPunches: "ignored",
    sortBy: "Sort attendance",
    categoryPriority: "Arrival category: early to late",
    categoryReverse: "Arrival category: late to early",
    departurePriority: "Departure category",
    nameAscending: "Employee name: A to Z",
    nameDescending: "Employee name: Z to A",
    idAscending: "Employee ID: lowest first",
    checkInNewest: "Check-in: latest first",
    checkInOldest: "Check-in: earliest first",
    checkOutNewest: "Check-out: latest first",
    hoursHighest: "Worked hours: highest first",
    hoursLowest: "Worked hours: lowest first",
  },
  am: {
    title: "የሰው ኃይል የሰዓት መቆጣጠሪያ",
    subtitle: "ደህንነቱ የተጠበቀ የመገኘትና የደመወዝ ሪፖርት",
    signIn: "ለመቀጠል ይግቡ",
    email: "የHR ኢሜይል",
    password: "የይለፍ ቃል",
    login: "ግባ",
    overview: "አጠቃላይ እይታ",
    attendance: "የዛሬ መገኘት",
    employees: "ሰራተኞች",
    history: "ታሪክ",
    analytics: "ትንታኔ",
    exporting: "ወደ Excel መላክ",
    logout: "ውጣ",
    sync: "መሣሪያውን አመሳስል",
    export: "ወደ Excel ላክ",
    search: "ሰራተኛ ፈልግ...",
    totalEmployees: "ሁሉም የታወቁ ሰራተኞች",
    activeDirectory: "በመሣሪያው ላይ ያሉ",
    punchedToday: "ዛሬ የመዘገቡ",
    notToday: "ዛሬ ያልመዘገቡ",
    inactiveWeek: "ከ7 ቀን በላይ ያልመዘገቡ",
    inactiveMonth: "ከ30 ቀን በላይ ያልመዘገቡ",
    neverPunched: "ፈጽሞ ያልመዘገቡ",
    checkIn: "የገባበት ሰዓት",
    checkOut: "የወጣበት ሰዓት",
    arrival: "የመግቢያ ሁኔታ",
    departure: "የመውጫ ሁኔታ",
    hours: "የሰራው ሰዓት",
    lastPunch: "የመጨረሻ ምዝገባ",
    activity: "የእንቅስቃሴ ምድብ",
    employee: "ሰራተኛ",
    id: "መለያ ቁጥር",
    loading: "የHR መረጃ በመጫን ላይ...",
    noData: "ከዚህ እይታ ጋር የሚዛመድ መረጃ የለም።",
    rawPunches: "የዛሬ ጥሬ ምዝገባ",
    early: "ቀድመው የገቡ",
    moderate: "በመካከለኛ ሰዓት የገቡ",
    late: "ዘግይተው የገቡ",
    exportHint: "የዛሬን የተደራጀ የመገኘት መዝገብ ለደመወዝ ስራ ያውርዱ።",
    punchStatus: "የዛሬ የምዝገባ ሁኔታ",
    punched: "ዛሬ መዝግቧል",
    notPunched: "ዛሬ አልመዘገበም",
    showing: "እየታየ ያለው",
    of: "ከ",
    page: "ገጽ",
    previous: "ቀዳሚ",
    next: "ቀጣይ",
    perPage: "በገጽ",
    syncEmployees: "የሰራተኞችን ዝርዝር አመሳስል",
    allArrivals: "ሁሉም የመግቢያ ምድቦች",
    allDepartures: "ሁሉም የመውጫ ምድቦች",
    earlyLeaver: "ቀድሞ የወጣ",
    moderateLeaver: "በመካከለኛ ሰዓት የወጣ",
    lateLeaver: "ዘግይቶ የወጣ",
    lunchOut: "የምሳ መውጫ",
    lunchReturn: "ከምሳ መመለሻ",
    lunchDuration: "የምሳ ደቂቃ",
    lunchStatus: "የምሳ ሁኔታ",
    allLunchStatuses: "ሁሉም የምሳ ሁኔታዎች",
    lunchComplete: "የምሳ እረፍት የተሟላ",
    lunchIssues: "የምሳ ምዝገባ ችግሮች",
    punchAudit: "የምዝገባ ምርመራ",
    ignoredPunches: "የተተወ",
    sortBy: "የመገኘት መረጃን ደርድር",
    categoryPriority: "የመግቢያ ምድብ፡ ቀድሞ ወደ ዘግይቶ",
    categoryReverse: "የመግቢያ ምድብ፡ ዘግይቶ ወደ ቀድሞ",
    departurePriority: "በመውጫ ምድብ",
    nameAscending: "የሠራተኛ ስም፡ A እስከ Z",
    nameDescending: "የሠራተኛ ስም፡ Z እስከ A",
    idAscending: "የሠራተኛ መለያ፡ ከዝቅተኛ",
    checkInNewest: "የመግቢያ ሰዓት፡ የቅርብ ጊዜ በፊት",
    checkInOldest: "የመግቢያ ሰዓት፡ ቀዳሚ በፊት",
    checkOutNewest: "የመውጫ ሰዓት፡ የቅርብ ጊዜ በፊት",
    hoursHighest: "የሥራ ሰዓት፡ ከፍተኛ በፊት",
    hoursLowest: "የሥራ ሰዓት፡ ዝቅተኛ በፊት",
  },
};

const statusAm = {
  "Early comer": "ቀድሞ የገባ",
  "Moderate comer": "በመካከለኛ ሰዓት የገባ",
  "Late comer": "ዘግይቶ የገባ",
  "Not punched out": "መውጫ አልመዘገበም",
  "Early leaver": "ቀድሞ የወጣ",
  "Moderate leaver": "በመካከለኛ ሰዓት የወጣ",
  "Late leaver": "ዘግይቶ የወጣ",
  "Lunch not recorded": "የምሳ ሰዓት አልተመዘገበም",
  "Lunch return missing": "ከምሳ መመለሻ አልተመዘገበም",
  "Lunch exit missing": "የምሳ መውጫ አልተመዘገበም",
  "Lunch shorter than schedule": "የምሳ እረፍት ከተወሰነው ያነሰ",
  "Lunch longer than schedule": "የምሳ እረፍት ከተወሰነው የበለጠ",
  "Lunch complete": "የምሳ እረፍት ተሟልቷል",
  "Punched today": "ዛሬ መዝግቧል",
  "Did not punch today": "ዛሬ አልመዘገበም",
  "Inactive 7+ days": "ከ7 ቀን በላይ ያልመዘገበ",
  "Inactive 30+ days": "ከ30 ቀን በላይ ያልመዘገበ",
  "Never punched": "ፈጽሞ ያልመዘገበ",
};

function Login({ onLogin, language, toggleLanguage }) {
  const t = text[language];
  const [email, setEmail] = useState("hr@company.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      onLogin(data);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#edf4ef] p-3 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_100px_rgba(4,63,43,.18)] sm:min-h-[calc(100vh-48px)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_25%_10%,_#20a875,_#087352_45%,_#034333_100%)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,_white_1px,_transparent_1px)] [background-size:28px_28px]" />
          <div className="relative flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl border border-white/30 bg-white/15 backdrop-blur"><Fingerprint /></div>
            <div><p className="text-xl font-bold tracking-[.18em]">PUNCHER</p><p className="text-sm text-emerald-100">HR ATTENDANCE</p></div>
          </div>
          <div className="relative max-w-lg">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[.24em] text-emerald-200">Secure workforce operations</p>
            <h1 className="text-5xl font-semibold leading-tight">{t.title}</h1>
            <p className="mt-5 max-w-md leading-7 text-emerald-100">{t.subtitle}</p>
          </div>
          <p className="relative text-xs text-emerald-200">Authorized HR personnel only</p>
        </section>
        <section className="flex items-center justify-center p-6 sm:p-12">
          <form onSubmit={submit} className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-between lg:justify-end">
              <div className="flex items-center gap-3 lg:hidden"><div className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white"><Fingerprint size={20} /></div><b>PUNCHER</b></div>
              <button type="button" onClick={toggleLanguage} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"><Languages size={17} />{language === "en" ? "አማ" : "EN"}</button>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-600">HR ACCESS</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">{t.signIn}</h2>
            <p className="mb-8 mt-2 text-sm leading-6 text-slate-500">{t.subtitle}</p>
            <label className="mb-5 block"><span className="mb-2 block text-sm font-medium text-slate-700">{t.email}</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></label>
            <label className="mb-4 block"><span className="mb-2 block text-sm font-medium text-slate-700">{t.password}</span><span className="flex items-center rounded-xl border border-slate-200 bg-slate-50 pr-3 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10"><input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" required className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-slate-900 outline-none" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
            {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">{loading && <RefreshCw size={17} className="animate-spin" />}{loading ? "Signing in..." : t.login}</button>
          </form>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return <div className="group dashboard-card relative overflow-hidden p-5"><div className="absolute -right-8 -top-8 size-24 rounded-full bg-teal-400/10 blur-2xl transition group-hover:bg-teal-400/20" /><div className="relative mb-5 flex items-start justify-between"><span className="max-w-[75%] text-sm leading-5 text-slate-400">{label}</span><span className="grid size-10 place-items-center rounded-xl border border-teal-400/20 bg-teal-400/10 text-teal-300 shadow-[0_0_24px_rgba(45,212,191,.08)]"><Icon size={19} /></span></div><div className="relative flex items-end justify-between"><p className="text-3xl font-semibold tracking-tight text-white">{value ?? 0}</p><span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-teal-300"><TrendingUp size={12} /> Live</span></div></div>;
}

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem("puncher-language") || "en");
  const [token, setToken] = useState(() => localStorage.getItem("puncher-token"));
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("puncher-user") || "null"));
  const [view, setView] = useState("overview");
  const [sidebar, setSidebar] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [employees, setEmployees] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState({});
  const [employeePagination, setEmployeePagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeLimit, setEmployeeLimit] = useState(20);
  const [historyRows, setHistoryRows] = useState([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceLimit, setAttendanceLimit] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historySearch, setHistorySearch] = useState("");
  const [historyEmployees, setHistoryEmployees] = useState([]);
  const [historyPeriod, setHistoryPeriod] = useState("30");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyTimeFrom, setHistoryTimeFrom] = useState("");
  const [historyTimeTo, setHistoryTimeTo] = useState("");
  const [historyVerification, setHistoryVerification] = useState("all");
  const [historySort, setHistorySort] = useState("newest");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [arrivalFilter, setArrivalFilter] = useState("all");
  const [departureFilter, setDepartureFilter] = useState("all");
  const [lunchFilter, setLunchFilter] = useState("all");
  const [attendanceSort, setAttendanceSort] = useState("category-asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const t = text[language];
  const locale = language === "am" ? "am-ET-u-ca-ethiopic" : "en-GB";

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(apiUrl(path), {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      localStorage.removeItem("puncher-token");
      setToken(null);
      throw new Error("Session expired");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.detail);
    return data;
  }, [token]);

  const loadAll = useCallback(async (sync = false) => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      if (sync) {
        await api("/api/sync-punches");
        await api("/api/employees/sync", { method: "POST" });
      }
      const [a, initialEmployees, h] = await Promise.all([
        api("/api/attendance/today"),
        api("/api/employees"),
        api("/api/history?days=365"),
      ]);
      let e = initialEmployees;
      if (!e.summary?.total) {
        await api("/api/employees/sync", { method: "POST" });
        e = await api("/api/employees?page=1&limit=20");
      }
      setAttendance(a.attendance || []); setAttendanceSummary(a.summary || {});
      setEmployees(e.employees || []); setEmployeeSummary(e.summary || {});
      setEmployeePagination(e.pagination || {});
      setHistoryRows(h.punches || []);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [api, token]);

  useEffect(() => { loadAll(false); }, [loadAll]);

  const loadEmployees = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({
        page: String(employeePage),
        limit: String(employeeLimit),
        category,
        search: query,
      });
      const data = await api(`/api/employees?${params}`);
      setEmployees(data.employees || []);
      setEmployeeSummary(data.summary || {});
      setEmployeePagination(data.pagination || {});
    } catch (employeeError) {
      setError(employeeError.message);
    }
  }, [api, token, employeePage, employeeLimit, category, query]);

  useEffect(() => {
    const timer = setTimeout(loadEmployees, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadEmployees, query]);

  useEffect(() => {
    setEmployeePage(1);
  }, [query, category, employeeLimit]);

  const filteredAttendance = useMemo(
    () =>
      attendance.filter(
        (row) =>
          (arrivalFilter === "all" ||
            row.arrivalStatus === arrivalFilter) &&
          (departureFilter === "all" ||
            row.departureStatus === departureFilter) &&
          (lunchFilter === "all" || row.lunchStatus === lunchFilter)
      ),
    [attendance, arrivalFilter, departureFilter, lunchFilter]
  );
  const sortedAttendance = useMemo(
    () => sortAttendanceRows(filteredAttendance, attendanceSort),
    [filteredAttendance, attendanceSort]
  );
  useEffect(() => setAttendancePage(1), [arrivalFilter, departureFilter, lunchFilter, attendanceSort, attendanceLimit]);
  const historyEmployeeOptions = useMemo(() => {
    const byId = new Map();
    historyRows.forEach((row) => {
      if (row.employeeId && !byId.has(String(row.employeeId))) {
        byId.set(String(row.employeeId), {
          employeeId: String(row.employeeId),
          employeeName: row.employeeName || "Unknown employee",
        });
      }
    });
    return [...byId.values()].sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName, undefined, { sensitivity: "base" })
    );
  }, [historyRows]);
  const filteredHistory = useMemo(
    () =>
      filterAndSortHistory(historyRows, {
        search: historySearch,
        employees: historyEmployees,
        period: historyPeriod,
        from: historyFrom,
        to: historyTo,
        timeFrom: historyTimeFrom,
        timeTo: historyTimeTo,
        verification: historyVerification,
        sort: historySort,
      }),
    [historyRows, historySearch, historyEmployees, historyPeriod, historyFrom, historyTo, historyTimeFrom, historyTimeTo, historyVerification, historySort]
  );
  useEffect(() => setHistoryPage(1), [historyLimit, historySearch, historyEmployees, historyPeriod, historyFrom, historyTo, historyTimeFrom, historyTimeTo, historyVerification, historySort]);
  const attendancePagination = useMemo(() => paginate(sortedAttendance, attendancePage, attendanceLimit), [sortedAttendance, attendancePage, attendanceLimit]);
  const historyPagination = useMemo(() => paginate(filteredHistory, historyPage, historyLimit), [filteredHistory, historyPage, historyLimit]);

  const time = (value) => value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "—";
  const shortTime = (value) => value ? new Date(value).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: true }) : "—";
  const status = (value) => language === "am" ? statusAm[value] || value : value;
  const login = ({ token: nextToken, user: nextUser }) => {
    localStorage.setItem("puncher-token", nextToken); localStorage.setItem("puncher-user", JSON.stringify(nextUser));
    setToken(nextToken); setUser(nextUser);
  };
  const logout = () => { localStorage.removeItem("puncher-token"); localStorage.removeItem("puncher-user"); setToken(null); setUser(null); };
  const toggleLanguage = () => setLanguage((current) => { const next = current === "en" ? "am" : "en"; localStorage.setItem("puncher-language", next); return next; });
  const exportExcel = async () => {
    const response = await fetch(apiUrl(`/api/attendance/today/export?lang=${language}`), { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return setError("Export failed");
    const blob = await response.blob(); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `attendance-today.xlsx`; link.click(); URL.revokeObjectURL(url);
  };

  if (!token) return <Login onLogin={login} language={language} toggleLanguage={toggleLanguage} />;

  const nav = [
    ["overview", t.overview, LayoutDashboard],
    ["attendance", t.attendance, CalendarDays],
    ["employees", t.employees, Users],
    ["history", t.history, History],
    ["analytics", t.analytics, BarChart3],
    ["export", t.exporting, Download],
  ];

  return (
    <main className="app-shell min-h-screen text-slate-100">
      {sidebar && <button aria-label="Close menu" onClick={() => setSidebar(false)} className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden" />}
      <aside className={`fixed inset-y-3 left-3 z-40 overflow-hidden rounded-[1.7rem] border border-teal-300/15 bg-[#071a1d]/95 p-3 text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 lg:translate-x-0 ${collapsed ? "lg:w-[76px]" : "lg:w-64"} w-64 ${sidebar ? "translate-x-0" : "-translate-x-[110%]"}`}>
        <div className={`mb-7 flex h-12 items-center ${collapsed ? "lg:justify-center" : "justify-between"}`}><div className="flex items-center gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 shadow-inner backdrop-blur"><Fingerprint size={22} /></div><div className={collapsed ? "lg:hidden" : ""}><b className="tracking-[.16em]">PUNCHER</b><p className="text-[10px] text-emerald-100">HR PORTAL</p></div></div><button onClick={() => setSidebar(false)} className="rounded-xl p-2 hover:bg-white/10 lg:hidden"><X /></button></div>
        <nav className="space-y-2">{nav.map(([key, label, Icon]) => <button title={label} key={key} onClick={() => { setView(key); setSidebar(false); }} className={`flex h-12 w-full items-center rounded-xl text-sm font-medium transition-all ${collapsed ? "lg:justify-center lg:px-0" : "gap-3 px-3.5"} ${view === key ? "border border-teal-300/20 bg-teal-300/10 text-teal-200 shadow-[inset_3px_0_0_#2dd4bf,0_0_24px_rgba(45,212,191,.08)]" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon size={19} className="shrink-0" /><span className={collapsed ? "lg:hidden" : ""}>{label}</span></button>)}</nav>
        <button onClick={() => setCollapsed((value) => !value)} className="absolute -right-0 top-20 hidden size-8 items-center justify-center rounded-l-xl bg-white text-emerald-700 shadow-lg lg:flex">{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>
        <div className={`absolute bottom-4 left-3 right-3 rounded-2xl bg-black/15 p-3 ${collapsed ? "lg:flex lg:justify-center lg:p-2" : ""}`}><div className={collapsed ? "lg:hidden" : ""}><p className="truncate text-sm font-medium">{user?.name}</p><p className="mb-3 truncate text-xs text-emerald-200">{user?.email}</p></div><button title={t.logout} onClick={logout} className={`flex items-center gap-2 text-sm text-rose-100 hover:text-white ${collapsed ? "lg:justify-center" : ""}`}><LogOut size={17} /><span className={collapsed ? "lg:hidden" : ""}>{t.logout}</span></button></div>
      </aside>
      <div className={`transition-all duration-300 ${collapsed ? "lg:ml-[92px]" : "lg:ml-[272px]"}`}>
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#061215]/85 px-5 py-4 backdrop-blur-xl sm:px-8"><button onClick={() => setSidebar(true)} className="icon-button lg:hidden"><Menu /></button><div className="min-w-0"><h1 className="truncate text-lg font-semibold text-white">{nav.find(([key]) => key === view)?.[1]}</h1><p className="hidden truncate text-xs text-slate-500 sm:block">{t.subtitle}</p></div><div className="flex gap-2"><button className="icon-button hidden sm:grid" title="System is live"><Bell size={18} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-teal-300" /></button><button onClick={toggleLanguage} className="icon-button"><Languages size={18} /></button><button onClick={() => loadAll(true)} disabled={loading} className="primary-button"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /><span className="hidden sm:inline">{t.sync}</span></button></div></header>
        <section className="mx-auto max-w-[1500px] p-5 sm:p-8">
          {error && <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
          {loading && !attendance.length ? <p className="py-20 text-center text-slate-400">{t.loading}</p> : (
            <>
              {view === "overview" && <Overview t={t} attendance={attendanceSummary} employees={employeeSummary} setView={setView} />}
              {view === "attendance" && <>
                <AttendanceFilters
                  arrivalFilter={arrivalFilter}
                  setArrivalFilter={setArrivalFilter}
                  departureFilter={departureFilter}
                  setDepartureFilter={setDepartureFilter}
                  lunchFilter={lunchFilter}
                  setLunchFilter={setLunchFilter}
                  attendanceSort={attendanceSort}
                  setAttendanceSort={setAttendanceSort}
                  t={t}
                  status={status}
                />
                <AttendanceTable rows={attendancePagination.items} t={t} time={shortTime} status={status} />
                <PaginationPro data={attendancePagination} page={attendancePage} setPage={setAttendancePage} limit={attendanceLimit} setLimit={setAttendanceLimit} t={t} />
              </>}
              {view === "employees" && <>
                <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label={t.totalEmployees} value={employeeSummary.total} icon={Users} />
                  <StatCard label={t.punchedToday} value={employeeSummary.punchedToday} icon={Fingerprint} />
                  <StatCard label={t.notToday} value={employeeSummary.notToday} icon={CalendarDays} />
                  <StatCard label={t.inactiveWeek} value={employeeSummary.inactiveWeek} icon={History} />
                </div>
                <Filters query={query} setQuery={setQuery} category={category} setCategory={setCategory} t={t} />
                <EmployeeTable rows={employees} t={t} time={time} status={status} />
                <PaginationPro
                  data={employeePagination}
                  page={employeePage}
                  setPage={setEmployeePage}
                  limit={employeeLimit}
                  setLimit={setEmployeeLimit}
                  t={t}
                />
              </>}
              {view === "history" && <>
                <HistoryFilters
                  rows={historyRows}
                  filteredCount={filteredHistory.length}
                  employeeOptions={historyEmployeeOptions}
                  search={historySearch}
                  setSearch={setHistorySearch}
                  selectedEmployees={historyEmployees}
                  setSelectedEmployees={setHistoryEmployees}
                  period={historyPeriod}
                  setPeriod={setHistoryPeriod}
                  from={historyFrom}
                  setFrom={setHistoryFrom}
                  to={historyTo}
                  setTo={setHistoryTo}
                  timeFrom={historyTimeFrom}
                  setTimeFrom={setHistoryTimeFrom}
                  timeTo={historyTimeTo}
                  setTimeTo={setHistoryTimeTo}
                  verification={historyVerification}
                  setVerification={setHistoryVerification}
                  sort={historySort}
                  setSort={setHistorySort}
                />
                <HistoryTable rows={historyPagination.items} t={t} time={time} />
                <PaginationPro data={historyPagination} page={historyPage} setPage={setHistoryPage} limit={historyLimit} setLimit={setHistoryLimit} t={t} />
              </>}
              {view === "analytics" && <AnalyticsPro t={t} attendance={attendanceSummary} employees={employeeSummary} />}
              {view === "export" && <Panel title={t.exporting}><Download size={40} className="mb-4 text-emerald-600" /><p className="mb-6 max-w-xl text-slate-500">{t.exportHint}</p><button onClick={exportExcel} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white"><Download size={18} />{t.export}</button></Panel>}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function paginate(items, page, limit) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);
  return { items: items.slice((safePage - 1) * limit, safePage * limit), page: safePage, limit, totalItems, totalPages };
}
function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function filterAndSortHistory(rows, filters) {
  const now = new Date();
  let start = null;
  let end = null;
  if (filters.period === "custom") {
    if (filters.from) start = new Date(`${filters.from}T00:00:00`);
    if (filters.to) end = new Date(`${filters.to}T23:59:59.999`);
  } else if (filters.period !== "all") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - Math.max(0, Number(filters.period) - 1));
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }
  const needle = filters.search.trim().toLocaleLowerCase();
  const selected = new Set(filters.employees);
  const filtered = rows.filter((row) => {
    const punch = new Date(row.punchTime);
    if (Number.isNaN(punch.getTime())) return false;
    if (needle && !`${row.employeeName || ""} ${row.employeeId || ""}`.toLocaleLowerCase().includes(needle)) return false;
    if (selected.size && !selected.has(String(row.employeeId))) return false;
    if (start && punch < start) return false;
    if (end && punch > end) return false;
    const clock = `${String(punch.getHours()).padStart(2, "0")}:${String(punch.getMinutes()).padStart(2, "0")}`;
    if (filters.timeFrom && clock < filters.timeFrom) return false;
    if (filters.timeTo && clock > filters.timeTo) return false;
    if (filters.verification !== "all" && String(row.verifyMode ?? 0) !== filters.verification) return false;
    return true;
  });
  return filtered.sort((a, b) => {
    if (filters.sort === "oldest") return new Date(a.punchTime) - new Date(b.punchTime);
    if (filters.sort === "name-asc") return (a.employeeName || "").localeCompare(b.employeeName || "", undefined, { sensitivity: "base" }) || new Date(b.punchTime) - new Date(a.punchTime);
    if (filters.sort === "name-desc") return (b.employeeName || "").localeCompare(a.employeeName || "", undefined, { sensitivity: "base" }) || new Date(b.punchTime) - new Date(a.punchTime);
    if (filters.sort === "id-asc") return String(a.employeeId || "").localeCompare(String(b.employeeId || ""), undefined, { numeric: true }) || new Date(b.punchTime) - new Date(a.punchTime);
    return new Date(b.punchTime) - new Date(a.punchTime);
  });
}
function sortAttendanceRows(rows, sortBy) {
  const arrivalOrder = { "Early comer": 1, "Moderate comer": 2, "Late comer": 3 };
  const departureOrder = { "Early leaver": 1, "Moderate leaver": 2, "Late leaver": 3, "Not punched out": 4 };
  const numberTime = (value) => value ? new Date(value).getTime() : -1;
  const compareText = (left, right) => String(left || "").localeCompare(String(right || ""), undefined, { numeric: true, sensitivity: "base" });
  const compareDate = (left, right, newestFirst = false) => {
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return newestFirst ? numberTime(right) - numberTime(left) : numberTime(left) - numberTime(right);
  };
  const sorted = [...rows];
  sorted.sort((left, right) => {
    switch (sortBy) {
      case "category-desc": return (arrivalOrder[right.arrivalStatus] || 0) - (arrivalOrder[left.arrivalStatus] || 0);
      case "departure": return (departureOrder[left.departureStatus] || 99) - (departureOrder[right.departureStatus] || 99);
      case "name-asc": return compareText(left.employeeName, right.employeeName);
      case "name-desc": return compareText(right.employeeName, left.employeeName);
      case "id-asc": return compareText(left.employeeId, right.employeeId);
      case "checkin-newest": return compareDate(left.checkIn, right.checkIn, true);
      case "checkin-oldest": return compareDate(left.checkIn, right.checkIn);
      case "checkout-newest": return compareDate(left.checkOut, right.checkOut, true);
      case "hours-highest": return (right.workedHours ?? -1) - (left.workedHours ?? -1);
      case "hours-lowest": return (left.workedHours ?? Number.MAX_VALUE) - (right.workedHours ?? Number.MAX_VALUE);
      default: return (arrivalOrder[left.arrivalStatus] || 99) - (arrivalOrder[right.arrivalStatus] || 99);
    }
  });
  return sorted;
}

function Panel({ title, subtitle, action, children, className = "" }) { return <div className={`dashboard-card p-5 sm:p-6 ${className}`}><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-semibold text-white">{title}</h2>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div>{action}</div>{children}</div>; }
function Metric({ label, value, color = "text-teal-300" }) { return <div className="flex justify-between border-b border-white/5 py-3 text-sm last:border-0"><span className="text-slate-400">{label}</span><b className={color}>{value ?? 0}</b></div>; }
function Overview({ t, attendance, employees, setView }) {
  const total = employees.total || 0;
  const present = employees.punchedToday || 0;
  const rate = total ? Math.round((present / total) * 100) : 0;
  return <div className="space-y-6">
    <section className="hero-panel flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
      <div><span className="eyebrow"><Sparkles size={13} /> Live workforce overview</span><h2 className="mt-4 max-w-2xl text-2xl font-semibold text-white sm:text-3xl">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Monitor arrivals, departures, lunch activity and workforce attendance from one secure workspace.</p></div>
      <button onClick={() => setView("attendance")} className="primary-button self-start">View today <ChevronRight size={17} /></button>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label={t.totalEmployees} value={total} icon={Users} /><StatCard label={t.punchedToday} value={present} icon={Fingerprint} /><StatCard label={t.notToday} value={employees.notToday} icon={CalendarDays} /><StatCard label={t.inactiveWeek} value={employees.inactiveWeek} icon={ShieldCheck} /></div>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <Panel title="Attendance health" subtitle="Today’s live distribution"><DistributionChart values={[attendance.earlyComers || 0, attendance.moderateComers || 0, attendance.lateComers || 0]} labels={[t.early, t.moderate, t.late]} /></Panel>
      <Panel title="Presence rate" subtitle={`${present} of ${total} employees`}><div className="grid place-items-center py-3"><Donut value={rate} /><p className="mt-4 text-center text-sm text-slate-400">{rate >= 80 ? "Strong attendance today" : "Attendance requires attention"}</p></div></Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-2"><Panel title={t.attendance}><Metric label={t.rawPunches} value={attendance.rawPunches} /><Metric label={t.early} value={attendance.earlyComers} /><Metric label={t.moderate} value={attendance.moderateComers} color="text-amber-300" /><Metric label={t.late} value={attendance.lateComers} color="text-rose-300" /></Panel><Panel title={t.employees}><Metric label={t.inactiveMonth} value={employees.inactiveMonth} color="text-rose-300" /><Metric label={t.neverPunched} value={employees.neverPunched} color="text-amber-300" /><Metric label="Checked out" value={attendance.checkedOut} /><Metric label={t.notToday} value={employees.notToday} /></Panel></div>
  </div>;
}
function Filters({ query, setQuery, category, setCategory, t }) { return <div className="filter-bar mb-5"><label className="search-field"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} /></label><label className="select-wrap"><SlidersHorizontal size={16} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">{t.totalEmployees}</option><option value="Punched today">{t.punchedToday}</option><option value="Not punched today">{t.notToday}</option><option value="Inactive 7+ days">{t.inactiveWeek}</option><option value="Inactive 30+ days">{t.inactiveMonth}</option><option value="Never punched">{t.neverPunched}</option></select></label></div>; }
function AttendanceFilters({ arrivalFilter, setArrivalFilter, departureFilter, setDepartureFilter, lunchFilter, setLunchFilter, attendanceSort, setAttendanceSort, t, status }) {
  return <div className="filter-bar mb-5">
    <select value={arrivalFilter} onChange={(e) => setArrivalFilter(e.target.value)}>
      <option value="all">{t.allArrivals}</option>
      {["Early comer", "Moderate comer", "Late comer"].map((value) => <option key={value} value={value}>{status(value)}</option>)}
    </select>
    <select value={departureFilter} onChange={(e) => setDepartureFilter(e.target.value)}>
      <option value="all">{t.allDepartures}</option>
      {["Not punched out", "Early leaver", "Moderate leaver", "Late leaver"].map((value) => <option key={value} value={value}>{status(value)}</option>)}
    </select>
    <select value={lunchFilter} onChange={(e) => setLunchFilter(e.target.value)}>
      <option value="all">{t.allLunchStatuses}</option>
      {["Lunch complete", "Lunch not recorded", "Lunch return missing", "Lunch exit missing", "Lunch shorter than schedule", "Lunch longer than schedule"].map((value) => <option key={value} value={value}>{status(value)}</option>)}
    </select>
    <label className="select-wrap">
      <SlidersHorizontal size={16} />
      <select aria-label={t.sortBy} value={attendanceSort} onChange={(e) => setAttendanceSort(e.target.value)}>
        <option value="category-asc">{t.categoryPriority}</option>
        <option value="category-desc">{t.categoryReverse}</option>
        <option value="departure">{t.departurePriority}</option>
        <option value="name-asc">{t.nameAscending}</option>
        <option value="name-desc">{t.nameDescending}</option>
        <option value="id-asc">{t.idAscending}</option>
        <option value="checkin-newest">{t.checkInNewest}</option>
        <option value="checkin-oldest">{t.checkInOldest}</option>
        <option value="checkout-newest">{t.checkOutNewest}</option>
        <option value="hours-highest">{t.hoursHighest}</option>
        <option value="hours-lowest">{t.hoursLowest}</option>
      </select>
    </label>
  </div>;
}
function Table({ headers, children }) { return <div className="table-shell overflow-x-auto"><table className="w-full min-w-[1200px] text-left"><thead><tr>{headers.map((h) => <th key={h} className="whitespace-nowrap px-5 py-4">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function categoryColor(value) {
  if (["Early comer", "Late leaver"].includes(value))
    return "bg-emerald-100 text-emerald-700 ring-emerald-600/15";
  if (["Moderate comer", "Moderate leaver"].includes(value))
    return "bg-amber-100 text-amber-800 ring-amber-600/15";
  if (["Late comer", "Early leaver"].includes(value))
    return "bg-rose-100 text-rose-700 ring-rose-600/15";
  return "bg-slate-100 text-slate-600 ring-slate-500/15";
}
function lunchColor(value) {
  if (value === "Lunch complete")
    return "bg-emerald-100 text-emerald-700 ring-emerald-600/15";
  if (value === "Lunch not recorded")
    return "bg-slate-100 text-slate-600 ring-slate-500/15";
  return "bg-rose-100 text-rose-700 ring-rose-600/15";
}
function AttendanceTable({ rows, t, time, status }) { return <Table headers={[t.employee, t.id, t.checkIn, t.arrival, t.lunchOut, t.lunchReturn, t.lunchDuration, t.lunchStatus, t.checkOut, t.departure, t.hours, t.punchAudit]}>{rows.length ? rows.map((r) => { const ignored = (r.eventAudit || []).filter((event) => !event.accepted); return <tr key={r.employeeId} className="hover:bg-emerald-50/40"><td className="px-5 py-4 font-medium text-slate-900">{r.employeeName}</td><td className="px-5 py-4 text-slate-500">{r.employeeId}</td><td className="px-5 py-4">{time(r.checkIn)}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${categoryColor(r.arrivalStatus)}`}>{status(r.arrivalStatus)}</span></td><td className="px-5 py-4">{time(r.lunchOut)}</td><td className="px-5 py-4">{time(r.lunchIn)}</td><td className="px-5 py-4">{r.lunchMinutes ?? "—"}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${lunchColor(r.lunchStatus)}`}>{status(r.lunchStatus)}</span></td><td className="px-5 py-4">{time(r.checkOut)}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${categoryColor(r.departureStatus)}`}>{status(r.departureStatus)}</span></td><td className="px-5 py-4">{r.workedHours?.toFixed(2) ?? "—"}</td><td className="px-5 py-4"><span title={ignored.map((event) => `${time(event.time)}: ${event.reason}`).join("\n")} className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ignored.length ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>{ignored.length} {t.ignoredPunches}</span></td></tr>; }) : <tr><td colSpan="12" className="px-5 py-16 text-center text-slate-500">{t.noData}</td></tr>}</Table>; }
function EmployeeTable({ rows, t, time, status }) {
  return <Table headers={[t.employee, t.id, t.punchStatus, t.activity, t.lastPunch]}>
    {rows.length ? rows.map((r) => <tr key={r.employeeId} className="hover:bg-emerald-50/40">
      <td className="px-5 py-4 font-medium text-slate-900">{r.employeeName}</td>
      <td className="px-5 py-4 text-slate-500">{r.employeeId}</td>
      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${r.punchedToday ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{r.punchedToday ? t.punched : t.notPunched}</span></td>
      <td className="px-5 py-4 font-medium text-slate-700">{status(r.activityCategory)}</td>
      <td className="px-5 py-4 text-slate-600">{time(r.lastPunch)}</td>
    </tr>) : <tr><td colSpan="5" className="px-5 py-16 text-center text-slate-500">{t.noData}</td></tr>}
  </Table>;
}
function HistoryFilters({
  rows, filteredCount, employeeOptions, search, setSearch, selectedEmployees,
  setSelectedEmployees, period, setPeriod, from, setFrom, to, setTo,
  timeFrom, setTimeFrom, timeTo, setTimeTo, verification, setVerification,
  sort, setSort,
}) {
  const [employeeSearch, setEmployeeSearch] = useState("");
  const visibleEmployees = employeeOptions.filter((employee) =>
    `${employee.employeeName} ${employee.employeeId}`.toLocaleLowerCase().includes(employeeSearch.trim().toLocaleLowerCase())
  );
  const reset = () => {
    setSearch(""); setSelectedEmployees([]); setPeriod("30"); setFrom(""); setTo("");
    setTimeFrom(""); setTimeTo(""); setVerification("all"); setSort("newest");
  };
  const toggleEmployee = (id) =>
    setSelectedEmployees((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  return <section className="history-filter-panel mb-5" aria-label="History filters">
    <div className="history-filter-heading">
      <div>
        <span className="eyebrow"><SlidersHorizontal size={13} /> Advanced history search</span>
        <h2>Find employee punch records</h2>
        <p>Combine employee, date, time and verification filters for an accurate audit view.</p>
      </div>
      <div className="history-results"><b>{filteredCount}</b><span>of {rows.length} punches</span></div>
    </div>
    <div className="history-filter-grid">
      <label className="history-control history-search-control">
        <span>Employee name or ID</span>
        <div><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or employee ID" /></div>
      </label>
      <div className="history-control">
        <span>Employees</span>
        <details className="employee-picker">
          <summary>{selectedEmployees.length ? `${selectedEmployees.length} employee${selectedEmployees.length === 1 ? "" : "s"} selected` : "All employees"}</summary>
          <div className="employee-picker-menu">
            <div className="employee-picker-search"><Search size={15} /><input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Find employee" /></div>
            <div className="employee-picker-actions"><button type="button" onClick={() => setSelectedEmployees(employeeOptions.map((employee) => employee.employeeId))}>Select all</button><button type="button" onClick={() => setSelectedEmployees([])}>Clear</button></div>
            <div className="employee-picker-list">
              {visibleEmployees.map((employee) => <label key={employee.employeeId}><input type="checkbox" checked={selectedEmployees.includes(employee.employeeId)} onChange={() => toggleEmployee(employee.employeeId)} /><span><b>{employee.employeeName}</b><small>ID {employee.employeeId}</small></span></label>)}
            </div>
          </div>
        </details>
      </div>
      <label className="history-control"><span>Date period</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option><option value="all">All loaded records</option><option value="custom">Custom date range</option></select></label>
      <label className="history-control"><span>Verification method</span><select value={verification} onChange={(event) => setVerification(event.target.value)}><option value="all">All methods</option><option value="1">Fingerprint</option><option value="3">Face / card</option><option value="4">Password / PIN</option><option value="0">Other / device default</option></select></label>
      {period === "custom" && <><label className="history-control"><span>From date</span><input type="date" value={from} max={to || dateInputValue(new Date())} onChange={(event) => setFrom(event.target.value)} /></label><label className="history-control"><span>To date</span><input type="date" value={to} min={from} max={dateInputValue(new Date())} onChange={(event) => setTo(event.target.value)} /></label></>}
      <label className="history-control"><span>Time from</span><input type="time" value={timeFrom} onChange={(event) => setTimeFrom(event.target.value)} /></label>
      <label className="history-control"><span>Time to</span><input type="time" value={timeTo} onChange={(event) => setTimeTo(event.target.value)} /></label>
      <label className="history-control"><span>Sort results</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest punches first</option><option value="oldest">Oldest punches first</option><option value="name-asc">Employee name A–Z</option><option value="name-desc">Employee name Z–A</option><option value="id-asc">Employee ID</option></select></label>
      <button type="button" onClick={reset} className="history-reset"><RotateCcw size={16} /> Reset filters</button>
    </div>
    {selectedEmployees.length > 0 && <div className="history-selection-summary"><span>Filtering {selectedEmployees.length} selected employee{selectedEmployees.length === 1 ? "" : "s"}</span><button type="button" onClick={() => setSelectedEmployees([])}>Show all employees</button></div>}
  </section>;
}
function Pagination({ data, page, setPage, limit, setLimit, t }) {
  const start = data.totalItems ? (data.page - 1) * data.limit + 1 : 0;
  const end = Math.min(data.page * data.limit, data.totalItems || 0);
  return <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <div className="flex flex-wrap items-center gap-4"><span>{t.showing} {start}–{end} {t.of} {data.totalItems || 0}</span><label className="flex items-center gap-2">{t.perPage}<select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none">{[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
    <div className="flex items-center gap-2"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">{t.previous}</button><span className="min-w-24 text-center">{t.page} {data.page || 1} {t.of} {data.totalPages || 1}</span><button onClick={() => setPage(Math.min(data.totalPages || 1, page + 1))} disabled={page >= (data.totalPages || 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">{t.next}</button></div>
  </div>;
}
function verificationLabel(value) {
  return { 1: "Fingerprint", 3: "Face / card", 4: "Password / PIN", 0: "Device default" }[Number(value)] || `Method ${value}`;
}
function HistoryTable({ rows, t, time }) { return <Table headers={[t.employee, t.id, "Punch date and time", "Verification method"]}>{rows.length ? rows.map((r) => <tr key={r.logId} className="hover:bg-emerald-50/40"><td className="px-5 py-4 font-medium text-slate-900">{r.employeeName}</td><td className="px-5 py-4 text-slate-400">{r.employeeId}</td><td className="px-5 py-4">{time(r.punchTime)}</td><td className="px-5 py-4"><span className="verification-badge">{verificationLabel(r.verifyMode)}</span></td></tr>) : <tr><td colSpan="4" className="px-5 py-16 text-center text-slate-500">{t.noData}</td></tr>}</Table>; }
function Analytics({ t, attendance, employees }) { const items = [[t.totalEmployees, employees.total], [t.punchedToday, employees.punchedToday], [t.notToday, employees.notToday], [t.inactiveWeek, employees.inactiveWeek], [t.inactiveMonth, employees.inactiveMonth], [t.early, attendance.earlyComers], [t.moderate, attendance.moderateComers], [t.late, attendance.lateComers]]; const max = Math.max(...items.map(([, v]) => v || 0), 1); return <Panel title={t.analytics}><div className="space-y-5">{items.map(([label, value]) => <div key={label}><div className="mb-2 flex justify-between text-sm text-slate-700"><span>{label}</span><b>{value || 0}</b></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${((value || 0) / max) * 100}%` }} /></div></div>)}</div></Panel>; }

function PaginationPro({ data, page, setPage, limit, setLimit, t }) {
  const start = data.totalItems ? (data.page - 1) * data.limit + 1 : 0;
  const end = Math.min(data.page * data.limit, data.totalItems || 0);
  return <div className="pagination-bar">
    <div className="flex flex-wrap items-center gap-4"><span>{t.showing} {start}-{end} {t.of} {data.totalItems || 0}</span><label className="flex items-center gap-2">{t.perPage}<select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>{[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
    <div className="flex items-center gap-2"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}><ChevronLeft size={16} /><span className="hidden sm:inline">{t.previous}</span></button><span className="min-w-24 text-center">{t.page} {data.page || 1} {t.of} {data.totalPages || 1}</span><button onClick={() => setPage(Math.min(data.totalPages || 1, page + 1))} disabled={page >= (data.totalPages || 1)}><span className="hidden sm:inline">{t.next}</span><ChevronRight size={16} /></button></div>
  </div>;
}
function AnalyticsPro({ t, attendance, employees }) {
  const [mode, setMode] = useState("attendance");
  const present = employees.punchedToday || 0;
  const total = employees.total || 0;
  const rate = total ? Math.round((present / total) * 100) : 0;
  const attendanceItems = [[t.early, attendance.earlyComers, "#2dd4bf"], [t.moderate, attendance.moderateComers, "#fbbf24"], [t.late, attendance.lateComers, "#fb7185"]];
  const workforceItems = [[t.punchedToday, present, "#2dd4bf"], [t.notToday, employees.notToday, "#fb7185"], [t.inactiveWeek, employees.inactiveWeek, "#fbbf24"], [t.inactiveMonth, employees.inactiveMonth, "#a78bfa"]];
  const items = mode === "attendance" ? attendanceItems : workforceItems;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="eyebrow"><CircleGauge size={13} /> Workforce intelligence</span><h2 className="mt-3 text-2xl font-semibold text-white">Performance analytics</h2><p className="mt-1 text-sm text-slate-500">Interactive, real-time insight into today's workforce.</p></div><div className="segmented"><button onClick={() => setMode("attendance")} className={mode === "attendance" ? "active" : ""}>Arrival</button><button onClick={() => setMode("workforce")} className={mode === "workforce" ? "active" : ""}>Workforce</button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label={t.totalEmployees} value={total} icon={Users} /><StatCard label={t.punchedToday} value={present} icon={CheckCircle2} /><StatCard label={t.rawPunches} value={attendance.rawPunches} icon={Fingerprint} /><StatCard label="Presence rate" value={`${rate}%`} icon={TrendingUp} /></div>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]"><Panel title={mode === "attendance" ? "Arrival classification" : "Workforce activity"} subtitle="Hover over each bar for exact values"><InteractiveBars items={items} /></Panel><Panel title="Daily presence" subtitle="Live attendance completion"><div className="grid place-items-center py-5"><Donut value={rate} /><div className="mt-5 grid w-full grid-cols-2 gap-3"><MiniMetric label="Present" value={present} color="text-teal-300" /><MiniMetric label="Absent" value={employees.notToday || 0} color="text-rose-300" /></div></div></Panel></div>
    <Panel title="HR attention center" subtitle="Prioritized indicators that may require action"><div className="grid gap-3 md:grid-cols-3"><Insight icon={Clock3} title="Late arrivals" value={attendance.lateComers || 0} tone="rose" /><Insight icon={ShieldCheck} title="Inactive 7+ days" value={employees.inactiveWeek || 0} tone="amber" /><Insight icon={Users} title="Never punched" value={employees.neverPunched || 0} tone="violet" /></div></Panel>
  </div>;
}
function Donut({ value }) { return <div className="relative grid size-40 place-items-center rounded-full" style={{ background: `conic-gradient(#2dd4bf ${value * 3.6}deg, rgba(255,255,255,.06) 0)` }}><div className="grid size-[124px] place-items-center rounded-full border border-white/5 bg-[#09191c]"><div className="text-center"><b className="text-3xl text-white">{value}%</b><p className="mt-1 text-[11px] uppercase tracking-widest text-slate-500">present</p></div></div></div>; }
function DistributionChart({ values, labels }) { const max = Math.max(...values, 1); return <div className="grid h-56 grid-cols-3 items-end gap-4 pt-8">{values.map((value, index) => <div key={labels[index]} className="group flex h-full flex-col justify-end"><div className="relative flex flex-1 items-end rounded-xl bg-white/[.025]"><div title={`${labels[index]}: ${value}`} className={`w-full rounded-xl transition-all duration-500 group-hover:brightness-125 ${["bg-teal-400/70", "bg-amber-400/70", "bg-rose-400/70"][index]}`} style={{ height: `${Math.max(8, (value / max) * 100)}%` }}><span className="absolute left-1/2 -translate-x-1/2 -translate-y-7 text-sm font-semibold text-white">{value}</span></div></div><p className="mt-3 truncate text-center text-xs text-slate-500">{labels[index]}</p></div>)}</div>; }
function InteractiveBars({ items }) { const max = Math.max(...items.map(([, value]) => value || 0), 1); return <div className="space-y-6 py-2">{items.map(([label, value, color]) => <div key={label} className="group"><div className="mb-2 flex justify-between text-sm"><span className="text-slate-400 group-hover:text-white">{label}</span><b className="text-white">{value || 0}</b></div><div className="h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full transition-all duration-700 group-hover:brightness-125" style={{ width: `${((value || 0) / max) * 100}%`, background: color, boxShadow: `0 0 18px ${color}55` }} /></div></div>)}</div>; }
function MiniMetric({ label, value, color }) { return <div className="rounded-xl border border-white/5 bg-white/[.025] p-3 text-center"><b className={`text-xl ${color}`}>{value}</b><p className="mt-1 text-xs text-slate-500">{label}</p></div>; }
function Insight({ icon: Icon, title, value, tone }) { const styles = { rose: "bg-rose-400/10 text-rose-300 border-rose-400/15", amber: "bg-amber-400/10 text-amber-300 border-amber-400/15", violet: "bg-violet-400/10 text-violet-300 border-violet-400/15" }; return <div className={`flex items-center gap-4 rounded-xl border p-4 ${styles[tone]}`}><span className="grid size-10 place-items-center rounded-lg bg-black/10"><Icon size={19} /></span><div><p className="text-xs opacity-70">{title}</p><b className="text-xl">{value}</b></div></div>; }
