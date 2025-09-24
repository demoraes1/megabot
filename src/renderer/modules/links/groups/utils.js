import { showNotification } from '../../ui/notifications.js';

export function normalizeUrlFrontend(url) {
  if (!url || url.trim() === '') {
    return '';
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl.match(/^https?:\/\//)) {
    return trimmedUrl;
  }

  if (
    trimmedUrl.startsWith('about:') ||
    trimmedUrl.startsWith('file:') ||
    trimmedUrl.startsWith('data:')
  ) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

export function validateAndNormalizeUrl(input) {
  const originalValue = input.value.trim();

  if (originalValue && !originalValue.match(/^https?:\/\//)) {
    const normalizedUrl = normalizeUrlFrontend(originalValue);
    console.log(`URL normalizada: ${originalValue} -> ${normalizedUrl}`);
    showNotification(`URL normalizada: ${normalizedUrl}`, 'info', 2000);
  }
}
