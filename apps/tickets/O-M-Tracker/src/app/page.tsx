'use client';

import { useEffect, useState } from 'react';
import { PortfolioSummary } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { CapacityChart } from '@/components/charts/CapacityChart';
import { ContractStatusChart } from '@/components/charts/ContractStatusChart';
import { Building2, Zap, PoundSterling, Calendar, TrendingUp, Award, Wrench } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  summary: PortfolioSummary;
  revenueHistory: { month: string; revenue: number; sites: number }[];
  capacityBySpv: { spv: string; capacity: number; contracted: number }[];
  topSites: { id: string; name: string; spv: string; capacity: number; monthlyFee: number }[];
  siteTypeBreakdown: { rooftop: number; groundMount: number };
  contractStatus: { contracted: number; nonContracted: number };
}

// CM Days History
const cmHistory = [
  { month: 'November 2025', allowed: 1.60, used: 0.75 },
  { month: 'October 2025', allowed: 1.60, used: 1.45 },
  { month: 'September 2025', allowed: 1.55, used: 1.20 },
  { month: 'August 2025', allowed: 1.55, used: 0.50 },
  { month: 'July 2025', allowed: 1.50, used: 1.50 },
  { month: 'June 2025', allowed: 1.50, used: 0.80 },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate CM Days
  const contractedCapacityMW = (data?.summary?.contractedCapacityKwp || 19200) / 1000;
  const cmAllowed = contractedCapacityMW / 12;
  const cmUsed = cmHistory[0].used;
  const cmRemaining = Math.max(0, cmAllowed - cmUsed);
  const cmPercent = (cmUsed / cmAllowed) * 100;

  if (isLoading) {
    return (
      <div className="main-content flex items-center justify-center" style={{ height: '100vh' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Portfolio Overview - {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="content" style={{ padding: '24px 32px' }}>
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="card stat-card-blue">
            <div className="card-header">
              <span className="card-title">Total Sites</span>
              <div className="card-icon blue">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="card-value">{summary?.totalSites || 0}</div>
            <div className="card-sub">
              <span>{summary?.contractedSites || 0}</span> contracted
            </div>
          </div>

          <div className="card stat-card-amber">
            <div className="card-header">
              <span className="card-title">Total Capacity</span>
              <div className="card-icon amber">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="card-value">{formatNumber((summary?.totalCapacityKwp || 0) / 1000, 1)} MW</div>
            <div className="card-sub">
              <span>{formatNumber((summary?.contractedCapacityKwp || 0) / 1000, 1)} MW</span> contracted
            </div>
          </div>

          <div className="card stat-card-green">
            <div className="card-header">
              <span className="card-title">Monthly Revenue</span>
              <div className="card-icon green">
                <PoundSterling className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="card-value">{formatCurrency(summary?.totalMonthlyFee || 0)}</div>
            <div className="card-sub">
              <span>{formatCurrency((summary?.totalMonthlyFee || 0) * 12)}</span> annually
            </div>
          </div>

          <div className="card stat-card-purple">
            <div className="card-header">
              <span className="card-title">Current Tier</span>
              <div className="card-icon purple">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="card-value">{summary?.currentTier || '20-30MW'}</div>
            <div className="card-sub">
              <span>£1.80</span>/kWp rate
            </div>
          </div>
        </div>

        {/* CM Days Tracker */}
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <div className="chart-header">
            <div className="chart-title">
              <Wrench className="h-5 w-5" />
              Corrective Maintenance Days
            </div>
            <span className="badge badge-blue">November 2025</span>
          </div>
          
          <div className="cm-tracker">
            <div className="cm-stat cm-stat-allowed">
              <div className="cm-stat-label">ALLOWED / MONTH</div>
              <div className="cm-stat-value">{cmAllowed.toFixed(2)}</div>
              <div className="cm-stat-unit">days</div>
            </div>
            <div className="cm-stat cm-stat-used">
              <div className="cm-stat-label">USED THIS MONTH</div>
              <div className="cm-stat-value">{cmUsed.toFixed(2)}</div>
              <div className="cm-stat-unit">days</div>
            </div>
            <div className="cm-stat cm-stat-remaining">
              <div className="cm-stat-label">REMAINING</div>
              <div className="cm-stat-value">{cmRemaining.toFixed(2)}</div>
              <div className="cm-stat-unit">days</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div className="progress-bar-header">
              <span style={{ color: 'var(--text-muted)' }}>Usage Progress</span>
              <span style={{ fontWeight: 600 }}>{cmPercent.toFixed(1)}% used</span>
            </div>
            <div className="progress-bar">
              <div 
                className={`progress-bar-fill ${cmPercent >= 100 ? 'exceeded' : cmPercent >= 80 ? 'warning' : 'under'}`}
                style={{ width: `${Math.min(cmPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Formula */}
          <div className="formula-box">
            <strong>Formula:</strong> CM Days Allowed = Contracted Capacity (MW) ÷ 12 = {contractedCapacityMW.toFixed(1)} MW ÷ 12 = {cmAllowed.toFixed(2)} days/month
          </div>
        </div>

        {/* CM Days History */}
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <div className="chart-header">
            <div className="chart-title">📊 CM Days History</div>
            <span className="badge badge-green">Last 6 months</span>
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

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Revenue Trend */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Revenue Trend
              </div>
              <span className="badge badge-blue">Last 12 months</span>
            </div>
            {data?.revenueHistory && data.revenueHistory.length > 0 ? (
              <RevenueChart data={data.revenueHistory} />
            ) : (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Import data to see revenue trends
              </div>
            )}
          </div>

          {/* Contract Status */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Contract Status</div>
            </div>
            {data?.contractStatus ? (
              <ContractStatusChart 
                contracted={data.contractStatus.contracted}
                nonContracted={data.contractStatus.nonContracted}
              />
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No data available
              </div>
            )}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Contracted</span>
                <span style={{ fontWeight: 500 }}>{data?.contractStatus?.contracted || 0} sites</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Not Contracted</span>
                <span style={{ fontWeight: 500 }}>{data?.contractStatus?.nonContracted || 0} sites</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="bottom-grid">
          {/* Capacity by SPV */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Capacity by SPV</div>
              <Link href="/spvs" className="site-link">View all →</Link>
            </div>
            {data?.capacityBySpv && data.capacityBySpv.length > 0 ? (
              <CapacityChart data={data.capacityBySpv} />
            ) : (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Import data with SPV assignments to see breakdown
              </div>
            )}
          </div>

          {/* Top Earning Sites */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">
                <Award className="h-5 w-5 text-amber-500" />
                Top Earning Sites
              </div>
              <Link href="/sites" className="site-link">View all →</Link>
            </div>
            {data?.topSites && data.topSites.length > 0 ? (
              <div style={{ marginTop: '8px' }}>
                {data.topSites.map((site, index) => (
                  <Link 
                    key={site.id}
                    href={`/sites/${site.id}`}
                    className="top-site"
                  >
                    <div className="top-site-info">
                      <div className={`top-site-rank ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-default'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="top-site-name">{site.name}</div>
                        <div className="top-site-meta">{site.spv || 'No SPV'} • {formatNumber(site.capacity, 0)} kWp</div>
                      </div>
                    </div>
                    <div className="top-site-fee">
                      {formatCurrency(site.monthlyFee)}
                      <span>/mo</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No contracted sites yet
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="chart-card">
          <div className="chart-title" style={{ marginBottom: '16px' }}>Quick Actions</div>
          <div className="actions-grid">
            <Link href="/sites" className="action-card">
              <div className="action-icon">🏢</div>
              <div className="action-title">View All Sites</div>
              <div className="action-desc">Browse and manage your portfolio sites</div>
            </Link>
            <Link href="/cmdays" className="action-card">
              <div className="action-icon">🔧</div>
              <div className="action-title">CM Days Tracker</div>
              <div className="action-desc">Log and track corrective maintenance</div>
            </Link>
            <Link href="/import" className="action-card">
              <div className="action-icon">📥</div>
              <div className="action-title">Import from Excel</div>
              <div className="action-desc">Bulk import sites from spreadsheet</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
