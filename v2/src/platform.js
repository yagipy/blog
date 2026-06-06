/**
 * @typedef {Object} Platform
 * @property {Document} document
 * @property {Storage} localStorage
 * @property {Navigator} navigator
 * @property {Location} location
 * @property {Window} window
 * @property {typeof fetch} fetch
 * @property {typeof setInterval} setInterval
 */

/** @type {Platform} */
export const platform = {
  document,
  localStorage,
  navigator,
  location,
  window,
  fetch:       (...args) => fetch(...args),
  setInterval: (...args) => setInterval(...args),
}
