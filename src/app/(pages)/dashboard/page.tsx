"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/src/config/api";
import type { SupportedSocialPlatform } from "@/src/config/api";
import { SUPPORTED_SOCIAL_PLATFORMS } from "@/src/config/api";
import AppIcon from "@/src/components/ui/AppIcon";
import CrmShell from "@/src/components/ui/CrmShell";
import { authJsonFetch, clearSession, logoutSession } from "@/src/lib/session";

type Platform = SupportedSocialPlatform;
type Recurrence = "once" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
type RecurrenceUnit = "minute" | "hour" | "day" | "week" | "month";
type AiGenerationType = "text" | "image" | "both";
type MediaType = "image" | "video" | "gif";

type PostMediaItem = {
  type: MediaType;
  url: string;
  base64Data?: string;
  mimeType?: string;
  size?: number;
  name?: string;
};

type SocialAccount = {
  _id: string;
  id?: string;
  platform: Platform;
  platformId?: string;
  platformUsername?: string;
  platformDisplayName?: string;
  platformMetadata?: {
    accountType?: string;
  };
};

type PostStatus = "draft" | "scheduled" | "published" | "failed";

type PostItem = {
  id?: string;
  _id: string;
  caption: string;
  title?: string;
  postType?: string;
  firstComment?: string;
  poll?: {
    question: string;
    options: Array<{ text: string }>;
    settings: { duration: string; voteSelectionType?: string };
  };
  instagramTrial?: {
    enabled: boolean;
    graduationStrategy?: string;
  };
  brandId?: string;
  reviewStatus?: string;
  approvalToken?: string;
  media?: PostMediaItem[];
  expiryMinutes?: number | null;
  expiryInterval?: number | null;
  expiryUnit?: RecurrenceUnit | null;
  publishedExpiresAt?: string | null;
  status: PostStatus;
  recurrence?: Recurrence;
  recurrenceInterval?: number | null;
  recurrenceUnit?: RecurrenceUnit | null;
  recurrencePaused?: boolean;
  timezone?: string;
  selectedPlatforms: string[];
  selectedAccountIds?: string[];
  createdAt: string;
  publishedTime?: string | null;
  scheduledTime?: string | null;
  platformResponses?: Array<{
    platform: Platform;
    status: "success" | "failed";
    message?: string;
    socialHandleId?: string;
    platformId?: string;
    accountType?: string;
    platformPostId?: string;
  }>;
  linkedinActivity?: LinkedInActivityItem[];
};

type LinkedInActivityItem = {
  _id: string;
  platformPostId?: string;
  contentSnapshot?: {
    title?: string;
    caption?: string;
    publishedTime?: string | null;
    publishedExpiresAt?: string | null;
  };
};

type PostsResponse = {
  data?: PostItem[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
};

type CreatePostResponse = {
  data?: PostItem;
};

type SocialAccountsResponse = {
  data?: SocialAccount[];
};

type UploadMediaResponse = {
  data?: Array<{
    name?: string;
    mimeType?: string;
    size?: number;
    url?: string;
    base64Data?: string;
  }>;
};

const platformLabelByName: Record<Platform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

const recurrenceUnitOptions: Array<{ value: RecurrenceUnit; label: string }> = [
  { value: "minute", label: "Minutes" },
  { value: "hour", label: "Hours" },
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
  { value: "month", label: "Months" },
];

const recurrenceIntervalBounds: Record<RecurrenceUnit, { min: number; max: number }> = {
  minute: { min: 30, max: 525600 },
  hour: { min: 1, max: 8760 },
  day: { min: 1, max: 365 },
  week: { min: 1, max: 52 },
  month: { min: 1, max: 12 },
};

const POSTS_PAGE_SIZE = 100;
const AI_TEXT_PROVIDER = "google";
const AI_TEXT_MODEL = "gemini-3.1-flash-lite";
const AI_IMAGE_PROVIDER = "google";
const AI_IMAGE_MODEL = "gemini-3.1-flash-lite";
const supportedPlatformSet = new Set<string>(SUPPORTED_SOCIAL_PLATFORMS);

const normalizeSocialAccount = (account: SocialAccount): SocialAccount => {
  const resolvedId = account._id || account.id || "";
  return {
    ...account,
    _id: resolvedId,
    id: resolvedId,
    platform: String(account.platform || "").toLowerCase() as Platform,
  };
};

const normalizeSupportedPlatforms = (
  value: string[] | undefined,
): SupportedSocialPlatform[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((platform): platform is SupportedSocialPlatform =>
    supportedPlatformSet.has(platform),
  );
};

const inferMediaTypeFromMime = (mimeType?: string): MediaType | null => {
  const normalizedMimeType = String(mimeType || "").trim().toLowerCase();
  if (!normalizedMimeType) {
    return null;
  }
  if (normalizedMimeType === "image/gif") {
    return "gif";
  }
  if (normalizedMimeType.startsWith("image/")) {
    return "image";
  }
  if (normalizedMimeType.startsWith("video/")) {
    return "video";
  }
  return null;
};

const normalizeCaptionNewlines = (value?: string): string =>
  String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n|\\n|\\r/g, "\n");

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountFilterIds, setAccountFilterIds] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [selectedPostType, setSelectedPostType] = useState<string>("auto");
  const [firstComment, setFirstComment] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState<string>("THREE_DAYS");
  const [instagramTrialEnabled, setInstagramTrialEnabled] = useState(false);
  const [instagramGraduation, setInstagramGraduation] = useState<string>("MANUAL");
  const [enableAiGeneration, setEnableAiGeneration] = useState(false);
  const [aiGenerationType, setAiGenerationType] = useState<AiGenerationType>("text");
  const [aiTextPrompt, setAiTextPrompt] = useState("");
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiImageSize, setAiImageSize] = useState("1024x1024");
  const [uploadedMedia, setUploadedMedia] = useState<PostMediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const [enableAutoExpire, setEnableAutoExpire] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [temporaryPostInterval, setTemporaryPostInterval] = useState("");
  const [temporaryPostUnit, setTemporaryPostUnit] = useState<RecurrenceUnit>("minute");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>("day");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingScheduledId, setSavingScheduledId] = useState<string | null>(null);
  const [pausingRecurringId, setPausingRecurringId] = useState<string | null>(null);
  const [resumingRecurringId, setResumingRecurringId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkPausingRecurring, setBulkPausingRecurring] = useState(false);
  const [bulkResumingRecurring, setBulkResumingRecurring] = useState(false);
  const [selectedScheduledPostIds, setSelectedScheduledPostIds] = useState<string[]>([]);
  const [selectedPublishedPostIds, setSelectedPublishedPostIds] = useState<string[]>([]);
  const [editingScheduledPostId, setEditingScheduledPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editScheduleDate, setEditScheduleDate] = useState("");
  const [editScheduleTime, setEditScheduleTime] = useState("");
  const [editTemporaryPostInterval, setEditTemporaryPostInterval] = useState("");
  const [editTemporaryPostUnit, setEditTemporaryPostUnit] = useState<RecurrenceUnit>("minute");
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState("1");
  const [editRecurrenceUnit, setEditRecurrenceUnit] = useState<RecurrenceUnit>("day");
  const [editTimezone, setEditTimezone] = useState("");
  const [editSelectedAccountIds, setEditSelectedAccountIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const localTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const redirectToSignIn = () => {
    clearSession();
    window.location.href = "/signin";
  };

  const normalizeDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const toLocalDateTimeParts = (value?: string | null) => {
    if (!value) {
      return { date: "", time: "" };
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return { date: "", time: "" };
    }

    const pad = (input: number) => String(input).padStart(2, "0");
    return {
      date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
      time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
    };
  };

  const getTemporaryPostDurationLabel = (post: PostItem) => {
    const interval = post.expiryInterval || post.expiryMinutes;
    const unit = post.expiryUnit || "minute";
    if (!interval) {
      return null;
    }
    return `${interval} ${unit}${interval === 1 ? "" : "s"}`;
  };

  const normalizeTemporaryPostInterval = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) {
      return Number.NaN;
    }

    return parsed;
  };

  const isValidRecurrenceInterval = (value: number, unit: RecurrenceUnit) => {
    const bounds = recurrenceIntervalBounds[unit];
    return Number.isInteger(value) && value >= bounds.min && value <= bounds.max;
  };

  const buildAccountFilterQuery = (
    accountIds: string[],
    entries: Array<[string, string]> = [],
  ) => {
    const params = new URLSearchParams(entries);

    accountIds.forEach((accountId) => {
      params.append("accountIds", accountId);
    });

    const query = params.toString();
    return query ? `?${query}` : "";
  };

  async function loadPosts(signal?: AbortSignal) {
    try {
      setPostsLoading(true);
      const allPosts: PostItem[] = [];
      let page = 1;
      let total = Infinity;

      while (allPosts.length < total) {
        const payload = await authJsonFetch<PostsResponse>(
          api.posts.list(
            buildAccountFilterQuery(accountFilterIds, [
              ["page", String(page)],
              ["limit", String(POSTS_PAGE_SIZE)],
              ["sortBy", "createdAt"],
              ["order", "desc"],
            ]),
          ),
          { signal },
        );
        const pagePosts = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? (payload as any)
            : [];
        allPosts.push(
          ...pagePosts.map((p: any) => ({
            ...p,
            _id: p.id || p._id,
          })),
        );
        total = Number(payload?.meta?.total ?? allPosts.length);

        if (!pagePosts.length) {
          break;
        }
        page += 1;
      }

      setPosts(allPosts);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const errorMessage = error instanceof Error ? error.message : "Unable to load posts";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setPostsLoading(false);
    }
  }

  const postHasLinkedinSuccess = (post: PostItem) =>
    Array.isArray(post.platformResponses)
      ? post.platformResponses.some(
          (item) => item.platform === "linkedin" && item.status === "success",
        )
      : false;

  const isRecurringPost = (post: PostItem) =>
    Boolean(post.recurrenceInterval && post.recurrenceUnit) || String(post?.recurrence || "once").toLowerCase() !== "once";

  async function createPost() {
    if (submitting || uploadingMedia) {
      return;
    }

    const cleanedCaption = caption.trim();
    const cleanedTextPrompt = aiTextPrompt.trim();
    const cleanedImagePrompt = aiImagePrompt.trim();
    const manualMedia = uploadedMedia.filter((item) => item.url.trim());
    const shouldGenerateText =
      enableAiGeneration && (aiGenerationType === "text" || aiGenerationType === "both");
    const shouldGenerateImage =
      enableAiGeneration && (aiGenerationType === "image" || aiGenerationType === "both");
    const includesTextContent = Boolean(cleanedCaption || shouldGenerateText);
    const includesMediaContent = manualMedia.length > 0 || shouldGenerateImage;

    if (!enableAiGeneration && !cleanedCaption && !manualMedia.length) {
      setMessage({ type: "error", text: "Caption or media is required before creating a post." });
      return;
    }

    if (shouldGenerateText && !cleanedTextPrompt) {
      setMessage({ type: "error", text: "Provide an AI prompt to generate text." });
      return;
    }

    if (shouldGenerateImage && !cleanedImagePrompt) {
      setMessage({ type: "error", text: "Provide an AI prompt to generate image." });
      return;
    }

    if (!selectedAccountIds.length) {
      setMessage({ type: "error", text: "Select at least one account/profile to publish." });
      return;
    }

    if (instagramSelected && !includesMediaContent) {
      setMessage({
        type: "error",
        text: "Instagram posts require at least one media item. Upload a file or enable AI image generation.",
      });
      return;
    }

    if (enableSchedule && (!scheduleDate || !scheduleTime)) {
      setMessage({ type: "error", text: "Select schedule date and time." });
      return;
    }

    if (enableSchedule) {
      const localScheduledTime = new Date(`${scheduleDate}T${scheduleTime}`);
      if (Number.isNaN(localScheduledTime.getTime())) {
        setMessage({ type: "error", text: "Selected schedule date/time is invalid." });
        return;
      }
      if (localScheduledTime.getTime() <= Date.now()) {
        setMessage({ type: "error", text: "Scheduled time must be in the future." });
        return;
      }
    }

    const normalizedRecurrenceInterval = Number(recurrenceInterval);
    if (enableRecurrence && !isValidRecurrenceInterval(normalizedRecurrenceInterval, recurrenceUnit)) {
      setMessage({ type: "error", text: "Repeat interval must be between 30 minutes and 12 months." });
      return;
    }
    const recurrenceValue: Recurrence = enableRecurrence ? "daily" : "once";
    const normalizedTemporaryPostInterval = enableAutoExpire
      ? normalizeTemporaryPostInterval(temporaryPostInterval)
      : null;
    if (enableAutoExpire && (Number.isNaN(normalizedTemporaryPostInterval) || !normalizedTemporaryPostInterval || !isValidRecurrenceInterval(normalizedTemporaryPostInterval, temporaryPostUnit))) {
      setMessage({ type: "error", text: "Temporary duration must be between 30 minutes and 12 months." });
      return;
    }

    try {
      setSubmitting(true);
      const effectivePostType =
        selectedPostType !== "auto"
          ? selectedPostType
          : includesMediaContent && includesTextContent
            ? "mixed"
            : includesMediaContent
              ? "image"
              : "text";

      const payload: any = {
        title: title.trim(),
        caption: cleanedCaption,
        media: manualMedia,
        postType: effectivePostType,
        visibility: "public",
        selectedPlatforms,
        selectedAccountIds,
        firstComment: firstComment.trim() || undefined,
        expiryMinutes: null,
        expiryInterval: normalizedTemporaryPostInterval,
        expiryUnit: normalizedTemporaryPostInterval ? temporaryPostUnit : undefined,
        status: "draft",
      };

      if (effectivePostType === "poll") {
        payload.poll = {
          question: pollQuestion.trim() || cleanedCaption,
          options: pollOptions.filter((o) => o.trim()).map((o) => ({ text: o.trim() })),
          settings: {
            duration: pollDuration,
            voteSelectionType: "SINGLE_VOTE",
          },
        };
      }

      if (instagramTrialEnabled && (effectivePostType === "reel" || effectivePostType === "video")) {
        payload.instagramTrial = {
          enabled: true,
          graduationStrategy: instagramGraduation,
        };
      }

      if (enableAiGeneration) {
        payload.ai = {
          enabled: true,
          generationType: aiGenerationType,
          textPrompt: cleanedTextPrompt,
          imagePrompt: cleanedImagePrompt,
          imageSize: aiImageSize,
          imageCount: 1,
          imageFormat: "url",
        };
      }

      const created = await authJsonFetch<any>(api.posts.create(), {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdPostId =
        created?.id || created?._id || created?.data?.id || created?.data?._id;
      if (!createdPostId) {
        throw new Error("We could not save this post. Please review your content and try again.");
      }

      if (enableSchedule) {
        await authJsonFetch(api.posts.schedule(createdPostId), {
          method: "POST",
          body: JSON.stringify({
            date: scheduleDate,
            time: scheduleTime,
            timezone: localTimezone,
            recurrence: enableRecurrence ? "daily" : "once",
            recurrenceInterval: enableRecurrence ? normalizedRecurrenceInterval : undefined,
            recurrenceUnit: enableRecurrence ? recurrenceUnit : undefined,
          }),
        });
      } else {
        await authJsonFetch(api.posts.publish(createdPostId), {
          method: "POST",
          body: JSON.stringify({
            platforms: selectedPlatforms,
            accountIds: selectedAccountIds,
            recurrence: recurrenceValue,
          }),
        });
      }

      setCaption("");
      setTitle("");
      setAiTextPrompt("");
      setAiImagePrompt("");
      setUploadedMedia([]);
      setScheduleDate("");
      setScheduleTime("");
      setTemporaryPostInterval("");
      setTemporaryPostUnit("minute");
      setRecurrenceInterval("1");
      setRecurrenceUnit("day");
      setEnableSchedule(false);
      setEnableRecurrence(false);
      setEnableAutoExpire(false);
      setMessage({
        type: "success",
        text: enableSchedule
          ? "Post scheduled successfully."
          : "Post published successfully.",
      });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to create post";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSubmitting(false);
    }
  }

  async function publishPost(post: PostItem) {
    if (publishingId || post.status === "published") {
      return;
    }

    const postHasMedia = Array.isArray(post.media)
      ? post.media.some((item) => item?.url?.trim())
      : false;

    if (post.selectedPlatforms.includes("instagram") && !postHasMedia) {
      setMessage({
        type: "error",
        text: "Instagram drafts need at least one media item before publishing.",
      });
      return;
    }

    const validPlatforms = normalizeSupportedPlatforms(post.selectedPlatforms);
    if (!validPlatforms.length) {
      setMessage({
        type: "error",
        text: "Select an Instagram or LinkedIn account before continuing.",
      });
      return;
    }

    try {
      setPublishingId(post._id);
      await authJsonFetch(api.posts.publish(post._id), {
        method: "POST",
        body: JSON.stringify({
          platforms: validPlatforms,
          accountIds: post.selectedAccountIds || [],
        }),
      });
      setMessage({ type: "success", text: "Publish request sent. Refreshing post status..." });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to publish post";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setPublishingId(null);
    }
  }

  async function deleteScheduledPost(postId: string) {
    if (deletingId || bulkDeleting) return;
    try {
      setDeletingId(postId);
      await authJsonFetch(api.posts.deleteScheduled(postId), { method: "DELETE" });
      setSelectedScheduledPostIds((current) => current.filter((id) => id !== postId));
      setSelectedPublishedPostIds((current) => current.filter((id) => id !== postId));
      setMessage({ type: "success", text: "Scheduled post deleted successfully." });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to delete scheduled post";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setDeletingId(null);
    }
  }

  async function deletePublishedPost(postId: string) {
    if (deletingId || bulkDeleting) return;
    try {
      setDeletingId(postId);
      await authJsonFetch(api.posts.deletePublished(postId), { method: "DELETE" });
      setSelectedScheduledPostIds((current) => current.filter((id) => id !== postId));
      setSelectedPublishedPostIds((current) => current.filter((id) => id !== postId));
      setMessage({ type: "success", text: "Published post deleted successfully." });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to delete published post";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setDeletingId(null);
    }
  }

  async function bulkDeleteScheduledPosts() {
    if (!selectedScheduledPostIds.length || deletingId || bulkDeleting) return;
    const count = selectedScheduledPostIds.length;
    try {
      setBulkDeleting(true);
      await authJsonFetch(api.posts.bulkDeleteScheduled(), {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedScheduledPostIds }),
      });
      setSelectedScheduledPostIds([]);
      setMessage({ type: "success", text: `${count} scheduled post(s) removed successfully.` });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to delete scheduled posts";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setBulkDeleting(false);
    }
  }

  async function bulkDeletePublishedPosts() {
    if (!selectedPublishedPostIds.length || deletingId || bulkDeleting) return;
    const count = selectedPublishedPostIds.length;
    try {
      setBulkDeleting(true);
      await authJsonFetch(api.posts.bulkDeletePublished(), {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedPublishedPostIds }),
      });
      setSelectedPublishedPostIds([]);
      setMessage({ type: "success", text: `${count} published post(s) removed successfully.` });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to delete published posts";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setBulkDeleting(false);
    }
  }

  async function bulkPauseRecurringPosts() {
    if (!selectedScheduledPostIds.length || bulkPausingRecurring || bulkResumingRecurring || bulkDeleting) return;
    const count = selectedScheduledPostIds.length;
    try {
      setBulkPausingRecurring(true);
      const result = await authJsonFetch<{ data?: { pausedCount: number; skippedCount: number } }>(
        api.posts.bulkPauseRecurrence(),
        { method: "POST", body: JSON.stringify({ ids: selectedScheduledPostIds }) },
      );
      const pausedCount = result?.data?.pausedCount ?? 0;
      const skippedCount = result?.data?.skippedCount ?? 0;
      setMessage({
        type: "success",
        text: `${pausedCount} post(s) paused.${skippedCount > 0 ? ` ${skippedCount} skipped (not recurring or already paused).` : ""}`,
      });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unable to pause ${count} post(s)`;
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setBulkPausingRecurring(false);
    }
  }

  async function bulkResumeRecurringPosts() {
    if (!selectedScheduledPostIds.length || bulkResumingRecurring || bulkPausingRecurring || bulkDeleting) return;
    const count = selectedScheduledPostIds.length;
    try {
      setBulkResumingRecurring(true);
      const result = await authJsonFetch<{ data?: { resumedCount: number; skippedCount: number; failedCount: number } }>(
        api.posts.bulkResumeRecurrence(),
        { method: "POST", body: JSON.stringify({ ids: selectedScheduledPostIds }) },
      );
      const resumedCount = result?.data?.resumedCount ?? 0;
      const skippedCount = result?.data?.skippedCount ?? 0;
      setMessage({
        type: "success",
        text: `${resumedCount} post(s) resumed.${skippedCount > 0 ? ` ${skippedCount} skipped (not recurring or not paused).` : ""}`,
      });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unable to resume ${count} post(s)`;
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setBulkResumingRecurring(false);
    }
  }

  function startEditScheduledPost(post: PostItem) {
    const localParts = toLocalDateTimeParts(post.scheduledTime);
    setEditingScheduledPostId(post._id);
    setEditTitle(post.title || "");
    setEditCaption(normalizeCaptionNewlines(post.caption));
    setEditScheduleDate(localParts.date);
    setEditScheduleTime(localParts.time);
    setEditTemporaryPostInterval(String(post.expiryInterval || post.expiryMinutes || ""));
    setEditTemporaryPostUnit(post.expiryUnit || "minute");
    setEditRecurrenceInterval(String(post.recurrenceInterval || 1));
    setEditRecurrenceUnit(post.recurrenceUnit || "day");
    setEditTimezone(post.timezone || localTimezone);
    setEditSelectedAccountIds(post.selectedAccountIds || []);
  }

  function cancelEditScheduledPost() {
    setEditingScheduledPostId(null);
    setEditTitle("");
    setEditCaption("");
    setEditScheduleDate("");
    setEditScheduleTime("");
    setEditTemporaryPostInterval("");
    setEditTemporaryPostUnit("minute");
    setEditRecurrenceInterval("1");
    setEditRecurrenceUnit("day");
    setEditTimezone("");
    setEditSelectedAccountIds([]);
  }

  const toggleEditAccount = (accountId: string) => {
    setEditSelectedAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((value) => value !== accountId)
        : [...current, accountId],
    );
  };

  async function saveScheduledPostEdits(post: PostItem) {
    if (
      savingScheduledId ||
      deletingId ||
      bulkDeleting ||
      pausingRecurringId ||
      resumingRecurringId
    ) {
      return;
    }

    if (!editScheduleDate || !editScheduleTime) {
      setMessage({ type: "error", text: "Provide schedule date and time." });
      return;
    }

    const localScheduledTime = new Date(`${editScheduleDate}T${editScheduleTime}`);
    if (Number.isNaN(localScheduledTime.getTime())) {
      setMessage({ type: "error", text: "Selected schedule date/time is invalid." });
      return;
    }

    if (localScheduledTime.getTime() <= Date.now()) {
      setMessage({ type: "error", text: "Scheduled time must be in the future." });
      return;
    }

    const normalizedEditTemporaryPostInterval = normalizeTemporaryPostInterval(editTemporaryPostInterval);
    if (Number.isNaN(normalizedEditTemporaryPostInterval) || (normalizedEditTemporaryPostInterval && !isValidRecurrenceInterval(normalizedEditTemporaryPostInterval, editTemporaryPostUnit))) {
      setMessage({ type: "error", text: "Temporary duration must be between 30 minutes and 12 months." });
      return;
    }

    const normalizedEditRecurrenceInterval = Number(editRecurrenceInterval);
    if (!isValidRecurrenceInterval(normalizedEditRecurrenceInterval, editRecurrenceUnit) && isRecurringPost(post)) {
      setMessage({ type: "error", text: "Repeat interval must be between 30 minutes and 12 months." });
      return;
    }

    if (!editSelectedAccountIds.length) {
      setMessage({ type: "error", text: "Select at least one account." });
      return;
    }

    try {
      setSavingScheduledId(post._id);

      await authJsonFetch(api.posts.update(post._id), {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle.trim(),
          caption: editCaption,
          recurrenceInterval: isRecurringPost(post) ? normalizedEditRecurrenceInterval : undefined,
          recurrenceUnit: isRecurringPost(post) ? editRecurrenceUnit : undefined,
          expiryMinutes: null,
          expiryInterval: normalizedEditTemporaryPostInterval,
          expiryUnit: normalizedEditTemporaryPostInterval ? editTemporaryPostUnit : undefined,
          selectedAccountIds: editSelectedAccountIds,
        }),
      });

      await authJsonFetch(api.posts.schedule(post._id), {
        method: "POST",
        body: JSON.stringify({
          date: editScheduleDate,
          time: editScheduleTime,
          timezone: editTimezone || localTimezone,
          recurrence: isRecurringPost(post) ? "daily" : "once",
          recurrenceInterval: isRecurringPost(post) ? normalizedEditRecurrenceInterval : undefined,
          recurrenceUnit: isRecurringPost(post) ? editRecurrenceUnit : undefined,
        }),
      });

      cancelEditScheduledPost();
      setMessage({ type: "success", text: "Scheduled post updated successfully." });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to update scheduled post";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSavingScheduledId(null);
    }
  }

  async function pauseRecurringPost(post: PostItem) {
    if (
      pausingRecurringId ||
      resumingRecurringId ||
      deletingId ||
      bulkDeleting ||
      bulkPausingRecurring ||
      bulkResumingRecurring ||
      savingScheduledId
    ) {
      return;
    }

    try {
      setPausingRecurringId(post._id);
      await authJsonFetch(api.posts.pauseRecurrence(post._id), {
        method: "POST",
      });
      if (editingScheduledPostId === post._id) {
        cancelEditScheduledPost();
      }
      setMessage({ type: "success", text: "Recurring schedule paused for this post." });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to pause recurrence";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setPausingRecurringId(null);
    }
  }

  async function resumeRecurringPost(post: PostItem) {
    if (
      resumingRecurringId ||
      pausingRecurringId ||
      deletingId ||
      bulkDeleting ||
      bulkPausingRecurring ||
      bulkResumingRecurring ||
      savingScheduledId
    ) {
      return;
    }

    try {
      setResumingRecurringId(post._id);
      await authJsonFetch(api.posts.resumeRecurrence(post._id), {
        method: "POST",
      });
      if (editingScheduledPostId === post._id) {
        cancelEditScheduledPost();
      }
      setMessage({ type: "success", text: "Recurring schedule resumed for this post." });
      await loadPosts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to resume recurrence";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setResumingRecurringId(null);
    }
  }

  async function loadAccounts(signal?: AbortSignal) {
    try {
      setAccountsLoading(true);
      const payload = await authJsonFetch<SocialAccountsResponse>(api.social.accounts(), { signal });
      setAccounts(
        Array.isArray(payload?.data)
          ? payload.data.map(normalizeSocialAccount).filter((account) =>
              supportedPlatformSet.has(account.platform),
            )
          : [],
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const errorMessage = error instanceof Error ? error.message : "Failed to load social accounts";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setAccountsLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const text = params.get("message");
    if (status && text) {
      setMessage({ type: status === "success" ? "success" : "error", text });
      window.history.replaceState({}, "", "/dashboard");
    }

    Promise.all([
      loadAccounts(controller.signal),
    ]);

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadPosts(controller.signal);

    return () => {
      controller.abort();
    };
  }, [accountFilterIds]);

  const connectedAccounts = accounts;

  useEffect(() => {
    setSelectedAccountIds((current) => {
      const validIds = new Set(connectedAccounts.map((account) => account._id));
      return current.filter((id) => validIds.has(id));
    });

    setAccountFilterIds((current) => {
      const validIds = new Set(connectedAccounts.map((account) => account._id));
      return current.filter((id) => validIds.has(id));
    });
  }, [connectedAccounts]);

  const filteredConnectedAccounts = useMemo(() => {
    if (!accountFilterIds.length) {
      return connectedAccounts;
    }

    const selectedIds = new Set(accountFilterIds);
    return connectedAccounts.filter((account) => selectedIds.has(account._id));
  }, [accountFilterIds, connectedAccounts]);

  const selectedPlatforms = useMemo(() => {
    const accountMap = new Map(connectedAccounts.map((item) => [item._id, item]));
    return Array.from(
      new Set(
        selectedAccountIds.map((id) => accountMap.get(id)?.platform).filter(Boolean),
      ),
    ) as Platform[];
  }, [connectedAccounts, selectedAccountIds]);

  const hasUploadedMedia = useMemo(
    () => uploadedMedia.some((item) => item.url.trim()),
    [uploadedMedia],
  );

  const instagramSelected = useMemo(
    () => selectedPlatforms.includes("instagram"),
    [selectedPlatforms],
  );

  const visiblePosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts]);

  const scheduledPosts = useMemo(() => {
    return [...visiblePosts]
      .filter((post) => post.status === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.scheduledTime || a.createdAt).getTime() -
          new Date(b.scheduledTime || b.createdAt).getTime(),
      );
  }, [visiblePosts]);

  // A post has been published if status=published OR it has any successful platform response OR has activity records (recurring posts stay "scheduled" after re-queuing)
  const hasEverBeenPublished = (post: PostItem) =>
    post.status === "published" ||
    (Array.isArray(post.platformResponses) &&
      post.platformResponses.some((r) => r.status === "success")) ||
    (Array.isArray(post.linkedinActivity) && post.linkedinActivity.length > 0);

  const publishedPosts = useMemo(() => {
    return [...posts]
      .filter(hasEverBeenPublished)
      .sort(
        (a, b) =>
          new Date(b.publishedTime || b.createdAt).getTime() -
          new Date(a.publishedTime || a.createdAt).getTime(),
      );
  }, [posts]);

  useEffect(() => {
    const validIds = new Set(scheduledPosts.map((post) => post._id));
    setSelectedScheduledPostIds((current) => current.filter((id) => validIds.has(id)));
  }, [scheduledPosts]);

  useEffect(() => {
    const validIds = new Set(publishedPosts.map((post) => post._id));
    setSelectedPublishedPostIds((current) => current.filter((id) => validIds.has(id)));
  }, [publishedPosts]);

  const allScheduledSelected =
    scheduledPosts.length > 0 &&
    scheduledPosts.every((post) => selectedScheduledPostIds.includes(post._id));

  const toggleSelectAllScheduled = () => {
    if (allScheduledSelected) {
      setSelectedScheduledPostIds((current) =>
        current.filter((id) => !scheduledPosts.some((p) => p._id === id)),
      );
    } else {
      const newIds = scheduledPosts.map((p) => p._id);
      setSelectedScheduledPostIds((current) =>
        Array.from(new Set([...current, ...newIds])),
      );
    }
  };

  const allPublishedSelected =
    publishedPosts.length > 0 &&
    publishedPosts.every((post) => selectedPublishedPostIds.includes(post._id));

  const toggleSelectAllPublished = () => {
    if (allPublishedSelected) {
      setSelectedPublishedPostIds((current) =>
        current.filter((id) => !publishedPosts.some((p) => p._id === id)),
      );
    } else {
      const newIds = publishedPosts.map((p) => p._id);
      setSelectedPublishedPostIds((current) =>
        Array.from(new Set([...current, ...newIds])),
      );
    }
  };

  const postsScheduledToday = useMemo(() => {
    const now = new Date();
    return posts.filter((post) => {
      if (!post.scheduledTime) return false;
      const d = new Date(post.scheduledTime);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;
  }, [posts]);

  const postMetrics = useMemo(() => {
    return posts.reduce(
      (acc, post) => {
        if (post.status === "published") acc.published += 1;
        else if (post.status === "scheduled") acc.scheduled += 1;
        else if (post.status === "failed") acc.failed += 1;
        else acc.drafts += 1;
        return acc;
      },
      { drafts: 0, scheduled: 0, published: 0, failed: 0 },
    );
  }, [posts]);

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((value) => value !== accountId)
        : [...current, accountId],
    );
  };

  const toggleAccountFilter = (accountId: string) => {
    setAccountFilterIds((current) =>
      current.includes(accountId)
        ? current.filter((value) => value !== accountId)
        : [...current, accountId],
    );
  };

  const formatAccountLabel = (account: SocialAccount) => {
    const accountType = account.platformMetadata?.accountType || "personal";
    const primaryLabel = account.platformDisplayName || account.platformUsername || account.platformId || "Account";
    const accountKind = accountType === "organization" || accountType === "page" ? "Page" : "Profile";
    return `${primaryLabel} (${accountKind})`;
  };

  const removeUploadedMedia = (url: string) => {
    setUploadedMedia((current) => current.filter((item) => item.url !== url));
  };

  async function uploadMediaFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(input.files || []);
    input.value = "";

    if (!files.length || uploadingMedia) {
      return;
    }

    const normalizedFiles = files.map((file) => ({
      file,
      mediaType: inferMediaTypeFromMime(file.type),
    }));

    if (normalizedFiles.some((entry) => !entry.mediaType)) {
      setMessage({
        type: "error",
        text: "Only image, GIF, and video uploads are supported.",
      });
      return;
    }

    try {
      setUploadingMedia(true);
      const formData = new FormData();
      for (const { file } of normalizedFiles) {
        formData.append("files", file);
      }

      const payload = await authJsonFetch<UploadMediaResponse>(api.uploads.media(), {
        method: "POST",
        body: formData,
      });

      const nextMedia = (payload?.data || []).reduce<PostMediaItem[]>((items, item, index) => {
        const fallbackFile = normalizedFiles[index];
        const mediaType = inferMediaTypeFromMime(item?.mimeType) || fallbackFile?.mediaType;
        const url = String(item?.url || "").trim();

        if (!mediaType || !url) {
          return items;
        }

        items.push({
          type: mediaType,
          url,
          base64Data: String(item?.base64Data || ""),
          mimeType: item?.mimeType || fallbackFile?.file.type || "",
          size: Number(item?.size || fallbackFile?.file.size || 0),
          name: item?.name || fallbackFile?.file.name || "",
        });

        return items;
      }, []);

      if (!nextMedia.length) {
        throw new Error("None of the selected files could be attached. Choose an image, GIF, or video and try again.");
      }

      setUploadedMedia((current) => [...current, ...nextMedia]);
      setMessage({
        type: "success",
        text: `${nextMedia.length} media file(s) attached successfully.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to upload media";
      if (errorMessage.toLowerCase().includes("session expired")) {
        redirectToSignIn();
        return;
      }
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setUploadingMedia(false);
    }
  }

  return (
    <CrmShell
      pageTitle="Dashboard"
      pageSubtitle="Create, schedule, and track content across your connected social accounts."
      breadcrumbs={["XSocial", "Workspace", "Dashboard"]}
      onSignOut={async () => {
        await logoutSession();
        window.location.href = "/signin";
      }}
      actions={
        <button type="button" className="outline-btn" onClick={() => loadPosts()}>
          Refresh Data
        </button>
      }
      filters={
        <>
          <div className="filter-chip">
            <AppIcon name="users" className="app-icon" />
            Connected accounts: {connectedAccounts.length}
          </div>
          <div className="filter-chip">
            <AppIcon name="calendar" className="app-icon" />
            Scheduled today: {postsScheduledToday}
          </div>
          <div className="filter-chip">
            <AppIcon name="publish" className="app-icon" />
            Total posts: {posts.length}
          </div>
        </>
      }
    >
      <section className="crm-grid crm-grid-dashboard">
        <header className="workspace-head">
          <h2 className="section-title">
            <span className="icon-token" aria-hidden="true">
              <AppIcon name="home" className="app-icon" />
            </span>
            Content Overview
          </h2>
          <p>
            Review your publishing activity, then create your next post from one place.
          </p>
          <div className="dashboard-account-filter">
            <div className="dashboard-account-filter-head">
              <div>
                <h3 className="section-title section-title-small">Account Filter</h3>
                <p>
                  Choose one or more accounts to limit the dashboard metrics and post lists. Leave the filter empty to show all connected accounts.
                </p>
              </div>
              <button
                type="button"
                className="outline-btn"
                onClick={() => setAccountFilterIds([])}
                disabled={!accountFilterIds.length}
              >
                Show All Accounts
              </button>
            </div>
            {accountsLoading ? (
              <p className="composer-empty">Loading connected accounts...</p>
            ) : !connectedAccounts.length ? (
              <p className="composer-empty">
                No connected accounts yet. Go to the <Link href="/accounts" className="link-inline">Social Accounts</Link> page to connect one.
              </p>
            ) : (
              <>
                <div className="composer-accounts">
                  {connectedAccounts.map((account) => (
                    <button
                      key={`filter-${account._id}`}
                      type="button"
                      className={`pill-btn ${accountFilterIds.includes(account._id) ? "active" : ""}`}
                      onClick={() => toggleAccountFilter(account._id)}
                    >
                      {platformLabelByName[account.platform] || account.platform}: {formatAccountLabel(account)}
                    </button>
                  ))}
                </div>
                <p className="composer-empty">
                  {accountFilterIds.length
                    ? `Showing dashboard data for ${filteredConnectedAccounts.length} selected account(s).`
                    : "Showing dashboard data for all connected accounts."}
                </p>
              </>
            )}
          </div>
          <div className="workspace-kpis">
            <article className="kpi-card">
              <p className="kpi-label">Connected Accounts</p>
              <p className="kpi-value">{filteredConnectedAccounts.length}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Draft Posts</p>
              <p className="kpi-value">{postMetrics.drafts}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Scheduled Posts</p>
              <p className="kpi-value">{postMetrics.scheduled}</p>
            </article>
            <article className="kpi-card">
              <p className="kpi-label">Published Posts</p>
              <p className="kpi-value">{postMetrics.published}</p>
            </article>
          </div>
          {message ? <p className={`message ${message.type}`} role="status">{message.text}</p> : null}
        </header>

        <section className="crm-panel sidebar-panel grid-col-span-4">
          <h3 className="section-title section-title-small">
            <span className="icon-token" aria-hidden="true">
              <AppIcon name="users" className="app-icon" />
            </span>
            Connected Accounts
          </h3>
          {accountsLoading ? (
            <p className="composer-empty">Loading connected accounts...</p>
          ) : !connectedAccounts.length ? (
            <p className="composer-empty">
              No connected accounts yet. Go to the <Link href="/accounts" className="link-inline">Social Accounts</Link> page to connect one.
            </p>
          ) : (
            <div className="account-list">
              {filteredConnectedAccounts.slice(0, 6).map((account) => (
                <div key={account._id} className="account-list-item">
                  <p className="platform-meta">{platformLabelByName[account.platform] || account.platform}</p>
                  <p className="account-kind">{formatAccountLabel(account)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="post-composer">
          <h3 className="section-title section-title-small">
            <span className="icon-token" aria-hidden="true">
              <AppIcon name="publish" className="app-icon" />
            </span>
            Create Content
          </h3>
          {!connectedAccounts.length ? (
            <p className="composer-empty">
              Connect a social account first from <Link href="/accounts" className="link-inline">Social Accounts</Link>.
            </p>
          ) : null}

          <label className="composer-label">
            Title (optional)
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Campaign title"
              maxLength={140}
              disabled={!connectedAccounts.length}
            />
          </label>

          <label className="composer-label">
            Format / Post Type
            <select
              value={selectedPostType}
              onChange={(e) => setSelectedPostType(e.target.value)}
              disabled={!connectedAccounts.length}
            >
              <option value="auto">Auto-detect (Text / Image / Mixed)</option>
              <option value="text">Pure Text Status</option>
              <option value="image">Single Image Post</option>
              <option value="carousel">Multi-Image Carousel</option>
              <option value="reel">Reel / Video (Instagram & LinkedIn)</option>
              <option value="story">Instagram Story</option>
              <option value="article">Article / Link Preview</option>
              <option value="poll">Native LinkedIn Poll</option>
            </select>
          </label>

          {selectedPostType === "poll" ? (
            <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-3.5 flex flex-col gap-2.5 my-2">
              <div className="flex items-center gap-2">
                <AppIcon name="spark" className="w-4 h-4 text-teal-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                  LinkedIn Poll Configuration
                </h4>
              </div>
              <label className="composer-label text-xs">
                Poll Question (max 140 chars)
                <input
                  type="text"
                  placeholder="e.g. Which cloud provider is your primary choice?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  maxLength={140}
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600">Options (2 to 4 choices, max 30 chars each)</span>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...pollOptions];
                        copy[i] = e.target.value;
                        setPollOptions(copy);
                      }}
                      maxLength={30}
                      className="flex-1 text-xs px-2.5 py-1.5 border rounded-lg bg-white"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                        className="text-xs text-red-500 hover:text-red-700 px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="text-xs text-teal-700 font-semibold self-start mt-1"
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <label className="composer-label text-xs">
                Poll Duration
                <select
                  value={pollDuration}
                  onChange={(e) => setPollDuration(e.target.value)}
                  className="bg-white"
                >
                  <option value="ONE_DAY">1 Day</option>
                  <option value="THREE_DAYS">3 Days</option>
                  <option value="SEVEN_DAYS">1 Week (7 Days)</option>
                  <option value="FOURTEEN_DAYS">2 Weeks (14 Days)</option>
                </select>
              </label>
            </div>
          ) : null}

          {(selectedPostType === "reel" || selectedPostType === "video") ? (
            <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-3 flex flex-col gap-2 my-2">
              <label className="composer-toggle text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={instagramTrialEnabled}
                  onChange={(e) => setInstagramTrialEnabled(e.target.checked)}
                />
                Instagram Trial Reel (Non-Followers Sandbox)
              </label>
              {instagramTrialEnabled && (
                <label className="composer-label text-xs">
                  Graduation Strategy
                  <select
                    value={instagramGraduation}
                    onChange={(e) => setInstagramGraduation(e.target.value)}
                    className="bg-white"
                  >
                    <option value="MANUAL">Manual Graduation</option>
                    <option value="SS_PERFORMANCE">Auto-Graduate on High Performance</option>
                  </select>
                </label>
              )}
            </div>
          ) : null}

          <label className="composer-label">
            Caption
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder={enableAiGeneration ? "Optional manual override" : "Write what you want to publish"}
              rows={5}
              maxLength={3000}
              disabled={!connectedAccounts.length}
            />
          </label>

          <label className="composer-label">
            First Comment (Automated sequencing)
            <input
              type="text"
              placeholder="e.g. Check out the link or drop a comment below! 🚀"
              value={firstComment}
              onChange={(e) => setFirstComment(e.target.value)}
              disabled={!connectedAccounts.length}
            />
          </label>

          <section className="composer-section">
            <div className="composer-section-head">
              <h4>Media</h4>
              <p>Optional for text posts. Required when publishing to Instagram.</p>
            </div>
            <label className="composer-label">
              Attach media
              <input
                className="composer-file-input"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={uploadMediaFiles}
                disabled={!connectedAccounts.length || uploadingMedia}
              />
            </label>

            {hasUploadedMedia ? (
              <div className="account-list media-attachment-list">
                {uploadedMedia.map((item) => (
                  <div key={item.url} className="account-list-item media-attachment-item">
                    <div>
                      <p className="platform-meta">{item.name || item.type.toUpperCase()}</p>
                      <p className="account-kind">{item.type.toUpperCase()} • {item.mimeType || "unknown type"}</p>
                    </div>
                    <button
                      type="button"
                      className="outline-btn media-remove-btn"
                      onClick={() => removeUploadedMedia(item.url)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {instagramSelected ? (
            <p className="message error composer-platform-note">
              Instagram can only publish posts that include media. Keep at least one uploaded file attached or enable AI image generation.
            </p>
          ) : null}

          <label className="composer-toggle">
            <input
              type="checkbox"
              checked={enableAiGeneration}
              onChange={(event) => setEnableAiGeneration(event.target.checked)}
              disabled={!connectedAccounts.length}
            />
            Generate with AI
          </label>

          {enableAiGeneration ? (
            <>
              <label className="composer-label">
                AI generation mode
                <select
                  value={aiGenerationType}
                  onChange={(event) => setAiGenerationType(event.target.value as AiGenerationType)}
                  disabled={!connectedAccounts.length}
                >
                  <option value="text">Text only</option>
                  <option value="image">Image only</option>
                  <option value="both">Text + Image</option>
                </select>
              </label>

              {aiGenerationType === "text" || aiGenerationType === "both" ? (
                <>
                  <label className="composer-label">
                    AI text prompt
                    <textarea
                      value={aiTextPrompt}
                      onChange={(event) => setAiTextPrompt(event.target.value)}
                      placeholder="Provide text generation instructions"
                      rows={3}
                      disabled={!connectedAccounts.length}
                    />
                  </label>
                  <p className="composer-empty">Text is generated with Google Gemini Flash Lite.</p>
                </>
              ) : null}

              {aiGenerationType === "image" || aiGenerationType === "both" ? (
                <>
                  <label className="composer-label">
                    AI image prompt
                    <textarea
                      value={aiImagePrompt}
                      onChange={(event) => setAiImagePrompt(event.target.value)}
                      placeholder="Provide image generation instructions"
                      rows={3}
                      disabled={!connectedAccounts.length}
                    />
                  </label>
                  <p className="composer-empty">Images are generated with Google Gemini Flash Lite.</p>
                  <div className="schedule-grid">
                    <label className="composer-label">
                      Image size
                      <input
                        type="text"
                        value={aiImageSize}
                        onChange={(event) => setAiImageSize(event.target.value)}
                        disabled={!connectedAccounts.length}
                      />
                    </label>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          <section className="composer-section">
            <div className="composer-section-head">
              <h4>Destinations</h4>
              <p>Select one or more accounts. Multiple selections publish the same post everywhere.</p>
            </div>
            <div className="composer-accounts">
              {connectedAccounts.length ? (
                connectedAccounts.map((account) => (
                  <button
                    key={account._id}
                    type="button"
                    className={`pill-btn ${selectedAccountIds.includes(account._id) ? "active" : ""}`}
                    onClick={() => toggleAccount(account._id)}
                  >
                    {platformLabelByName[account.platform] || account.platform}: {formatAccountLabel(account)}
                  </button>
                ))
              ) : (
                <p className="composer-empty">No connected account available.</p>
              )}
            </div>
          </section>

          <section className="composer-section">
            <div className="composer-section-head">
              <h4>Delivery</h4>
              <p>Publish immediately or set a schedule with optional repeat and expiry rules.</p>
            </div>
            <div className="composer-toggle-row">
              <label className="composer-toggle">
                <input
                  type="checkbox"
                  checked={enableSchedule}
                  onChange={(event) => setEnableSchedule(event.target.checked)}
                  disabled={!connectedAccounts.length}
                />
                Schedule this post
              </label>
              <label className="composer-toggle">
                <input
                  type="checkbox"
                  checked={enableRecurrence}
                  onChange={(event) => setEnableRecurrence(event.target.checked)}
                  disabled={!connectedAccounts.length}
                />
                Repeat
              </label>
              <label className="composer-toggle">
                <input
                  type="checkbox"
                  checked={enableAutoExpire}
                  onChange={(event) => setEnableAutoExpire(event.target.checked)}
                  disabled={!connectedAccounts.length}
                />
                Auto-expire
              </label>
            </div>

          {enableAutoExpire ? (
          <div className="schedule-grid">
            <label className="composer-label">
              Expire after
              <input
                type="number"
                min={recurrenceIntervalBounds[temporaryPostUnit].min}
                max={recurrenceIntervalBounds[temporaryPostUnit].max}
                step="1"
                value={temporaryPostInterval}
                onChange={(event) => setTemporaryPostInterval(event.target.value)}
                disabled={!connectedAccounts.length}
              />
            </label>
            <label className="composer-label">
              Cycle
              <select
                value={temporaryPostUnit}
                onChange={(event) => setTemporaryPostUnit(event.target.value as RecurrenceUnit)}
                disabled={!connectedAccounts.length}
              >
                {recurrenceUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          ) : null}

          {enableRecurrence ? (
            <div className="schedule-grid">
              <label className="composer-label">
              Repeat every
              <input
                type="number"
                min={recurrenceIntervalBounds[recurrenceUnit].min}
                max={recurrenceIntervalBounds[recurrenceUnit].max}
                step="1"
                value={recurrenceInterval}
                onChange={(event) => setRecurrenceInterval(event.target.value)}
                disabled={!connectedAccounts.length}
              />
              </label>
              <label className="composer-label">
              Cycle
              <select
                value={recurrenceUnit}
                onChange={(event) => {
                  const unit = event.target.value as RecurrenceUnit;
                  const value = Number(recurrenceInterval);
                  const bounds = recurrenceIntervalBounds[unit];
                  setRecurrenceUnit(unit);
                  if (!Number.isInteger(value) || value < bounds.min) setRecurrenceInterval(String(bounds.min));
                  if (value > bounds.max) setRecurrenceInterval(String(bounds.max));
                }}
                disabled={!connectedAccounts.length}
              >
                {recurrenceUnitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
              </label>
            </div>
          ) : null}

          {enableSchedule ? (
            <div className="schedule-grid">
              <label className="composer-label">
                Date
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(event) => setScheduleDate(event.target.value)}
                  disabled={!connectedAccounts.length}
                />
              </label>
              <label className="composer-label">
                Time
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(event) => setScheduleTime(event.target.value)}
                  disabled={!connectedAccounts.length}
                />
              </label>
              <label className="composer-label">
                Timezone
                <input
                  type="text"
                  value={localTimezone}
                  disabled
                />
              </label>
            </div>
          ) : null}
          </section>

          <button
            type="button"
            className="composer-submit"
            onClick={createPost}
            disabled={submitting || uploadingMedia || !connectedAccounts.length}
          >
            {uploadingMedia
              ? "Uploading media..."
              : submitting
                ? "Processing..."
                : enableSchedule
                  ? "Schedule Post"
                  : "Publish Post"}
          </button>
        </section>

        <section className="posts-board">
          <h3 className="section-title section-title-small">
            <span className="icon-token" aria-hidden="true">
              <AppIcon name="calendar" className="app-icon" />
            </span>
            Scheduled Posts
          </h3>
          {postsLoading ? (
            <p className="dash-state">Loading scheduled posts...</p>
          ) : scheduledPosts.length === 0 ? (
            <p className="composer-empty">No scheduled posts.</p>
          ) : (
            <>
              {selectedScheduledPostIds.length > 0 ? (
                <div className="bulk-action-bar">
                  <span className="bulk-action-count">{selectedScheduledPostIds.length} selected</span>
                  <button
                    type="button"
                    className="outline-btn danger-btn"
                    onClick={bulkDeleteScheduledPosts}
                    disabled={bulkDeleting || bulkPausingRecurring || bulkResumingRecurring || Boolean(deletingId)}
                  >
                    {bulkDeleting ? "Deleting..." : `Delete ${selectedScheduledPostIds.length} post(s)`}
                  </button>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={bulkPauseRecurringPosts}
                    disabled={bulkPausingRecurring || bulkResumingRecurring || bulkDeleting || Boolean(deletingId)}
                  >
                    {bulkPausingRecurring ? "Pausing..." : `Pause ${selectedScheduledPostIds.length} post(s)`}
                  </button>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={bulkResumeRecurringPosts}
                    disabled={bulkResumingRecurring || bulkPausingRecurring || bulkDeleting || Boolean(deletingId)}
                  >
                    {bulkResumingRecurring ? "Resuming..." : `Resume ${selectedScheduledPostIds.length} post(s)`}
                  </button>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => setSelectedScheduledPostIds([])}
                    disabled={bulkDeleting || bulkPausingRecurring || bulkResumingRecurring}
                  >
                    Clear selection
                  </button>
                </div>
              ) : null}
              <div className="posts-table-wrap" role="region" aria-label="Scheduled posts table">
                <table className="posts-table">
                  <thead>
                    <tr>
                      <th scope="col">
                        <input
                          type="checkbox"
                          aria-label="Select all scheduled posts"
                          checked={allScheduledSelected}
                          onChange={toggleSelectAllScheduled}
                          disabled={bulkDeleting || bulkPausingRecurring || bulkResumingRecurring || Boolean(deletingId)}
                        />
                      </th>
                      <th scope="col">Title / Caption</th>
                      <th scope="col">Schedule</th>
                      <th scope="col">Recurrence</th>
                      <th scope="col">Platforms</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledPosts.map((post) => {
                      const isEditing = editingScheduledPostId === post._id;
                      const isRecurring = (post.recurrence || "once") !== "once";
                      const isRecurrencePaused = Boolean(post.recurrencePaused);
                      const isBusy =
                        deletingId === post._id ||
                        savingScheduledId === post._id ||
                        pausingRecurringId === post._id ||
                        resumingRecurringId === post._id ||
                        bulkDeleting ||
                        bulkPausingRecurring ||
                        bulkResumingRecurring;

                      return (
                        <tr key={post._id} className={selectedScheduledPostIds.includes(post._id) ? "row-selected" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select post ${post.title || post.caption || post._id}`}
                              checked={selectedScheduledPostIds.includes(post._id)}
                              onChange={() =>
                                setSelectedScheduledPostIds((current) =>
                                  current.includes(post._id)
                                    ? current.filter((id) => id !== post._id)
                                    : [...current, post._id],
                                )
                              }
                              disabled={bulkDeleting || bulkPausingRecurring || bulkResumingRecurring || Boolean(deletingId)}
                            />
                          </td>
                          <td>
                            {isEditing ? (
                              <div className="edit-fields-stack">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(event) => setEditTitle(event.target.value)}
                                  placeholder="Title"
                                  maxLength={140}
                                />
                                <textarea
                                  value={editCaption}
                                  onChange={(event) => setEditCaption(event.target.value)}
                                  placeholder="Caption"
                                  rows={3}
                                  maxLength={3000}
                                />
                              </div>
                            ) : (
                              <>
                                {post.title ? <p className="post-title">{post.title}</p> : null}
                                <p className="post-caption" style={{ whiteSpace: "pre-wrap" }}>
                                  {normalizeCaptionNewlines(post.caption) || "-"}
                                </p>
                              </>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div className="edit-fields-stack">
                                <input
                                  type="date"
                                  value={editScheduleDate}
                                  onChange={(event) => setEditScheduleDate(event.target.value)}
                                />
                                <input
                                  type="time"
                                  value={editScheduleTime}
                                  onChange={(event) => setEditScheduleTime(event.target.value)}
                                />
                                <input
                                  type="text"
                                  value={editTimezone}
                                  onChange={(event) => setEditTimezone(event.target.value)}
                                  placeholder="Timezone (e.g. Asia/Kolkata)"
                                />
                              </div>
                            ) : (
                              <>
                                <p className="post-date">{normalizeDate(post.scheduledTime)}</p>
                                <p className="post-date">Timezone: {post.timezone || localTimezone}</p>
                                {isRecurrencePaused ? (
                                  <p className="post-date">Recurrence status: Paused</p>
                                ) : null}
                              </>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div className="edit-fields-stack">
                                <input
                                  type="number"
                                  min={recurrenceIntervalBounds[editRecurrenceUnit].min}
                                  max={recurrenceIntervalBounds[editRecurrenceUnit].max}
                                  step="1"
                                  value={editRecurrenceInterval}
                                  onChange={(event) => setEditRecurrenceInterval(event.target.value)}
                                  aria-label="Repeat every"
                                />
                                <select
                                  value={editRecurrenceUnit}
                                  onChange={(event) => {
                                    const unit = event.target.value as RecurrenceUnit;
                                    const value = Number(editRecurrenceInterval);
                                    const bounds = recurrenceIntervalBounds[unit];
                                    setEditRecurrenceUnit(unit);
                                    if (!Number.isInteger(value) || value < bounds.min) setEditRecurrenceInterval(String(bounds.min));
                                    if (value > bounds.max) setEditRecurrenceInterval(String(bounds.max));
                                  }}
                                  aria-label="Repeat cycle"
                                >
                                  {recurrenceUnitOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <select
                                  value={editTemporaryPostUnit}
                                  onChange={(event) => {
                                    const unit = event.target.value as RecurrenceUnit;
                                    const value = Number(editTemporaryPostInterval);
                                    const bounds = recurrenceIntervalBounds[unit];
                                    setEditTemporaryPostUnit(unit);
                                    if (!Number.isInteger(value) || value < bounds.min) setEditTemporaryPostInterval(String(bounds.min));
                                    if (value > bounds.max) setEditTemporaryPostInterval(String(bounds.max));
                                  }}
                                  aria-label="Temporary duration cycle"
                                >
                                  {recurrenceUnitOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min={recurrenceIntervalBounds[editTemporaryPostUnit].min}
                                  max={recurrenceIntervalBounds[editTemporaryPostUnit].max}
                                  step="1"
                                  value={editTemporaryPostInterval}
                                  onChange={(event) => setEditTemporaryPostInterval(event.target.value)}
                                  aria-label="Temporary duration"
                                />
                              </div>
                            ) : (
                              <span className="status-pill status-scheduled">
                                {post.recurrenceInterval && post.recurrenceUnit
                                  ? `EVERY ${post.recurrenceInterval} ${post.recurrenceUnit.toUpperCase()}${post.recurrenceInterval === 1 ? "" : "S"}`
                                  : (post.recurrence || "once").toUpperCase()}
                                {isRecurrencePaused ? " (PAUSED)" : ""}
                              </span>
                            )}
                            {!isEditing ? (
                              <p className="post-date">
                                Temporary Post: {getTemporaryPostDurationLabel(post) || "Not set"}
                              </p>
                            ) : null}
                          </td>
                          <td>
                            {isEditing ? (
                              <div className="composer-accounts edit-fields-stack">
                                {connectedAccounts.length ? (
                                  connectedAccounts.map((account) => (
                                    <button
                                      key={account._id}
                                      type="button"
                                      className={`pill-btn ${editSelectedAccountIds.includes(account._id) ? "active" : ""}`}
                                      onClick={() => toggleEditAccount(account._id)}
                                    >
                                      {platformLabelByName[account.platform] || account.platform}: {formatAccountLabel(account)}
                                    </button>
                                  ))
                                ) : (
                                  <p className="composer-empty">No connected account available.</p>
                                )}
                              </div>
                            ) : (
                              <>
                                <p className="post-platforms">{post.selectedPlatforms.join(", ") || "none"}</p>
                                <p className="post-date">
                                  {post.selectedAccountIds?.length
                                    ? `${post.selectedAccountIds.length} account(s)`
                                    : "No accounts"}
                                </p>
                              </>
                            )}
                          </td>
                          <td>
                            <div className="post-actions post-actions-stack">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="outline-btn"
                                    onClick={() => saveScheduledPostEdits(post)}
                                    disabled={isBusy}
                                  >
                                    {savingScheduledId === post._id ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    className="outline-btn"
                                    onClick={cancelEditScheduledPost}
                                    disabled={isBusy}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="outline-btn"
                                  onClick={() => startEditScheduledPost(post)}
                                  disabled={Boolean(editingScheduledPostId) || isBusy}
                                >
                                  Edit
                                </button>
                              )}

                              {isRecurring ? (
                                <button
                                  type="button"
                                  className="outline-btn"
                                  onClick={() =>
                                    isRecurrencePaused
                                      ? resumeRecurringPost(post)
                                      : pauseRecurringPost(post)
                                  }
                                  disabled={isBusy}
                                >
                                  {pausingRecurringId === post._id
                                    ? "Pausing..."
                                    : resumingRecurringId === post._id
                                      ? "Resuming..."
                                      : isRecurrencePaused
                                        ? "Resume Recurrence"
                                        : "Pause Recurrence"}
                                </button>
                              ) : null}

                              <button
                                type="button"
                                className="outline-btn danger-btn"
                                onClick={() => deleteScheduledPost(post._id)}
                                disabled={isBusy}
                              >
                                {deletingId === post._id ? "Deleting..." : "Delete Job"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="composer-empty">{scheduledPosts.length} scheduled post(s) shown.</p>
            </>
          )}
        </section>

        <section className="posts-board">
          <h3 className="section-title section-title-small">
            <span className="icon-token" aria-hidden="true">
              <AppIcon name="publish" className="app-icon" />
            </span>
            Published Posts
          </h3>
          {postsLoading ? (
            <p className="dash-state">Loading posts...</p>
          ) : publishedPosts.length === 0 ? (
            <p className="composer-empty">No published posts yet.</p>
          ) : (
            <>
              {selectedPublishedPostIds.length > 0 ? (
                <div className="bulk-action-bar">
                  <span className="bulk-action-count">{selectedPublishedPostIds.length} selected</span>
                  <button
                    type="button"
                    className="outline-btn danger-btn"
                    onClick={bulkDeletePublishedPosts}
                    disabled={bulkDeleting || Boolean(deletingId)}
                  >
                    {bulkDeleting ? "Deleting..." : `Delete ${selectedPublishedPostIds.length} post(s)`}
                  </button>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => setSelectedPublishedPostIds([])}
                    disabled={bulkDeleting}
                  >
                    Clear selection
                  </button>
                </div>
              ) : null}
              <div className="posts-table-wrap" role="region" aria-label="Published posts table">
                <table className="posts-table">
                  <thead>
                    <tr>
                      <th scope="col">
                        <input
                          type="checkbox"
                          aria-label="Select all published posts"
                          checked={allPublishedSelected}
                          onChange={toggleSelectAllPublished}
                          disabled={bulkDeleting || Boolean(deletingId)}
                        />
                      </th>
                      <th scope="col">Title / Caption</th>
                      <th scope="col">Platforms</th>
                      <th scope="col">Published</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedPosts.map((post) => (
                      <tr key={post._id} className={selectedPublishedPostIds.includes(post._id) ? "row-selected" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select post ${post.title || post.caption || post._id}`}
                            checked={selectedPublishedPostIds.includes(post._id)}
                            onChange={() =>
                              setSelectedPublishedPostIds((current) =>
                                current.includes(post._id)
                                  ? current.filter((id) => id !== post._id)
                                  : [...current, post._id],
                              )
                            }
                            disabled={bulkDeleting || Boolean(deletingId)}
                          />
                        </td>
                        <td>
                          {post.title ? <p className="post-title">{post.title}</p> : null}
                          <p className="post-caption" style={{ whiteSpace: "pre-wrap" }}>
                            {normalizeCaptionNewlines(post.caption) || "-"}
                          </p>
                        </td>
                        <td>
                          <p className="post-platforms">{post.selectedPlatforms.join(", ") || "none"}</p>
                          <p className="post-date">
                            {post.selectedAccountIds?.length ? `${post.selectedAccountIds.length} account(s)` : "No accounts"}
                          </p>
                          <p className="post-date">Recurrence: {(post.recurrence || "once").toUpperCase()}</p>
                        </td>
                        <td>
                          <p className="post-date">{normalizeDate(post.publishedTime)}</p>
                          <p className="post-date">Temporary Post expires: {normalizeDate(post.publishedExpiresAt)}</p>
                        </td>
                        <td>
                          <div className="post-actions">
                            <button
                              type="button"
                              className="outline-btn danger-btn"
                              onClick={() => deletePublishedPost(post._id)}
                              disabled={
                                deletingId === post._id ||
                                Boolean(deletingId) ||
                                bulkDeleting ||
                                Boolean(savingScheduledId) ||
                                Boolean(pausingRecurringId) ||
                                Boolean(resumingRecurringId)
                              }
                              title="Permanently delete this published post"
                            >
                              {deletingId === post._id ? "Removing..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {posts.filter(hasEverBeenPublished).length > publishedPosts.length ? (
                <p className="composer-empty">Showing latest {publishedPosts.length} of {posts.filter(hasEverBeenPublished).length} published posts.</p>
              ) : (
                <p className="composer-empty">{publishedPosts.length} published post(s) total.</p>
              )}
            </>
          )}
        </section>
      </section>
    </CrmShell>
  );
}
