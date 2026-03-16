/**
 * Export all dashboard hooks
 */

export { useReactProjectGeneration } from './useReactProjectGeneration';
export { useExternalBackendGeneration } from './useExternalBackendGeneration';
export { useFirestoreRealtimeGeneration } from './useFirestoreRealtimeGeneration';

// Type exports
export type { GenerationMetadata, GenerationProgress, UseReactProjectGenerationResult } from './useReactProjectGeneration';
export type { UseExternalBackendGenerationResult } from './useExternalBackendGeneration';
export type { UseFirestoreRealtimeGenerationResult } from './useFirestoreRealtimeGeneration';
