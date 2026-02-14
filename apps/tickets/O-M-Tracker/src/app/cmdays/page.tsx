'use client';

import { useState } from 'react';
import { formatNumber } from '@/lib/calculations';
import { Wrench, Download, Plus } from 'lucide-react';

// Sample CM Days data
const cmHistory = [
  { month: 'November 2025', allowed: 1.60, used: 0.75 },
  { month: 'October 2025', allowed: 1.60, used: 1.45 },
  { month: 'September 2025', allowed: 1.55, used: 1.20 },
  { month: 'August 2025', allowed: 1.55, used: 0.50 },
  { month: 'July 2025', allowed: 1.50, used: 1.50 },
  { month: 'June 2025', allowed: 1.50, used: 0.80 },
];

// Sample work log
const workLog = [
  { date: '15 Nov 2025', site: 'Valley View Solar', description: 'Inverter fault repair', hours: 4.0, technician: 'John Smith' },
  { date: '08 Nov 2025', site: 'Meadow Solar Farm', description: 'Panel cleaning after storm', hours: 2.0, technician: 'Mike Johnson' },
];

// Sample sites for dropdown
const sites = [
  'Meadow Solar Farm',
  'Hilltop Energy Park',
  'Valley View Solar',
  'Sunrise Industrial',
  'Northfield Array',
];

export default function CMDaysPage() {
  const [selectedSite, setSelectedSite] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');

  // Calculate CM Days
  const contractedCapacityMW = 19.2;
  const cmAllowed = contractedCapacityMW / 12;
  const cmUsed = cmHistory[0].used;
  const cmRemaining = Math.max(0, cmAllowed - cmUsed);

  // Calculate YTD rollover (unused days from previous months)
  const ytdRollover = cmHistory.slice(1).reduce((acc, row) => acc + Math.max(0, row.allowed - row.used), 0);

  // Total hours/days for current month
  const totalHours = workLog.reduce((acc, log) => acc + log.hours, 0);
  const totalDays = totalHours / 8;

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header">
        <h1>Corrective Maintenance Days</h1>
        <p>Track and manage CM day allowances</p>
      </div>

      <div className="content" style={{ padding: '24px 32px' }}>
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="card stat-card-green">
            <div className="card-header">
              <span className="card-title">Allowed</span>
              <div className="card-icon green">✓</div>
            </div>
            <div className="card-value" style={{ color: '#16a34a' }}>{cmAllowed.toFixed(2)}</div>
            <div className="card-sub">days this month</div>
          </div>

          <div className="card stat-card-amber">
            <div className="card-header">
              <span className="card-title">Used</span>
              <div className="card-icon amber">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="card-value" style={{ color: '#d97706' }}>{cmUsed.toFixed(2)}</div>
            <div className="card-sub">days used</div>
          </div>

          <div className="card stat-card-blue">
            <div className="card-header">
              <span className="card-title">Remaining</span>
              <div className="card-icon blue">⏳</div>
            </div>
            <div className="card-value" style={{ color: '#2563eb' }}>{cmRemaining.toFixed(2)}</div>
            <div className="card-sub">days left</div>
          </div>

          <div className="card stat-card-purple">
            <div className="card-header">
              <span className="card-title">YTD Rollover</span>
              <div className="card-icon purple">📊</div>
            </div>
            <div className="card-value" style={{ color: '#7c3aed' }}>+{ytdRollover.toFixed(2)}</div>
            <div className="card-sub">days banked</div>
          </div>
        </div>

        {/* Log CM Work */}
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <div className="chart-title" style={{ marginBottom: '16px' }}>
            <Plus className="h-5 w-5 inline mr-2" />
            Log CM Work
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Site</label>
              <select 
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'inherit' }}
              >
                <option value="">Select site...</option>
                {sites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Hours</label>
              <input 
                type="number" 
                placeholder="0.0" 
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Days (÷8)</label>
              <input 
                type="text" 
                value={(parseFloat(hours) / 8 || 0).toFixed(2)} 
                disabled 
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', background: '#f9fafb', fontFamily: 'inherit' }}
              />
            </div>
            <button style={{ padding: '10px 20px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Add
            </button>
          </div>
        </div>

        {/* CM Work Log */}
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <div className="chart-header">
            <div className="chart-title">📋 November 2025 Work Log</div>
            <button style={{ padding: '6px 12px', background: 'white', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
          <div className="table-container" style={{ marginTop: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Site</th>
                  <th>Description</th>
                  <th>Hours</th>
                  <th>Days</th>
                  <th>Technician</th>
                </tr>
              </thead>
              <tbody>
                {workLog.map((log, idx) => (
                  <tr key={idx}>
                    <td>{log.date}</td>
                    <td><a href="#" className="site-link">{log.site}</a></td>
                    <td>{log.description}</td>
                    <td>{log.hours.toFixed(1)}</td>
                    <td style={{ fontWeight: 600 }}>{(log.hours / 8).toFixed(2)}</td>
                    <td>{log.technician}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: '#f9fafb' }}>
                <tr>
                  <td colSpan={3} style={{ fontWeight: 600 }}>Total for November</td>
                  <td style={{ fontWeight: 600 }}>{totalHours.toFixed(1)} hrs</td>
                  <td style={{ fontWeight: 700, color: 'var(--amber)' }}>{totalDays.toFixed(2)} days</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Monthly History */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">📈 Monthly CM Usage History</div>
            <span className="badge badge-blue">Last 6 months</span>
          </div>
          <div className="table-container" style={{ marginTop: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Allowed</th>
                  <th>Used</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cmHistory.map((row, idx) => {
                  const remaining = Math.max(0, row.allowed - row.used);
                  const percent = (row.used / row.allowed) * 100;
                  let statusClass = 'status-yes';
                  let statusText = 'Under';
                  let statusStyle = {};
                  
                  if (percent >= 100) {
                    statusClass = 'status-no';
                    statusText = 'Exceeded';
                  } else if (percent >= 80) {
                    statusStyle = { background: '#fef3c7', color: '#b45309' };
                    statusText = 'Warning';
                  }
                  
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{row.month}</td>
                      <td>{row.allowed.toFixed(2)} days</td>
                      <td>{row.used.toFixed(2)} days</td>
                      <td style={{ color: remaining > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {remaining.toFixed(2)} days
                      </td>
                      <td>
                        <span className={`status-badge ${statusClass}`} style={statusStyle}>
                          {statusText}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          ({percent.toFixed(0)}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

