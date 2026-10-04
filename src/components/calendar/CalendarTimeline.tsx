"use client";

import { useMemo, useState } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import Modal from "@/src/components/ui/Modal";
import { TableSkeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/components/ui/ToastContext";
import { api } from "@/src/config/api";
import { authJsonFetch } from "@/src/lib/session";
import { formatDate } from "@/src/lib/utils";
import type { PostItem, SocialAccount } from "@/src/lib/schemas";

interface CalendarTimelineProps {
  posts: PostItem[];
  accounts: SocialAccount[];
  loading: boolean;
  onReload: () => Promise<void> | void;
  localTimezone: string;
  onOpenComposer?: () => void;
}

type ViewMode = "calendar" | "timeline" | "table";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function CalendarTimeline({
  posts,
  accounts,
  loading,
  onReload,
  localTimezone,
  onOpenComposer,
}: CalendarTimelineProps) {
  const toast = useToast();

  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit State
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Single Action State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [togglingRecurrenceId, setTogglingRecurrenceId] = useState<string | null>(null);

  // Month Navigation
  const handlePrevMonth = () => {
    setSelectedDayNumber(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDayNumber(null);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDayNumber(today.getDate());
  };

  // Filter posts by platform and search query
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (platformFilter !== "all") {
        if (!post.selectedPlatforms?.includes(platformFilter as any)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = post.title?.toLowerCase().includes(q);
        const matchesCaption = post.caption?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCaption) return false;
      }
      return true;
    });
  }, [posts, platformFilter, searchQuery]);

  // Map posts to dates in the currently selected month
  const postsByDateInMonth = useMemo(() => {
    const map = new Map<number, PostItem[]>();

    filteredPosts.forEach((post) => {
      if (!post.scheduledTime) return;
      const d = new Date(post.scheduledTime);
      if (Number.isNaN(d.getTime())) return;

      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        const existing = map.get(day) || [];
        existing.push(post);
        map.set(day, existing);
      }
    });

    // Sort each day's posts by time
    map.forEach((items) => {
      items.sort((a, b) => {
        const timeA = new Date(a.scheduledTime || 0).getTime();
        const timeB = new Date(b.scheduledTime || 0).getTime();
        return timeA - timeB;
      });
    });

    return map;
  }, [filteredPosts, currentYear, currentMonth]);

  // Calendar Grid Days Calculation
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      dateKey: string;
    }> = [];

    // Leading padding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      cells.push({
        day,
        isCurrentMonth: false,
        dateKey: `prev-${day}`,
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      cells.push({
        day,
        isCurrentMonth: true,
        dateKey: `curr-${day}`,
      });
    }

    // Trailing padding days to fill 7 columns
    const totalCells = cells.length;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        dateKey: `next-${i}`,
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  // Timeline groups for display
  const timelineGroups = useMemo(() => {
    let dayKeys = Array.from(postsByDateInMonth.keys()).sort((a, b) => a - b);

    if (selectedDayNumber !== null) {
      dayKeys = dayKeys.filter((d) => d === selectedDayNumber);
    }

    return dayKeys.map((day) => {
      const dateObj = new Date(currentYear, currentMonth, day);
      const isToday =
        today.getFullYear() === currentYear &&
        today.getMonth() === currentMonth &&
        today.getDate() === day;

      const isTomorrow =
        new Date(today.getTime() + 86400000).toDateString() === dateObj.toDateString();

      const items = postsByDateInMonth.get(day) || [];

      return {
        day,
        date: dateObj,
        isToday,
        isTomorrow,
        formattedHeading: dateObj.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        items,
      };
    });
  }, [postsByDateInMonth, selectedDayNumber, currentYear, currentMonth, today]);

  // Edit modal opener
  function startEdit(post: PostItem) {
    setEditingPost(post);
    setEditTitle(post.title || "");
    setEditCaption(post.caption || "");
    setEditTimezone(post.timezone || localTimezone);

    if (post.scheduledTime) {
      const d = new Date(post.scheduledTime);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setEditTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
    }
  }

  async function handleSaveEdit() {
    if (!editingPost || !editDate || !editTime) {
      toast.error("Please pick both a date and a time.");
      return;
    }

    setSavingEdit(true);
    try {
      await authJsonFetch(api.posts.update(editingPost._id), {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle.trim(),
          caption: editCaption.trim(),
        }),
      });

      await authJsonFetch(api.posts.schedule(editingPost._id), {
        method: "POST",
        body: JSON.stringify({
          date: editDate,
          time: editTime,
          timezone: editTimezone || localTimezone,
        }),
      });

      toast.success("Scheduled post updated successfully!");
      setEditingPost(null);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update scheduled post.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleRecurrence(post: PostItem) {
    setTogglingRecurrenceId(post._id);
    try {
      if (post.recurrencePaused) {
        await authJsonFetch(api.posts.resumeRecurrence(post._id), { method: "POST" });
        toast.success("Repeating schedule resumed.");
      } else {
        await authJsonFetch(api.posts.pauseRecurrence(post._id), { method: "POST" });
        toast.success("Repeating schedule paused.");
      }
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update repeating schedule.");
    } finally {
      setTogglingRecurrenceId(null);
    }
  }

  async function confirmDeletePost() {
    if (!postToDelete) return;
    setDeletingId(postToDelete);
    try {
      await authJsonFetch(api.posts.deleteScheduled(postToDelete), { method: "DELETE" });
      toast.success("Scheduled post deleted successfully.");
      setPostToDelete(null);
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete scheduled post.");
    } finally {
      setDeletingId(null);
    }
  }

  const formatPostTime = (isoString?: string | null) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="calendar-timeline-root flex flex-col gap-6">
      {/* Top Filter and View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "calendar"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setViewMode("calendar")}
            >
              <AppIcon name="calendar" className="w-3.5 h-3.5" />
              Calendar Timeline
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "timeline"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setViewMode("timeline")}
            >
              <AppIcon name="clock" className="w-3.5 h-3.5" />
              Timeline Only
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setViewMode("table")}
            >
              <AppIcon name="grid" className="w-3.5 h-3.5" />
              List Table
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={`pill-btn text-xs ${platformFilter === "all" ? "active" : ""}`}
              onClick={() => setPlatformFilter("all")}
            >
              All Channels
            </button>
            <button
              type="button"
              className={`pill-btn text-xs ${platformFilter === "instagram" ? "active" : ""}`}
              onClick={() => setPlatformFilter("instagram")}
            >
              Instagram
            </button>
            <button
              type="button"
              className={`pill-btn text-xs ${platformFilter === "linkedin" ? "active" : ""}`}
              onClick={() => setPlatformFilter("linkedin")}
            >
              LinkedIn
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              placeholder="Search scheduled posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 pl-8 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-600"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400">
              <AppIcon name="search" className="w-3.5 h-3.5" />
            </span>
          </div>

          {onOpenComposer && (
            <button
              type="button"
              onClick={onOpenComposer}
              className="primary-btn text-xs px-3 py-2 whitespace-nowrap"
            >
              + Create Post
            </button>
          )}
        </div>
      </div>

      {/* Month Navigation Controls */}
      {(viewMode === "calendar" || viewMode === "timeline") && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-100">
              {Array.from(postsByDateInMonth.values()).reduce((sum, list) => sum + list.length, 0)} posts
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              aria-label="Previous month"
            >
              <AppIcon name="chevron" className="w-4 h-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={handleJumpToToday}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              aria-label="Next month"
            >
              <AppIcon name="chevron" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* INTERACTIVE CALENDAR GRID */}
      {viewMode === "calendar" && (
        <div className="calendar-grid-card bg-white rounded-2xl border border-slate-200 p-4 shadow-sm overflow-hidden">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {DAYS_OF_WEEK.map((dayName) => (
              <div
                key={dayName}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-500 py-1"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarGrid.map((cell) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={cell.dateKey}
                    className="min-h-[70px] sm:min-h-[96px] p-1.5 rounded-xl bg-slate-50/50 border border-transparent text-slate-300 text-xs select-none"
                  >
                    <span className="font-medium text-[11px]">{cell.day}</span>
                  </div>
                );
              }

              const dayPosts = postsByDateInMonth.get(cell.day) || [];
              const isToday =
                today.getFullYear() === currentYear &&
                today.getMonth() === currentMonth &&
                today.getDate() === cell.day;
              const isSelected = selectedDayNumber === cell.day;

              return (
                <button
                  type="button"
                  key={cell.dateKey}
                  onClick={() =>
                    setSelectedDayNumber((prev) => (prev === cell.day ? null : cell.day))
                  }
                  className={`min-h-[70px] sm:min-h-[96px] p-2 rounded-xl text-left transition-all flex flex-col justify-between border ${
                    isSelected
                      ? "border-sky-600 bg-sky-50/40 ring-2 ring-sky-600/20 shadow-sm"
                      : isToday
                        ? "border-amber-300 bg-amber-50/20 hover:border-amber-400"
                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? "bg-amber-600 text-white"
                          : isSelected
                            ? "bg-sky-600 text-white"
                            : "text-slate-800"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {dayPosts.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800">
                        {dayPosts.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 mt-1 w-full overflow-hidden">
                    {dayPosts.slice(0, 2).map((post) => (
                      <div
                        key={post._id}
                        className="truncate text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-800 border border-slate-200/60"
                        title={post.title || post.caption}
                      >
                        <span className="text-slate-500 font-mono mr-1">
                          {formatPostTime(post.scheduledTime)}
                        </span>
                        {post.title || post.caption || "Post"}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <span className="text-[10px] font-semibold text-slate-500 pl-0.5">
                        +{dayPosts.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Day Filter Clear Banner */}
          {selectedDayNumber !== null && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Focusing on:{" "}
                <strong>
                  {MONTH_NAMES[currentMonth]} {selectedDayNumber}, {currentYear}
                </strong>{" "}
                ({(postsByDateInMonth.get(selectedDayNumber) || []).length} posts)
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayNumber(null)}
                className="text-sky-700 font-semibold hover:underline"
              >
                Show All Days in {MONTH_NAMES[currentMonth]}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CHRONOLOGICAL TIMELINE STREAM */}
      {(viewMode === "calendar" || viewMode === "timeline") && (
        <section className="timeline-stream-section flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <AppIcon name="clock" className="w-4 h-4 text-sky-700" />
              Timeline Schedule
            </h4>
          </div>

          {loading ? (
            <TableSkeleton rows={3} cols={4} />
          ) : timelineGroups.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white border border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <AppIcon name="calendar" className="w-6 h-6" />
              </div>
              <h5 className="font-bold text-slate-800 text-sm">
                No scheduled posts found for this time
              </h5>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {selectedDayNumber
                  ? `No posts scheduled for ${MONTH_NAMES[currentMonth]} ${selectedDayNumber}, ${currentYear}.`
                  : `There are no posts scheduled for ${MONTH_NAMES[currentMonth]} ${currentYear}.`}
              </p>
              {onOpenComposer && (
                <button
                  type="button"
                  onClick={onOpenComposer}
                  className="primary-btn text-xs px-4 py-2 mt-4 inline-flex items-center gap-1.5"
                >
                  <AppIcon name="plus" className="w-3.5 h-3.5" />
                  Schedule a Post Now
                </button>
              )}
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 flex flex-col gap-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {timelineGroups.map((group) => (
                <div key={group.day} className="relative flex flex-col gap-3">
                  {/* Timeline Date Marker */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`absolute -left-6 sm:-left-8 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        group.isToday
                          ? "bg-amber-500 border-white text-white shadow"
                          : "bg-white border-slate-300 text-slate-700"
                      }`}
                    >
                      {group.day}
                    </span>
                    <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {group.formattedHeading}
                      {group.isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                          Today
                        </span>
                      )}
                      {group.isTomorrow && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 uppercase tracking-wider">
                          Tomorrow
                        </span>
                      )}
                    </h5>
                  </div>

                  {/* Day's Post Cards */}
                  <div className="flex flex-col gap-3">
                    {group.items.map((post) => {
                      const isRecurring = (post.recurrence || "once") !== "once";

                      return (
                        <div
                          key={post._id}
                          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col gap-3"
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 border border-sky-200">
                                {formatPostTime(post.scheduledTime)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {post.timezone || localTimezone}
                              </span>
                              {isRecurring && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                                  Repeats {post.recurrence}
                                  {post.recurrencePaused ? " (Paused)" : ""}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {post.selectedPlatforms?.map((plt) => (
                                <span
                                  key={plt}
                                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                                >
                                  {plt}
                                </span>
                              ))}
                            </div>
                          </div>

                          {post.title && (
                            <h6 className="font-bold text-xs text-slate-900">{post.title}</h6>
                          )}

                          <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            {post.caption}
                          </p>

                          {post.media?.length ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <AppIcon name="link" className="w-3.5 h-3.5" />
                              <span>{post.media.length} photo/video file(s) attached</span>
                            </div>
                          ) : null}

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => startEdit(post)}
                              className="outline-btn text-xs px-2.5 py-1"
                            >
                              Edit Post
                            </button>
                            {isRecurring && (
                              <button
                                type="button"
                                onClick={() => handleToggleRecurrence(post)}
                                disabled={togglingRecurrenceId === post._id}
                                className="outline-btn text-xs px-2.5 py-1"
                              >
                                {post.recurrencePaused ? "Resume" : "Pause"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setPostToDelete(post._id)}
                              disabled={deletingId === post._id}
                              className="outline-btn danger-btn text-xs px-2.5 py-1"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* LIST TABLE VIEW */}
      {viewMode === "table" && (
        <div className="posts-table-wrap bg-white rounded-2xl border border-slate-200 p-4 shadow-sm" role="region" aria-label="Scheduled posts list">
          <table className="posts-table">
            <thead>
              <tr>
                <th scope="col">Title & Message</th>
                <th scope="col">Scheduled Time</th>
                <th scope="col">Repeat</th>
                <th scope="col">Channels</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-xs text-slate-500">
                    No scheduled posts match your filters.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post._id}>
                    <td>
                      {post.title && <p className="post-title">{post.title}</p>}
                      <p className="post-caption line-clamp-2">{post.caption}</p>
                    </td>
                    <td>
                      <p className="post-date font-semibold">
                        {formatDate(post.scheduledTime)}
                      </p>
                      <p className="text-[11px] text-slate-500">{post.timezone || localTimezone}</p>
                    </td>
                    <td>
                      <span className="status-pill status-scheduled">
                        {(post.recurrence || "once").toUpperCase()}
                        {post.recurrencePaused ? " (PAUSED)" : ""}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {post.selectedPlatforms?.map((plt) => (
                          <span
                            key={plt}
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                          >
                            {plt}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="outline-btn text-xs px-2.5 py-1"
                          onClick={() => startEdit(post)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="outline-btn danger-btn text-xs px-2.5 py-1"
                          onClick={() => setPostToDelete(post._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Scheduled Post Modal */}
      <Modal
        isOpen={Boolean(editingPost)}
        onClose={() => setEditingPost(null)}
        title="Edit Scheduled Post"
        description="Change your post text or update when it will be published."
        confirmLabel="Save Changes"
        onConfirm={handleSaveEdit}
        isLoading={savingEdit}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
              Message
            </label>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={3}
              className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Date
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">
                Time
              </label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full text-xs px-3 py-2 border rounded-lg bg-white"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(postToDelete)}
        onClose={() => setPostToDelete(null)}
        title="Delete Scheduled Post?"
        description="This post will be permanently canceled and will not be published."
        confirmLabel="Delete Post"
        isDestructive
        onConfirm={confirmDeletePost}
        isLoading={Boolean(deletingId)}
      />
    </div>
  );
}
