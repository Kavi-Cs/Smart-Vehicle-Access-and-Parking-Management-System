
import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Camera,
  CarFront,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Command,
  Download,
  Eye,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'

type Direction = 'ENTRY' | 'EXIT' | 'UNKNOWN'
type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved'

type VehicleEvent = {
  id: string
  plate: string
  time: string
  camera: string
  device: string
  confidence: number
  direction: Direction
  registration: 'Registered' | 'Unknown' | 'Pending'
  authorization: 'Authorized' | 'Unauthorized' | 'Unverified'
}

type SecurityAlert = {
  id: string
  title: string
  description: string
  time: string
  severity: 'High' | 'Medium' | 'Low'
  status: AlertStatus
}

const demoEvents: VehicleEvent[] = [
  { id: 'EVT-1048', plate: 'DEMO-001', time: '10:42:18', camera: 'CAM-01', device: 'RPI-01', confidence: 98.4, direction: 'ENTRY', registration: 'Registered', authorization: 'Authorized' },
  { id: 'EVT-1047', plate: 'DEMO-002', time: '10:39:52', camera: 'CAM-02', device: 'RPI-02', confidence: 64.2, direction: 'UNKNOWN', registration: 'Unknown', authorization: 'Unverified' },
  { id: 'EVT-1046', plate: 'DEMO-003', time: '10:35:07', camera: 'CAM-01', device: 'RPI-01', confidence: 96.8, direction: 'EXIT', registration: 'Registered', authorization: 'Authorized' },
  { id: 'EVT-1045', plate: 'DEMO-004', time: '10:31:44', camera: 'CAM-02', device: 'RPI-02', confidence: 71.5, direction: 'ENTRY', registration: 'Pending', authorization: 'Unverified' },
  { id: 'EVT-1044', plate: 'DEMO-005', time: '10:28:11', camera: 'CAM-01', device: 'RPI-01', confidence: 99.1, direction: 'EXIT', registration: 'Registered', authorization: 'Authorized' },
  { id: 'EVT-1043', plate: 'DEMO-006', time: '10:21:36', camera: 'CAM-02', device: 'RPI-02', confidence: 91.7, direction: 'ENTRY', registration: 'Registered', authorization: 'Unauthorized' },
]

const initialAlerts: SecurityAlert[] = [
  { id: 'ALT-208', title: 'Unknown vehicle detected', description: 'DEMO-002 · CAM-02', time: '10:39 AM', severity: 'High', status: 'Open' },
  { id: 'ALT-207', title: 'Low-confidence plate reading', description: 'DEMO-004 · 71.5% confidence', time: '10:31 AM', severity: 'Medium', status: 'Open' },
  { id: 'ALT-206', title: 'Direction requires review', description: 'DEMO-002 · Direction uncertain', time: '10:39 AM', severity: 'Medium', status: 'Open' },
  { id: 'ALT-205', title: 'Authorization mismatch', description: 'DEMO-006 · Verify backend result', time: '10:21 AM', severity: 'High', status: 'Acknowledged' },
]

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Vehicle Events', icon: CarFront },
  { label: 'Security Alerts', icon: ShieldAlert },
  { label: 'Vehicle History', icon: Clock3 },
  { label: 'Analytics', icon: Activity },
]

function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'red' | 'amber' | 'blue' }) {
  const styles = {
    neutral: 'bg-slate-800 text-slate-300 ring-slate-700',
    green: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
    red: 'bg-rose-400/10 text-rose-300 ring-rose-400/20',
    amber: 'bg-amber-400/10 text-amber-200 ring-amber-400/20',
    blue: 'bg-sky-400/10 text-sky-300 ring-sky-400/20',
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide ring-1 ring-inset ${styles[tone]}`}>
      {children}
    </span>
  )
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  color,
  trend,
}: {
  label: string
  value: string
  note: string
  icon: typeof CarFront
  color: string
  trend?: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-slate-700">
      <div className="flex items-start justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon size={19} />
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-white">{value}</span>
        {trend && <span className="text-xs font-medium text-emerald-300">{trend}</span>}
      </div>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState('Overview')
  const [search, setSearch] = useState('')
  const [directionFilter, setDirectionFilter] = useState('All directions')
  const [alertFilter, setAlertFilter] = useState('All alerts')
  const [alerts, setAlerts] = useState(initialAlerts)
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState('')

  const filteredEvents = useMemo(() => demoEvents.filter((event) => {
    const matchesSearch = `${event.plate} ${event.id} ${event.camera} ${event.device}`.toLowerCase().includes(search.toLowerCase())
    const matchesDirection = directionFilter === 'All directions' || event.direction === directionFilter
    return matchesSearch && matchesDirection
  }), [search, directionFilter])

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = `${alert.title} ${alert.description} ${alert.id}`.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = alertFilter === 'All alerts' || alert.status === alertFilter
    return matchesSearch && matchesStatus
  })

  const openAlerts = alerts.filter((alert) => alert.status === 'Open').length

  function updateAlert(id: string, status: AlertStatus) {
    setAlerts((current) => current.map((alert) => alert.id === id ? { ...alert, status } : alert))
    setSelectedAlert(null)
    setToast(`Alert ${id} marked ${status.toLowerCase()}. Demo only.`)
    window.setTimeout(() => setToast(''), 3000)
  }

  function exportEvents() {
    const header = 'Event ID,Plate,Time,Camera,Device,Confidence,Direction,Registration,Authorization'
    const rows = filteredEvents.map((event) =>
      [event.id, event.plate, event.time, event.camera, event.device, event.confidence, event.direction, event.registration, event.authorization].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'smartvehicle-demo-events.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const pageTitle = activePage === 'Overview' ? 'Security Overview' : activePage

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <div className="flex min-h-screen">
        {mobileMenuOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-[#0b1120] transition-transform lg:static lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-[76px] items-center gap-3 border-b border-slate-800 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-slate-950">
              <ShieldCheck size={23} />
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-wide text-white">SmartVehicle</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500">Security Operations</div>
            </div>
            <button className="ml-auto text-slate-500 lg:hidden" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</p>
            <nav className="space-y-1">
              {navigation.map(({ label, icon: Icon }) => {
                const active = activePage === label
                return (
                  <button
                    key={label}
                    onClick={() => { setActivePage(label); setMobileMenuOpen(false); setSearch('') }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? 'bg-cyan-400/10 font-semibold text-cyan-300 ring-1 ring-inset ring-cyan-400/15' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'}`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {label === 'Security Alerts' && openAlerts > 0 && (
                      <span className="ml-auto rounded-md bg-rose-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">{openAlerts}</span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="mt-8 px-4">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">System</p>
            <button onClick={() => { setToast('System settings will be connected in a future phase.'); window.setTimeout(() => setToast(''), 3000) }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800/70 hover:text-white">
              <Settings size={18} /> Settings
            </button>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                </span>
                <span className="text-xs font-semibold text-slate-300">Prototype environment</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">Showing fictional records. No live camera or backend connection.</p>
            </div>
            <div className="mt-4 flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-cyan-300">SO</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-200">Security Operator</div>
                <div className="mt-0.5 text-[10px] text-slate-500">Demo account</div>
              </div>
              <ChevronDown size={15} className="text-slate-500" />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-800 bg-[#080d18]/95 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
            <div className="flex items-center gap-3">
              <button className="text-slate-400 lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
                <Menu size={21} />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>SmartVehicle</span><span>/</span><span className="text-slate-300">{activePage}</span>
                </div>
                <h1 className="mt-1 text-lg font-semibold tracking-tight text-white">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-500 sm:flex">
                <Clock3 size={14} />
                <span>Demo session</span>
              </div>
              <button
                aria-label="View security alerts"
                onClick={() => setActivePage('Security Alerts')}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <Bell size={17} />
                {openAlerts > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-400" />}
              </button>
              <div className="hidden h-8 w-px bg-slate-800 sm:block" />
              <div className="hidden text-right sm:block">
                <div className="text-xs font-medium text-slate-200">Security Team</div>
                <div className="mt-0.5 text-[10px] text-slate-500">University Gate</div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-7 lg:p-9">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-cyan-300">Gate monitoring workspace</p>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {activePage === 'Overview' ? 'Good day, Security Team' : activePage}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  {activePage === 'Overview'
                    ? 'Review vehicle movements, monitor security alerts, and inspect recognition results.'
                    : `Inspect ${activePage.toLowerCase()} using the current demonstration dataset.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="amber">DEMO MODE</StatusBadge>
                <button onClick={exportEvents} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800">
                  <Download size={15} /> Export events
                </button>
              </div>
            </div>

            {activePage === 'Overview' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Vehicles currently inside" value="24" note="Illustrative occupancy count" icon={CarFront} color="bg-cyan-400/10 text-cyan-300" />
                  <MetricCard label="Entries today" value="68" note="Illustrative confirmed entries" icon={ArrowDownLeft} color="bg-emerald-400/10 text-emerald-300" trend="+12.5%" />
                  <MetricCard label="Exits today" value="44" note="Illustrative confirmed exits" icon={ArrowUpRight} color="bg-sky-400/10 text-sky-300" />
                  <MetricCard label="Unresolved alerts" value={String(openAlerts)} note="Require operator review" icon={ShieldAlert} color="bg-amber-400/10 text-amber-200" />
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                  <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Recent vehicle events</h3>
                        <p className="mt-1 text-xs text-slate-500">Latest illustrative recognition results</p>
                      </div>
                      <button onClick={() => setActivePage('Vehicle Events')} className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200">
                        View all <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left">
                        <thead className="bg-slate-950/50 text-[10px] uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Vehicle / time</th>
                            <th className="px-4 py-3 font-semibold">Camera</th>
                            <th className="px-4 py-3 font-semibold">Direction</th>
                            <th className="px-4 py-3 font-semibold">Recognition</th>
                            <th className="px-5 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {demoEvents.slice(0, 5).map((event) => (
                            <tr key={event.id} className="transition hover:bg-slate-800/30">
                              <td className="px-5 py-4">
                                <div className="font-mono text-xs font-semibold text-slate-200">{event.plate}</div>
                                <div className="mt-1 text-[10px] text-slate-500">{event.time} · {event.id}</div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2 text-xs text-slate-300"><Camera size={14} className="text-slate-500" />{event.camera}</div>
                                <div className="mt-1 text-[10px] text-slate-500">{event.device}</div>
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge tone={event.direction === 'ENTRY' ? 'green' : event.direction === 'EXIT' ? 'blue' : 'amber'}>{event.direction}</StatusBadge>
                              </td>
                              <td className="px-4 py-4">
                                <div className={`text-xs font-semibold ${event.confidence < 75 ? 'text-amber-300' : 'text-slate-200'}`}>{event.confidence.toFixed(1)}%</div>
                                <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                                  <div className={`h-full rounded-full ${event.confidence < 75 ? 'bg-amber-400' : 'bg-cyan-400'}`} style={{ width: `${event.confidence}%` }} />
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <StatusBadge tone={event.authorization === 'Authorized' ? 'green' : event.authorization === 'Unauthorized' ? 'red' : 'amber'}>
                                  {event.authorization}
                                </StatusBadge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
                      <span className="text-[10px] text-slate-500">Showing 5 of {demoEvents.length} demo events</span>
                      <button onClick={() => setActivePage('Vehicle Events')} className="text-[11px] font-medium text-slate-400 hover:text-white">Open event log</button>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-900/50">
                    <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Security alerts</h3>
                        <p className="mt-1 text-xs text-slate-500">Items requiring attention</p>
                      </div>
                      <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-rose-400/10 px-2 text-xs font-semibold text-rose-300">{openAlerts} open</span>
                    </div>
                    <div className="divide-y divide-slate-800/80">
                      {alerts.slice(0, 4).map((alert) => (
                        <button key={alert.id} onClick={() => setSelectedAlert(alert)} className="flex w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-800/30">
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${alert.severity === 'High' ? 'bg-rose-400/10 text-rose-300' : 'bg-amber-400/10 text-amber-200'}`}>
                            {alert.severity === 'High' ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-xs font-semibold text-slate-200">{alert.title}</span>
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${alert.status === 'Open' ? 'bg-rose-400' : alert.status === 'Acknowledged' ? 'bg-amber-300' : 'bg-emerald-400'}`} />
                            </span>
                            <span className="mt-1 block truncate text-[11px] text-slate-500">{alert.description}</span>
                            <span className="mt-2 block text-[10px] text-slate-600">{alert.id} · {alert.time}</span>
                          </span>
                          <Eye size={15} className="mt-1 shrink-0 text-slate-600" />
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setActivePage('Security Alerts')} className="flex w-full items-center justify-center gap-2 border-t border-slate-800 px-5 py-3.5 text-xs font-medium text-cyan-300 hover:bg-slate-800/30">
                      Review all alerts <ArrowRight size={14} />
                    </button>
                  </section>
                </div>

                <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Monitoring infrastructure</h3>
                      <p className="mt-1 text-xs text-slate-500">Planned camera and device configuration</p>
                    </div>
                    <StatusBadge tone="amber">Not connected</StatusBadge>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      { id: 'CAM-01', device: 'RPI-01', detail: 'Camera observation point 1' },
                      { id: 'CAM-02', device: 'RPI-02', detail: 'Camera observation point 2' },
                    ].map((camera) => (
                      <div key={camera.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400"><Camera size={18} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-200">{camera.id}</div>
                          <div className="mt-1 text-[11px] text-slate-500">{camera.device} · {camera.detail}</div>
                        </div>
                        <span className="h-2 w-2 rounded-full bg-slate-600" />
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] leading-5 text-slate-500">Camera IDs identify observation sources only. Entry and exit direction must come from the recognition pipeline, not from the camera ID.</p>
                </section>
              </>
            )}

            {activePage === 'Vehicle Events' && (
              <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="flex flex-col gap-4 border-b border-slate-800 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Vehicle event log</h3>
                    <p className="mt-1 text-xs text-slate-500">Search and filter fictional recognition events.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plate, event, camera..." className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/60 sm:w-64" />
                    </div>
                    <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-cyan-400/60">
                      <option>All directions</option><option>ENTRY</option><option>EXIT</option><option>UNKNOWN</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-slate-950/50 text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>{['Event / timestamp', 'Number plate', 'Camera / device', 'Confidence', 'Direction', 'Registration', 'Authorization'].map((label) => <th key={label} className="px-4 py-3 font-semibold first:pl-5 last:pr-5">{label}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-4 pl-5"><div className="text-xs font-semibold text-slate-200">{event.id}</div><div className="mt-1 text-[10px] text-slate-500">{event.time}</div></td>
                          <td className="px-4 py-4 font-mono text-xs text-white">{event.plate}</td>
                          <td className="px-4 py-4"><div className="text-xs text-slate-300">{event.camera}</div><div className="mt-1 text-[10px] text-slate-500">{event.device}</div></td>
                          <td className="px-4 py-4"><span className={event.confidence < 75 ? 'text-amber-300' : 'text-slate-200'}>{event.confidence.toFixed(1)}%</span></td>
                          <td className="px-4 py-4"><StatusBadge tone={event.direction === 'ENTRY' ? 'green' : event.direction === 'EXIT' ? 'blue' : 'amber'}>{event.direction}</StatusBadge></td>
                          <td className="px-4 py-4"><StatusBadge tone={event.registration === 'Registered' ? 'green' : 'amber'}>{event.registration}</StatusBadge></td>
                          <td className="px-4 py-4 pr-5"><StatusBadge tone={event.authorization === 'Authorized' ? 'green' : event.authorization === 'Unauthorized' ? 'red' : 'amber'}>{event.authorization}</StatusBadge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredEvents.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No demo events match your search.</div>}
                </div>
                <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">{filteredEvents.length} of {demoEvents.length} demo events</div>
              </section>
            )}

            {activePage === 'Security Alerts' && (
              <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="text-sm font-semibold text-white">Alert review queue</h3><p className="mt-1 text-xs text-slate-500">Inspect alerts and record a demo review status.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts..." className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs outline-none placeholder:text-slate-600 focus:border-cyan-400/60 sm:w-48" />
                    </div>
                    <select value={alertFilter} onChange={(e) => setAlertFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-300 outline-none">
                      <option>All alerts</option><option>Open</option><option>Acknowledged</option><option>Resolved</option>
                    </select>
                  </div>
                </div>
                <div className="divide-y divide-slate-800/80">
                  {filteredAlerts.map((alert) => (
                    <div key={alert.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert.severity === 'High' ? 'bg-rose-400/10 text-rose-300' : 'bg-amber-400/10 text-amber-200'}`}><AlertTriangle size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-200">{alert.title}</h4><StatusBadge tone={alert.severity === 'High' ? 'red' : 'amber'}>{alert.severity} priority</StatusBadge></div>
                        <p className="mt-1 text-xs text-slate-400">{alert.description}</p>
                        <p className="mt-2 text-[10px] text-slate-600">{alert.id} · {alert.time} · Status: {alert.status}</p>
                      </div>
                      <button onClick={() => setSelectedAlert(alert)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"><Eye size={14} /> Review</button>
                    </div>
                  ))}
                  {filteredAlerts.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No alerts match your filters.</div>}
                </div>
              </section>
            )}

            {activePage === 'Vehicle History' && (
              <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Search size={20} /></div>
                <h3 className="mt-4 text-base font-semibold text-white">Search vehicle history</h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">Search the demonstration events by plate, event ID, or camera. Real registration details and movement history will be supplied by the team's backend later.</p>
                <div className="relative mt-5 max-w-lg">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Enter demo plate or camera ID..." className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400/60" />
                </div>
                <div className="mt-5 space-y-2">
                  {filteredEvents.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 p-4"><div><div className="font-mono text-sm text-slate-200">{event.plate}</div><div className="mt-1 text-xs text-slate-500">{event.id} · {event.time} · {event.camera}</div></div><StatusBadge tone={event.direction === 'UNKNOWN' ? 'amber' : 'blue'}>{event.direction}</StatusBadge></div>)}
                  {filteredEvents.length === 0 && <p className="py-5 text-sm text-slate-500">No matching demo records.</p>}
                </div>
              </section>
            )}

            {activePage === 'Analytics' && (
              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                  <h3 className="text-sm font-semibold text-white">Illustrative daily traffic</h3>
                  <p className="mt-1 text-xs text-slate-500">Example hourly vehicle counts · fictional data</p>
                  <div className="mt-7 flex h-52 items-end gap-3 border-b border-slate-800 pb-2">
                    {[32, 45, 28, 63, 75, 54, 88, 66, 42, 70, 49, 35].map((height, index) => (
                      <div key={index} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                        <div title={`${height} illustrative detections`} className="w-full max-w-8 rounded-t-md bg-cyan-400/70 transition hover:bg-cyan-300" style={{ height: `${height}%` }} />
                        <span className="text-[9px] text-slate-600">{index * 2 + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"><span className="h-2 w-2 rounded-sm bg-cyan-400" />Illustrative detections by hour</div>
                </section>
                <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                  <h3 className="text-sm font-semibold text-white">Recognition quality</h3>
                  <p className="mt-1 text-xs text-slate-500">Based on the six visible demo events</p>
                  <div className="mt-7 space-y-5">
                    {[{ label: 'High confidence (90%+)', count: demoEvents.filter((e) => e.confidence >= 90).length, color: 'bg-emerald-400' }, { label: 'Medium confidence (75–89.9%)', count: demoEvents.filter((e) => e.confidence >= 75 && e.confidence < 90).length, color: 'bg-cyan-400' }, { label: 'Low confidence (<75%)', count: demoEvents.filter((e) => e.confidence < 75).length, color: 'bg-amber-400' }].map((item) => (
                      <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between text-xs"><span className="text-slate-300">{item.label}</span><span className="text-slate-500">{item.count} events</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.count / demoEvents.length * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-[11px] leading-5 text-slate-500">These counts illustrate the interface only. They are not measured system accuracy or real traffic statistics.</p>
                </section>
              </div>
            )}

            <footer className="flex flex-col justify-between gap-2 border-t border-slate-800/80 pt-5 text-[10px] text-slate-600 sm:flex-row">
              <span>SmartVehicle Security Dashboard · Frontend prototype</span>
              <span className="flex items-center gap-2"><Command size={12} /> Fictional data · No live system connection</span>
            </footer>
          </div>
        </main>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setSelectedAlert(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="alert-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0d1525] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${selectedAlert.severity === 'High' ? 'bg-rose-400/10 text-rose-300' : 'bg-amber-400/10 text-amber-200'}`}><ShieldAlert size={22} /></span>
              <button onClick={() => setSelectedAlert(null)} aria-label="Close alert" className="text-slate-500 hover:text-white"><X size={19} /></button>
            </div>
            <h3 id="alert-title" className="mt-5 text-lg font-semibold text-white">{selectedAlert.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{selectedAlert.description}</p>
            <div className="mt-5 space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Alert ID</span><span className="font-mono text-slate-300">{selectedAlert.id}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Severity</span><span className="text-slate-300">{selectedAlert.severity}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Reported time</span><span className="text-slate-300">{selectedAlert.time}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Current status</span><span className="text-slate-300">{selectedAlert.status}</span></div>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-slate-500">An alert is a request for review, not proof of wrongdoing. These actions change local demo state only.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button onClick={() => updateAlert(selectedAlert.id, 'Resolved')} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800"><CheckCircle2 size={14} /> Resolve</button>
              <button onClick={() => updateAlert(selectedAlert.id, 'Acknowledged')} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300"><Check size={14} /> Acknowledge</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-5 right-5 z-[80] flex max-w-sm items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-200 shadow-2xl">
          <CheckCircle2 size={17} className="shrink-0 text-emerald-300" />{toast}
          <button onClick={() => setToast('')} aria-label="Dismiss notification" className="ml-2 text-slate-500 hover:text-white"><X size={15} /></button>
        </div>
      )}
    </div>
  )
}
