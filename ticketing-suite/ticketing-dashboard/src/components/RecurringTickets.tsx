import React, { useState, useEffect } from 'react';
import { API_BASE } from '../lib/api';
import axios from 'axios';

interface RecurringTicket {
  id: string;
  siteId: string;
  typeKey: string;
  description: string;
  priority: string;
  frequency: string;
  intervalValue: number;
  startDate: string;
  endDate?: string;
  leadTimeDays: number;
  isActive: boolean;
  nextScheduledAt: string;
  lastGeneratedAt?: string;
}

export default function RecurringTickets() {
  const [tickets, setTickets] = useState<RecurringTicket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    siteId: '',
    typeKey: '',
    description: '',
    priority: 'P2',
    frequency: 'MONTHLY',
    intervalValue: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    leadTimeDays: 7,
    details: '',
  });

  useEffect(() => {
    loadRecurringTickets();
  }, []);

  const loadRecurringTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/recurring-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to load recurring tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/recurring-tickets`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowForm(false);
      setFormData({
        siteId: '',
        typeKey: '',
        description: '',
        priority: 'P2',
        frequency: 'MONTHLY',
        intervalValue: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        leadTimeDays: 7,
        details: '',
      });
      loadRecurringTickets();
    } catch (error) {
      console.error('Failed to create recurring ticket:', error);
      alert('Failed to create recurring ticket');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE}/recurring-tickets/${id}`,
        { isActive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadRecurringTickets();
    } catch (error) {
      console.error('Failed to toggle recurring ticket:', error);
    }
  };

  const deleteRecurring = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring ticket?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/recurring-tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadRecurringTickets();
    } catch (error) {
      console.error('Failed to delete recurring ticket:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="row" style={{ marginBottom: '16px' }}>
        <h2>Recurring Tickets</h2>
        <div className="spacer" />
        <button className="primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Recurring Ticket'}
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: '16px' }}>
          <h3>Create Recurring Ticket</h3>
          <form onSubmit={handleSubmit}>
            <div className="row" style={{ gap: '8px', marginBottom: '8px' }}>
              <input
                placeholder="Site ID"
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                required
              />
              <input
                placeholder="Type Key"
                value={formData.typeKey}
                onChange={(e) => setFormData({ ...formData, typeKey: e.target.value })}
                required
              />
            </div>
            <input
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              style={{ width: '100%', marginBottom: '8px' }}
            />
            <textarea
              placeholder="Details (optional)"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              style={{ width: '100%', marginBottom: '8px', minHeight: '60px' }}
            />
            <div className="row" style={{ gap: '8px', marginBottom: '8px' }}>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              <input
                type="number"
                placeholder="Interval"
                value={formData.intervalValue}
                onChange={(e) => setFormData({ ...formData, intervalValue: parseInt(e.target.value) })}
                min="1"
                required
                style={{ width: '100px' }}
              />
            </div>
            <div className="row" style={{ gap: '8px', marginBottom: '8px' }}>
              <label>
                Start Date:
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </label>
              <label>
                End Date (optional):
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </label>
              <label>
                Lead Time (days):
                <input
                  type="number"
                  value={formData.leadTimeDays}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) })}
                  min="0"
                  required
                  style={{ width: '100px' }}
                />
              </label>
            </div>
            <button type="submit" className="primary">Create Recurring Ticket</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '12px' }}>
        {tickets.length === 0 ? (
          <div className="panel">No recurring tickets found</div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="panel">
              <div className="row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {ticket.description}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    {ticket.frequency} (every {ticket.intervalValue}{' '}
                    {ticket.frequency.toLowerCase()}) • Priority: {ticket.priority} • Lead time:{' '}
                    {ticket.leadTimeDays} days
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
                    Next scheduled: {new Date(ticket.nextScheduledAt).toLocaleDateString()}
                    {ticket.lastGeneratedAt && (
                      <> • Last generated: {new Date(ticket.lastGeneratedAt).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
                <div className="row" style={{ gap: '8px' }}>
                  <button
                    onClick={() => toggleActive(ticket.id, ticket.isActive)}
                    style={{
                      background: ticket.isActive ? 'var(--ok)' : 'var(--muted)',
                      color: '#fff',
                      border: 'none',
                    }}
                  >
                    {ticket.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => deleteRecurring(ticket.id)} style={{ background: 'var(--bad)', color: '#fff', border: 'none' }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
