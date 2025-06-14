"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Clock, Zap } from 'lucide-react';
import { UsageService } from '@/lib/services/usage-service';
import { UserUsage } from '@/lib/types/usage';

interface UsageTrackerProps {
  className?: string;
}

export interface UsageTrackerRef {
  refreshUsage: () => void;
}

const UsageTracker = forwardRef<UsageTrackerRef, UsageTrackerProps>(({ className = "" }, ref) => {
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const usageService = new UsageService();

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const { data, error } = await usageService.getUserUsage();
      if (!error && data) {
        setUsage(data);
      }
    } catch (error) {
      console.error('Error loading usage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Expose refreshUsage method to parent
  useImperativeHandle(ref, () => ({
    refreshUsage: loadUsage
  }));

  if (loading) {
    return (
      <div className={`rounded-lg p-4 ${className}`} style={{ border: 'none' }}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-6 bg-gray-700 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const usagePercentage = ((usage.free_tier_limit - usage.minutes_remaining) / usage.free_tier_limit) * 100;
  const isLowUsage = usage.minutes_remaining <= 10;
  const isOutOfMinutes = usage.minutes_remaining <= 0;

  return (
    <div className={`rounded-lg p-4 ${className}`} style={{ border: 'none' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">Deepgram Usage</span>
        </div>
        <Zap className="h-4 w-4 text-yellow-400" />
      </div>
      
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-white font-medium">Minutes Remaining</span>
          <span className={`text-xs font-medium mt-px ${
            isOutOfMinutes ? 'text-red-400' : 
            isLowUsage ? 'text-yellow-400' : 
            'text-green-400'
          }`}>
            {usage.minutes_remaining}
          </span>
        </div>
        
        {isOutOfMinutes && (
          <div className="text-xs text-red-400 bg-red-400/10 rounded p-2 mt-2">
            <div className="font-medium mb-1">🎯 Free Deepgram minutes used up!</div>
            <div className="text-gray-300">✅ WebSpeech API is still available (free)</div>
          </div>
        )}
        
        {isLowUsage && !isOutOfMinutes && (
          <div className="text-xs text-yellow-400 bg-yellow-400/10 rounded p-2 mt-2">
            <div className="font-medium mb-1">⚡ Running low on Deepgram minutes</div>
            <div className="text-gray-300">💡 WebSpeech API is always free as backup</div>
          </div>
        )}
      </div>
    </div>
  );
});

UsageTracker.displayName = 'UsageTracker';

export default UsageTracker; 