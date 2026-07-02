/**
 * Data validation schemas using Zod
 * Provides runtime type checking for import/export functionality
 */

import { z } from 'zod';

// ============================================
// Constants
// ============================================

export const DATA_VERSION = '1.0.0';
export const MIN_COMPATIBLE_VERSION = '1.0.0';

// Limits for security
export const LIMITS = {
  MAX_ABILITIES: 100,
  MAX_AGENTS: 50,
  MAX_DRAWINGS: 200,
  MAX_POINTS_PER_DRAWING: 1000,
  MAX_COORDINATE_OVERRIDES: 1000,
  MAX_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_BASE64_LENGTH: 3 * 1024 * 1024, // ~2MB after base64 encoding
  MAX_STRING_LENGTH: 500,
  MAX_NAME_LENGTH: 100,
} as const;

// Allowed image types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// ============================================
// Base Schemas
// ============================================

export const MapValueSchema = z.enum([
  'ascent', 'breeze', 'lotus', 'icebox', 'sunset',
  'split', 'haven', 'fracture', 'abyss', 'pearl', 'bind', 'corrode', 'summit'
]);

export const PositionSchema = z.object({
  x: z.number().min(0).max(2000),
  y: z.number().min(0).max(2000),
});

export const AgentTypeSchema = z.enum([
  // Duelists
  'jett', 'phoenix', 'raze', 'reyna', 'yoru', 'neon', 'iso', 'waylay',
  // Controllers
  'astra', 'brimstone', 'clove', 'harbor', 'miks', 'omen', 'viper',
  // Initiators
  'breach', 'fade', 'gekko', 'kayo', 'skye', 'sova', 'tejo',
  // Sentinels
  'chamber', 'cypher', 'deadlock', 'killjoy', 'sage', 'veto', 'vyse'
]);

// ============================================
// Ability Schemas
// ============================================

export const AbilityInfoSchema = z.object({
  name: z.string().max(LIMITS.MAX_NAME_LENGTH),
  iconPath: z.string().max(500),
  type: z.string().max(50),
  index: z.number().int().min(0).max(100),
  abilityData: z.record(z.unknown()).optional(),
});

export const PlacedAbilitySchema = z.object({
  id: z.string().max(100),
  ability: AbilityInfoSchema,
  position: PositionSchema,
  rotation: z.number().optional(),
  length: z.number().min(0).max(5000).optional(),
  isAlly: z.boolean(),
});

// ============================================
// Agent Schemas
// ============================================

export const PlacedAgentSchema = z.object({
  id: z.string().max(100),
  agentType: AgentTypeSchema,
  position: PositionSchema,
  isAlly: z.boolean(),
  state: z.enum(['alive', 'dead']),
});

// ============================================
// Drawing Schemas
// ============================================

export const DrawingElementSchema = z.object({
  id: z.string().max(100),
  type: z.enum(['line', 'arrow', 'freehand', 'text']),
  points: z.array(PositionSchema).max(LIMITS.MAX_POINTS_PER_DRAWING),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  strokeWidth: z.number().min(1).max(50),
  text: z.string().max(LIMITS.MAX_STRING_LENGTH).optional(),
});

// ============================================
// Strategy Schemas
// ============================================

export const StrategySchema = z.object({
  id: z.string().max(100),
  name: z.string().max(LIMITS.MAX_NAME_LENGTH),
  map: MapValueSchema,
  isAttack: z.boolean(),
  placedAbilities: z.array(PlacedAbilitySchema).max(LIMITS.MAX_ABILITIES),
  placedAgents: z.array(PlacedAgentSchema).max(LIMITS.MAX_AGENTS),
  drawings: z.array(DrawingElementSchema).max(LIMITS.MAX_DRAWINGS),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// Schema for importing (allows partial data)
export const StrategyImportSchema = z.object({
  _version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  _exportedAt: z.string().datetime().optional(),
  _app: z.string().optional(),
  map: MapValueSchema,
  isAttack: z.boolean(),
  placedAbilities: z.array(PlacedAbilitySchema).max(LIMITS.MAX_ABILITIES),
  placedAgents: z.array(PlacedAgentSchema).max(LIMITS.MAX_AGENTS),
  drawings: z.array(DrawingElementSchema).max(LIMITS.MAX_DRAWINGS),
});

// ============================================
// Lineup Schemas
// ============================================

export const CoordinateSchema = z.object({
  start: z.object({
    raw: z.array(z.number()).length(2),
    normalized: z.array(z.number()).length(2),
  }),
  end: z.object({
    raw: z.array(z.number()).length(2),
    normalized: z.array(z.number()).length(2),
  }),
});

export const LineupSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().max(LIMITS.MAX_NAME_LENGTH),
  side: z.enum(['attack', 'defense', 'unknown']),
  side_cn: z.string().max(50),
  abilityKey: z.enum(['C', 'Q', 'E', 'X']).optional(),
  coordinates: CoordinateSchema,
  coverage_area: z.array(z.array(z.number())),
  media: z.object({
    stand_image: z.object({
      url: z.string(),
      local: z.string(),
    }).optional(),
    detail_images: z.array(z.object({
      url: z.string(),
      local: z.string(),
      label: z.string().max(100),
    })),
    video: z.object({
      bilibili: z.string(),
      timestamp: z.string(),
      cut_video: z.string(),
    }).optional(),
    video_url: z.string().optional(),
  }),
  created_at: z.string().optional(),
  source_url: z.string().optional(),
  video_url: z.string().optional(),
});

// Schema for custom lineups import
export const CustomLineupsImportSchema = z.array(LineupSchema).max(500);

// ============================================
// Coordinate Override Schemas
// ============================================

export const CoordinateOverrideSchema = z.record(
  z.number().int().positive(), // lineupId
  z.object({
    start: z.tuple([z.number(), z.number()]),
    end: z.tuple([z.number(), z.number()]),
  })
).refine(
  (obj) => Object.keys(obj).length <= LIMITS.MAX_COORDINATE_OVERRIDES,
  { message: `Too many coordinate overrides (max ${LIMITS.MAX_COORDINATE_OVERRIDES})` }
);

// ============================================
// Type Exports
// ============================================

export type ValidatedStrategyImport = z.infer<typeof StrategyImportSchema>;
export type ValidatedCustomLineupsImport = z.infer<typeof CustomLineupsImportSchema>;
export type ValidatedCoordinateOverride = z.infer<typeof CoordinateOverrideSchema>;

// ============================================
// Validation Functions
// ============================================

/**
 * Validate strategy import data
 */
export function validateStrategyImport(data: unknown): { success: true; data: ValidatedStrategyImport } | { success: false; error: string } {
  try {
    const validated = StrategyImportSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      return { success: false, error: `Validation failed: ${issues}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

/**
 * Validate custom lineups import data
 */
export function validateCustomLineupsImport(data: unknown): { success: true; data: ValidatedCustomLineupsImport } | { success: false; error: string } {
  try {
    const validated = CustomLineupsImportSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      return { success: false, error: `Validation failed: ${issues}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

/**
 * Validate coordinate overrides import data
 */
export function validateCoordinateOverridesImport(data: unknown): { success: true; data: ValidatedCoordinateOverride } | { success: false; error: string } {
  try {
    const validated = CoordinateOverrideSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      return { success: false, error: `Validation failed: ${issues}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

// ============================================
// Version Management
// ============================================

/**
 * Check if imported data version is compatible
 */
export function isVersionCompatible(importVersion: string | undefined, currentVersion: string = DATA_VERSION): boolean {
  if (!importVersion) return true; // No version specified, assume compatible
  
  const [importMajor, importMinor] = importVersion.split('.').map(Number);
  const [currentMajor] = currentVersion.split('.').map(Number);
  
  // Major version must match for compatibility
  return importMajor === currentMajor;
}

/**
 * Get version warning message if needed
 */
export function getVersionWarning(importVersion: string | undefined): string | null {
  if (!importVersion) {
    return 'This data was exported from an older version. Some features may not work correctly.';
  }
  
  if (!isVersionCompatible(importVersion)) {
    return `This data was exported from version ${importVersion}, which may not be compatible with the current version.`;
  }
  
  return null;
}

// ============================================
// Image Validation
// ============================================

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): ImageValidationResult {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }
  
  // Check file size
  if (file.size > LIMITS.MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${(LIMITS.MAX_IMAGE_SIZE / 1024 / 1024).toFixed(1)}MB`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate base64 image data
 */
export function validateBase64Image(base64String: string): ImageValidationResult {
  if (base64String.length > LIMITS.MAX_BASE64_LENGTH) {
    return {
      valid: false,
      error: `Image data too large after encoding. Maximum: ${(LIMITS.MAX_BASE64_LENGTH / 1024 / 1024).toFixed(1)}MB`,
    };
  }
  
  // Check if it's a valid data URL
  if (!base64String.startsWith('data:image/')) {
    return {
      valid: false,
      error: 'Invalid image data format',
    };
  }
  
  return { valid: true };
}

// ============================================
// Storage Utilities
// ============================================

/**
 * Check if localStorage has available quota
 */
export function checkStorageQuota(): boolean {
  try {
    const testKey = '__quota_test__';
    const testData = 'x'.repeat(1024 * 1024); // 1MB
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current localStorage usage in bytes
 */
export function getStorageUsage(): number {
  if (typeof window === 'undefined') return 0;
  
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        total += key.length + value.length;
      }
    }
  }
  return total * 2; // UTF-16 encoding = 2 bytes per character
}

/**
 * Format storage size for display
 */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
