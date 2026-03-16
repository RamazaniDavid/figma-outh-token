import type {
  FigmaDocument,
  FigmaNode,
  PageData,
  SubPage,
} from './types';

/**
 * Valid node types that should be considered as subpages
 * Based on old backend implementation which only used FRAME
 */
const VALID_SUBPAGE_TYPES: Set<string> = new Set(['FRAME']);

/**
 * Parse a Figma document into structured page and subpage data
 *
 * @param document - The Figma document object
 * @param depth - How deep to traverse (not currently used, for future enhancement)
 * @returns Array of PageData with subpages
 */
export function parseDocumentPages(
  document: FigmaDocument,
  depth: number = 2
): PageData[] {
  const pages: PageData[] = [];

  // Iterate through document children to find pages (CANVAS nodes)
  for (const pageNode of document.children) {
    // Only process CANVAS nodes as pages
    if (pageNode.type !== 'CANVAS') {
      continue;
    }

    const subpages: SubPage[] = [];

    // Extract children that are valid subpage types (FRAME nodes)
    if (pageNode.children) {
      for (const child of pageNode.children) {
        if (VALID_SUBPAGE_TYPES.has(child.type)) {
          subpages.push({
            id: child.id,
            name: child.name,
            type: child.type,
            absoluteBoundingBox: child.absoluteBoundingBox,
          });
        }
      }
    }

    // Add page with its subpages
    pages.push({
      id: pageNode.id,
      name: pageNode.name,
      type: 'CANVAS',
      subpages,
    });
  }

  return pages;
}

/**
 * Get all node IDs from pages and subpages for batch screenshot fetching
 *
 * @param pages - Array of PageData
 * @returns Flat array of all node IDs (pages + subpages)
 */
export function getAllNodeIds(pages: PageData[]): string[] {
  const nodeIds: string[] = [];

  for (const page of pages) {
    // Add page ID
    nodeIds.push(page.id);

    // Add all subpage IDs
    for (const subpage of page.subpages) {
      nodeIds.push(subpage.id);
    }
  }

  return nodeIds;
}

/**
 * Map screenshot URLs back to pages and subpages
 * Mutates the pages array in place
 *
 * @param pages - Array of PageData to update
 * @param screenshots - Map of node ID to screenshot URL
 */
export function mapScreenshotsToPages(
  pages: PageData[],
  screenshots: Record<string, string>
): void {
  for (const page of pages) {
    // Map page screenshot
    if (screenshots[page.id]) {
      page.screenshot = screenshots[page.id];
    }

    // Map subpage screenshots
    for (const subpage of page.subpages) {
      if (screenshots[subpage.id]) {
        subpage.screenshot = screenshots[subpage.id];
      }
    }
  }
}

/**
 * Find a specific page by ID
 *
 * @param pages - Array of PageData
 * @param pageId - ID of the page to find
 * @returns PageData if found, undefined otherwise
 */
export function findPageById(pages: PageData[], pageId: string): PageData | undefined {
  return pages.find(page => page.id === pageId);
}

/**
 * Find a specific subpage by ID across all pages
 *
 * @param pages - Array of PageData
 * @param subpageId - ID of the subpage to find
 * @returns SubPage if found, undefined otherwise
 */
export function findSubpageById(pages: PageData[], subpageId: string): SubPage | undefined {
  for (const page of pages) {
    const subpage = page.subpages.find(sp => sp.id === subpageId);
    if (subpage) {
      return subpage;
    }
  }
  return undefined;
}

/**
 * Get statistics about the document structure
 *
 * @param pages - Array of PageData
 * @returns Object with page/subpage counts
 */
export function getDocumentStats(pages: PageData[]): {
  totalPages: number;
  totalSubpages: number;
  pagesWithSubpages: number;
  emptyPages: number;
} {
  let totalSubpages = 0;
  let pagesWithSubpages = 0;
  let emptyPages = 0;

  for (const page of pages) {
    const subpageCount = page.subpages.length;
    totalSubpages += subpageCount;

    if (subpageCount > 0) {
      pagesWithSubpages++;
    } else {
      emptyPages++;
    }
  }

  return {
    totalPages: pages.length,
    totalSubpages,
    pagesWithSubpages,
    emptyPages,
  };
}
