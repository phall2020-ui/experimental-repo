'use client';

import { useEffect, useState } from 'react';
import { SiteWithCalculations } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { Plus, Search, Download } from 'lucide-react';
import Link from 'next/link';

export default function SitesPage() {
  const [sites, setSites] = useState<SiteWithCalculations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      const data = await res.json();
      
      if (data.success) {
        setSites(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch sites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (site: SiteWithCalculations) => {
    if (!confirm(`Are you sure you want to delete "${site.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setSites((prev) => prev.filter((s) => s.id !== site.id));
      } else {
        alert('Failed to delete site');
      }
    } catch (err) {
      alert('Failed to delete site');
    }
  };

  // Filter sites based on search
  const filteredSites = sites.filter(site => 
    site.name.toLowerCase().includes(search.toLowerCase()) ||
    site.spv?.toLowerCase().includes(search.toLowerCase()) ||
    site.siteType?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate totals
  const totalCapacity = filteredSites.reduce((sum, s) => sum + (s.capacityKwp || 0), 0);
  const totalMonthlyFee = filteredSites.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
  const contractedCount = filteredSites.filter(s => s.contracted).length;

  if (isLoading) {
    return (
      <div className="main-content flex items-center justify-center" style={{ height: '100vh' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header">
        <h1>Sites</h1>
        <p>{sites.length} sites in portfolio</p>
      </div>

      <div className="content" style={{ padding: '24px 32px' }}>
        {/* Summary Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
          <div className="card stat-card-blue">
            <div className="card-header">
              <span className="card-title">Total Sites</span>
            </div>
            <div className="card-value">{filteredSites.length}</div>
            <div className="card-sub"><span>{contractedCount}</span> contracted</div>
          </div>
          <div className="card stat-card-amber">
            <div className="card-header">
              <span className="card-title">Total Capacity</span>
            </div>
            <div className="card-value">{formatNumber(totalCapacity / 1000, 1)} MW</div>
            <div className="card-sub">{formatNumber(totalCapacity, 0)} kWp</div>
          </div>
          <div className="card stat-card-green">
            <div className="card-header">
              <span className="card-title">Monthly Revenue</span>
            </div>
            <div className="card-value">{formatCurrency(totalMonthlyFee)}</div>
            <div className="card-sub"><span>{formatCurrency(totalMonthlyFee * 12)}</span> annually</div>
          </div>
          <div className="card stat-card-purple">
            <div className="card-header">
              <span className="card-title">Avg Fee/kWp</span>
            </div>
            <div className="card-value">£{totalCapacity > 0 ? (totalMonthlyFee / totalCapacity * 12).toFixed(2) : '0.00'}</div>
            <div className="card-sub">per year</div>
          </div>
        </div>

        {/* Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="search-box">
            <Search className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search sites..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ padding: '8px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download className="h-4 w-4" />
              Export
            </button>
            <Link href="/sites/new">
              <button style={{ padding: '8px 16px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus className="h-4 w-4" />
                Add Site
              </button>
            </Link>
          </div>
        </div>

        {/* Sites Table */}
        <div className="chart-card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>SPV</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Monthly Fee</th>
                  <th>Contracted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSites.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      {search ? 'No sites match your search' : 'No sites yet. Import or add sites to get started.'}
                    </td>
                  </tr>
                ) : (
                  filteredSites.map((site) => (
                    <tr key={site.id}>
                      <td>
                        <Link href={`/sites/${site.id}`} className="site-link" style={{ fontWeight: 500 }}>
                          {site.name}
                        </Link>
                      </td>
                      <td>
                        {site.spv ? (
                          <span className="badge badge-blue">{site.spv}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>{site.siteType || '—'}</td>
                      <td>{formatNumber(site.capacityKwp || 0, 0)} kWp</td>
                      <td style={{ fontWeight: 600, color: 'var(--green)' }}>
                        {formatCurrency(site.monthlyFee || 0)}
                      </td>
                      <td>
                        <span className={`status-badge ${site.contracted ? 'status-yes' : 'status-no'}`}>
                          {site.contracted ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link href={`/sites/${site.id}`}>
                            <button style={{ padding: '4px 10px', background: 'white', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                              View
                            </button>
                          </Link>
                          <button 
                            onClick={() => handleDelete(site)}
                            style={{ padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#dc2626' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
