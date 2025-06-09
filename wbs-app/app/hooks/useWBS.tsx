'use client';

import { useContext } from 'react';
import { WBSContext } from '@/app/contexts/WBSContext';

export function useWBS() {
  const context = useContext(WBSContext);
  
  if (!context) {
    throw new Error('useWBS must be used within a WBSProvider');
  }
  
  return context;
} 