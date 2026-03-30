import { NextResponse } from 'next/server';
import { getSites, getSpvs } from '@/lib/db';
import { calculateSiteWithAllTiers, calculatePortfolioSummary } from '@/lib/calculations';

export async function GET() {
  try {
    const sites = getSites();
    const spvs = getSpvs();
    const summary = calculatePortfolioSummary(sites);
    
    // Calculate sites with all calculations
    const sitesWithCalcs = sites.map(s => calculateSiteWithAllTiers(s));
    const contractedSites = sitesWithCalcs.filter(s => s.contractStatus === 'Yes');
    
    // Generate mock historical data (in production, this would come from actual records)
    // For now, we simulate last 12 months based on current data with some variation
    const currentRevenue = summary.totalMonthlyFee;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    const revenueHistory = months.map((month, index) => {
      // Simulate growth - older months have less revenue
      const monthsAgo = (currentMonth - index + 12) % 12;
      const growthFactor = 1 - (monthsAgo * 0.03); // ~3% monthly growth simulated
      const variance = 0.95 + Math.random() * 0.1; // ±5% random variance
      
      return {
        month,
        revenue: Math.round(currentRevenue * growthFactor * variance),
        sites: Math.max(1, Math.round(contractedSites.length * growthFactor)),
      };
    });
    
    // Capacity by SPV
    const capacityBySpv = spvs
      .map(spv => {
        const spvSites = sites.filter(s => s.spvCode === spv.code);
        const contracted = spvSites.filter(s => s.contractStatus === 'Yes');
        
        return {
          spv: spv.code,
          capacity: spvSites.reduce((sum, s) => sum + s.systemSizeKwp, 0),
          contracted: contracted.reduce((sum, s) => sum + s.systemSizeKwp, 0),
        };
      })
      .filter(s => s.capacity > 0)
      .sort((a, b) => b.capacity - a.capacity)
      .slice(0, 8); // Top 8 SPVs
    
    // Top sites by monthly fee
    const topSites = contractedSites
      .sort((a, b) => b.monthlyFee - a.monthlyFee)
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        name: s.name,
        spv: s.spvCode,
        capacity: s.systemSizeKwp,
        monthlyFee: s.monthlyFee,
      }));
    
    // Site type breakdown
    const siteTypeBreakdown = {
      rooftop: sites.filter(s => s.siteType === 'Rooftop').length,
      groundMount: sites.filter(s => s.siteType === 'Ground Mount').length,
    };
    
    return NextResponse.json({
      success: true,
      data: {
        summary,
        revenueHistory,
        capacityBySpv,
        topSites,
        siteTypeBreakdown,
        contractStatus: {
          contracted: contractedSites.length,
          nonContracted: sites.length - contractedSites.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

