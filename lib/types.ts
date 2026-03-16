// Figma API Types
// Based on Figma REST API documentation

// ============================================
// Session Types
// ============================================

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  oauthState?: string;
  grantedScopes?: string; // Scopes actually granted by Figma
}

// ============================================
// Figma User Types
// ============================================

export interface FigmaUser {
  id: string;
  email: string;
  handle: string;
  img_url: string;
}

// ============================================
// Figma File Types
// ============================================

export interface FigmaFile {
  name: string;
  role: string;
  lastModified: string;
  editorType: string;
  thumbnailUrl?: string;
  version: string;
  document: FigmaDocument;
  components: Record<string, FigmaComponent>;
  componentSets: Record<string, FigmaComponentSet>;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
}

export interface FigmaDocument {
  id: string;
  name: string;
  type: 'DOCUMENT';
  children: FigmaNode[];
}

// ============================================
// Figma Node Types
// ============================================

export type FigmaNodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'STAR'
  | 'LINE'
  | 'ELLIPSE'
  | 'REGULAR_POLYGON'
  | 'RECTANGLE'
  | 'TEXT'
  | 'SLICE'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'STICKY'
  | 'SHAPE_WITH_TEXT'
  | 'CONNECTOR'
  | 'SECTION';

export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  locked?: boolean;
  children?: FigmaNode[];
  
  // Layout properties
  absoluteBoundingBox?: BoundingBox;
  absoluteRenderBounds?: BoundingBox;
  constraints?: LayoutConstraints;
  relativeTransform?: Transform;
  size?: Vector;
  
  // Auto layout
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  
  // Appearance
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: 'NONE' | 'ROUND' | 'SQUARE' | 'LINE_ARROW' | 'TRIANGLE_ARROW';
  strokeJoin?: 'MITER' | 'BEVEL' | 'ROUND';
  strokeDashes?: number[];
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  
  // Effects
  effects?: Effect[];
  blendMode?: BlendMode;
  opacity?: number;
  
  // Text specific
  characters?: string;
  style?: TypeStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<number, TypeStyle>;
  
  // Component specific
  componentId?: string;
  componentProperties?: Record<string, ComponentProperty>;
  
  // Export settings
  exportSettings?: ExportSetting[];
}

// ============================================
// Common Types
// ============================================

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vector {
  x: number;
  y: number;
}

export type Transform = [[number, number, number], [number, number, number]];

export interface LayoutConstraints {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type BlendMode =
  | 'PASS_THROUGH'
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'LINEAR_BURN'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'LINEAR_DODGE'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

// ============================================
// Paint Types
// ============================================

export type PaintType =
  | 'SOLID'
  | 'GRADIENT_LINEAR'
  | 'GRADIENT_RADIAL'
  | 'GRADIENT_ANGULAR'
  | 'GRADIENT_DIAMOND'
  | 'IMAGE'
  | 'EMOJI'
  | 'VIDEO';

export interface Paint {
  type: PaintType;
  visible?: boolean;
  opacity?: number;
  color?: Color;
  blendMode?: BlendMode;
  gradientHandlePositions?: Vector[];
  gradientStops?: ColorStop[];
  scaleMode?: 'FILL' | 'FIT' | 'TILE' | 'STRETCH';
  imageTransform?: Transform;
  scalingFactor?: number;
  rotation?: number;
  imageRef?: string;
  gifRef?: string;
}

export interface ColorStop {
  position: number;
  color: Color;
}

// ============================================
// Effect Types
// ============================================

export type EffectType =
  | 'INNER_SHADOW'
  | 'DROP_SHADOW'
  | 'LAYER_BLUR'
  | 'BACKGROUND_BLUR';

export interface Effect {
  type: EffectType;
  visible?: boolean;
  radius: number;
  color?: Color;
  blendMode?: BlendMode;
  offset?: Vector;
  spread?: number;
  showShadowBehindNode?: boolean;
}

// ============================================
// Text Types
// ============================================

export interface TypeStyle {
  fontFamily?: string;
  fontPostScriptName?: string;
  paragraphSpacing?: number;
  paragraphIndent?: number;
  listSpacing?: number;
  italic?: boolean;
  fontWeight?: number;
  fontSize?: number;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';
  textDecoration?: 'NONE' | 'STRIKETHROUGH' | 'UNDERLINE';
  textAutoResize?: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT' | 'TRUNCATE';
  textAlignHorizontal?: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing?: number;
  fills?: Paint[];
  hyperlink?: Hyperlink;
  opentypeFlags?: Record<string, number>;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  lineHeightPercentFontSize?: number;
  lineHeightUnit?: 'PIXELS' | 'FONT_SIZE_%' | 'INTRINSIC_%';
}

export interface Hyperlink {
  type: 'URL' | 'NODE';
  url?: string;
  nodeID?: string;
}

// ============================================
// Component Types
// ============================================

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks?: { uri: string }[];
}

export interface FigmaComponentSet {
  key: string;
  name: string;
  description: string;
  documentationLinks?: { uri: string }[];
}

export interface ComponentProperty {
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  value: boolean | string;
  preferredValues?: { type: string; key: string }[];
}

// ============================================
// Style Types
// ============================================

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

// ============================================
// Export Types
// ============================================

export interface ExportSetting {
  suffix: string;
  format: 'JPG' | 'PNG' | 'SVG' | 'PDF';
  constraint: {
    type: 'SCALE' | 'WIDTH' | 'HEIGHT';
    value: number;
  };
}

// ============================================
// API Response Types
// ============================================

export interface FigmaFileResponse {
  name: string;
  role: string;
  lastModified: string;
  editorType: string;
  thumbnailUrl?: string;
  version: string;
  document: FigmaDocument;
  components: Record<string, FigmaComponent>;
  componentSets: Record<string, FigmaComponentSet>;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
}

export interface FigmaFileNodesResponse {
  name: string;
  role: string;
  lastModified: string;
  editorType: string;
  thumbnailUrl?: string;
  version: string;
  nodes: Record<string, {
    document: FigmaNode;
    components: Record<string, FigmaComponent>;
    schemaVersion: number;
    styles: Record<string, FigmaStyle>;
  }>;
}

export interface FigmaImagesResponse {
  err: string | null;
  images: Record<string, string>;
}

export interface FigmaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ============================================
// Extracted Data Types (Minimized for client)
// ============================================

export interface ExtractedFrameData {
  id: string;
  name: string;
  type: FigmaNodeType;
  absoluteBoundingBox?: BoundingBox;
  children?: ExtractedFrameData[];
  styles?: {
    fills?: Paint[];
    strokes?: Paint[];
    effects?: Effect[];
    opacity?: number;
    blendMode?: BlendMode;
  };
  layout?: {
    mode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    padding?: { top: number; right: number; bottom: number; left: number };
    spacing?: number;
    primaryAlign?: string;
    counterAlign?: string;
  };
  text?: {
    characters?: string;
    style?: Partial<TypeStyle>;
  };
  cornerRadius?: number | [number, number, number, number];
  screenshot?: string;
}

export interface ExtractedFileData {
  fileKey: string;
  fileName: string;
  lastModified: string;
  version: string;
  frames: ExtractedFrameData[];
  extractedAt: string;
}

// ============================================
// Pages & Subpages Types
// ============================================

export interface SubPage {
  id: string;
  name: string;
  type: FigmaNodeType;
  screenshot?: string;
  absoluteBoundingBox?: BoundingBox;
}

export interface PageData {
  id: string;
  name: string;
  type: 'CANVAS';
  screenshot?: string;
  subpages: SubPage[];
}

export interface ExtractedFileWithPages extends ExtractedFileData {
  pages: PageData[];
}

// ============================================
// API Request/Response Types
// ============================================

export interface ExtractRequest {
  fileKey: string;
  nodeId?: string;
  depth?: number;
  includeImages?: boolean;
}

export interface ExtractResponse {
  success: boolean;
  data?: ExtractedFileData | ExtractedFrameData | ExtractedFileWithPages;
  error?: string;
}

export interface WebhookPayload {
  event_type: 'FILE_UPDATE' | 'FILE_DELETE' | 'FILE_VERSION_UPDATE' | 'LIBRARY_PUBLISH';
  file_key: string;
  file_name: string;
  passcode: string;
  timestamp: string;
  triggered_by: {
    id: string;
    handle: string;
  };
}
