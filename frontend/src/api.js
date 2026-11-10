export const editorToken = {
  get: () => { try { return localStorage.getItem('sf_editor_token') || '' } catch { return '' } },
  set: (v) => { try { localStorage.setItem('sf_editor_token', v) } catch { /* bỏ qua */ } },
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  if (path.startsWith('/editor')) headers['X-Editor-Token'] = editorToken.get()
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(path, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) })
  if (!res.ok) {
    let detail = `Lỗi ${res.status}`
    try { detail = (await res.json()).detail || detail } catch { /* giữ mặc định */ }
    const err = new Error(typeof detail === 'string' ? detail : 'Dữ liệu không hợp lệ')
    err.status = res.status
    throw err
  }
  return res.json()
}

export const media = (file) => (file ? `/media/${file}` : null)
export const fmtTs = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
export const fmtDate = (t) => (t ? new Date(t * 1000).toLocaleDateString('vi-VN') : '')
export const guideUrl = (slug, step) => `/huong-dan/${slug}${step != null ? `#buoc-${step + 1}` : ''}`
