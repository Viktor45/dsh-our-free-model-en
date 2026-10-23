/** Copy for the model-visibility controls. The standalone console renders in
 * English only, so this returns one set of labels; the argument is kept because
 * callers pass the document language. */
export function visibilityCopy(locale) {
  return {
    hideFree: 'Hide anonymous and Kilo free models',
    hideEac: 'Hide EAC models',
    hide: 'Hide model',
    show: 'Show model',
    hidden: 'Hidden by preference',
    groupHidden: 'Turn off group hiding first',
    saved: 'Model visibility saved',
  }
}
