import type {
  FigmaFileResponse,
  FigmaFileNodesResponse,
  FigmaImagesResponse,
  FigmaUser,
  FigmaNode,
  ExtractedFrameData,
  ExtractedFileData,
  Paint,
  Effect,
} from './types';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

/**
 * Figma API Client for making authenticated requests
 */
export class FigmaClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${FIGMA_API_BASE}${endpoint}`;

    // console.log('[Figma Client] Making request:', {
    //   endpoint,
    //   url,
    //   method: options.method || 'GET',
    //   hasToken: !!this.accessToken,
    //   tokenLength: this.accessToken?.length,
    //   tokenPrefix: this.accessToken?.substring(0, 10) + '...',
    // });

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // console.log('[Figma Client] Request headers:', {
    //   hasAuthorization: !!headers.Authorization,
    //   authorizationFormat: headers.Authorization?.substring(0, 20) + '...',
    // });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // console.log('[Figma Client] Response received:', {
    //   endpoint,
    //   status: response.status,
    //   statusText: response.statusText,
    //   ok: response.ok,
    //   headers: Object.fromEntries(response.headers.entries()),
    // });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error('[Figma Client] API error:', {
      //   endpoint,
      //   status: response.status,
      //   statusText: response.statusText,
      //   errorText,
      // });

      if (response.status === 429) {
        throw new Error('Rate limited by Figma API. Please try again later.');
      }

      if (response.status === 403) {
        let errorMessage = 'Access forbidden. ';

        // Try to parse error for more details
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.err) {
            errorMessage += errorData.err + '. ';
          }
        } catch (e) {
          // Not JSON, use text as is
        }

        errorMessage += 'Possible causes:\n';
        errorMessage += '1. You don\'t have permission to access this file\n';
        errorMessage += '2. OAuth is authenticated with a different Figma account\n';
        errorMessage += '3. File is in a private team workspace\n\n';
        errorMessage += 'Solution: Check that your dashboard shows the same email you use in figma.com, or re-authenticate.';

        throw new Error(errorMessage);
      }

      if (response.status === 404) {
        throw new Error('Resource not found. Check the file key or node ID.');
      }

      throw new Error(`Figma API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as T;
    // console.log('[Figma Client] Response parsed successfully:', {
    //   endpoint,
    //   dataKeys: Object.keys(data as object),
    // });

    return data;
  }

  /**
   * Get the current authenticated user
   */
  async getMe(): Promise<FigmaUser> {
    return this.request<FigmaUser>('/me');
  }

  /**
   * Get a Figma file by key
   */
  async getFile(
    fileKey: string,
    options?: {
      version?: string;
      depth?: number;
      geometry?: 'paths';
      pluginData?: string;
      branchData?: boolean;
    }
  ): Promise<FigmaFileResponse> {
    const params = new URLSearchParams();
    
    if (options?.version) params.set('version', options.version);
    if (options?.depth) params.set('depth', options.depth.toString());
    if (options?.geometry) params.set('geometry', options.geometry);
    if (options?.pluginData) params.set('plugin_data', options.pluginData);
    if (options?.branchData) params.set('branch_data', 'true');
    
    const queryString = params.toString();
    const endpoint = `/files/${fileKey}${queryString ? `?${queryString}` : ''}`;
    
    return this.request<FigmaFileResponse>(endpoint);
  }

  /**
   * Get specific nodes from a Figma file
   */
  async getFileNodes(
    fileKey: string,
    nodeIds: string[],
    options?: {
      version?: string;
      depth?: number;
      geometry?: 'paths';
      pluginData?: string;
    }
  ): Promise<FigmaFileNodesResponse> {
    const params = new URLSearchParams();
    params.set('ids', nodeIds.join(','));
    
    if (options?.version) params.set('version', options.version);
    if (options?.depth) params.set('depth', options.depth.toString());
    if (options?.geometry) params.set('geometry', options.geometry);
    if (options?.pluginData) params.set('plugin_data', options.pluginData);
    
    const endpoint = `/files/${fileKey}/nodes?${params.toString()}`;
    
    return this.request<FigmaFileNodesResponse>(endpoint);
  }

  /**
   * Get rendered images for nodes
   */
  async getImages(
    fileKey: string,
    nodeIds: string[],
    options?: {
      scale?: number;
      format?: 'jpg' | 'png' | 'svg' | 'pdf';
      svgIncludeId?: boolean;
      svgSimplifyStroke?: boolean;
      useAbsoluteBounds?: boolean;
      version?: string;
    }
  ): Promise<FigmaImagesResponse> {
    const params = new URLSearchParams();
    params.set('ids', nodeIds.join(','));

    if (options?.scale) params.set('scale', options.scale.toString());
    if (options?.format) params.set('format', options.format);
    if (options?.svgIncludeId) params.set('svg_include_id', 'true');
    if (options?.svgSimplifyStroke) params.set('svg_simplify_stroke', 'true');
    if (options?.useAbsoluteBounds) params.set('use_absolute_bounds', 'true');
    if (options?.version) params.set('version', options.version);

    const endpoint = `/images/${fileKey}?${params.toString()}`;

    return this.request<FigmaImagesResponse>(endpoint);
  }

  /**
   * Get all image fills (imageRef URLs) from a file
   * Used to replace FIGMA_IMAGE placeholders in generated HTML
   */
  async getFileImages(fileKey: string): Promise<{ meta: { images: Record<string, string> } }> {
    const endpoint = `/files/${fileKey}/images`;
    return this.request<{ meta: { images: Record<string, string> } }>(endpoint);
  }

  /**
   * Get file versions
   */
  async getVersions(fileKey: string): Promise<{
    versions: Array<{
      id: string;
      created_at: string;
      label: string;
      description: string;
      user: FigmaUser;
    }>;
  }> {
    return this.request(`/files/${fileKey}/versions`);
  }

  /**
   * Get comments on a file
   */
  async getComments(fileKey: string): Promise<{
    comments: Array<{
      id: string;
      message: string;
      created_at: string;
      user: FigmaUser;
      client_meta?: { x?: number; y?: number; node_id?: string };
    }>;
  }> {
    return this.request(`/files/${fileKey}/comments`);
  }

  /**
   * Get local variables from a file
   * Includes color variables, number variables, string variables, boolean variables
   */
  async getLocalVariables(fileKey: string): Promise<{
    status: number;
    error: boolean;
    meta: {
      variables: Record<string, {
        id: string;
        name: string;
        key: string;
        variableCollectionId: string;
        resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
        valuesByMode: Record<string, any>;
        remote: boolean;
        description: string;
        hiddenFromPublishing: boolean;
        scopes: string[];
        codeSyntax: Record<string, string>;
      }>;
      variableCollections: Record<string, {
        id: string;
        name: string;
        key: string;
        modes: Array<{ modeId: string; name: string }>;
        defaultModeId: string;
        remote: boolean;
        hiddenFromPublishing: boolean;
        variableIds: string[];
      }>;
    };
  }> {
    return this.request(`/files/${fileKey}/variables/local`);
  }

  /**
   * Get published variables from a file
   */
  async getPublishedVariables(fileKey: string): Promise<{
    status: number;
    error: boolean;
    meta: {
      variables: Record<string, any>;
      variableCollections: Record<string, any>;
    };
  }> {
    return this.request(`/files/${fileKey}/variables/published`);
  }
}

/**
 * Extract and minimize frame data from a Figma node
 */
export function extractFrameData(node: FigmaNode, depth: number = 10): ExtractedFrameData {
  const extracted: ExtractedFrameData = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  // Add bounding box if present
  if (node.absoluteBoundingBox) {
    extracted.absoluteBoundingBox = node.absoluteBoundingBox;
  }

  // Add styles (only if non-empty)
  const styles: ExtractedFrameData['styles'] = {};
  
  if (node.fills && node.fills.length > 0) {
    styles.fills = minimizePaints(node.fills);
  }
  if (node.strokes && node.strokes.length > 0) {
    styles.strokes = minimizePaints(node.strokes);
  }
  if (node.effects && node.effects.length > 0) {
    styles.effects = minimizeEffects(node.effects);
  }
  if (node.opacity !== undefined && node.opacity !== 1) {
    styles.opacity = node.opacity;
  }
  if (node.blendMode && node.blendMode !== 'PASS_THROUGH') {
    styles.blendMode = node.blendMode;
  }
  
  if (Object.keys(styles).length > 0) {
    extracted.styles = styles;
  }

  // Add layout info if auto layout
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    extracted.layout = {
      mode: node.layoutMode,
      padding: {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0,
      },
      spacing: node.itemSpacing,
      primaryAlign: node.primaryAxisAlignItems,
      counterAlign: node.counterAxisAlignItems,
    };
  }

  // Add text content if text node
  if (node.type === 'TEXT' && node.characters) {
    extracted.text = {
      characters: node.characters,
    };
    if (node.style) {
      extracted.text.style = {
        fontFamily: node.style.fontFamily,
        fontSize: node.style.fontSize,
        fontWeight: node.style.fontWeight,
        textAlignHorizontal: node.style.textAlignHorizontal,
        textAlignVertical: node.style.textAlignVertical,
        letterSpacing: node.style.letterSpacing,
        lineHeightPx: node.style.lineHeightPx,
      };
    }
  }

  // Add corner radius
  if (node.cornerRadius) {
    extracted.cornerRadius = node.cornerRadius;
  } else if (node.rectangleCornerRadii) {
    extracted.cornerRadius = node.rectangleCornerRadii;
  }

  // Recursively extract children
  if (node.children && node.children.length > 0 && depth > 0) {
    extracted.children = node.children.map(child => extractFrameData(child, depth - 1));
  }

  return extracted;
}

/**
 * Extract file data with minimized payload
 */
export function extractFileData(
  fileKey: string,
  file: FigmaFileResponse,
  depth: number = 10
): ExtractedFileData {
  const frames: ExtractedFrameData[] = [];

  // Extract all top-level frames from each page
  for (const page of file.document.children) {
    if (page.children) {
      for (const child of page.children) {
        if (['FRAME', 'COMPONENT', 'COMPONENT_SET', 'SECTION'].includes(child.type)) {
          frames.push(extractFrameData(child, depth));
        }
      }
    }
  }

  return {
    fileKey,
    fileName: file.name,
    lastModified: file.lastModified,
    version: file.version,
    frames,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Minimize paint array by removing default/empty values
 */
function minimizePaints(paints: Paint[]): Paint[] {
  return paints
    .filter(paint => paint.visible !== false)
    .map(paint => {
      const minimized: Paint = { type: paint.type };
      
      if (paint.color) minimized.color = paint.color;
      if (paint.opacity !== undefined && paint.opacity !== 1) minimized.opacity = paint.opacity;
      if (paint.gradientHandlePositions) minimized.gradientHandlePositions = paint.gradientHandlePositions;
      if (paint.gradientStops) minimized.gradientStops = paint.gradientStops;
      if (paint.scaleMode) minimized.scaleMode = paint.scaleMode;
      if (paint.imageRef) minimized.imageRef = paint.imageRef;
      
      return minimized;
    });
}

/**
 * Minimize effects array by removing default/empty values
 */
function minimizeEffects(effects: Effect[]): Effect[] {
  return effects
    .filter(effect => effect.visible !== false)
    .map(effect => {
      const minimized: Effect = { 
        type: effect.type,
        radius: effect.radius,
      };
      
      if (effect.color) minimized.color = effect.color;
      if (effect.offset) minimized.offset = effect.offset;
      if (effect.spread) minimized.spread = effect.spread;
      
      return minimized;
    });
}

/**
 * Find a specific node by ID in the document tree
 */
export function findNodeById(root: FigmaNode, nodeId: string): FigmaNode | null {
  if (root.id === nodeId) {
    return root;
  }
  
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Get all frames from a document
 */
export function getAllFrames(document: FigmaNode): FigmaNode[] {
  const frames: FigmaNode[] = [];
  
  function traverse(node: FigmaNode) {
    if (['FRAME', 'COMPONENT', 'COMPONENT_SET'].includes(node.type)) {
      frames.push(node);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  traverse(document);
  return frames;
}
