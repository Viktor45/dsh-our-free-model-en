#!/usr/bin/env node
import path from 'node:path'
import { startStandalone } from './service.mjs'

const usage = `Our Free Model standalone local service
Usage: node packages/standalone/cli.mjs [options]

  --port <port>       Listening port, 18900 by default (picks a free one on conflict)
  --data-dir <dir>    Data directory, OFM_HOME or ~/.our-free-model by default
  --no-refresh        Skip the startup and periodic refresh; manual refresh and inference still work
  --probe             Disabled (kept for compatibility): automatic probing sends no requests
  --lan               Enable and save the LAN inference relay (separate key; management stays local-only)
  --no-lan            Disable and save the LAN inference relay
  --lan-port <port>   Save the desired LAN port, 0 by default; does not enable the relay on its own
  --help              Show this help
`

async function main() {
  const options = {}
  for (let index = 2; index < process.argv.length; index++) {
    const flag = process.argv[index]
    if (flag === '--help') { process.stdout.write(usage); return }
    if (flag === '--no-refresh') { options.refresh = false; continue }
    if (flag === '--probe') { options.probe = true; continue }
    if (flag === '--lan' || flag === '--no-lan') { options.lanEnabled = flag === '--lan'; continue }
    if (!['--port', '--data-dir', '--lan-port'].includes(flag) || !process.argv[index + 1] || process.argv[index + 1].startsWith('--')) {
      throw new Error(`Unknown option or missing value: ${flag}`)
    }
    const value = process.argv[++index]
    if (flag === '--port' || flag === '--lan-port') {
      if (!/^\d+$/.test(value) || Number(value) > 65535) throw new Error('The port must be a whole number between 0 and 65535')
      options[flag === '--port' ? 'port' : 'lanPort'] = Number(value)
    } else options.dataDir = path.resolve(value)
  }
  const service = await startStandalone(options)
  let stopping = false
  const shutdown = () => {
    if (stopping) return
    stopping = true
    void service.close().catch(error => {
      process.stderr.write(`Shutdown failed: ${error.message}\n`)
      process.exitCode = 1
    })
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  process.stdout.write(`${service.product} ${service.version}\nManagement page (one-time sign-in, valid for 10 minutes): ${service.managementUrl}\nAPI: ${service.url}/v1\nAPI key stored at: ${service.keyFile}\n`)
  if (service.lan.running) {
    process.stdout.write(`LAN API: ${service.lan.baseUrls.join(', ') || `port ${service.lan.port}`}\nLAN key: read it in the local management API (separate from the local API key)\n`)
  } else if (service.lan.error) process.stderr.write(`${service.lan.error}\n`)
}

main().catch(error => {
  process.stderr.write(`Startup failed: ${error.code === 'EEXIST' ? 'a service is already running on this data directory, or the owner of service.lock cannot be confirmed; stop the running service first. Windows and Linux reclaim stale locks once the owning process is confirmed gone.' : error.message}\n`)
  process.exitCode = 1
})
