import { NextResponse } from 'next/server';
import { getSites, getSpvs } from '@/lib/db';
import { calculateSiteWithAllTiers } from '@/lib/calculations';

export async function GET() {
  try {
    const sites = getSites();
    const spvs = getSpvs();
    
    // Calculate summary for each SPV
    const summaries = spvs.map(spv => {
      const spvSites = sites.filter(s => s.spvCode === spv.code);
      const contractedSites = spvSites.filter(s => s.contractStatus === 'Yes');
      
      const sitesWithCalcs = contractedSites.map(s => calculateSiteWithAllTiers(s));
      const monthlyRevenue = sitesWithCalcs.reduce((sum, s) => sum + s.monthlyFee, 0);
      
      return {
        code: spv.code,
        name: spv.name,
        siteCount: spvSites.length,
        contractedCount: contractedSites.length,
        totalCapacityKwp: spvSites.reduce((sum, s) => sum + s.systemSizeKwp, 0),
        contractedCapacityKwp: contractedSites.reduce((sum, s) => sum + s.systemSizeKwp, 0),
        monthlyRevenue,
      };
    }).filter(s => s.siteCount > 0); // Only include SPVs with sites
    
    // Sort by monthly revenue descending
    summaries.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
    
    return NextResponse.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error('Error fetching SPV summaries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SPV summaries' },
      { status: 500 }
    );
  }
}

