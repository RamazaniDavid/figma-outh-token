/**
 * Parse a Figma URL and extract the file key and node ID
 *
 * Supported URL formats:
 * - https://www.figma.com/file/{fileKey}/...?node-id={nodeId}
 * - https://www.figma.com/design/{fileKey}/...?node-id={nodeId}
 * - https://www.figma.com/proto/{fileKey}/...?node-id={nodeId}
 */
export interface ParsedFigmaUrl {
  fileKey: string;
  nodeId?: string;
}

export function parseFigmaUrl(url: string): ParsedFigmaUrl | null {
  try {
    // Clean up the URL
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return null;
    }

    // Parse the URL
    const urlObj = new URL(trimmedUrl);

    // Check if it's a Figma URL
    if (!urlObj.hostname.includes('figma.com')) {
      return null;
    }

    // Extract file key from path
    // Patterns: /file/{fileKey}/ or /design/{fileKey}/ or /proto/{fileKey}/
    const pathMatch = urlObj.pathname.match(/\/(file|design|proto)\/([a-zA-Z0-9]+)/);
    if (!pathMatch || !pathMatch[2]) {
      return null;
    }

    const fileKey = pathMatch[2];

    // Extract node ID from query parameters
    // Pattern: node-id=123-456 or node-id=123:456
    const nodeIdParam = urlObj.searchParams.get('node-id');
    let nodeId: string | undefined;

    if (nodeIdParam) {
      // Convert node-id format (123-456) to Figma API format (123:456)
      nodeId = nodeIdParam.replace(/-/g, ':');
    }

    return {
      fileKey,
      nodeId,
    };
  } catch (error) {
    // Invalid URL format
    return null;
  }
}

/**
 * Validate if a string is a valid Figma URL
 */
export function isValidFigmaUrl(url: string): boolean {
  return parseFigmaUrl(url) !== null;
}
