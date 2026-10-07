import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

const filings = [{ id: 'gst-1', title: 'GSTR-3B October', type: 'GST', dueDate: '2026-10-20', status: 'upcoming', assignee: 'Aditi Sharma', notes: 'Reconcile records' }];
const dashboard = { summary: { total: 1, upcoming: 1, overdue: 0, completed: 0 }, nextDeadline: filings[0] };
const settings = { businessName: 'Studio Vertex', gstin: '27AABCU9603R1ZM', financialYear: '2026-27', alerts: { email: true, overdue: true, digest: false } };

function response(body, ok = true) { return Promise.resolve({ ok, json: () => Promise.resolve(body) }); }

describe('DueDate dashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (url === '/api/filings' && !options.method) return response(filings);
      if (url === '/api/dashboard') return response(dashboard);
      if (url === '/api/settings' && !options.method) return response(settings);
      if (url === '/api/filings' && options.method === 'POST') return response({ ...filings[0], id: 'new-filing' });
      if (url === '/api/settings' && options.method === 'PUT') return response(JSON.parse(options.body));
      if (String(url).startsWith('/api/filings/') && options.method === 'PATCH') return response({ ...filings[0], status: 'completed' });
      return response({});
    }));
  });

  it('renders loaded filing data from the API', async () => {
    render(<App />);
    expect((await screen.findAllByText('GSTR-3B October')).length).toBeGreaterThan(0);
    expect(screen.getByText('Total filings')).toBeInTheDocument();
  });

  it('shows an error notice when initial API requests fail', async () => {
    global.fetch.mockResolvedValueOnce(response({}, false)).mockResolvedValueOnce(response({}, false)).mockResolvedValueOnce(response({}, false));
    render(<App />);
    expect(await screen.findByText('Unable to load workspace data.')).toBeInTheDocument();
  });

  it('submits a filing form and reloads the dashboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText('GSTR-3B October');
    await user.click(screen.getByRole('button', { name: /add filing/i }));
    await user.type(screen.getByPlaceholderText(/gstr-1/i), 'GSTR-1 November');
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-11-11' } });
    await user.click(screen.getByRole('button', { name: /add deadline/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/filings', expect.objectContaining({ method: 'POST' })));
  });

  it('navigates to settings and persists edited business information', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findAllByText('GSTR-3B October');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const input = screen.getByLabelText('Business name');
    await user.clear(input);
    await user.type(input, 'Deadline Labs');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/settings', expect.objectContaining({ method: 'PUT' })));
    expect(await screen.findByText('Workspace settings saved to MongoDB.')).toBeInTheDocument();
  });
});
