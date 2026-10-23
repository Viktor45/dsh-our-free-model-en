import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleAlert, Network, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { providers as sharedProviders } from 'ofm-provider-list'
import { shared } from 'ofm-shared-client'
import { providerLabel } from '../providers-data.mjs'
import { Badge, Button, Card, Input } from './ui'
import type { Summary } from '../types'

interface Status { closed?: boolean; accounts?: { total: number; enabled: number }; models?: { total: number; disabled: number } }
type Rpc = (method: string, payload?: object) => Promise<any>
const t = Object.assign((key: string) => shared.DICT.en[key] ?? key, { locale: 'en' })
const providers = sharedProviders.map(providerLabel)

export function ChannelBrowser({ rpc, summary }: { rpc: Rpc; summary: Summary & { reload?(): void } }) {
  const [statuses, setStatuses] = useState<Record<string, Status>>()
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, select] = useState<string>()
  const [auto, setAuto] = useState<{ enabled: boolean; running?: boolean; ranToday?: boolean }>()
  const [busy, setBusy] = useState(false)
  const mounted = useRef(false)
  const sequence = useRef(0)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const reload = useCallback(async () => {
    const started = ++sequence.current
    try {
      const value = await rpc('provider.status', { providers: providers.map(row => row.id) })
      if (!mounted.current || started !== sequence.current) return
      setStatuses(value.statuses ?? {})
      setError('')
    } catch (failure) {
      if (mounted.current && started === sequence.current) setError((failure as Error).message)
    }
  }, [rpc])
  useEffect(() => {
    mounted.current = true
    void reload()
    void rpc('usage.autoCheckin', {}).then(value => {
      if (mounted.current) setAuto(value.autoCheckin)
    }).catch(() => {})
    const timer = setInterval(() => { void reload() }, 45000)
    return () => { mounted.current = false; sequence.current++; clearInterval(timer) }
  }, [rpc, reload])
  useEffect(() => {
    if (selected) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      detailHeading.current?.focus({ preventScroll: true })
    }
  }, [selected])
  const onChanged = useCallback(() => {
    void reload()
    window.dispatchEvent(new CustomEvent('ofm:channels'))
    summary.reload?.()
  }, [reload, summary.reload])
  const onError = useCallback((_provider: unknown, failure: Error) => { if (mounted.current) setError(failure.message) }, [])
  const connected = providers.filter(provider => statuses?.[provider.id]?.accounts?.enabled && !statuses[provider.id].closed).length
  const accounts = Object.values(statuses ?? {}).reduce((sum, row) => sum + (row.accounts?.total ?? 0), 0)
  const selectedProvider = providers.find(row => row.id === selected)
  const rows = providers.filter(provider => {
    const status = statuses?.[provider.id]
    const isConnected = (status?.accounts?.enabled ?? 0) > 0 && !status?.closed
    return `${provider.name} ${provider.org}`.toLowerCase().includes(search.toLowerCase().trim())
      && (filter === 'all' || (status !== undefined && (filter === 'connected' ? isConnected : !isConnected)))
  })
  // 分类标签展示全量数量；搜索后的匹配数量由结果栏单独展示。
  const counts: Record<string, number> = {
    all: providers.length,
    connected,
    pending: providers.filter(provider => {
      const status = statuses?.[provider.id]
      return status !== undefined && (status.closed || (status.accounts?.enabled ?? 0) <= 0)
    }).length,
  }
  return <>
    <div className="channel-summary-strip">
      <div className="ch-metric"><span className="ch-metric-icon"><Network size={16} /></span>
        <div className="ch-metric-body"><span className="ch-metric-label">Connected channels</span>
          <strong className="ch-metric-value">{statuses ? connected : <span className="ch-skeleton" />}<small> / {providers.length}</small></strong></div></div>
      <div className="ch-metric"><span className="ch-metric-icon"><ShieldCheck size={16} /></span>
        <div className="ch-metric-body"><span className="ch-metric-label">Local accounts</span>
          <strong className="ch-metric-value">{statuses ? accounts : <span className="ch-skeleton" />}</strong></div></div>
      <div className="checkin-control"><span className="status-dot" /><span>{auto?.running ? 'Check-in running' : auto?.ranToday ? "Today's check-in done" : 'Daily auto check-in'}</span>
        <button type="button" role="switch" aria-label="Daily auto check-in" aria-checked={auto?.enabled === true}
          className={`ui-switch ${auto?.enabled ? 'on' : ''}`} disabled={!auto || busy} onClick={() => {
            setBusy(true)
            void rpc('usage.autoCheckin', { enabled: !auto?.enabled }).then(value => { if (mounted.current) setAuto(value.autoCheckin) })
              .catch(failure => { if (mounted.current) setError(failure.message) }).finally(() => { if (mounted.current) setBusy(false) })
          }}><span /></button>
      </div>
    </div>
    {error && <div className="channel-error" role="alert"><CircleAlert size={16} /><span>{error}</span><Button variant="ghost" onClick={() => { void reload() }}>Retry</Button></div>}
    {selectedProvider ? <div className="provider-detail" data-testid="provider-detail">
      <div className="provider-detail-top"><Button variant="outline" onClick={() => select(undefined)}><ArrowLeft size={15} />Back to all channels</Button>
        <span>Account credentials are stored in a local standalone directory</span></div>
      <div className="provider-detail-layout"><Card className="provider-detail-sidebar"><h2 tabIndex={-1} ref={detailHeading}>{selectedProvider.name}</h2><p>{selectedProvider.org}</p>
        <div className="detail-label">Switch channel</div>{providers.map(provider => <button className={`detail-provider-link ${provider.id === selected ? 'active' : ''}`} key={provider.id}
          onClick={() => select(provider.id)}><span>{provider.name}</span>{provider.id === selected && <Check size={14} />}</button>)}</Card>
        <div className="provider-detail-main"><div className="provider-detail-description"><h2>Accounts & models</h2><p>Add accounts and manage free quota and available models.</p></div>
          <shared.ChannelCard key={selectedProvider.id} channel={selectedProvider} status={statuses?.[selectedProvider.id]} rpc={rpc} t={t} onChanged={onChanged} onError={onError} />
          <div className="detail-security-note"><ShieldCheck size={16} />Sign-in, renewal and quota keep the original channel's rules. Account backups and provider options live under “Providers & backups”.</div>
        </div></div>
    </div> : <>
      <div className="channel-toolbar"><div className="channel-search"><Search size={17} /><Input aria-label="Search channels" placeholder="Search a channel or provider…" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <div className="channel-filters" aria-label="Filter channels by status">{[['all', 'All channels'], ['connected', 'Connected'], ['pending', 'Not connected']].map(([id, label]) =>
          <button key={id} aria-pressed={filter === id} disabled={id !== 'all' && !statuses} onClick={() => setFilter(id)}>{label}<span>{id === 'all' || statuses ? counts[id] : '—'}</span></button>)}</div>
      </div>
      <div className="channel-results-meta"><span>{rows.length} channels</span><span><SlidersHorizontal size={13} />Manage accounts and quota per provider</span></div>
      <div className="provider-grid">{rows.map(provider => {
        const status = statuses?.[provider.id]
        const state = status === undefined ? 'Reading' : status.closed ? 'Turned off' : (status.accounts?.enabled ?? 0) > 0 ? 'Connected' : 'Not connected'
        return <Card className="provider-card" key={provider.id}>
          <div className="provider-card-top"><span className="provider-logo" style={{ color: provider.accent, backgroundColor: `${provider.accent}0d` }}>{provider.name.slice(0, 2).toUpperCase()}</span>
            <Badge tone={state === 'Connected' ? 'success' : 'neutral'}>{state === 'Connected' && <span className="status-dot" />}{state}</Badge></div>
          <h2>{provider.name}</h2><div className="provider-org">{provider.org}</div><p className="provider-description">{provider.note}</p>
          <div className="provider-counts"><span>Accounts <strong>{status ? status.accounts?.total ?? 0 : '—'}</strong></span>
            <span>Models <strong>{status ? Math.max(0, (status.models?.total ?? 0) - (status.models?.disabled ?? 0)) : '—'}</strong></span></div>
          <Button variant="outline" className="provider-manage" onClick={() => select(provider.id)}>Manage channel <ArrowRight size={14} /></Button>
        </Card>
      })}</div>
      {rows.length === 0 && <Card className="channel-empty"><Search size={24} /><h2>No matching channels</h2><p>Try another name, or switch the filter.</p><Button variant="outline" onClick={() => { setSearch(''); setFilter('all') }}>Reset filters</Button></Card>}
    </>}
  </>
}
