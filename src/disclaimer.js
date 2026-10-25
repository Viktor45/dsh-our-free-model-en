/**
 * The disclaimer copy both surfaces show: the plugin's settings page and the
 * standalone/desktop console.
 *
 * The product carries no WorkBuddy and no Huawei Cloud channel. Those two are
 * excluded mechanically (`src/magpie-policy.js`, and the aggregate registry
 * through it), but an exclusion with no explanation leaves a user wondering
 * whether the channel is broken. This copy answers the two questions that
 * matter instead: those channels are not part of what this build offers, and
 * anything a user does with a channel is their own responsibility.
 *
 * The copy is data, not markup: each surface renders it in its own idiom, so
 * there is exactly one place to change what the product says. It is deliberately
 * short — a wall of legal text is read by nobody — and states the project's
 * purpose plainly, because that is the honest description of what it is.
 */

export const DISCLAIMER_VERSION = 2

/** Channels this build does not offer, named for the reader. */
export const EXCLUDED_CHANNELS = Object.freeze([
  'WorkBuddy China (workbuddy, also known as CodeBuddy)',
  'WorkBuddy International (workbuddy-ai)',
  'Huawei Cloud Huawei Cloud MaaS (huaweicloud, including Token Plan)',
])

export const DISCLAIMER = Object.freeze({
  version: DISCLAIMER_VERSION,
  title: 'Terms of use & disclaimer',
  subtitle: 'About the channels this plugin does not offer, and the limits of what is your responsibility',
  intro: 'This plugin is a personal learning and technical research project. It exists to study model gateways, protocol adapters and local routing, is provided as-is, and is not a commercial service or a product promise.',
  sections: Object.freeze([
    {
      id: 'excluded',
      heading: 'This plugin does not offer these three channels',
      body: 'This plugin does not contain and does not offer WorkBuddy China (workbuddy, also known as CodeBuddy), WorkBuddy International (workbuddy-ai), or Huawei Cloud Huawei Cloud MaaS (huaweicloud, including Token Plan). All three are removed on both the plugin side and the desktop side: they appear in no channel list, preset, sign-in entry, plugin market or model catalog, and they cannot be enabled by importing a configuration or installing a third-party plugin. Their absence from the catalog is not a fault — it is a deliberate choice of this project, and later updates will not bring them back.',
    },
    {
      id: 'responsibility',
      heading: 'Third-party channels are not our business',
      body: 'If you use any of the channels above, or any other third-party service, in any way outside this plugin — configuring an address yourself, importing credentials, installing third-party software, or signing in to somebody else\'s account — that is your own personal action. It is unrelated to this project\'s author and team. We do not take part in it, we do not endorse it, we do not support it, and we accept no responsibility for its availability, its compliance, or any of its consequences.',
    },
    {
      id: 'accounts',
      heading: 'You are responsible for your accounts and credentials',
      body: 'This plugin only stores the credentials you import on your own machine and never uploads them to any server. Make sure the way you use those accounts complies with the terms of the corresponding provider and with the law where you live; bans, charges, data risks and any other loss arising from that use are borne by the user.',
    },
    {
      id: 'no-warranty',
      heading: 'No warranty of any kind',
      body: 'This project makes no express or implied warranty of correctness, stability, fitness for sale or fitness for a particular purpose. The author and the team accept no liability for any direct or indirect loss caused by the use of this plugin. Assess the risks yourself, and follow the laws and provider agreements of your own jurisdiction first.',
    },
    {
      id: 'lawful',
      heading: 'Use it lawfully',
      body: 'This project is for personal learning and technical research only. Do not use it to violate provider terms, to bypass authorization limits, to abuse quotas in bulk, or for any other unlawful purpose. Any dispute, claim or legal liability arising from improper use is borne by the user.',
    },
  ]),
  accept: 'I have read and understood',
  reopen: 'View the disclaimer',
})

/** Whether a stored acknowledgement matches the current copy version. */
export function disclaimerAcknowledged(settings) {
  return Number(settings?.disclaimerAck) === DISCLAIMER_VERSION
}
