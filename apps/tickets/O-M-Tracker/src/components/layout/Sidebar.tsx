'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Settings,
  Upload,
  Briefcase,
  LogOut,
  Wrench,
  Sun,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Sites', href: '/sites', icon: Building2 },
  { name: 'SPV Portfolio', href: '/spvs', icon: Briefcase },
  { name: 'CM Days', href: '/cmdays', icon: Wrench },
  { name: 'Import Data', href: '/import', icon: Upload },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="logo">
        <div className="logo-icon">
          <Sun className="h-5 w-5 text-white" />
        </div>
        <span className="logo-text">Clearsol O&M</span>
      </div>

      {/* Navigation */}
      <nav className="nav">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn('nav-item', isActive && 'active')}
            >
              <item.icon className="nav-icon" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-item w-full"
          style={{ marginBottom: '8px' }}
        >
          <LogOut className="nav-icon" />
          Sign Out
        </button>
        <p>Portfolio Tracker v2.0</p>
      </div>
    </div>
  );
}
