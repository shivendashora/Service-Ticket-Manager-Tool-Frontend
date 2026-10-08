export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// FastAPI returns `detail` as a string, or as a list of validation errors
const extractMessage = (body, fallback) => {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
        return field && typeof field === 'string' ? `${field}: ${d.msg}` : d.msg;
      })
      .join(', ');
  }
  return body?.message || fallback;
};

async function request(path, { method = 'GET', body, form, query } = {}) {
  let url = `${API_URL}${path}`;
  if (query) {
    const params = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    if ([...params].length) url += `?${params}`;
  }

  const options = { method, credentials: 'include', headers: {} };
  if (form) {
    options.body = form;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Cookie expired or missing: let the auth layer sign the user out
    if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/me')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(extractMessage(data, `Request failed (${res.status})`), res.status);
  }

  return data;
}

const buildAttachmentForm = (form, { links = [], images = [] }) => {
  links.filter(Boolean).forEach((link) => form.append('links', link));
  images.forEach((file) => form.append('images', file));
  return form;
};

export const authApi = {
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: { name, email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  googleLoginUrl: `${API_URL}/auth/google/login`,
};

export const ticketsApi = {
  list: (status) => request('/tickets', { query: { status } }).then((d) => d.tickets),
  get: (id) => request(`/tickets/${id}`).then((d) => d.ticket),
  create: ({ title, description, estimated_time, links, images }) => {
    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    if (estimated_time !== '' && estimated_time !== null && estimated_time !== undefined) {
      form.append('estimated_time', String(estimated_time));
    }
    buildAttachmentForm(form, { links, images });
    return request('/tickets', { method: 'POST', form }).then((d) => d.ticket);
  },
  update: (id, changes) =>
    request(`/tickets/${id}`, { method: 'PATCH', body: changes }).then((d) => d.ticket),
  remove: (id) => request(`/tickets/${id}`, { method: 'DELETE' }),
  addAttachments: (id, payload) =>
    request(`/tickets/${id}/attachments`, {
      method: 'POST',
      form: buildAttachmentForm(new FormData(), payload),
    }).then((d) => d.ticket),
  removeAttachment: (id, attachmentId) =>
    request(`/tickets/${id}/attachments/${attachmentId}`, { method: 'DELETE' }),
  assign: (ticketIds, userId) =>
    request('/assign-tickets', { method: 'POST', body: { ticket_id: ticketIds, to_user_id: userId } }),
  unassign: (id, userId) => request(`/tickets/${id}/assignees/${userId}`, { method: 'DELETE' }),
};

export const usersApi = {
  list: (role) => request('/users', { query: { role } }).then((d) => d.users),
  updateRole: (id, role) =>
    request(`/users/${id}/role`, { method: 'PATCH', body: { role } }).then((d) => d.user),
};

export const attachmentUrl = (attachment) =>
  attachment.type === 'image' ? `${API_URL}${attachment.url}` : attachment.url;
