/** 赞助内容与每日公告交互：浏览器专用，不读取账号或调用赞助商接口。 */
export const SPONSOR = Object.freeze({
  title: 'Advertisement from our sponsor',
  name: 'Beichen API',
  url: 'https://beichenapi.com/register?aff=DL49WAC2DQNG',
  invite: 'DL49WAC2DQNG',
  greeting: 'With apologies, dear friends:',
  paragraphs: [
    'To keep renting the servers we run this plugin on (extremely expensive — there are only a few of us penniless students), we had to take a little advertising and earn a small commission. We are genuinely sorry for that; it all goes to raising server concurrency and the account pool (100% to improve the experience and keep operations running) (we had an unexpected surge of popularity, our small server simply died, and we had to pay to replace it), so it really was not a choice we wanted to make. If the ads hurt your experience, please be understanding.',
    'This plugin exists to give everyone free compute to learn with. Response times can indeed be slow, but we are improving them as much as we can. (No, this is not a trick to farm stars — the recent surge of popularity was a genuine surprise.) If responses are slow, it may be that many people are using it at once; thank you for your patience.',
    'About the ads: they pay for the servers and operations, and they come from commissions when people use the relay. (So if you can, please do use our invite code ʕ  •ᴥ•ʔ)',
    'This is our advertiser’s relay service. The group link on their home page leads to the group owner if you want to try it; it offers quality capacity for foreign large models (obviously that has to be guaranteed, otherwise we would not dare to display the partnership). If you want to try top foreign models (go ahead, be a bold pelican), please consider using our link. (We are begging you: do not skip the invite code — one of our members will do anything for it ( •̥́ ˍ •̀ू ))',
    '(•‾̑⌣‾̑•)✧˖ If you want paid compute capacity, please consider the channel we offer (it really is a decent channel, with good pricing and quality). This project will keep running and stays free. Running this ad is a last resort… (Believe us, we really do not want to pocket the money, we just want to run this project well (which is why we rented a very expensive server), (ó﹏ò｡) and we are truly sorry to anyone who dislikes ads.)',
    'All in all, thank you for your support and for staying with us. (There is no need to support us through the relay if you would rather not — simply starring the project and using it already makes us very happy.) With sponsorship like this, we will absolutely keep making the ofm service better and better. Thank you, sincerely, once again.',
  ],
})

export const SPONSOR_DAY_KEY = 'ofm.sponsor.last-shown.v1'

/** 使用用户当地的日历日期，不能用 UTC 的 toISOString() 划分“今天”。 */
export function sponsorLocalDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 同源窗口共用 Web Lock；只有公告成功打开后才记账。存储禁用时跳过自动广告。 */
export async function claimSponsorDay({ storage, locks, now = () => new Date(), eligible = () => true, show = () => {} }) {
  const claim = () => {
    if (!eligible()) return false
    const day = sponsorLocalDay(now())
    try {
      if (storage.getItem(SPONSOR_DAY_KEY) === day) return false
      // 写入失败时不弹窗，避免刷新、重挂载或隐私模式下反复打扰。
      const previous = storage.getItem(SPONSOR_DAY_KEY)
      storage.setItem(SPONSOR_DAY_KEY, day)
      try { show() } catch (error) {
        if (previous === null) storage.removeItem(SPONSOR_DAY_KEY)
        else storage.setItem(SPONSOR_DAY_KEY, previous)
        throw error
      }
      return true
    } catch { return false }
  }
  try { return locks?.request ? await locks.request('ofm-sponsor-daily', claim) : claim() }
  catch { return false }
}

/** 两端共用 React 组件；插件通过构建脚本内联，独立端直接导入。 */
export function createSponsorUI(React, image, createPortal, variant = 'plugin') {
  const { createElement: h, useState, useEffect, useRef } = React
  const surfaceClass = `ofm-sponsor ofm-sponsor-${variant}`
  const icon = (name, size = 18) => h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    name === 'arrow' ? h('path', { d: 'M7 17 17 7M7 7h10v10' })
      : name === 'close' ? h('path', { d: 'm6 6 12 12M6 18 18 6' })
        : [h('path', { key: 1, d: 'M20 8v5a3 3 0 0 1-3 3H8a4 4 0 0 1-4-4V8zM20 9h1a2 2 0 0 1 0 4h-1M8 4v1m5-1v1' }), h('path', { key: 2, d: 'M4 20h16' })])

  function SponsorArticle() {
    const [copied, setCopied] = useState('')
    const copyTimer = useRef(null)
    useEffect(() => () => clearTimeout(copyTimer.current), [])
    const copy = async (value, label) => {
      try {
        await navigator.clipboard.writeText(value)
        setCopied(`${label} copied`)
      } catch { setCopied('Copying did not finish; select the text and copy it by hand.') }
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(''), 3000)
    }
    const paragraph = index => h('p', { key: index }, SPONSOR.paragraphs[index])
    return h('article', { className: 'ofm-sponsor-article' },
      h('div', { className: 'ofm-sponsor-intro' },
        h('div', null, h('h2', null, 'Keeping the free service going, together.'), h('p', null, 'A note from the OFM team, and an honest sponsorship invitation.')),
        h('span', { className: 'ofm-sponsor-seal', 'aria-hidden': true }, icon('cup', 26))),
      h('div', { className: 'ofm-sponsor-letter' },
        h('p', { className: 'ofm-sponsor-greeting' }, SPONSOR.greeting),
        paragraph(0), paragraph(1), paragraph(2),
        h('div', { className: 'ofm-sponsor-contact' },
          h('p', null, 'Here is the link with the invite code attached:'),
          h('a', { className: 'ofm-sponsor-url', href: SPONSOR.url, target: '_blank', rel: 'noopener noreferrer' }, SPONSOR.url, icon('arrow', 16)),
          h('div', { className: 'ofm-sponsor-copyrow' }, h('span', null, 'Invite code ', h('strong', null, SPONSOR.invite)),
            h('button', { type: 'button', onClick: () => copy(SPONSOR.invite, 'Invite code') }, 'Copy invite code')),
          h('span', { className: 'ofm-sponsor-copy-status', role: 'status' }, copied)),
        paragraph(3), paragraph(4), paragraph(5),
        h('div', { className: 'ofm-sponsor-signoff' }, h('span', null, 'Thank you for your understanding and your company'), h('strong', null, 'The OFM team'))),
      h('figure', { className: 'ofm-sponsor-evidence' },
        h('figcaption', null, h('strong', null, 'Also attached: the relay’s pelican test'), h('span', null, 'Report problems directly · the images below are supplied as-is')),
        h('img', { src: image, alt: 'Supplied generation samples: three images showing a cycling pelican and mountain-and-river scenes, with the model name, generation time and duration kept underneath.', width: 1227, height: 367, loading: 'lazy', decoding: 'async' })),
      h('div', { className: 'ofm-sponsor-end' }, h('p', null, 'If you are curious, take one step further.'),
        h('a', { className: 'ofm-sponsor-visit', href: SPONSOR.url, target: '_blank', rel: 'noopener noreferrer' }, 'Visit Beichen API', icon('arrow')), h('span', null, 'Sponsor site · includes the invite code')))
  }

  function SponsorPage() {
    return h('section', { className: surfaceClass + ' ofm-sponsor-page', 'aria-labelledby': 'ofm-sponsor-page-title' },
      h('header', { className: 'ofm-sponsor-pagehead' }, h('h1', { id: 'ofm-sponsor-page-title' }, SPONSOR.title), h('p', null, 'Beichen API × OFM · read the full text here whenever you like.')),
      h(SponsorArticle))
  }

  function SponsorNotice({ targetId, placement = 'below' }) {
    const dialog = useRef(null)
    const mounted = useRef(false)
    const closing = useRef(false)
    const animation = useRef(null)
    const previousFocus = useRef(null)
    const unlock = useRef(() => {})
    const [opened, setOpened] = useState(false)
    const [leaving, setLeaving] = useState(false)
    const finish = () => {
      dialog.current?.close()
      // 清除收起动画的 forwards 状态，否则同一界面跨日再打开会透明并卡住操作。
      animation.current?.cancel()
      animation.current = null
      unlock.current()
      if (mounted.current) { setOpened(false); setLeaving(false) }
    }
    const dismiss = () => {
      const node = dialog.current
      if (!node?.open || closing.current) return
      closing.current = true
      setLeaving(true)
      const target = document.getElementById(targetId)
      const focusedInside = node.contains(document.activeElement)
      const complete = () => {
        if (!mounted.current) return
        finish()
        if (focusedInside) (target ?? previousFocus.current)?.focus({ preventScroll: true })
        if (target && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          target.animate?.([{ outline: '2px solid currentColor', outlineOffset: '4px' }, { outline: '2px solid transparent', outlineOffset: '0px' }], { duration: 700, easing: 'ease-out' })
        }
      }
      if (target) {
        const rect = target.getBoundingClientRect()
        if (rect.left < 0 || rect.right > window.innerWidth || rect.top < 0 || rect.bottom > window.innerHeight) {
          target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
        }
      }
      if (!target || !node.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { complete(); return }
      const from = node.getBoundingClientRect(), to = target.getBoundingClientRect()
      if (to.bottom < 0 || to.top > window.innerHeight) { complete(); return }
      animation.current = node.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${to.x + to.width / 2 - from.x - from.width / 2}px, ${to.y + to.height / 2 - from.y - from.height / 2}px) scale(${Math.max(.08, to.width / from.width)}, ${Math.max(.04, to.height / from.height)})`, opacity: 0 },
      ], { duration: 440, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' })
      animation.current.finished.then(complete, complete)
    }
    useEffect(() => {
      mounted.current = true
      let cancelled = false
      const blockedByDialog = () => {
        const selector = 'dialog[open], [role="dialog"][aria-modal="true"]'
        // 插件挂在宿主设置弹窗中；菜单所在的这一层不是需要避让的其他弹窗。
        const hostDialog = variant === 'plugin' ? document.getElementById(targetId)?.closest(selector) : null
        return [...document.querySelectorAll(selector)].some(node => node !== dialog.current && node !== hostDialog && node.getClientRects().length > 0)
      }
      const show = () => {
        if (cancelled || document.hidden || !dialog.current || blockedByDialog()) throw new Error('not ready')
        previousFocus.current = document.activeElement
        dialog.current.showModal()
        closing.current = false
        const oldOverflow = document.body.style.overflow, oldPadding = document.body.style.paddingRight
        const gutter = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
        document.body.style.overflow = 'hidden'
        if (gutter) document.body.style.paddingRight = `${gutter + parseFloat(getComputedStyle(document.body).paddingRight || '0')}px`
        let restored = false
        unlock.current = () => { if (restored) return; restored = true; document.body.style.overflow = oldOverflow; document.body.style.paddingRight = oldPadding }
        setOpened(true)
      }
      const tryShow = () => {
        if (cancelled || document.hidden) return
        if (blockedByDialog()) { observe(); return }
        let storage
        try { storage = window.localStorage } catch { return }
        void claimSponsorDay({ storage, locks: navigator.locks, eligible: () => !cancelled && !document.hidden, show }).then(shown => {
          if (shown || storage.getItem(SPONSOR_DAY_KEY) === sponsorLocalDay()) observer.disconnect()
        }).catch(() => { observer.disconnect() })
      }
      const observer = new MutationObserver(tryShow)
      const observe = () => observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'aria-hidden'] })
      const timer = setTimeout(tryShow, 700)
      const onVisibility = () => { if (!document.hidden) tryShow() }
      // 宿主在 document 上用 Esc 关闭设置页；公告打开时先消费按键，保留设置页。
      const onKeyDown = event => {
        if (event.key !== 'Escape' || !dialog.current?.open) return
        event.preventDefault()
        event.stopPropagation()
        dismiss()
      }
      document.addEventListener('visibilitychange', onVisibility)
      document.addEventListener('keydown', onKeyDown, true)
      return () => {
        cancelled = true; mounted.current = false
        clearTimeout(timer)
        observer.disconnect()
        document.removeEventListener('visibilitychange', onVisibility)
        document.removeEventListener('keydown', onKeyDown, true)
        animation.current?.cancel()
        dialog.current?.close()
        unlock.current()
      }
    }, [])
    return createPortal(h('dialog', { ref: dialog, className: `${surfaceClass} ofm-sponsor-dialog${leaving ? ' is-closing' : ''}`, 'aria-labelledby': 'ofm-sponsor-dialog-title', 'aria-describedby': 'ofm-sponsor-dialog-description', 'data-placement': placement,
      onCancel: event => { event.preventDefault(); dismiss() },
      onClick: event => { if (event.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dismiss() } } },
      h('header', { className: 'ofm-sponsor-dialoghead' }, h('div', null, h('h2', { id: 'ofm-sponsor-dialog-title' }, SPONSOR.title), h('p', { id: 'ofm-sponsor-dialog-description' }, 'Beichen API × OFM · shown once on the first visit of each day')),
        h('button', { type: 'button', className: 'ofm-sponsor-close', autoFocus: true, onClick: dismiss, 'aria-label': 'Fold the notice back into the sponsor menu', title: 'Fold into the sponsor menu (Esc)' }, icon('close'))),
      h('div', { className: 'ofm-sponsor-scroll', tabIndex: 0, role: 'region', 'aria-label': 'Full advertisement text, scrollable' }, opened ? h(SponsorArticle) : null),
      h('footer', { className: 'ofm-sponsor-dialogfoot' }, h('p', null, 'No need to read it all — you can fold it away at any time.', h('span', null, 'The full text stays in the sponsor menu.')),
        h('button', { type: 'button', className: 'ofm-sponsor-fold', onClick: dismiss }, 'Fold into menu', icon('arrow', 16)))), document.body)
  }
  return { SponsorPage, SponsorNotice }
}
