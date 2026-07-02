/**
 * @agent Frontend Dev
 * @last-modified 2026-07-02
 * @description 图片加载工具：本地优先，OSS 降级
 * @dependencies env
 */

const OSS_BASE_URL = process.env.NEXT_PUBLIC_OSS_BASE_URL || '';

/** 获取本地图片路径 */
export const getLocalPath = (path: string): string => {
  if (path.startsWith('/')) return path;
  return `/${path}`;
};

/** 获取 OSS 图片路径 */
export const getOssPath = (path: string): string => {
  const localPath = getLocalPath(path);
  return OSS_BASE_URL ? `${OSS_BASE_URL}${localPath}` : localPath;
};

/**
 * 图片 onError 降级处理器
 * 当本地图片加载失败时，自动切换到 OSS 地址
 */
export const handleImageFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  const currentSrc = img.src;

  // 如果已经尝试过 OSS（避免无限循环），直接隐藏
  if (img.dataset.ossTried === 'true') {
    img.style.display = 'none';
    return;
  }

  // 如果当前是本地路径且 OSS 已配置，切换到 OSS
  if (OSS_BASE_URL && !currentSrc.includes(OSS_BASE_URL)) {
    img.dataset.ossTried = 'true';
    const path = new URL(currentSrc, window.location.origin).pathname;
    img.src = `${OSS_BASE_URL}${path}`;
  } else {
    img.style.display = 'none';
  }
};

/**
 * 生成带降级属性的 img props
 */
export const withImageFallback = (localPath: string) => ({
  src: getLocalPath(localPath),
  onError: handleImageFallback,
});
