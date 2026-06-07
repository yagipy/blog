import { platform } from '../platform.mjs'

export const isLocal = platform.location.hostname === 'localhost' || platform.location.hostname === '127.0.0.1' || platform.location.hostname === '[::1]'
