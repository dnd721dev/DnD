'use client';

import Link from 'next/link';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import ProfileNavButton from '@/components/profile/ProfileNavButton';

export default function Header() {
  return (
    <header className="flex items-center justify-between py-3">
      <Link href="/" className="font-bold">
        DND721
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/campaigns"
          className="text-sm opacity-80 hover:opacity-100"
        >
          Games
        </Link>
        {/* New: quick link to your profile */}
        <ProfileNavButton />
        <ConnectButton />
      </div>
    </header>
  );
}
