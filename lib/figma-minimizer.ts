/**
 * Figma Data Minimizer
 * Converts raw Figma JSON into a minimized structure optimized for LLM consumption
 */

import { getIconFromName } from './icon-mapping';

interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MinimalComponent {
  name: string;
  type: string;
  bbox?: BBox;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  boxShadow?: string;
  opacity?: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  layoutMode?: string;
  gap?: number;
  justifyContent?: string;
  alignItems?: string;
  constraints?: {
    horizontal?: string;
    vertical?: string;
  };
  blendMode?: string;
  overflow?: string;
  position?: string;
  image?: boolean;
  imageRef?: string;
  gradient?: string;
  zIndex?: number;
  relativePosition?: {
    top: number;
    left: number;
  };
  shapeType?: string;
  iconType?: string;  // Detected icon type (e.g., 'search', 'heart', 'cart')
  strokeColor?: string;  // Stroke color for vector elements
  strokeWidth?: number;  // Stroke width for vector elements
  rotation?: number;
  children?: MinimalComponent[];
  kind?: string;
  components?: MinimalComponent[];
  // Phase 1: FILL/HUG sizing (responsive intent preservation)
  sizing?: {
    width: 'fill' | 'hug' | 'fixed';
    height: 'fill' | 'hug' | 'fixed';
  };
  // Phase 1: Layout wrap support
  layoutWrap?: string;
  // Phase 2: Rich text support (styled segments)
  textCase?: string;
  textShadow?: string;
  textSegments?: {
    characters: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    fontStyle?: string;
    textDecoration?: string;
    textCase?: string;
    lineHeight?: number;
    letterSpacing?: number;
  }[];
  // Phase 2: Multi-fill support (all visible fills for CSS layering)
  fills?: any[];
}


interface Section {
  name: string;
  type: string;
  nodeId: string;
  bbox?: BBox;
  components: MinimalComponent[];
  subsections?: Section[];
  // TEXT properties for TEXT-type sections
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  backgroundColor?: string;
}

interface MinimalStructure {
  frameName: string;
  frameBbox?: BBox;
  sections: Section[];
}

interface MinimizeOptions {
  maxNodesPerComponent?: number;
  maxDepthPerComponent?: number;
}

/**
 * Main entry point - Convert Figma FRAME node to minimal structure
 */
export function figmaFrameToMinimalStructure(
  frameNode: any,
  options: MinimizeOptions = {}
): MinimalStructure {
  const { maxNodesPerComponent = 25, maxDepthPerComponent = 10 } = options;

  if (frameNode.type !== 'FRAME') {
    throw new Error('Expected a Figma FRAME node as root');
  }

  const sections: Section[] = [];
  for (const child of frameNode.children || []) {
    const section = buildSection(child, maxNodesPerComponent, maxDepthPerComponent);
    if (section) {
      sections.push(section);
    }
  }

  return {
    frameName: frameNode.name,
    frameBbox: getBBox(frameNode),
    sections,
  };
}

/**
 * Build a section from a top-level child
 */
function buildSection(
  node: any,
  maxNodesPerComponent: number,
  maxDepthPerComponent: number
): Section | null {
  if (isSkippable(node)) {
    return null;
  }

  const bbox = getBBox(node);
  const components: MinimalComponent[] = [];
  const subsections: Section[] = [];

  for (const child of node.children || []) {
    if (isSkippable(child)) {
      continue;
    }

    const [nodeCount, maxDepth] = computeComplexity(child);
    const isStructural = [
      'FRAME',
      'GROUP',
      'COMPONENT',
      'INSTANCE',
      'SECTION',
    ].includes(child.type);

    if (
      isStructural &&
      (nodeCount > maxNodesPerComponent || maxDepth > maxDepthPerComponent)
    ) {
      // Treat as subsection
      const subsectionComponents = extractComponents(
        child,
        maxNodesPerComponent,
        maxDepthPerComponent
      );
      subsections.push({
        name: child.name,
        type: child.type,
        nodeId: child.id,
        bbox: getBBox(child),
        components: subsectionComponents,
      });
    } else {
      // Treat as normal component
      const comp = simplifyNode(child, maxNodesPerComponent, maxDepthPerComponent);
      if (comp) {
        components.push(comp);
      }
    }
  }

  const section: Section = {
    name: node.name,
    type: node.type,
    nodeId: node.id,
    bbox,
    components,
  };

  // For TEXT sections, extract typography properties
  if (node.type === 'TEXT') {
    const text = (node.characters || '').trim();
    if (text) {
      section.text = text;
    }
    
    const style = node.style || {};
    if (style.fontFamily) section.fontFamily = style.fontFamily;
    if (style.fontSize) section.fontSize = Math.round(style.fontSize * 10) / 10;
    if (style.fontWeight) section.fontWeight = style.fontWeight;
    if (style.textAlignHorizontal) {
      const align = style.textAlignHorizontal;
      if (['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'].includes(align)) {
        section.textAlign = align.toLowerCase();
      }
    }
    if (style.lineHeightPx) section.lineHeight = Math.round(style.lineHeightPx * 10) / 10;
    if (style.letterSpacing) section.letterSpacing = Math.round(style.letterSpacing * 100) / 100;
    
    // Extract text color (Phase 1: use top fill)
    const fills = node.fills || [];
    const textTopFill = retrieveTopFill(fills);
    if (textTopFill && textTopFill.type === 'SOLID') {
      const color = textTopFill.color;
      if (color) {
        section.color = rgbaToCss(color);
      }
    }
  }
  
  // For non-TEXT sections, extract background color (Phase 1: use top fill)
  if (node.type !== 'TEXT') {
    const fills = node.fills || [];
    const bgTopFill = retrieveTopFill(fills);
    if (bgTopFill && bgTopFill.type === 'SOLID') {
      const color = bgTopFill.color;
      if (color) {
        section.backgroundColor = rgbaToCss(color);
      }
    }
  }

  if (subsections.length > 0) {
    section.subsections = subsections;
  }

  return section;
}

/**
 * Extract components from a subsection
 */
function extractComponents(
  node: any,
  maxNodesPerComponent: number,
  maxDepthPerComponent: number
): MinimalComponent[] {
  const components: MinimalComponent[] = [];
  const parentBbox = getBBox(node); // Parent bbox for relative positioning

  for (const child of node.children || []) {
    if (isSkippable(child)) {
      continue;
    }

    const [nodeCount, maxDepth] = computeComplexity(child);
    const isStructural = [
      'FRAME',
      'GROUP',
      'COMPONENT',
      'INSTANCE',
      'SECTION',
    ].includes(child.type);

    let comp: MinimalComponent | null;

    if (
      isStructural &&
      (nodeCount > maxNodesPerComponent || maxDepth > maxDepthPerComponent)
    ) {
      // Nested subsection
      const subsectionComponents = extractComponents(
        child,
        maxNodesPerComponent,
        maxDepthPerComponent
      );
      const childBbox = getBBox(child);
      comp = {
        name: child.name,
        type: child.type,
        bbox: childBbox,
        kind: 'subsection',
        components: subsectionComponents,
      };
      // Add relative position for subsections too
      if (childBbox && parentBbox) {
        comp.relativePosition = {
          top: Math.round((childBbox.y - parentBbox.y) * 10) / 10,
          left: Math.round((childBbox.x - parentBbox.x) * 10) / 10,
        };
      }
    } else {
      comp = simplifyNode(child, maxNodesPerComponent, maxDepthPerComponent, parentBbox);
    }

    if (comp) {
      components.push(comp);
    }
  }

  return components;
}

/**
 * Simplify a single node
 */
function simplifyNode(
  node: any,
  maxNodesPerComponent: number,
  maxDepthPerComponent: number,
  parentBbox?: { x: number; y: number; w: number; h: number }
): MinimalComponent | null {
  if (isSkippable(node)) {
    return null;
  }

  const nodeType = node.type;
  const simplified: MinimalComponent = {
    name: node.name,
    type: nodeType,
  };

  const bbox = getBBox(node);
  if (bbox) {
    simplified.bbox = bbox;
    
    // Calculate relative position if parent bbox is provided
    if (parentBbox) {
      simplified.relativePosition = {
        top: Math.round((bbox.y - parentBbox.y) * 10) / 10,
        left: Math.round((bbox.x - parentBbox.x) * 10) / 10,
      };
    }
  }

  // TEXT content
  if (nodeType === 'TEXT') {
    // Try node.text.characters first (Figma API format), then node.characters, then node.name as fallback
    const text = (node.text?.characters || node.characters || node.name || '').trim();
    if (text) {
      simplified.text = text;
    }

    // Typography styles - check node.text.style first (Figma API format), then node.style
    const style = node.text?.style || node.style || {};
    if (style.fontFamily) simplified.fontFamily = style.fontFamily;
    if (style.fontSize) simplified.fontSize = Math.round(style.fontSize * 10) / 10;
    if (style.fontWeight) simplified.fontWeight = style.fontWeight;
    if (style.textAlignHorizontal) {
      const align = style.textAlignHorizontal;
      if (['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'].includes(align)) {
        simplified.textAlign = align.toLowerCase();
      }
    }
    if (style.lineHeightPx) simplified.lineHeight = Math.round(style.lineHeightPx * 10) / 10;
    if (style.letterSpacing) simplified.letterSpacing = Math.round(style.letterSpacing * 100) / 100;
    if (style.textDecoration && style.textDecoration !== 'NONE') {
      simplified.textDecoration = style.textDecoration.toLowerCase();
    }

    // Phase 2: text-case (UPPER, LOWER, TITLE)
    if (style.textCase && style.textCase !== 'ORIGINAL') {
      simplified.textCase = style.textCase;
    }

    // Phase 2: text-shadow from DROP_SHADOW effects on text nodes
    const textEffects = node.effects || [];
    const textDropShadow = textEffects.find(
      (e: any) => e.type === 'DROP_SHADOW' && e.visible !== false
    );
    if (textDropShadow) {
      const ds = textDropShadow;
      const ox = Math.round(ds.offset?.x || 0);
      const oy = Math.round(ds.offset?.y || 0);
      const blur = Math.round(ds.radius || 0);
      if (ds.color) {
        const r = Math.round((ds.color.r || 0) * 255);
        const g = Math.round((ds.color.g || 0) * 255);
        const b = Math.round((ds.color.b || 0) * 255);
        const a = ds.color.a ?? 1;
        simplified.textShadow = `${ox}px ${oy}px ${blur}px rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
      }
    }

    // Phase 2: Styled text segments (multi-style text)
    const styledSegments = node.styledTextSegments || (node as any).characterStyleOverrides;
    if (styledSegments && Array.isArray(styledSegments) && styledSegments.length > 1) {
      simplified.textSegments = styledSegments.map((seg: any) => {
        const segment: any = { characters: seg.characters || '' };
        if (seg.fills && Array.isArray(seg.fills)) {
          const segFill = retrieveTopFill(seg.fills);
          if (segFill && segFill.type === 'SOLID' && segFill.color) {
            segment.color = rgbaToCss(segFill.color);
          }
        }
        if (seg.fontSize) segment.fontSize = Math.round(seg.fontSize * 10) / 10;
        if (seg.fontName?.family) segment.fontFamily = seg.fontName.family;
        if (seg.fontWeight) segment.fontWeight = seg.fontWeight;
        if (seg.fontName?.style?.toLowerCase().includes('italic')) segment.fontStyle = 'italic';
        if (seg.textDecoration && seg.textDecoration !== 'NONE') segment.textDecoration = seg.textDecoration.toLowerCase();
        if (seg.textCase && seg.textCase !== 'ORIGINAL') segment.textCase = seg.textCase;
        if (seg.lineHeight?.value) segment.lineHeight = Math.round(seg.lineHeight.value * 10) / 10;
        if (seg.letterSpacing?.value) segment.letterSpacing = Math.round(seg.letterSpacing.value * 100) / 100;
        return segment;
      });
    }
  }

  // Colors - extract background/fill colors (including gradients)
  // Phase 1: Use retrieveTopFill (last visible paint in array, matching Figma's rendering)
  const fills = node.fills || [];
  const visibleFills = fills.filter((f: any) => f.visible !== false);
  
  // Phase 2: Capture all visible fills for multi-fill CSS layering
  if (visibleFills.length > 1) {
    simplified.fills = visibleFills.map((f: any) => ({
      type: f.type,
      color: f.color,
      opacity: f.opacity,
      gradient: f.gradientStops ? linearGradientToCss(f) || radialGradientToCss(f) : undefined,
      visible: true,
    }));
  }
  
  const topFill = retrieveTopFill(fills);
  if (topFill) {
    if (topFill.type === 'SOLID') {
      const color = topFill.color;
      if (color) {
        simplified.backgroundColor = rgbaToCss(color);
      }
    } else if (topFill.type === 'GRADIENT_LINEAR' || topFill.type === 'LINEAR_GRADIENT') {
      const gradient = linearGradientToCss(topFill);
      if (gradient) {
        simplified.gradient = gradient;
      }
    } else if (topFill.type === 'GRADIENT_RADIAL' || topFill.type === 'RADIAL_GRADIENT') {
      const gradient = radialGradientToCss(topFill);
      if (gradient) {
        simplified.gradient = gradient;
      }
    } else if (topFill.type === 'GRADIENT_ANGULAR') {
      const gradient = angularGradientToCss(topFill);
      if (gradient) {
        simplified.gradient = gradient;
      }
    } else if (topFill.type === 'GRADIENT_DIAMOND') {
      const gradient = diamondGradientToCss(topFill);
      if (gradient) {
        simplified.gradient = gradient;
      }
    }
  }

  // Text color (from fills for TEXT nodes)
  if (nodeType === 'TEXT') {
    const textTopFill = retrieveTopFill(fills);
    if (textTopFill && textTopFill.type === 'SOLID') {
      const color = textTopFill.color;
      if (color) {
        simplified.color = rgbaToCss(color);
        delete simplified.backgroundColor;
      }
    }
  }

  // Border radius
  if (node.cornerRadius && node.cornerRadius > 0) {
    simplified.borderRadius = Math.round(node.cornerRadius * 10) / 10;
  }

  // Strokes (borders)
  const strokes = node.strokes || [];
  const strokeWeight = node.strokeWeight || 0;
  if (strokes.length > 0 && strokeWeight > 0) {
    const stroke = strokes[0];
    if (stroke.type === 'SOLID' && stroke.visible !== false) {
      const strokeColor = stroke.color;
      if (strokeColor) {
        simplified.borderColor = rgbaToCss(strokeColor);
        simplified.borderWidth = Math.round(strokeWeight * 10) / 10;
      }
    }
  }

  // Effects (shadows, blurs)
  const effects = node.effects || [];
  const shadows = effects.filter(
    (e: any) => e.type === 'DROP_SHADOW' && e.visible !== false
  );
  if (shadows.length > 0) {
    const shadowCss = effectToCss(shadows[0]);
    if (shadowCss) {
      simplified.boxShadow = shadowCss;
    }
  }

  // Opacity
  if (node.opacity !== undefined && node.opacity < 1) {
    simplified.opacity = Math.round(node.opacity * 100) / 100;
  }

  // Padding
  const { paddingLeft, paddingTop, paddingRight, paddingBottom } = node;
  if ([paddingLeft, paddingTop, paddingRight, paddingBottom].some((p) => p && p > 0)) {
    simplified.padding = {
      top: Math.round((paddingTop || 0) * 10) / 10,
      right: Math.round((paddingRight || 0) * 10) / 10,
      bottom: Math.round((paddingBottom || 0) * 10) / 10,
      left: Math.round((paddingLeft || 0) * 10) / 10,
    };
  }

  // Layout mode (AUTO layout)
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    simplified.layoutMode = node.layoutMode;

    if (node.itemSpacing && node.itemSpacing > 0) {
      simplified.gap = Math.round(node.itemSpacing * 10) / 10;
    }

    if (node.primaryAxisAlignItems) {
      simplified.justifyContent = node.primaryAxisAlignItems;
    }

    if (node.counterAxisAlignItems) {
      simplified.alignItems = node.counterAxisAlignItems;
    }

    // Phase 1: Layout wrap support
    if (node.layoutWrap && node.layoutWrap === 'WRAP') {
      simplified.layoutWrap = 'WRAP';
    }
  }

  // Phase 1: FILL/HUG sizing resolution — preserve responsive intent
  if (node.layoutSizingHorizontal || node.layoutSizingVertical) {
    const widthSizing = node.layoutSizingHorizontal === 'FILL' ? 'fill'
      : node.layoutSizingHorizontal === 'HUG' ? 'hug' : 'fixed';
    const heightSizing = node.layoutSizingVertical === 'FILL' ? 'fill'
      : node.layoutSizingVertical === 'HUG' ? 'hug' : 'fixed';
    // Only add if not both fixed (that's the default)
    if (widthSizing !== 'fixed' || heightSizing !== 'fixed') {
      simplified.sizing = { width: widthSizing, height: heightSizing };
    }
  }

  // Constraints
  if (node.constraints) {
    simplified.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  }

  // Blend mode
  if (node.blendMode && node.blendMode !== 'NORMAL') {
    simplified.blendMode = node.blendMode;
  }

  // Clipping
  if (node.clipsContent === true) {
    simplified.overflow = 'hidden';
  }

  // Absolute positioning
  if (node.layoutPositioning === 'ABSOLUTE') {
    simplified.position = 'absolute';
  }

  // Image flag
  const imageRef = getImageRef(node);
  if (imageRef) {
    simplified.image = true;
    simplified.imageRef = imageRef;
  }

  // Vector shapes with icon detection
  if (['VECTOR', 'LINE', 'ELLIPSE', 'POLYGON', 'STAR', 'REGULAR_POLYGON', 'RECTANGLE'].includes(nodeType)) {
    simplified.shapeType = nodeType.toLowerCase();
    
    // Try to detect icon type from node name or parent context
    const iconMatch = getIconFromName(node.name);
    if (iconMatch) {
      simplified.iconType = iconMatch.key;
    }
    
    // Extract stroke info for vectors (useful for icon rendering)
    const strokes = node.strokes || [];
    if (strokes.length > 0 && strokes[0].visible !== false) {
      const stroke = strokes[0];
      if (stroke.type === 'SOLID' && stroke.color) {
        simplified.strokeColor = rgbaToCss(stroke.color);
      }
    }
    if (node.strokeWeight) {
      simplified.strokeWidth = Math.round(node.strokeWeight * 10) / 10;
    }
  }

  // Rotation
  if (node.rotation && Math.abs(node.rotation) > 0.1) {
    simplified.rotation = Math.round(node.rotation * 10) / 10;
  }

  // Phase 1: Empty FRAME → RECTANGLE conversion (no children = simple shape)
  if (['FRAME', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'].includes(nodeType)) {
    const children = node.children || [];
    if (children.length === 0) {
      simplified.type = 'RECTANGLE';
      simplified.shapeType = 'rectangle';
      // Don't process children since there are none
      return simplified;
    }
  }

  // For structural nodes, keep simplified children if not too complex
  if (['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'SECTION'].includes(nodeType)) {
    // Check if this FRAME is actually an icon container (e.g., "akar-icons:search")
    const iconMatch = getIconFromName(node.name);
    if (iconMatch) {
      simplified.iconType = iconMatch.key;
    }

    // Phase 1: GROUP inlining — flatten GROUP children into parent
    // GROUPs in Figma are pure visual containers with no layout properties
    // Inlining removes unnecessary nesting and simplifies LLM context
    if (nodeType === 'GROUP') {
      const myBbox = getBBox(node);
      const inlinedChildren: MinimalComponent[] = [];
      for (const child of node.children || []) {
        const childSimple = simplifyNode(
          child,
          maxNodesPerComponent,
          maxDepthPerComponent,
          parentBbox // Use PARENT's bbox (not GROUP's) for relative positioning
        );
        if (childSimple) {
          inlinedChildren.push(childSimple);
        }
      }
      // Return the first child directly if only one, otherwise keep as group
      if (inlinedChildren.length === 1) {
        return inlinedChildren[0];
      }
      // For multiple children, keep as group but mark it as inlined
      if (inlinedChildren.length > 0) {
        simplified.children = inlinedChildren;
      }
      return simplified;
    }
    
    const [nodeCount, maxDepth] = computeComplexity(node);
    if (nodeCount <= maxNodesPerComponent && maxDepth <= maxDepthPerComponent) {
      const childrenSimplified: MinimalComponent[] = [];
      const myBbox = getBBox(node); // Parent bbox for children
      for (const child of node.children || []) {
        const childSimple = simplifyNode(
          child,
          maxNodesPerComponent,
          maxDepthPerComponent,
          myBbox // Pass parent bbox to calculate relative positions
        );
        if (childSimple) {
          childrenSimplified.push(childSimple);
        }
      }

      if (childrenSimplified.length > 0) {
        simplified.children = childrenSimplified;
      }
    }
  }

  // Remove undefined values
  Object.keys(simplified).forEach((key) => {
    if (simplified[key as keyof MinimalComponent] === undefined) {
      delete simplified[key as keyof MinimalComponent];
    }
  });

  return simplified;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Retrieve the topmost visible fill from a fills array.
 * In Figma, the top layer is at the LAST position in the array.
 * We reverse and find the first visible fill — matching FigmaToCode's retrieveTopFill().
 */
function retrieveTopFill(fills: any[]): any | undefined {
  if (!fills || !Array.isArray(fills) || fills.length === 0) return undefined;
  return [...fills].reverse().find((f: any) => f.visible !== false);
}

function rgbaToCss(color: any): string {
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  const a = color.a !== undefined ? color.a : 1;

  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
}

function linearGradientToCss(fill: any): string {
  const stops = fill.gradientStops || [];
  if (stops.length === 0) return '';

  // Calculate angle from gradient handle positions
  const handlePositions = fill.gradientHandlePositions || [];
  let angle = 180; // default to top-to-bottom
  if (handlePositions.length >= 2) {
    const dx = handlePositions[1].x - handlePositions[0].x;
    const dy = handlePositions[1].y - handlePositions[0].y;
    angle = Math.round((Math.atan2(dy, dx) * 180 / Math.PI) + 90);
  }

  const colorStops = stops.map((stop: any) => {
    const color = rgbaToCss(stop.color);
    const position = Math.round(stop.position * 100);
    return `${color} ${position}%`;
  }).join(', ');

  return `linear-gradient(${angle}deg, ${colorStops})`;
}

function radialGradientToCss(fill: any): string {
  const stops = fill.gradientStops || [];
  if (stops.length === 0) return '';

  const colorStops = stops.map((stop: any) => {
    const color = rgbaToCss(stop.color);
    const position = Math.round(stop.position * 100);
    return `${color} ${position}%`;
  }).join(', ');

  return `radial-gradient(circle, ${colorStops})`;
}

/**
 * Convert angular gradient to CSS conic-gradient
 * Matches FigmaToCode's htmlAngularGradient
 */
function angularGradientToCss(fill: any): string {
  const stops = fill.gradientStops || [];
  if (stops.length === 0) return '';

  const handlePositions = fill.gradientHandlePositions || [];
  let angle = 0;
  if (handlePositions.length >= 3) {
    const center = handlePositions[0];
    const startDir = handlePositions[2];
    const dx = startDir.x - center.x;
    const dy = startDir.y - center.y;
    angle = Math.round(((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360);
  }

  // Conic gradient uses degrees for stop positions (0-360)
  const colorStops = stops.map((stop: any) => {
    const color = rgbaToCss(stop.color);
    const position = Math.round(stop.position * 360);
    return `${color} ${position}deg`;
  }).join(', ');

  const cx = handlePositions.length > 0 ? (handlePositions[0].x * 100).toFixed(2) : '50';
  const cy = handlePositions.length > 0 ? (handlePositions[0].y * 100).toFixed(2) : '50';

  return `conic-gradient(from ${angle}deg at ${cx}% ${cy}%, ${colorStops})`;
}

/**
 * Convert diamond gradient to CSS approximation using 4 linear gradients
 * Matches FigmaToCode's htmlDiamondGradient
 */
function diamondGradientToCss(fill: any): string {
  const stops = fill.gradientStops || [];
  if (stops.length === 0) return '';

  const colorStops = stops.map((stop: any) => {
    const color = rgbaToCss(stop.color);
    const position = Math.round(stop.position * 50); // Half range for each quadrant
    return `${color} ${position}%`;
  }).join(', ');

  // Approximate diamond with 4 gradient quadrants
  const gradients = [
    `linear-gradient(to bottom right, ${colorStops}) bottom right / 50% 50% no-repeat`,
    `linear-gradient(to bottom left, ${colorStops}) bottom left / 50% 50% no-repeat`,
    `linear-gradient(to top left, ${colorStops}) top left / 50% 50% no-repeat`,
    `linear-gradient(to top right, ${colorStops}) top right / 50% 50% no-repeat`,
  ];

  return gradients.join(', ');
}

function effectToCss(effect: any): string {
  if (effect.type === 'DROP_SHADOW') {
    const offsetX = effect.offset?.x || 0;
    const offsetY = effect.offset?.y || 0;
    const radius = effect.radius || 0;
    const color = effect.color || {};
    const colorCss = rgbaToCss(color);
    return `${offsetX}px ${offsetY}px ${radius}px ${colorCss}`;
  }
  return '';
}

function getBBox(node: any): BBox | undefined {
  const box = node.absoluteBoundingBox;
  if (!box || typeof box !== 'object') {
    return undefined;
  }

  const round = (v: any): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return Math.round(v * 10) / 10;
    return 0;
  };

  try {
    return {
      x: round(box.x),
      y: round(box.y),
      w: round(box.width),
      h: round(box.height),
    };
  } catch {
    return undefined;
  }
}

function getImageRef(node: any): string | undefined {
  // Check node.fills first (direct fills)
  const fills = node.fills || [];
  for (const fill of fills) {
    if (fill.type === 'IMAGE' && fill.imageRef) {
      return fill.imageRef;
    }
  }

  // Also check node.styles.fills (styled fills)
  const stylesFills = node.styles?.fills || [];
  for (const fill of stylesFills) {
    if (fill.type === 'IMAGE' && fill.imageRef) {
      return fill.imageRef;
    }
  }

  return undefined;
}

function computeComplexity(node: any): [number, number] {
  const children = node.children || [];
  if (children.length === 0) {
    return [1, 1];
  }

  let total = 1;
  let maxChildDepth = 0;

  for (const child of children) {
    const [cTotal, cDepth] = computeComplexity(child);
    total += cTotal;
    if (cDepth > maxChildDepth) {
      maxChildDepth = cDepth;
    }
  }

  return [total, maxChildDepth + 1];
}

function isSkippable(node: any): boolean {
  if (!node.type) {
    return true;
  }

  if (node.visible === false) {
    return true;
  }

  return false;
}

/**
 * Calculate the byte size of JSON data
 */
export function calculateJsonSize(data: any): number {
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

/**
 * Format byte size to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calculate reduction percentage
 */
export function calculateReduction(originalSize: number, minimizedSize: number): number {
  return Math.round(((originalSize - minimizedSize) / originalSize) * 100);
}

/**
 * Color data structure for the color lookup table
 */
interface ColorData {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Color registry for deduplication
 * Manages unique colors and assigns IDs
 */
class ColorRegistry {
  private colors: Map<string, ColorData> = new Map();
  private nextId: number = 1;

  /**
   * Add a color to registry, return its ID
   * If color already exists, return existing ID
   */
  addColor(color: {r: number, g: number, b: number, a?: number}): string {
    const normalized = {
      r: Math.round(color.r * 1000) / 1000,
      g: Math.round(color.g * 1000) / 1000,
      b: Math.round(color.b * 1000) / 1000,
      a: Math.round((color.a ?? 1) * 1000) / 1000,
    };

    // Create unique key for deduplication
    const key = `${normalized.r},${normalized.g},${normalized.b},${normalized.a}`;

    // Check if color already exists
    const colorIds = Array.from(this.colors.keys());
    for (const id of colorIds) {
      const existingColor = this.colors.get(id)!;
      const existingKey = `${existingColor.r},${existingColor.g},${existingColor.b},${existingColor.a}`;
      if (existingKey === key) {
        return id;
      }
    }

    // Add new color
    const id = this.nextId.toString();
    this.colors.set(id, normalized);
    this.nextId++;
    return id;
  }

  /**
   * Get color lookup table as plain object
   */
  getColorsObject(): Record<string, ColorData> {
    const obj: Record<string, ColorData> = {};
    const colorIds = Array.from(this.colors.keys());
    for (const id of colorIds) {
      obj[id] = this.colors.get(id)!;
    }
    return obj;
  }

  /**
   * Check if any colors were registered
   */
  hasColors(): boolean {
    return this.colors.size > 0;
  }
}

/**
 * Node colors extracted from Figma node
 */
interface NodeColors {
  fill?: string;      // Primary fill color ID
  stroke?: string;    // Stroke color ID
  shadow?: string;    // Shadow color ID
}

/**
 * Extract colors from a Figma node and register them
 * Returns color IDs for fill, stroke, and shadow
 */
function extractNodeColors(node: any, colorRegistry: ColorRegistry): NodeColors {
  const colors: NodeColors = {};

  // Extract fill color (background)
  // Check both node.fills and node.styles.fills
  const fills = node.fills || node.styles?.fills || [];
  if (fills.length > 0) {
    const primaryFill = fills[0];
    if (primaryFill.type === 'SOLID' && primaryFill.visible !== false && primaryFill.color) {
      colors.fill = colorRegistry.addColor(primaryFill.color);
    }
  }

  // Extract stroke color (border)
  // Check both node.strokes and node.styles.strokes
  const strokes = node.strokes || node.styles?.strokes || [];
  const strokeWeight = node.strokeWeight || node.styles?.strokeWeight || 0;
  if (strokes.length > 0 && strokeWeight > 0) {
    const stroke = strokes[0];
    if (stroke.type === 'SOLID' && stroke.visible !== false && stroke.color) {
      colors.stroke = colorRegistry.addColor(stroke.color);
    }
  }

  // Extract shadow color
  // Check both node.effects and node.styles.effects
  const effects = node.effects || node.styles?.effects || [];
  const shadows = effects.filter(
    (e: any) => e.type === 'DROP_SHADOW' && e.visible !== false
  );
  if (shadows.length > 0 && shadows[0].color) {
    colors.shadow = colorRegistry.addColor(shadows[0].color);
  }

  return colors;
}

/**
 * Shorten long names (more than 4 words)
 */
function shortenName(name: string): string {
  const words = name.split(/\s+/);
  if (words.length > 4) {
    return words.slice(0, 4).join(' ') + '...';
  }
  return name;
}

/**
 * Transform Figma frame data to RawSnapshot format
 * - Normalizes frame position to (0, 0)
 * - Calculates all children positions relative to frame's absoluteBoundingBox
 * - Includes: id, name, type, x, y, w, h, children
 * - Extracts and deduplicates colors with a lookup table
 */
export function figmaFrameToRawSnapshot(frameNode: any): any {
  if (!frameNode || frameNode.type !== 'FRAME') {
    throw new Error('Expected a Figma FRAME node');
  }

  const frameBbox = frameNode.absoluteBoundingBox;
  if (!frameBbox) {
    throw new Error('Frame must have absoluteBoundingBox');
  }

  // Extract offset coordinates
  const offsetX = frameBbox.x;
  const offsetY = frameBbox.y;

  // Create color registry for deduplication
  const colorRegistry = new ColorRegistry();

  // Transform node recursively
  function transformNode(node: any): any {
    const transformed: any = {
      id: node.id,
      n: shortenName(node.name), // Shorten long names
      t: node.type,
    };

    // Transform absoluteBoundingBox to x, y, w, h with rounding
    if (node.absoluteBoundingBox) {
      const bbox = node.absoluteBoundingBox;
      transformed.x = Math.round((bbox.x - offsetX) * 10) / 10;
      transformed.y = Math.round((bbox.y - offsetY) * 10) / 10;
      transformed.w = Math.round(bbox.width * 10) / 10;
      transformed.h = Math.round(bbox.height * 10) / 10;
    }

    // Extract text content for TEXT nodes
    if (node.type === 'TEXT') {
      const text = (node.text?.characters || node.characters || '').trim();
      if (text) {
        transformed.text = text;
      }
    }

    // Extract and register colors
    const nodeColors = extractNodeColors(node, colorRegistry);
    if (nodeColors.fill) transformed.fill = nodeColors.fill;
    if (nodeColors.stroke) transformed.stroke = nodeColors.stroke;
    if (nodeColors.shadow) transformed.shadow = nodeColors.shadow;

    // Recursively transform children
    if (node.children && Array.isArray(node.children)) {
      transformed.c = node.children.map((child: any) => transformNode(child));
    }

    return transformed;
  }

  const result = transformNode(frameNode);

  // Add color lookup table to root
  if (colorRegistry.hasColors()) {
    result.colors = colorRegistry.getColorsObject();
  }

  return result;
}

/**
 * Unmanaged element structure for elements filtered by size
 */
interface UnmanagedElement {
  id: string;
  n: string;  // name
  t: string;  // type
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;  // For TEXT nodes
}

/**
 * Pre-calculated cluster of spatially-related unmanaged elements
 */
interface UnmanagedCluster {
  yRange: [number, number];
  elements: UnmanagedElement[];  // Full element data instead of just IDs
  count: number;
  avgY: number;  // Average Y position for sorting
}

/**
 * Transform rawSnapshot to ultra-lightweight format for section detection
 * - Limits depth to specified levels (default: 2)
 * - Filters out tiny decorative elements
 * - Tracks unmanaged elements (those failing size requirements)
 * - Pre-calculates spatial clusters of unmanaged elements
 * - Only includes essential spatial data: id, t, x, y, w, h, childCount
 */
export function figmaSnapshotToSectionHint(
  snapshot: any,
  options?: {
    maxDepth?: number;
    minWidth?: number;
    minHeight?: number;
  }
): any {
  const {
    maxDepth = 2,
    minWidth = 10,
    minHeight = 10,
  } = options || {};

  // Track unmanaged elements at each level
  const unmanagedElements: UnmanagedElement[] = [];

  // Helper to extract text from TEXT nodes
  function extractText(node: any): string | undefined {
    if (node.t !== 'TEXT') return undefined;
    // Try multiple possible text fields (text was added in figmaFrameToRawSnapshot)
    return node.text || node.n;
  }

  function transformNodeForHint(node: any, currentDepth: number): any | null {
    // Skip invisible nodes
    if (node.visible === false) {
      return null;
    }

    // Check size requirements
    const failsSize = node.w < minWidth || node.h < minHeight;

    if (failsSize) {
      // Add to unmanaged elements if has valid position data
      if (node.id && node.t &&
          node.x !== undefined && node.y !== undefined &&
          node.w !== undefined && node.h !== undefined) {
        const unmanagedEl: UnmanagedElement = {
          id: node.id,
          n: node.n || '',
          t: node.t,
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h,
        };

        // Include text content for TEXT nodes
        const text = extractText(node);
        if (text) {
          unmanagedEl.text = text;
        }

        unmanagedElements.push(unmanagedEl);
      }
      return null;
    }

    const transformed: any = {
      id: node.id,
      t: node.t,
    };

    // Include spatial data
    if (node.x !== undefined) transformed.x = node.x;
    if (node.y !== undefined) transformed.y = node.y;
    if (node.w !== undefined) transformed.w = node.w;
    if (node.h !== undefined) transformed.h = node.h;

    // Handle children
    if (node.c && Array.isArray(node.c)) {
      if (currentDepth >= maxDepth) {
        // At max depth, replace children with count
        transformed.childCount = node.c.length;
      } else {
        // Recursively transform children
        const children = node.c
          .map((child: any) => transformNodeForHint(child, currentDepth + 1))
          .filter((child: any) => child !== null);

        if (children.length > 0) {
          transformed.c = children;
        } else if (node.c.length > 0) {
          // All children were filtered out, but there were some
          transformed.childCount = node.c.length;
        }
      }
    }

    return transformed;
  }

  const result = transformNodeForHint(snapshot, 0);

  // Add unmanaged elements if any were found
  if (unmanagedElements.length > 0) {
    result.unmanagedElements = unmanagedElements;

    // Pre-calculate clusters based on Y-coordinate proximity
    const clusters = calculateUnmanagedClusters(unmanagedElements);
    if (clusters.length > 0) {
      result.unmanagedClusters = clusters;
    }
  }

  return result;
}

/**
 * Calculate clusters of unmanaged elements based on Y-coordinate proximity
 * Groups elements within ±20px tolerance
 */
function calculateUnmanagedClusters(elements: UnmanagedElement[]): UnmanagedCluster[] {
  if (elements.length === 0) return [];

  // Sort by Y position
  const sorted = [...elements].sort((a, b) => a.y - b.y);

  const clusters: UnmanagedCluster[] = [];
  const Y_TOLERANCE = 20;  // ±20px tolerance for grouping

  let currentCluster: UnmanagedElement[] = [sorted[0]];
  let currentMinY = sorted[0].y;
  let currentMaxY = sorted[0].y + sorted[0].h;

  for (let i = 1; i < sorted.length; i++) {
    const element = sorted[i];
    const elementY = element.y;

    // Check if this element is within tolerance of the current cluster
    if (Math.abs(elementY - currentMinY) <= Y_TOLERANCE) {
      // Add to current cluster
      currentCluster.push(element);
      currentMinY = Math.min(currentMinY, elementY);
      currentMaxY = Math.max(currentMaxY, elementY + element.h);
    } else {
      // Save current cluster if it has multiple elements
      if (currentCluster.length >= 2) {
        const avgY = currentCluster.reduce((sum, el) => sum + el.y, 0) / currentCluster.length;
        clusters.push({
          yRange: [Math.round(currentMinY), Math.round(currentMaxY)],
          elements: currentCluster,  // Include full element data
          count: currentCluster.length,
          avgY: Math.round(avgY),
        });
      }

      // Start new cluster
      currentCluster = [element];
      currentMinY = elementY;
      currentMaxY = elementY + element.h;
    }
  }

  // Don't forget the last cluster
  if (currentCluster.length >= 2) {
    const avgY = currentCluster.reduce((sum, el) => sum + el.y, 0) / currentCluster.length;
    clusters.push({
      yRange: [Math.round(currentMinY), Math.round(currentMaxY)],
      elements: currentCluster,  // Include full element data
      count: currentCluster.length,
      avgY: Math.round(avgY),
    });
  }

  // Sort clusters by avgY
  return clusters.sort((a, b) => a.avgY - b.avgY);
}

/**
 * Flatten tree structure into ID-keyed map for O(1) lookups
 * Useful for extracting specific sections by element IDs
 */
export function flattenSnapshotById(snapshot: any): Map<string, any> {
  const map = new Map<string, any>();

  function traverse(node: any) {
    if (!node || !node.id) return;

    map.set(node.id, node);

    // Traverse children
    if (node.c && Array.isArray(node.c)) {
      node.c.forEach((child: any) => traverse(child));
    }

    // Also traverse children property (for different formats)
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => traverse(child));
    }
  }

  traverse(snapshot);
  return map;
}

/**
 * Clone a node with all its children
 */
function cloneNodeWithChildren(node: any): any {
  const cloned = { ...node };
  if (node.c && Array.isArray(node.c)) {
    cloned.c = node.c.map((child: any) => cloneNodeWithChildren(child));
  }
  return cloned;
}

/**
 * Calculate bounding box from a list of nodes
 */
function calculateBoundingBox(nodes: any[]): { x: number; y: number; w: number; h: number } {
  if (nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  function updateBounds(node: any) {
    if (node.x !== undefined && node.y !== undefined &&
        node.w !== undefined && node.h !== undefined) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.w);
      maxY = Math.max(maxY, node.y + node.h);
    }
    if (node.c && Array.isArray(node.c)) {
      node.c.forEach((child: any) => updateBounds(child));
    }
  }

  nodes.forEach(updateBounds);

  return {
    x: Math.round(minX * 10) / 10,
    y: Math.round(minY * 10) / 10,
    w: Math.round((maxX - minX) * 10) / 10,
    h: Math.round((maxY - minY) * 10) / 10,
  };
}

/**
 * Extract section-specific snapshot from rawSnapshot
 * Returns only the nodes referenced by elementIds (and their children)
 */
export function extractSectionSnapshot(
  rawSnapshot: any,
  elementIds: string[]
): any {
  if (!rawSnapshot || !elementIds || elementIds.length === 0) {
    return null;
  }

  // Create ID lookup map for fast access
  const nodeMap = flattenSnapshotById(rawSnapshot);

  // Extract referenced nodes and their subtrees
  const sectionNodes: any[] = [];

  for (const elementId of elementIds) {
    const node = nodeMap.get(elementId);
    if (node) {
      sectionNodes.push(cloneNodeWithChildren(node));
    }
  }

  if (sectionNodes.length === 0) return null;

  // Create section snapshot structure
  const sectionSnapshot: any = {
    id: `section-${elementIds[0]}`,
    n: 'Section Snapshot',
    t: 'SECTION',
    x: 0, y: 0, w: 0, h: 0,
    c: sectionNodes,
  };

  // Calculate bounding box from children
  if (sectionNodes.length > 0) {
    const bounds = calculateBoundingBox(sectionNodes);
    Object.assign(sectionSnapshot, bounds);
  }

  // Preserve color lookup table from original rawSnapshot
  if (rawSnapshot.colors) {
    sectionSnapshot.colors = rawSnapshot.colors;
  }

  return sectionSnapshot;
}

/**
 * Flatten raw Figma data tree into ID-keyed Map for O(1) lookups
 * Works with raw Figma data (not rawSnapshot)
 */
function flattenRawDataById(rawData: any): Map<string, any> {
  const map = new Map<string, any>();

  function traverse(node: any) {
    if (!node || !node.id) return;
    map.set(node.id, node);

    // Traverse children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => traverse(child));
    }
  }

  traverse(rawData);
  return map;
}

/**
 * Calculate bounding box from multiple nodes
 */
function calculateBoundingBoxFromNodes(nodes: any[]): BBox {
  if (nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  function updateBounds(node: any) {
    const bbox = node.absoluteBoundingBox;
    if (bbox) {
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }

    // Recurse children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => updateBounds(child));
    }
  }

  nodes.forEach(updateBounds);

  return {
    x: Math.round(minX * 10) / 10,
    y: Math.round(minY * 10) / 10,
    w: Math.round((maxX - minX) * 10) / 10,
    h: Math.round((maxY - minY) * 10) / 10
  };
}

/**
 * Normalize node coordinates relative to origin (0, 0)
 * Deep clones nodes and adjusts all absoluteBoundingBox values
 */
function normalizeNodeCoordinates(nodes: any[], offsetX: number, offsetY: number): any[] {
  function normalizeNode(node: any): any {
    const normalized = { ...node };

    // Adjust absoluteBoundingBox
    if (normalized.absoluteBoundingBox) {
      normalized.absoluteBoundingBox = {
        ...normalized.absoluteBoundingBox,
        x: normalized.absoluteBoundingBox.x - offsetX,
        y: normalized.absoluteBoundingBox.y - offsetY
      };
    }

    // Recurse children
    if (normalized.children && Array.isArray(normalized.children)) {
      normalized.children = normalized.children.map((child: any) => normalizeNode(child));
    }

    return normalized;
  }

  return nodes.map(normalizeNode);
}

/**
 * Extract and minimize section data from raw Figma data
 * Uses the same minimization logic as figmaFrameToMinimalStructure
 * Returns a MinimalStructure with proper sections, components, subsections
 * Coordinates are normalized so the section starts at (0, 0)
 *
 * @param rawFigmaData - The raw extracted Figma frame data
 * @param elementIds - Array of element IDs that belong to this section
 * @param options - Minimization options (maxNodes, maxDepth)
 * @returns MinimalStructure with sections starting at (0, 0)
 */
export function extractSectionMinimizedData(
  rawFigmaData: any,
  elementIds: string[],
  options: MinimizeOptions = {}
): MinimalStructure | null {
  const { maxNodesPerComponent = 25, maxDepthPerComponent = 10 } = options;

  if (!rawFigmaData || !elementIds || elementIds.length === 0) {
    return null;
  }

  // Create ID lookup map from raw data
  const nodeMap = flattenRawDataById(rawFigmaData);

  // Extract nodes by ID
  const sectionNodes: any[] = [];
  for (const elementId of elementIds) {
    const node = nodeMap.get(elementId);
    if (node) {
      sectionNodes.push(node);
    }
  }

  if (sectionNodes.length === 0) return null;

  // Calculate bounding box of all section nodes to determine offset
  const sectionBounds = calculateBoundingBoxFromNodes(sectionNodes);
  const offsetX = sectionBounds.x;
  const offsetY = sectionBounds.y;

  // Normalize coordinates: create adjusted copies of nodes with relative positions
  const normalizedNodes = normalizeNodeCoordinates(sectionNodes, offsetX, offsetY);

  // Create sections using buildSection
  const sections: Section[] = [];
  for (const node of normalizedNodes) {
    const section = buildSection(node, maxNodesPerComponent, maxDepthPerComponent);
    if (section) {
      sections.push(section);
    }
  }

  return {
    frameName: 'Section',
    frameBbox: {
      x: 0,
      y: 0,
      w: sectionBounds.w,
      h: sectionBounds.h
    },
    sections
  };
}
