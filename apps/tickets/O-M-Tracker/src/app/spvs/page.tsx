'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { Building, Zap, PoundSterling, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface SpvSummary {
  code: string;
  name: string;
  siteCount: number;
  contractedCount: number;
  totalCapacityKwp: number;
  contractedCapacityKwp: number;
  monthlyRevenue: number;
}

export default function SpvsPage() {
  const [spvs, setSpvs] = useState<SpvSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpvs();
  }, []);

  const fetchSpvs = async () => {
    try {
      const res = await fetch('/api/spvs/summary');
      const data = await res.json();
      
      if (data.success) {
        setSpvs(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch SPV data');
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = spvs.reduce((sum, s) => sum + s.monthlyRevenue, 0);
  const totalSites = spvs.reduce((sum, s) => sum + s.siteCount, 0);
  const totalCapacity = spvs.reduce((sum, s) => sum + s.totalCapacityKwp, 0);

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
        <h1>SPV Portfolio</h1>
        <p>Special Purpose Vehicle breakdown and invoicing</p>
      </div>

      <div className="content" style={{ padding: '24px 32px' }}>
        {/* Summary Cards */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
          <div className="card stat-card-blue">
            <div className="card-header">
              <span className="card-title">Total SPVs</span>
              <div className="card-icon blue">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="card-value">{spvs.length}</div>
            <div className="card-sub">{totalSites} sites total</div>
          </div>

          <div className="card stat-card-amber">
            <div className="card-header">
              <span className="card-title">Total Capacity</span>
              <div className="card-icon amber">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="card-value">{formatNumber(totalCapacity / 1000, 1)} MW</div>
            <div className="card-sub">Across all SPVs</div>
          </div>

          <div className="card stat-card-green">
            <div className="card-header">
              <span className="card-title">Monthly Revenue</span>
              <div className="card-icon green">
                <PoundSterling className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="card-value">{formatCurrency(totalRevenue)}</div>
            <div className="card-sub">From contracted sites</div>
          </div>
        </div>

        {/* SPV Cards Grid */}
        {error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', color: '#dc2626' }}>
            {error}
          </div>
        ) : spvs.length === 0 ? (
          <div className="chart-card" style={{ textAlign: 'center', padding: '48px' }}>
            <Building className="h-12 w-12 mx-auto" style={{ color: '#d1d5db', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No SPV data</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Import sites with SPV assignments to see data here.
            </p>
          </div>
        ) : (
          <div className="spv-grid">
            {spvs.map((spv) => (
              <div key={spv.code} className="spv-card">
                <div className="spv-header">
                  <span className="spv-code">{spv.code}</span>
                  <Link href={`/spvs/${spv.code}`}>
                    <button style={{ padding: '6px 12px', background: 'white', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText className="h-4 w-4" />
                      Invoice
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
                <div className="spv-name">{spv.name}</div>
                
                <div className="spv-stats">
                  <div>
                    <div className="spv-stat-label">Sites</div>
                    <div className="spv-stat-value">
                      {spv.siteCount}
                      <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        ({spv.contractedCount} contracted)
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="spv-stat-label">Capacity</div>
                    <div className="spv-stat-value">{formatNumber(spv.totalCapacityKwp / 1000, 2)} MW</div>
                  </div>
                  <div className="spv-revenue">
                    <div className="spv-stat-label">Monthly Revenue</div>
                    <div className="spv-stat-value">{formatCurrency(spv.monthlyRevenue)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
