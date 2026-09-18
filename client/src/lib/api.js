async function request(method, url, body, isFormData = false) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  upload: (url, formData) => request('POST', url, formData, true),
};
