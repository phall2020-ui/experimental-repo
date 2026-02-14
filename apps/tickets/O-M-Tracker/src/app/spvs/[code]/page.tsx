'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { SiteWithCalculations } from '@/types';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Building, 
  Zap, 
  PoundSterling,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface SpvDetails {
  code: string;
  name: string;
  sites: SiteWithCalculations[];
  summary: {
    totalSites: number;
    contractedSites: number;
    totalCapacityKwp: number;
    contractedCapacityKwp: number;
    totalMonthlyFee: number;
    totalAnnualFee: number;
  };
}

export default function SpvDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  const [spvDetails, setSpvDetails] = useState<SpvDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      fetchSpvDetails();
    }
  }, [code]);

  const fetchSpvDetails = async () => {
    try {
      const res = await fetch(`/api/spvs/${code}`);
      const data = await res.json();
      
      if (data.success) {
        setSpvDetails(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch SPV details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportInvoice = () => {
    // Create CSV for invoice
    if (!spvDetails) return;
    
    const headers = ['Site Name', 'System Size (kWp)', 'Contract Status', 'Site Costs', 'Portfolio Cost', 'Fixed Fee', 'Monthly Fee'];
    const rows = spvDetails.sites
      .filter(s => s.contractStatus === 'Yes')
      .map(site => [
        site.name,
        site.systemSizeKwp.toFixed(2),
        site.contractStatus,
        site.siteFixedCosts.toFixed(2),
        site.portfolioCost_20MW.toFixed(2),
        site.fixedFee_20MW.toFixed(2),
        site.monthlyFee.toFixed(2),
      ]);
    
    // Add totals row
    rows.push([
      'TOTAL',
      spvDetails.summary.contractedCapacityKwp.toFixed(2),
      '',
      '',
      '',
      '',
      spvDetails.summary.totalMonthlyFee.toFixed(2),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${code}_invoice_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !spvDetails) {
    return (
      <div className="p-6">
        <Header title="SPV Details" subtitle="Error loading data" />
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
          {error || 'SPV not found'}
        </div>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const contractedSites = spvDetails.sites.filter(s => s.contractStatus === 'Yes');

  return (
    <div className="flex flex-col h-full">
      <Header 
        title={spvDetails.name} 
        subtitle={`SPV Code: ${spvDetails.code}`}
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Back button and actions */}
        <div className="flex items-center justify-between">
          <Link href="/spvs">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to SPVs
            </Button>
          </Link>
          <Button onClick={handleExportInvoice}>
            <Download className="mr-2 h-4 w-4" />
            Export Invoice (CSV)
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Sites</CardTitle>
              <Building className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{spvDetails.summary.totalSites}</div>
              <p className="text-sm text-gray-500 mt-1">
                {spvDetails.summary.contractedSites} contracted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Capacity</CardTitle>
              <Zap className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(spvDetails.summary.totalCapacityKwp / 1000, 2)} MW
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formatNumber(spvDetails.summary.contractedCapacityKwp / 1000, 2)} MW contracted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Monthly Fee</CardTitle>
              <PoundSterling className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(spvDetails.summary.totalMonthlyFee)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                From contracted sites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Annual Fee</CardTitle>
              <Calendar className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(spvDetails.summary.totalAnnualFee)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(spvDetails.summary.totalMonthlyFee)} × 12
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Breakdown Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Breakdown
              </CardTitle>
              <Badge variant="info">
                {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Site Name
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Size (kWp)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Site Costs
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Portfolio Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Fixed Fee (Annual)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Monthly Fee
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {spvDetails.sites.map((site) => (
                    <tr 
                      key={site.id} 
                      className={`hover:bg-gray-50 ${site.contractStatus !== 'Yes' ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm">
                        <Link 
                          href={`/sites/${site.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {site.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatNumber(site.systemSizeKwp, 2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={site.contractStatus === 'Yes' ? 'success' : 'default'}>
                          {site.contractStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(site.siteFixedCosts)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(site.portfolioCost_20MW)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {site.contractStatus === 'Yes' 
                          ? formatCurrency(site.fixedFee_20MW)
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {site.contractStatus === 'Yes' 
                          ? formatCurrency(site.monthlyFee)
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr className="font-semibold">
                    <td className="px-4 py-3 text-sm">
                      TOTAL ({contractedSites.length} contracted sites)
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatNumber(spvDetails.summary.contractedCapacityKwp, 2)}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(contractedSites.reduce((s, site) => s + site.siteFixedCosts, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(contractedSites.reduce((s, site) => s + site.portfolioCost_20MW, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCurrency(spvDetails.summary.totalAnnualFee)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {formatCurrency(spvDetails.summary.totalMonthlyFee)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

