// XSocial Go Backend API Configuration

export const API_CONFIG = {
  BASE_URL:
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:5000",
  ENDPOINTS: {
    // Auth & Identity
    LOGIN: "/v1/auth/login",
    LOGOUT: "/v1/auth/logout",
    REFRESH: "/v1/auth/refresh",
    SIGNUP: "/v1/auth/signup",
    VERIFY_EMAIL: "/v1/auth/verify-email",
    FORGOT_PASSWORD: "/v1/auth/forgot-password",
    RESET_PASSWORD: "/v1/auth/reset-password",
    USER_ME: "/v1/users/me",
    CHANGE_PASSWORD: "/v1/users/change-password",

    // Brands & Multi-workspace RBAC
    BRANDS: "/v1/brands",

    // Social Accounts & OAuth
    SOCIAL_ACCOUNTS: "/v1/social/accounts",
    SOCIAL_CONNECT_PREFIX: "/v1/social/connect",
    SOCIAL_REFRESH_TOKEN: "/v1/social/refresh-token",
    SOCIAL_ACCOUNT_PREFIX: "/v1/social",

    // Posts & Composer
    POSTS: "/v1/posts",
    UPLOAD_MEDIA: "/v1/uploads/media",
    PLANNER_BEST_TIMES: "/v1/planner/best-times",

    // Unified Community Inbox
    INBOX: "/v1/inbox",

    // SmartLinks (Link-in-Bio)
    SMARTLINKS: "/v1/smartlinks",

    // Autolists & RSS Queues
    AUTOLISTS: "/v1/autolists",
    RSS_FEEDS: "/v1/rss-feeds",

    // Competitors
    COMPETITORS: "/v1/competitors",

    // Ad Campaigns & Paid Ads ROI
    ADS_CAMPAIGNS: "/v1/ads/campaigns",
    ADS_SUMMARY: "/v1/ads/summary",

    // Analytics & Reports
    ANALYTICS_SOCIAL: "/v1/analytics/social",
    ANALYTICS_WEB: "/v1/analytics/web",
    REPORTS: "/v1/reports",
    REPORTS_GENERATE: "/v1/reports/generate",

    // Developer API Keys, Webhooks, Audit Logs
    API_KEYS: "/v1/api-keys",
    WEBHOOKS: "/v1/webhooks",
    AUDIT_LOGS: "/v1/audit-logs",
  },
} as const;

export const SUPPORTED_SOCIAL_PLATFORMS = ["instagram", "linkedin"] as const;
export type SupportedSocialPlatform = (typeof SUPPORTED_SOCIAL_PLATFORMS)[number];

const normalizeBaseUrl = (value?: string): string => {
  if (!value) return "";
  return value.replace(/\/+$/, "");
};

const pathSegment = (value: string): string => encodeURIComponent(value);

export function getApiUrl(endpoint: string): string {
  const base = normalizeBaseUrl(API_CONFIG.BASE_URL);
  if (!base) return endpoint;
  return `${base}${endpoint}`;
}

export const api = {
  auth: {
    login: () => getApiUrl(API_CONFIG.ENDPOINTS.LOGIN),
    logout: () => getApiUrl(API_CONFIG.ENDPOINTS.LOGOUT),
    refresh: () => getApiUrl(API_CONFIG.ENDPOINTS.REFRESH),
    signup: () => getApiUrl(API_CONFIG.ENDPOINTS.SIGNUP),
    verifyEmail: () => getApiUrl(API_CONFIG.ENDPOINTS.VERIFY_EMAIL),
    forgotPassword: () => getApiUrl(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD),
    resetPassword: () => getApiUrl(API_CONFIG.ENDPOINTS.RESET_PASSWORD),
  },
  users: {
    me: () => getApiUrl(API_CONFIG.ENDPOINTS.USER_ME),
    changePassword: () => getApiUrl(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD),
  },
  brands: {
    list: () => getApiUrl(API_CONFIG.ENDPOINTS.BRANDS),
    create: () => getApiUrl(API_CONFIG.ENDPOINTS.BRANDS),
    get: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.BRANDS}/${pathSegment(id)}`),
    update: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.BRANDS}/${pathSegment(id)}`),
    delete: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.BRANDS}/${pathSegment(id)}`),
    members: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.BRANDS}/${pathSegment(id)}/members`),
    removeMember: (id: string, userId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.BRANDS}/${pathSegment(id)}/members/${pathSegment(userId)}`),
  },
  social: {
    accounts: () => getApiUrl(API_CONFIG.ENDPOINTS.SOCIAL_ACCOUNTS),
    connect: (platform: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.SOCIAL_CONNECT_PREFIX}/${pathSegment(platform)}`),
    refreshToken: () => getApiUrl(API_CONFIG.ENDPOINTS.SOCIAL_REFRESH_TOKEN),
    disconnect: (accountId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.SOCIAL_ACCOUNT_PREFIX}/${pathSegment(accountId)}`),
    callback: (platform: string, query = "") =>
      getApiUrl(`/v1/social/callback/${pathSegment(platform)}${query}`),
  },
  posts: {
    create: () => getApiUrl(API_CONFIG.ENDPOINTS.POSTS),
    list: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}${query}`),
    get: (postId: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}`),
    update: (postId: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}`),
    schedule: (postId: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}`),
    pauseRecurrence: (postId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}/pause-recurrence`),
    resumeRecurrence: (postId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}/resume-recurrence`),
    delete: (postId: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}`),
    deleteScheduled: (postId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}/scheduled`),
    deletePublished: (postId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}/published`),
    bulkDelete: () => getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/bulk`),
    bulkDeleteScheduled: () => getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/bulk/scheduled`),
    bulkDeletePublished: () => getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/bulk/published`),
    publish: (postId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}/publish`),
    submitApproval: (postId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}/submit-approval`),
    approve: (postId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}/approve`),
    reject: (postId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}/reject`),
    reshare: (postId: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/${pathSegment(postId)}/reshare`),
    bulkPauseRecurrence: () =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/bulk/pause-recurrence`),
    bulkResumeRecurrence: () =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.POSTS}/bulk/resume-recurrence`),
    bestTimes: (query = "") =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.PLANNER_BEST_TIMES}${query}`),
  },
  uploads: {
    media: () => getApiUrl(API_CONFIG.ENDPOINTS.UPLOAD_MEDIA),
  },
  inbox: {
    list: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.INBOX}${query}`),
    get: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.INBOX}/${pathSegment(id)}`),
    reply: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.INBOX}/${pathSegment(id)}/reply`),
    updateStatus: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.INBOX}/${pathSegment(id)}/status`),
    cannedReplies: () => getApiUrl(`${API_CONFIG.ENDPOINTS.INBOX}/canned-replies`),
    deleteCannedReply: (id: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.INBOX}/canned-replies/${pathSegment(id)}`),
  },
  smartlinks: {
    list: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.SMARTLINKS}${query}`),
    create: () => getApiUrl(API_CONFIG.ENDPOINTS.SMARTLINKS),
    update: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.SMARTLINKS}/${pathSegment(id)}`),
    delete: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.SMARTLINKS}/${pathSegment(id)}`),
    analytics: (id: string) =>
      getApiUrl(`${API_CONFIG.ENDPOINTS.SMARTLINKS}/${pathSegment(id)}/analytics`),
  },
  autolists: {
    list: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.AUTOLISTS}${query}`),
    create: () => getApiUrl(API_CONFIG.ENDPOINTS.AUTOLISTS),
    delete: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.AUTOLISTS}/${pathSegment(id)}`),
    addPost: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.AUTOLISTS}/${pathSegment(id)}/posts`),
    rssList: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.RSS_FEEDS}${query}`),
    rssCreate: () => getApiUrl(API_CONFIG.ENDPOINTS.RSS_FEEDS),
    rssDelete: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.RSS_FEEDS}/${pathSegment(id)}`),
  },
  competitors: {
    list: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.COMPETITORS}${query}`),
    create: () => getApiUrl(API_CONFIG.ENDPOINTS.COMPETITORS),
    delete: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.COMPETITORS}/${pathSegment(id)}`),
    sync: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.COMPETITORS}/${pathSegment(id)}/sync`),
  },
  ads: {
    campaigns: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.ADS_CAMPAIGNS}${query}`),
    create: () => getApiUrl(API_CONFIG.ENDPOINTS.ADS_CAMPAIGNS),
    update: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.ADS_CAMPAIGNS}/${pathSegment(id)}`),
    delete: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.ADS_CAMPAIGNS}/${pathSegment(id)}`),
    summary: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.ADS_SUMMARY}${query}`),
  },
  analytics: {
    social: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.ANALYTICS_SOCIAL}${query}`),
    web: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.ANALYTICS_WEB}${query}`),
  },
  reports: {
    list: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.REPORTS}${query}`),
    generate: () => getApiUrl(API_CONFIG.ENDPOINTS.REPORTS_GENERATE),
    download: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.REPORTS}/${pathSegment(id)}/download`),
  },
  developer: {
    apiKeys: () => getApiUrl(API_CONFIG.ENDPOINTS.API_KEYS),
    deleteApiKey: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.API_KEYS}/${pathSegment(id)}`),
    webhooks: () => getApiUrl(API_CONFIG.ENDPOINTS.WEBHOOKS),
    deleteWebhook: (id: string) => getApiUrl(`${API_CONFIG.ENDPOINTS.WEBHOOKS}/${pathSegment(id)}`),
    auditLogs: (query = "") => getApiUrl(`${API_CONFIG.ENDPOINTS.AUDIT_LOGS}${query}`),
  },
};
