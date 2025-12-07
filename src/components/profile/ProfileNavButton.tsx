'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabase';

type ProfileRow = {
  username: string | null;
};

export default function ProfileNavButton() {
  const { address, isConnected } = useAccount();

  // 👇 Prevent hydration mismatch: don't render anything until mounted
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isConnected || !address) {
      setUsername(null);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle<ProfileRow>();

      if (error) {
        console.error('Failed to load profile for nav:', error);
        setUsername(null);
      } else if (data?.username) {
        setUsername(data.username);
      } else {
        setUsername(null);
      }

      setLoading(false);
    };

    void loadProfile();
  }, [mounted, isConnected, address]);

  // ❌ On server + first client render: return nothing → no mismatch
  if (!mounted) return null;

  // Not connected: no profile button, just wallet button
  if (!isConnected || !address) return null;

  // Optional tiny loading state
  if (loading && !username) {
    return (
      <div className="text-xs text-gray-400">
        Loading profile…
      </div>
    );
  }

  // Connected but no profile yet → send to edit/create
  if (!username) {
    return (
      <Link
        href="/profile/edit"
        className="text-sm px-3 py-1 rounded-md border border-zinc-700 hover:bg-zinc-800 transition"
      >
        Set up profile
      </Link>
    );
  }

  // Normal case: profile exists
  return (
    <Link
      href={`/profile/${username}`}
      className="text-sm px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 transition"
    >
      My Profile
    </Link>
  );
}
