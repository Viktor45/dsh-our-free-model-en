import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, CircleAlert, Layers3, RefreshCw, Search, RotateCcw, X } from 'lucide-react'
import { Badge, Button, Card, Input } from './components/ui'
import { usageDays, usageModels } from './usage-data.mjs'
import type { Host, Stats, UsageModel } from './types'
import './usage.css'

const number = (value: number) => new Intl.NumberFormat('en-US').format(value)
const compact = (value: number) => value >= 1e6 ? `${Number((value / 1e6).toFixed(1))}M`
  : value >= 1e3 ? `${Number((value / 1e3).toFixed(1))}K` : number(value)
const measured = (value?: number | null) => value != null && Number.isFinite(value) ? number(value) : '—'

export function Usage({ stats, host, active }: { stats: Stats; host: Host; active: boolean }) {
  const [period, setPeriod] = useState(14)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('calls')
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const generation = useRef(0)
  const refreshingRef = useRef(false)
  const activeRef = useRef(active)
  activeRef.current = active
  useEffect(() => {
    if (!active) {
      generation.current++
      refreshingRef.current = false
      setRefreshing(false); setMessage(''); setError('')
    }
    return () => { generation.current++ }
  }, [active])
  const days: { day: string; total: number }[] = usageDays(stats.days, period)
  const windowTotal = days.reduce((sum, day) => sum + day.total, 0)
  const max = Math.max(1, ...days.map(day => day.total))
  const models: { total: number; pages: number; page: number; rows: UsageModel[] } = usageModels(stats.models, { search, sort, page })
  useEffect(() => { if (page !== models.page) setPage(models.page) }, [page, models.page])
  const hasHistory = stats.requests > 0 || stats.turns > 0 || stats.models.length > 0 || stats.days.length > 0
  const metrics = [
    { name: 'User turns', value: stats.turns, detail: 'One user request counts as one turn', icon: Layers3 },
    { name: 'Physical requests', value: stats.requests, detail: 'Includes retries and recovery requests', icon: Activity },
    { name: 'Input tokens', value: stats.grand.input, detail: 'Based on reported usage', icon: ArrowDownToLine },
    { name: 'Output tokens', value: stats.grand.output, detail: 'Based on reported usage', icon: ArrowUpFromLine },
    { name: 'Failed turns', value: stats.failedTurns, detail: 'User turns that never finished', icon: CircleAlert },
    { name: 'Recovered turns', value: stats.recoveredTurns, detail: 'User turns completed after recovery', icon: RotateCcw },
  ]
  const refresh = async () => {
    if (refreshingRef.current || !activeRef.current) return
    const started = ++generation.current
    const isCurrent = () => started === generation.current && activeRef.current
    refreshingRef.current = true
    setRefreshing(true); setMessage(''); setError('')
    try {
      await host.refresh()
      if (isCurrent()) setMessage('Statistics updated')
    } catch (reason) {
      if (isCurrent()) setError(reason instanceof Error ? reason.name === 'TimeoutError' ? 'The refresh timed out. Please try again.'
        : reason instanceof TypeError && /fetch/i.test(reason.message) ? 'Cannot reach the local service; make sure it is running and try again.'
        : reason.message : 'Refreshing the statistics failed. Please try again.')
    } finally {
      if (isCurrent()) { refreshingRef.current = false; setRefreshing(false) }
    }
  }
  if (!active) return null
  return <div className="usage-browser" data-testid="usage-ready">
    <header className="dashboard-heading"><div><div className="heading-eyebrow">WORKSPACE / USAGE</div>
      <h1>Usage</h1><p>See cumulative usage on this machine and its daily trend.</p></div>
      <Button variant="outline" disabled={refreshing} onClick={() => { void refresh() }}>
        <RefreshCw size={15} className={refreshing ? 'spinning' : ''} />{refreshing ? 'Refreshing' : 'Refresh statistics'}
      </Button>
    </header>
    {message && <p className="usage-feedback" role="status">{message}</p>}
    {error && <div className="channel-error" role="alert"><CircleAlert size={16} /><span>{error}</span>
      <Button variant="ghost" aria-label="Dismiss statistics error" onClick={() => setError('')}><X size={15} /></Button></div>}
    <div className="usage-metrics">{metrics.map(metric => <Card className="dashboard-metric ov-metric" key={metric.name}>
      <div><span>{metric.name}</span><div className="ov-metric-icon"><metric.icon size={17} /></div></div>
      <strong title={number(metric.value)} data-metric={metric.name}>{metric.name.includes('token') ? compact(metric.value) : number(metric.value)}</strong><p>{metric.detail}</p>
    </Card>)}</div>
    <div className="usage-scope"><span>Cumulative · independent of the trend range below</span>
      <span>Failed physical requests <strong data-testid="usage-request-failures">{number(stats.requestFailures)}</strong></span>
      <span>Thinking tokens <strong>{number(stats.grand.reasoning)}</strong></span></div>
    {(stats.logicalEstimated || stats.requestFailuresEstimated) && <p className="usage-estimated" role="note">
      <CircleAlert size={15} /><span>Some historical figures are estimated:
        {stats.logicalEstimated && ' user turns from before the migration are estimated from historical requests.'}
        {stats.requestFailuresEstimated && ' some failed physical requests are estimated from the records kept.'}
        New records keep requests and turns counted separately.</span></p>}
    <Card className="usage-trend">
      <div className="card-heading"><div><h2>Daily token usage</h2><p>Last {period} days · input plus output</p></div>
        <div className="channel-filters" role="group" aria-label="Trend time range">{[7, 14, 30].map(count =>
          <button key={count} aria-pressed={period === count} onClick={() => setPeriod(count)}>{count} days</button>)}</div>
      </div>
      <div className="usage-window-total"><strong data-testid="usage-window-total">{number(windowTotal)}</strong><span>tokens / selected range</span></div>
      <p className="usage-scroll-hint">Swipe sideways to see every date.</p>
      <div className="usage-trend-scroll"><div className="usage-trend-chart" style={{ minWidth: period * 35 }}
        role="img" aria-label={`Token usage over the last ${period} days: ${days.map(day => `${day.day} ${number(day.total)}`).join('; ')}`}>
        {days.map(day => <div className="usage-day" key={day.day} tabIndex={0} title={`${day.day} · ${number(day.total)} tokens`}
          aria-label={`${day.day}: ${number(day.total)} tokens`}>
          <div className="usage-day-track"><div className={`usage-day-bar ${day.total ? '' : 'zero'}`} style={{ height: `${Math.max(1, day.total / max * 100)}%` }} /></div>
          <span>{day.day.slice(5).replace('-', '/')}</span>
        </div>)}
      </div></div>
      {windowTotal === 0 && <p className="usage-window-empty" role="status">{hasHistory ? 'No token usage was recorded in the selected range; cumulative figures still keep the history.' : 'No calls recorded yet; usage appears here once a client is connected.'}</p>}
      <div className="card-foot"><span>{days[0].day} — {days[days.length - 1].day} · local calendar days</span><span>Unreported usage is never estimated into real tokens</span></div>
    </Card>
    <Card className="usage-model-panel">
      <div className="card-heading"><div><h2>By model</h2><p>Cumulative records · up to 20 models per page</p></div>
        <Badge>{number(stats.models.length)} models</Badge></div>
      <div className="usage-model-filters"><div className="usage-model-search"><Search size={16} />
        <Input type="search" aria-label="Search usage models" placeholder="Search by model name or ID…" value={search}
          onChange={event => { setSearch(event.target.value); setPage(1) }} /></div>
        <select aria-label="Sort usage models" value={sort} onChange={event => { setSort(event.target.value); setPage(1) }}>
          <option value="calls">Most physical requests</option><option value="tokens">Most tokens</option>
          <option value="failedTurns">Most failed turns</option><option value="name">Model name</option>
        </select>
        {search && <Button variant="ghost" onClick={() => { setSearch(''); setPage(1) }}><X size={14} />Clear search</Button>}
      </div>
      {models.total ? <><p className="usage-scroll-hint">Swipe sideways to see every column.</p>
      <div className="usage-model-scroll" tabIndex={0} role="region" aria-label="Cumulative usage per model, horizontally scrollable">
        <table className="usage-model-table"><thead><tr>
          <th scope="col">Model / ID</th><th scope="col">User turns</th><th scope="col">Physical requests</th><th scope="col">Input tokens</th>
          <th scope="col">Output tokens</th><th scope="col">Failed turns</th><th scope="col">Recovered turns</th><th scope="col">First token</th><th scope="col">Speed</th>
        </tr></thead><tbody>{models.rows.map(model => <tr key={model.model} data-usage-model={model.model}>
          <td><strong>{model.name}</strong><code>{model.model}</code></td><td>{number(model.turns)}</td>
          <td>{number(model.calls)}<small>failed {number(model.failed)}</small></td>
          <td>{number(model.input)}</td><td>{number(model.output)}</td><td>{number(model.failedTurns)}</td>
          <td>{number(model.recoveredTurns)}</td><td>{measured(model.avgTtftMs)}<small>ms</small></td><td>{measured(model.tps)}<small>tok/s</small></td>
        </tr>)}</tbody></table>
      </div></> : <div className="usage-empty"><Activity size={25} /><h3>{search.trim() ? 'No matching models' : 'No model usage recorded yet'}</h3>
        <p>{search.trim() ? 'Try another name or ID, or clear the search.' : 'Connect a client and send a message; model statistics appear here.'}</p></div>}
      <div className="usage-pagination"><span data-testid="usage-model-count">{number(models.total)} / {number(stats.models.length)} models</span>
        <span>Page {models.page} of {models.pages}</span><Button variant="outline" aria-label="Previous page of usage models" disabled={models.page === 1}
          onClick={() => setPage(models.page - 1)}><ChevronLeft size={15} />Previous</Button>
        <Button variant="outline" aria-label="Next page of usage models" disabled={models.page === models.pages}
          onClick={() => setPage(models.page + 1)}>Next<ChevronRight size={15} /></Button></div>
    </Card>
    <p className="footnote">Statistics record usage and performance only; prompts and answers are never stored. First-token latency and speed come from measurable samples that were kept, and read “—” when nothing was measured.</p>
  </div>
}
