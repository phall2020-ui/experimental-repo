import { NextRequest, NextResponse } from 'next/server';
import { getSites, getSpvByCode } from '@/lib/db';
import { calculateSiteWithAllTiers } from '@/lib/calculations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const spv = getSpvByCode(code);
    
    if (!spv) {
      return NextResponse.json(
        { success: false, error: 'SPV not found' },
        { status: 404 }
      );
    }
    
    const allSites = getSites();
    const spvSites = allSites.filter(s => s.spvCode === code);
    const sitesWithCalcs = spvSites.map(s => calculateSiteWithAllTiers(s));
    
    const contractedSites = sitesWithCalcs.filter(s => s.contractStatus === 'Yes');
    const totalMonthlyFee = contractedSites.reduce((sum, s) => sum + s.monthlyFee, 0);
    
    const response = {
      code: spv.code,
      name: spv.name,
      sites: sitesWithCalcs,
      summary: {
        totalSites: spvSites.length,
        contractedSites: contractedSites.length,
        totalCapacityKwp: spvSites.reduce((sum, s) => sum + s.systemSizeKwp, 0),
        contractedCapacityKwp: contractedSites.reduce((sum, s) => sum + s.systemSizeKwp, 0),
        totalMonthlyFee,
        totalAnnualFee: totalMonthlyFee * 12,
      },
    };
    
    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching SPV details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch SPV details' },
      { status: 500 }
    );
  }
}

