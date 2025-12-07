'use client';

import { createWeb3Modal } from '@web3modal/wagmi/react';
import { wagmiConfig } from './wagmi';

let created = false;

export function initWeb3Modal() {
  if (created) return;
  created = true;

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;
  if (!projectId) {
    console.warn('Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID');
  }

  // Do NOT pass `chains` here — they come from wagmiConfig
  createWeb3Modal({
    wagmiConfig,
    projectId,
    themeMode: 'dark',
    enableAnalytics: false
    // no `chains`
  });
}
