import { z } from "zod";

// Base API Error Schema
export const ApiErrorSchema = z.object({
  statusCode: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  details: z.any().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// Auth & Tokens Schemas
export const TokenSetSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});
export type TokenSet = z.infer<typeof TokenSetSchema>;

export const AuthResponseSchema = z.object({
  message: z.string().optional(),
  verificationToken: z.string().optional(),
  resetToken: z.string().optional(),
  token: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokens: TokenSetSchema.optional(),
  data: z
    .object({
      tokens: TokenSetSchema.optional(),
      token: z.string().optional(),
      user: z
        .object({
          id: z.string().optional(),
          email: z.string().optional(),
          fullName: z.string().optional(),
          name: z.string().optional(),
        })
        .optional(),
      navigation: z
        .object({
          mainDashboardUrl: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// User Profile Schema
export const UserProfileSchema = z.object({
  email: z.string().email(),
  fullName: z.string().optional(),
  name: z.string().optional(),
  timezone: z.string().optional(),
  isVerified: z.boolean().optional(),
  createdAt: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// Social Accounts Schema
export const SupportedSocialPlatformEnum = z.enum(["instagram", "linkedin"]);
export type SupportedSocialPlatform = z.infer<typeof SupportedSocialPlatformEnum>;

export const SocialAccountSchema = z.object({
  _id: z.string(),
  id: z.string().optional(),
  platform: SupportedSocialPlatformEnum,
  platformId: z.string().optional(),
  platformDisplayName: z.string().optional(),
  platformUsername: z.string().optional(),
  platformMetadata: z
    .object({
      accountType: z.string().optional(),
    })
    .optional(),
});
export type SocialAccount = z.infer<typeof SocialAccountSchema>;

export const SocialAccountsResponseSchema = z.object({
  data: z.array(z.any()).optional(),
});

// Brand & Workspaces Schema
export const BrandMemberRoleEnum = z.enum(["owner", "admin", "member", "client"]);
export type BrandMemberRole = z.infer<typeof BrandMemberRoleEnum>;

export const BrandMemberSchema = z.object({
  userId: z.string(),
  role: BrandMemberRoleEnum,
  email: z.string().optional(),
  name: z.string().optional(),
});
export type BrandMember = z.infer<typeof BrandMemberSchema>;

export const BrandSchema = z.object({
  _id: z.string().optional(),
  id: z.string().optional(),
  name: z.string().min(1, "Brand name is required"),
  timezone: z.string().optional(),
  members: z.array(BrandMemberSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Brand = z.infer<typeof BrandSchema>;

export const BrandsResponseSchema = z.object({
  data: z.array(z.any()).optional(),
  brands: z.array(z.any()).optional(),
});

// Post Media Schema
export const MediaTypeEnum = z.enum(["image", "video", "gif"]);
export type MediaType = z.infer<typeof MediaTypeEnum>;

export const PostMediaItemSchema = z.object({
  type: MediaTypeEnum,
  url: z.string().url("Invalid media URL"),
  base64Data: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  name: z.string().optional(),
});
export type PostMediaItem = z.infer<typeof PostMediaItemSchema>;

// Post Status and Recurrence
export const PostStatusEnum = z.enum(["draft", "scheduled", "published", "failed"]);
export type PostStatus = z.infer<typeof PostStatusEnum>;

export const RecurrenceEnum = z.enum(["once", "hourly", "daily", "weekly", "monthly", "yearly"]);
export type Recurrence = z.infer<typeof RecurrenceEnum>;

export const RecurrenceUnitEnum = z.enum(["minute", "hour", "day", "week", "month"]);
export type RecurrenceUnit = z.infer<typeof RecurrenceUnitEnum>;

export const PlatformResponseSchema = z.object({
  platform: SupportedSocialPlatformEnum,
  status: z.enum(["success", "failed"]),
  message: z.string().optional(),
  socialHandleId: z.string().optional(),
  platformId: z.string().optional(),
  accountType: z.string().optional(),
  platformPostId: z.string().optional(),
});
export type PlatformResponse = z.infer<typeof PlatformResponseSchema>;

export const PostItemSchema = z.object({
  _id: z.string(),
  id: z.string().optional(),
  caption: z.string(),
  title: z.string().optional(),
  postType: z.string().optional(),
  firstComment: z.string().optional(),
  brandId: z.string().optional(),
  reviewStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  approvalToken: z.string().optional(),
  media: z.array(PostMediaItemSchema).optional(),
  status: PostStatusEnum,
  recurrence: RecurrenceEnum.optional(),
  recurrenceInterval: z.number().nullable().optional(),
  recurrenceUnit: RecurrenceUnitEnum.nullable().optional(),
  recurrencePaused: z.boolean().optional(),
  expiryMinutes: z.number().nullable().optional(),
  expiryInterval: z.number().nullable().optional(),
  expiryUnit: RecurrenceUnitEnum.nullable().optional(),
  publishedExpiresAt: z.string().nullable().optional(),
  timezone: z.string().optional(),
  selectedPlatforms: z.array(z.string()),
  selectedAccountIds: z.array(z.string()).optional(),
  createdAt: z.string(),
  publishedTime: z.string().nullable().optional(),
  scheduledTime: z.string().nullable().optional(),
  platformResponses: z.array(PlatformResponseSchema).optional(),
  poll: z
    .object({
      question: z.string(),
      options: z.array(z.object({ text: z.string() })),
      settings: z.object({
        duration: z.string(),
        voteSelectionType: z.string().optional(),
      }),
    })
    .optional(),
  instagramTrial: z
    .object({
      enabled: z.boolean(),
      graduationStrategy: z.string().optional(),
    })
    .optional(),
});
export type PostItem = z.infer<typeof PostItemSchema>;

export const PostsResponseSchema = z.object({
  data: z.array(z.any()).optional(),
  meta: z
    .object({
      page: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().optional(),
    })
    .optional(),
});

// Developer API Key Schema
export const ApiKeyItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string().optional(),
  key: z.string().optional(),
  lastUsedAt: z.string().optional(),
  createdAt: z.string(),
});
export type ApiKeyItem = z.infer<typeof ApiKeyItemSchema>;

export const ApiKeysResponseSchema = z.object({
  data: z.array(z.any()).optional(),
  key: z.string().optional(),
  apiKey: ApiKeyItemSchema.optional(),
});
