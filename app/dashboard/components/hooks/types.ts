/**
 * TypeScript types for React project generation API
 */

/**
 * Section data from backend API
 */
export interface Section {
  id: string;
  name: string;
  type: string;           // Section type from detector (header, footer, hero, etc.)
  order: number;
  hasForm: boolean;       // Detected from TSX code
  hasMenu: boolean;       // From section detector
  menuItems?: string[];   // Only if hasMenu === true
  generated: {
    componentName: string;
    tsx: string;           // Complete React component code
  };
}

/**
 * Synchronous API response (full section data)
 */
export interface GenerateReactProjectSyncResponse {
  figmaUrl: string;
  screenshot: string;     // S3 URL
  sections: Section[];
}

/**
 * Job progress data from Firestore
 */
export interface JobProgress {
  currentStep: string;
  percentage: number;
  sectionsDetected?: number;
  sectionsProcessed?: number;
}

/**
 * Job data from Firestore
 */
export interface FirestoreJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: JobProgress;
  screenshotUrl?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
}
