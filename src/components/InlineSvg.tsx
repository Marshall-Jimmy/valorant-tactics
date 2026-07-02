'use client';

import { useEffect, useState, useMemo } from 'react';

interface InlineSvgProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  filter?: string;
}

export function InlineSvg({ src, className, style, filter }: InlineSvgProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setSvgContent(null);

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setSvgContent(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => { cancelled = true; };
  }, [src]);

  // 处理 SVG 内容：确保尺寸适配容器，与 <img> 行为一致
  const processedSvg = useMemo(() => {
    if (!svgContent) return null;
    let processed = svgContent;
    // 替换/添加 width 和 height 为 100%
    processed = processed.replace(/\s+width="[^"]*"/, '');
    processed = processed.replace(/\s+height="[^"]*"/, '');
    // 在 <svg 标签中注入样式，确保与 img 行为一致
    processed = processed.replace(
      '<svg',
      '<svg width="100%" height="100%" style="display:block;width:100%;height:100%"'
    );
    // 如果没有 preserveAspectRatio，添加默认值
    if (!processed.includes('preserveAspectRatio')) {
      processed = processed.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
    }
    return processed;
  }, [svgContent]);

  if (error) {
    return (
      <img
        src={src}
        className={className}
        style={style}
        draggable={false}
      />
    );
  }

  if (!processedSvg) {
    return null;
  }

  return (
    <div
      className={className}
      style={{ ...style, filter }}
      dangerouslySetInnerHTML={{ __html: processedSvg }}
    />
  );
}
