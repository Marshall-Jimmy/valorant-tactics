/**
 * @agent Frontend Dev
 * @last-modified 2026-07-02
 * @description JSON 文件下载和导入工具函数，从 LineupPanel/StrategyPanel 中提取
 */

/**
 * Download a JSON string as a file
 */
export function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open a file picker for JSON files and call onLoad with the text content
 */
export function importJsonFile(onLoad: (text: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => onLoad(reader.result as string);
      reader.readAsText(file);
    }
  };
  input.click();
}
