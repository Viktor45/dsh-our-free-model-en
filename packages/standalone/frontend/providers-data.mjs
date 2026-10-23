/** English labels for the account-channel roster the shared page renders.
 * The shared vendor/organisation fields come from the plugin dictionary; the
 * standalone console shows its own copy so the page reads in one language. */
export const providerCopy = {
  lobsterai: { org: 'Youdao', note: 'Lobster · daily check-in credits' },
  qoder: { org: 'Alibaba', note: '100 credits a day, encrypted inference endpoint' },
  qodercn: { org: 'Alibaba', note: 'China endpoint and model pool' },
  trae: { org: 'ByteDance', note: 'Phone-number sign-in' },
  cline: { org: 'Cline', note: 'Free quota on a Cline account' },
  loomy: { org: 'iFlytek', note: 'WeChat QR scan, SMS code as a fallback' },
  raccoon: { org: 'SenseTime', note: 'Phone-number sign-in' },
  minimax: { org: 'MiniMax', note: 'Device code + PKCE, daily check-in' },
  zcode: { org: 'Zhipu', note: 'Browser sign-in (needs a browser on this machine)' },
  gemini: { org: 'Google Code Assist', note: 'Local-callback OAuth free tier' },
}

export const providerLabel = provider => ({
  ...provider,
  name: provider.id === 'qodercn' ? 'Qoder China' : provider.name,
  org: providerCopy[provider.id]?.org ?? provider.org,
  note: providerCopy[provider.id]?.note ?? provider.note,
})
