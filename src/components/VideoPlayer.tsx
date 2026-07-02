'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from './I18nProvider';

interface VideoPlayerProps {
  bilibiliUrl?: string;
  timestamp?: string;
  className?: string;
}

// Extract Bilibili BV ID from URL
function extractBilibiliId(url: string): { bvid: string; timestamp?: number } | null {
  // Handle various Bilibili URL formats
  // https://www.bilibili.com/video/BV1GJ411x7h7/?p=1&spm_id_from=444.41.list.card_archive.click
  // https://b23.tv/xxx (short URL)
  const match = url.match(/bilibili\.com\/video\/(BV[\w]+)/);
  if (match) {
    const bvid = match[1];
    // Extract timestamp from URL if present
    const timestampMatch = url.match(/t=(\d+)/);
    const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : undefined;
    return { bvid, timestamp };
  }
  return null;
}

export function VideoPlayer({ bilibiliUrl, timestamp, className = '' }: VideoPlayerProps) {
  const [showEmbed, setShowEmbed] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { t } = useLanguage();

  if (!bilibiliUrl) return null;

  const bilibiliInfo = extractBilibiliId(bilibiliUrl);
  const effectiveTimestamp = timestamp || bilibiliInfo?.timestamp;

  // Bilibili embed URL
  const embedSrc = bilibiliInfo
    ? `https://player.bilibili.com/player.html?bvid=${bilibiliInfo.bvid}&page=1&autoplay=0`
    : null;

  if (showEmbed && embedSrc) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">{t('video.player')}</span>
          <button
            onClick={() => setShowEmbed(false)}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          {loadError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-400 text-sm">
              <div className="text-center">
                <p className="mb-2">{t('video.loadError')}</p>
                <a
                  href={bilibiliUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  {t('video.openInBilibili')}
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src={embedSrc}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              onError={() => setLoadError(true)}
              title="Bilibili Video"
            />
          )}
        </div>
        {effectiveTimestamp !== undefined && (
          <a
            href={`${bilibiliUrl}&t=${effectiveTimestamp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {t('video.timestamp')}: {Math.floor(Number(effectiveTimestamp) / 60)}:{String(Number(effectiveTimestamp) % 60).padStart(2, '0')}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <button
        onClick={() => setShowEmbed(true)}
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        <span>{t('lineup.watchVideo')}</span>
        {effectiveTimestamp !== undefined && (
          <span className="text-xs text-zinc-500">
            ({Math.floor(Number(effectiveTimestamp) / 60)}:{String(Number(effectiveTimestamp) % 60).padStart(2, '0')})
          </span>
        )}
      </button>
    </div>
  );
}
