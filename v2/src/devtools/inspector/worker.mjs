import { check }  from './checker.mjs'
import { lint }   from './linter.mjs'
import { format } from './formatter.mjs'

self.onmessage = function(e) {
  const { type, source, options, _id } = e.data
  const reply = data => self.postMessage({ ...data, _id })
  try {
    if (type === 'check')  reply({ type: 'result', ...check(source) })
    if (type === 'lint')   reply({ type: 'result', warnings: lint(source, options?.rules) })
    if (type === 'format') reply({ type: 'result', ...format(source, options) })
  } catch (err) {
    reply({ type: 'error', message: err.message })
  }
}
