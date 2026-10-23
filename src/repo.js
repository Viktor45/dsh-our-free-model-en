/**
 * The repository this build publishes from.
 *
 * One place names the fork, so the update channel, the announcement feed and
 * the catalog records cannot drift apart: a client that looks for updates at
 * one repository and a manifest published in another would fail every
 * signature check.
 *
 * This fork runs its own release channel. It pins its own Ed25519 key and
 * publishes its own signed manifest, so upstream's channel and this one are
 * separate trust roots — a client built from this tree accepts this
 * repository's manifests only.
 *
 * @module src/repo.js
 */

export const REPO = 'Viktor45/dsh-our-free-model-en'

/** The repository as a browsable https URL. */
export const REPO_URL = `https://github.com/${REPO}`
