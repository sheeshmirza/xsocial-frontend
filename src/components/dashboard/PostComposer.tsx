"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import { useToast } from "@/src/components/ui/ToastContext";
import { api } from "@/src/config/api";
import { authJsonFetch } from "@/src/lib/session";
import type {
  SocialAccount,
  PostMediaItem,
  MediaType,
  Recurrence,
  RecurrenceUnit,
} from "@/src/lib/schemas";

interface PostComposerProps {
  accounts: SocialAccount[];
  localTimezone: string;
  onPostCreated: () => Promise<void> | void;
}

type AiGenerationType = "text" | "image" | "both";

const platformLabelByName: Record<string, string> = {
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

const inferMediaTypeFromMime = (mimeType?: string): MediaType | null => {
  const norm = String(mimeType || "").trim().toLowerCase();
  if (!norm) return null;
  if (norm === "image/gif") return "gif";
  if (norm.startsWith("image/")) return "image";
  if (norm.startsWith("video/")) return "video";
  return null;
};

export default function PostComposer({
  accounts,
  localTimezone,
  onPostCreated,
}: PostComposerProps) {
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedPostType, setSelectedPostType] = useState<string>("auto");
  const [firstComment, setFirstComment] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // LinkedIn Poll
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState<string>("THREE_DAYS");

  // Instagram Trial Reel
  const [instagramTrialEnabled, setInstagramTrialEnabled] = useState(false);
  const [instagramGraduation, setInstagramGraduation] = useState<string>("MANUAL");

  // AI Generation
  const [enableAiGeneration, setEnableAiGeneration] = useState(false);
  const [aiGenerationType, setAiGenerationType] = useState<AiGenerationType>("text");
  const [aiTextPrompt, setAiTextPrompt] = useState("");
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiImageSize, setAiImageSize] = useState("1024x1024");

  // Media
  const [uploadedMedia, setUploadedMedia] = useState<PostMediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Delivery Controls
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const [enableAutoExpire, setEnableAutoExpire] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [temporaryPostInterval, setTemporaryPostInterval] = useState("");
  const [temporaryPostUnit, setTemporaryPostUnit] = useState<RecurrenceUnit>("minute");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>("day");

  const [submitting, setSubmitting] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);

  const selectedPlatforms = Array.from(
    new Set(
      selectedAccountIds
        .map((id) => accounts.find((a) => a._id === id)?.platform)
        .filter(Boolean),
    ),
  );

  const instagramSelected = selectedPlatforms.includes("instagram");
  const hasUploadedMedia = uploadedMedia.some((item) => item.url.trim());

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId],
    );
  };

  const removeUploadedMedia = (url: string) => {
    setUploadedMedia((current) => current.filter((item) => item.url !== url));
  };

  async function uploadMediaFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(input.files || []);
    input.value = "";

    if (!files.length || uploadingMedia) return;

    // Client-side file size bounds check (max 50MB per file)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds the 50MB upload limit.`);
        return;
      }
    }

    const normalizedFiles = files.map((file) => ({
      file,
      mediaType: inferMediaTypeFromMime(file.type),
    }));

    if (normalizedFiles.some((entry) => !entry.mediaType)) {
      toast.error("Only image, GIF, and video file attachments are supported.");
      return;
    }

    try {
      setUploadingMedia(true);
      const formData = new FormData();
      for (const { file } of normalizedFiles) {
        formData.append("files", file);
      }

      const payload = await authJsonFetch<{ data?: any[] }>(api.uploads.media(), {
        method: "POST",
        body: formData,
      });

      const nextMedia = (payload?.data || []).reduce<PostMediaItem[]>((items, item, index) => {
        const fallbackFile = normalizedFiles[index];
        const mediaType = inferMediaTypeFromMime(item?.mimeType) || fallbackFile?.mediaType;
        const url = String(item?.url || "").trim();

        if (mediaType && url) {
          items.push({
            type: mediaType,
            url,
            base64Data: String(item?.base64Data || ""),
            mimeType: item?.mimeType || fallbackFile?.file.type || "",
            size: Number(item?.size || fallbackFile?.file.size || 0),
            name: item?.name || fallbackFile?.file.name || "",
          });
        }
        return items;
      }, []);

      if (!nextMedia.length) {
        throw new Error("None of the selected media files could be attached.");
      }

      setUploadedMedia((current) => [...current, ...nextMedia]);
      toast.success(`${nextMedia.length} media file(s) attached successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Media upload failed.");
    } finally {
      setUploadingMedia(false);
    }
  }

  function validateForm(): boolean {
    const cleanedCaption = caption.trim();
    const shouldGenerateText =
      enableAiGeneration && (aiGenerationType === "text" || aiGenerationType === "both");
    const shouldGenerateImage =
      enableAiGeneration && (aiGenerationType === "image" || aiGenerationType === "both");
    const manualMedia = uploadedMedia.filter((item) => item.url.trim());
    const includesMediaContent = manualMedia.length > 0 || shouldGenerateImage;

    if (!enableAiGeneration && !cleanedCaption && !manualMedia.length) {
      toast.error("Caption text or media attachment is required.");
      return false;
    }

    if (shouldGenerateText && !aiTextPrompt.trim()) {
      toast.error("Please provide an AI prompt to generate text.");
      return false;
    }

    if (shouldGenerateImage && !aiImagePrompt.trim()) {
      toast.error("Please provide an AI prompt to generate image.");
      return false;
    }

    if (!selectedAccountIds.length) {
      toast.error("Select at least one social handle to target.");
      return false;
    }

    if (instagramSelected && !includesMediaContent) {
      toast.error("Instagram posts require media. Attach a file or enable AI image generation.");
      return false;
    }

    if (enableSchedule) {
      if (!scheduleDate || !scheduleTime) {
        toast.error("Select both date and time for scheduled delivery.");
        return false;
      }
      const localScheduledTime = new Date(`${scheduleDate}T${scheduleTime}`);
      if (Number.isNaN(localScheduledTime.getTime()) || localScheduledTime.getTime() <= Date.now()) {
        toast.error("Scheduled delivery time must be in the future.");
        return false;
      }
    }

    return true;
  }

  async function handleCreate(isApprovalRequest = false) {
    if (submitting || uploadingMedia) return;
    if (!validateForm()) return;

    if (isApprovalRequest) setSubmittingForApproval(true);
    else setSubmitting(true);

    try {
      const cleanedCaption = caption.trim();
      const manualMedia = uploadedMedia.filter((item) => item.url.trim());
      const shouldGenerateText =
        enableAiGeneration && (aiGenerationType === "text" || aiGenerationType === "both");
      const shouldGenerateImage =
        enableAiGeneration && (aiGenerationType === "image" || aiGenerationType === "both");
      const includesMediaContent = manualMedia.length > 0 || shouldGenerateImage;
      const includesTextContent = Boolean(cleanedCaption || shouldGenerateText);

      const effectivePostType =
        selectedPostType !== "auto"
          ? selectedPostType
          : includesMediaContent && includesTextContent
            ? "mixed"
            : includesMediaContent
              ? "image"
              : "text";

      const recurrenceValue: Recurrence = enableRecurrence ? "daily" : "once";

      const payload: any = {
        title: title.trim(),
        caption: cleanedCaption,
        media: manualMedia,
        postType: effectivePostType,
        visibility: "public",
        selectedPlatforms,
        selectedAccountIds,
        firstComment: firstComment.trim() || undefined,
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
          textPrompt: aiTextPrompt.trim(),
          imagePrompt: aiImagePrompt.trim(),
          imageSize: aiImageSize,
          imageCount: 1,
          imageFormat: "url",
        };
      }

      const created = await authJsonFetch<any>(api.posts.create(), {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdPostId = created?.id || created?._id || created?.data?.id || created?.data?._id;
      if (!createdPostId) {
        throw new Error("Could not retrieve created post identifier.");
      }

      if (isApprovalRequest) {
        // Complete Backend Mapping: Call submitApproval
        await authJsonFetch(api.posts.submitApproval(createdPostId), { method: "POST" });
        toast.success("Post sent for review and approval!");
      } else if (enableSchedule) {
        await authJsonFetch(api.posts.schedule(createdPostId), {
          method: "POST",
          body: JSON.stringify({
            date: scheduleDate,
            time: scheduleTime,
            timezone: localTimezone,
            recurrence: recurrenceValue,
            recurrenceInterval: enableRecurrence ? Number(recurrenceInterval) : undefined,
            recurrenceUnit: enableRecurrence ? recurrenceUnit : undefined,
          }),
        });
        toast.success("Post scheduled successfully!");
      } else {
        await authJsonFetch(api.posts.publish(createdPostId), {
          method: "POST",
          body: JSON.stringify({
            platforms: selectedPlatforms,
            accountIds: selectedAccountIds,
            recurrence: recurrenceValue,
          }),
        });
        toast.success("Post published successfully!");
      }

      // Reset form
      setCaption("");
      setTitle("");
      setFirstComment("");
      setAiTextPrompt("");
      setAiImagePrompt("");
      setUploadedMedia([]);
      setScheduleDate("");
      setScheduleTime("");
      setEnableSchedule(false);
      setEnableRecurrence(false);
      setEnableAutoExpire(false);
      setEnableAiGeneration(false);

      await onPostCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create post.");
    } finally {
      setSubmitting(false);
      setSubmittingForApproval(false);
    }
  }

  return (
    <section className="post-composer" aria-labelledby="composer-heading">
      <div className="flex items-center justify-between mb-4">
        <h3 id="composer-heading" className="section-title section-title-small">
          <span className="icon-token" aria-hidden="true">
            <AppIcon name="publish" className="app-icon" />
          </span>
          Create a New Post
        </h3>
      </div>

      {!accounts.length ? (
        <p className="composer-empty">
          Connect an account first in{" "}
          <Link href="/accounts" className="link-inline">
            Connected Accounts
          </Link>
          .
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <label className="composer-label">
          Post Title (optional)
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Autumn Product Launch"
            maxLength={140}
            disabled={!accounts.length}
          />
        </label>

        <label className="composer-label">
          Post Type
          <select
            value={selectedPostType}
            onChange={(e) => setSelectedPostType(e.target.value)}
            disabled={!accounts.length}
          >
            <option value="auto">Automatic (based on text or photos)</option>
            <option value="text">Text Only</option>
            <option value="image">Single Photo</option>
            <option value="carousel">Photo Carousel</option>
            <option value="reel">Video / Reel</option>
            <option value="story">Story (Instagram)</option>
            <option value="article">Article Link</option>
            <option value="poll">Poll (LinkedIn)</option>
          </select>
        </label>

        {selectedPostType === "poll" && (
          <div className="border border-sky-200 bg-sky-50/40 rounded-xl p-3.5 flex flex-col gap-3 my-2">
            <div className="flex items-center gap-2 text-sky-900 font-bold text-xs uppercase tracking-wider">
              <AppIcon name="spark" className="w-4 h-4 text-sky-700" />
              Poll Details
            </div>
            <label className="composer-label text-xs">
              Question
              <input
                type="text"
                placeholder="What is your top priority this quarter?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                maxLength={140}
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-slate-600">
                Options (2 to 4 choices)
              </span>
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
                  className="text-xs text-sky-800 font-semibold self-start mt-1"
                >
                  + Add Option
                </button>
              )}
            </div>
          </div>
        )}

        <label className="composer-label">
          Post Message
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={
              enableAiGeneration
                ? "Optional notes or points you want to include..."
                : "What would you like to share?"
            }
            rows={5}
            maxLength={3000}
            disabled={!accounts.length}
          />
        </label>

        <label className="composer-label">
          First Comment (optional)
          <input
            type="text"
            placeholder="e.g. Link in bio! 👇"
            value={firstComment}
            onChange={(e) => setFirstComment(e.target.value)}
            disabled={!accounts.length}
          />
        </label>

        {/* Media Attachments */}
        <section className="composer-section">
          <div className="composer-section-head">
            <h4>Photos & Videos</h4>
            <p>Required for Instagram. Supports pictures, videos, and GIFs up to 50MB.</p>
          </div>
          <label className="composer-label">
            Upload photos or videos
            <input
              className="composer-file-input"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={uploadMediaFiles}
              disabled={!accounts.length || uploadingMedia}
            />
          </label>

          {hasUploadedMedia ? (
            <div className="account-list media-attachment-list">
              {uploadedMedia.map((item) => (
                <div key={item.url} className="account-list-item media-attachment-item">
                  <div>
                    <p className="platform-meta">{item.name || item.type.toUpperCase()}</p>
                    <p className="account-kind">
                      {item.type.toUpperCase()} • {item.mimeType || "media"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="outline-btn media-remove-btn text-xs text-red-600 hover:border-red-300"
                    onClick={() => removeUploadedMedia(item.url)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* AI Generator */}
        <label className="composer-toggle mt-3">
          <input
            type="checkbox"
            checked={enableAiGeneration}
            onChange={(e) => setEnableAiGeneration(e.target.checked)}
            disabled={!accounts.length}
          />
          Help me write with AI
        </label>

        {enableAiGeneration ? (
          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 flex flex-col gap-3 my-2">
            <label className="composer-label text-xs">
              What should AI create?
              <select
                value={aiGenerationType}
                onChange={(e) => setAiGenerationType(e.target.value as AiGenerationType)}
              >
                <option value="text">Post message only</option>
                <option value="image">Image only</option>
                <option value="both">Both message & image</option>
              </select>
            </label>

            {(aiGenerationType === "text" || aiGenerationType === "both") && (
              <label className="composer-label text-xs">
                What is this post about?
                <textarea
                  value={aiTextPrompt}
                  onChange={(e) => setAiTextPrompt(e.target.value)}
                  placeholder="Describe your idea, tone (friendly, professional, enthusiastic), and what you want to say..."
                  rows={2}
                />
              </label>
            )}

            {(aiGenerationType === "image" || aiGenerationType === "both") && (
              <label className="composer-label text-xs">
                Describe the picture you want
                <textarea
                  value={aiImagePrompt}
                  onChange={(e) => setAiImagePrompt(e.target.value)}
                  placeholder="Describe what the picture should show..."
                  rows={2}
                />
              </label>
            )}
          </div>
        ) : null}

        {/* Destinations */}
        <section className="composer-section">
          <div className="composer-section-head">
            <h4>Where to Share</h4>
            <p>Choose which accounts to post to.</p>
          </div>
          <div className="composer-accounts">
            {accounts.map((account) => (
              <button
                key={account._id}
                type="button"
                className={`pill-btn ${selectedAccountIds.includes(account._id) ? "active" : ""}`}
                onClick={() => toggleAccount(account._id)}
              >
                {platformLabelByName[account.platform] || account.platform}:{" "}
                {account.platformDisplayName || account.platformUsername || "Account"}
              </button>
            ))}
          </div>
        </section>

        {/* Delivery Options */}
        <section className="composer-section">
          <div className="composer-section-head">
            <h4>Publishing Options</h4>
            <p>Post right away or pick a time in the future.</p>
          </div>
          <div className="composer-toggle-row">
            <label className="composer-toggle">
              <input
                type="checkbox"
                checked={enableSchedule}
                onChange={(e) => setEnableSchedule(e.target.checked)}
                disabled={!accounts.length}
              />
              Schedule for Later
            </label>
            <label className="composer-toggle">
              <input
                type="checkbox"
                checked={enableRecurrence}
                onChange={(e) => setEnableRecurrence(e.target.checked)}
                disabled={!accounts.length}
              />
              Repeat Automatically
            </label>
          </div>

          {enableSchedule && (
            <div className="schedule-grid mt-3">
              <label className="composer-label text-xs">
                Date
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </label>
              <label className="composer-label text-xs">
                Time
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </label>
              <label className="composer-label text-xs">
                Timezone
                <input type="text" value={localTimezone} disabled className="bg-slate-50" />
              </label>
            </div>
          )}

          {enableRecurrence && (
            <div className="schedule-grid mt-3">
              <label className="composer-label text-xs">
                Repeat Every
                <input
                  type="number"
                  min={recurrenceIntervalBounds[recurrenceUnit].min}
                  max={recurrenceIntervalBounds[recurrenceUnit].max}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(e.target.value)}
                />
              </label>
              <label className="composer-label text-xs">
                Frequency
                <select
                  value={recurrenceUnit}
                  onChange={(e) => setRecurrenceUnit(e.target.value as RecurrenceUnit)}
                >
                  {recurrenceUnitOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            type="button"
            className="composer-submit flex-1"
            onClick={() => handleCreate(false)}
            disabled={submitting || uploadingMedia || !accounts.length}
          >
            {uploadingMedia
              ? "Uploading photos/videos..."
              : submitting
                ? "Please wait..."
                : enableSchedule
                  ? "Schedule Post"
                  : "Publish Now"}
          </button>

          <button
            type="button"
            className="outline-btn text-xs font-semibold py-2.5 px-4"
            onClick={() => handleCreate(true)}
            disabled={submittingForApproval || uploadingMedia || !accounts.length}
            title="Send this post to your team for approval"
          >
            {submittingForApproval ? "Sending..." : "Send for Approval"}
          </button>
        </div>
      </div>
    </section>
  );
}
