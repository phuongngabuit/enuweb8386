const R = window.React
const mk = (spread) => (type, props, key) => {
  const { children, ...rest } = props || {}
  if (key !== undefined) rest.key = key
  if (children === undefined) return R.createElement(type, rest)
  return spread ? R.createElement(type, rest, ...children) : R.createElement(type, rest, children)
}
module.exports = { jsx: mk(false), jsxs: mk(true), Fragment: R.Fragment }
