import { z } from 'zod';

export const PROTOCOL_VERSION = 1;

// Base message envelope
export const MessageEnvelopeSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  id: z.string(),
  type: z.string(),
  timestamp: z.string(),
  source: z.enum(['web', 'bridge', 'device']),
  target: z.enum(['web', 'bridge', 'device', 'broadcast']),
  payload: z.record(z.any()),
});

export type MessageEnvelope = z.infer<typeof MessageEnvelopeSchema>;

// Action definitions
export const ActionTypeSchema = z.enum([
  'launch_app',
  'open_url',
  'shortcut',
  'text',
  'media',
  'http'
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

export const ActionPayloadSchema = z.object({
  path: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  keys: z.array(z.string()).optional(),
  text: z.string().optional(),
  mediaCommand: z.enum(['play', 'pause', 'next', 'prev', 'mute', 'vol_up', 'vol_down']).optional(),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  httpUrl: z.string().optional(),
  httpHeaders: z.record(z.string()).optional(),
  httpBody: z.string().optional(),
});

export type ActionPayload = z.infer<typeof ActionPayloadSchema>;

// Button definition
export const ButtonSchema = z.object({
  id: z.string(),
  rowIdx: z.number().min(0).max(2),
  colIdx: z.number().min(0).max(3),
  label: z.string().optional(),
  iconAssetId: z.string().optional(),
});

export type Button = z.infer<typeof ButtonSchema>;

// Device Page definition
export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  pageIndex: z.number(),
  buttons: z.array(ButtonSchema),
});

export type Page = z.infer<typeof PageSchema>;

// Profile definition
export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  isFallback: z.boolean(),
  pages: z.array(PageSchema),
});

export type Profile = z.infer<typeof ProfileSchema>;

// App Detection Rule definition
export const AppDetectionRuleSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  processName: z.string().optional(),
  windowTitlePattern: z.string().optional(),
  priority: z.number(),
});

export type AppDetectionRule = z.infer<typeof AppDetectionRuleSchema>;

// Payloads for specific message types
export const DeviceHelloPayloadSchema = z.object({
  deviceId: z.string(),
  firmwareVersion: z.string(),
  hardwareModel: z.string(),
  gridRows: z.number(),
  gridCols: z.number(),
});

export type DeviceHelloPayload = z.infer<typeof DeviceHelloPayloadSchema>;

export const DeviceStatusPayloadSchema = z.object({
  connected: z.boolean(),
  activePageId: z.string().optional(),
  batteryPercentage: z.number().optional(),
  freeMemoryBytes: z.number().optional(),
});

export type DeviceStatusPayload = z.infer<typeof DeviceStatusPayloadSchema>;

export const ProfileSyncPayloadSchema = z.object({
  activeProfile: ProfileSchema,
});

export type ProfileSyncPayload = z.infer<typeof ProfileSyncPayloadSchema>;

export const PageSyncPayloadSchema = z.object({
  page: PageSchema,
});

export type PageSyncPayload = z.infer<typeof PageSyncPayloadSchema>;

export const ButtonEventPayloadSchema = z.object({
  rowIdx: z.number(),
  colIdx: z.number(),
  buttonId: z.string(),
});

export type ButtonEventPayload = z.infer<typeof ButtonEventPayloadSchema>;

export const ActionExecutePayloadSchema = z.object({
  actionId: z.string(),
  type: ActionTypeSchema,
  payload: ActionPayloadSchema,
});

export type ActionExecutePayload = z.infer<typeof ActionExecutePayloadSchema>;

export const WidgetUpdatePayloadSchema = z.object({
  widgetId: z.string(),
  type: z.string(),
  data: z.record(z.any()),
});

export type WidgetUpdatePayload = z.infer<typeof WidgetUpdatePayloadSchema>;

export const AssetSyncPayloadSchema = z.object({
  assetId: z.string(),
  data: z.string(), // Base64 encoded asset binary or URL
  contentType: z.string(),
});

export type AssetSyncPayload = z.infer<typeof AssetSyncPayloadSchema>;

export const FirmwareStatusPayloadSchema = z.object({
  readyToUpdate: z.boolean(),
  progressPercentage: z.number().optional(),
  error: z.string().optional(),
});

export type FirmwareStatusPayload = z.infer<typeof FirmwareStatusPayloadSchema>;
