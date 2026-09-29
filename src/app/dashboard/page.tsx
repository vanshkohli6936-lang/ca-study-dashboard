"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../supabase";

type Subject = {
  id: number;
  name: string;
  color: string;
  targetMinutes: number;
};

const SUBJECTS: Subject[] = [
  {
    id: 1,
    name: "A/c (FR)",
    color: "bg-blue-500",
    targetMinutes: 180,
  },
  {
    id: 2,
    name: "IBS (LAW)",
    color: "bg-green-500",
    targetMinutes: 120,
  },
  {
    id: 3,
    name: "TAX",
    color: "bg-red-500",
    targetMinutes: 120,
  },
  {
    id: 4,
    name: "COST",
    color: "bg-purple-500",
    targetMinutes: 120,
  },
  {
    id: 5,
    name: "AUDIT",
    color: "bg-orange-500",
    targetMinutes: 120,
  },
  {
    id: 6,
    name: "FM (AFM)",
    color: "bg-cyan-500",
    targetMinutes: 120,
  },
];

const DAILY_TARGET_MINUTES = 8 * 60;

// 1 May 2027, 9:00 AM IST
const EXAM_DATE = new Date("2027-05-01T09:00:00+05:30");

function formatMinutes(totalMinutes: number) {
  const minutes = Math.max(0, Math.floor(totalMinutes));

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

function formatTimer(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    String(hrs).padStart(2, "0"),
    String(mins).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":");
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfWeek(date: Date) {
  const result = new Date(date);

  const day = result.getDay();

  // Monday = 0
  const difference = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);
  result.setHours(0, 0, 0, 0);

  return result;
}

function isSameDay(date1: Date, date2: Date) {
  return getDateKey(date1) === getDateKey(date2);
}

export default function Dashboard() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [subject, setSubject] = useState("1");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [sessions, setSessions] = useState<any[]>([]);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Live timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSubject, setTimerSubject] = useState("1");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [isTimerSaving, setIsTimerSaving] = useState(false);

  // --------------------------------------------------
  // LIVE CLOCK
  // --------------------------------------------------

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------
  // LIVE STUDY TIMER
  // --------------------------------------------------

  useEffect(() => {
    if (!timerRunning || !timerStartTime) {
      return;
    }

    const interval = setInterval(() => {
      const seconds = Math.floor(
        (Date.now() - timerStartTime.getTime()) / 1000
      );

      setTimerSeconds(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerStartTime]);

  // --------------------------------------------------
  // FETCH DATA
  // --------------------------------------------------

  const fetchSessions = async () => {
    if (!studentName) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("student", studentName)
        .order("start_time", { ascending: false });

      if (error) {
        console.error("Fetch study sessions error:", error);
        alert("Study data load nahi ho pa raha: " + error.message);
        return;
      }

      setSessions(data || []);
    } catch (error: any) {
      console.error("Fetch error:", error);
      alert("Connection Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedStudent = localStorage.getItem("student");

    if (!storedStudent) {
      router.replace("/login");
      return;
    }

    setStudentName(storedStudent);
  }, [router]);

  useEffect(() => {
    if (studentName) {
      fetchSessions();
    }
  }, [studentName]);

  // --------------------------------------------------
  // TODAY
  // --------------------------------------------------

  const todaysSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (!session.start_time) return false;

      return isSameDay(
        new Date(session.start_time),
        currentTime
      );
    });
  }, [sessions, currentTime]);

  const completedMinutes = useMemo(() => {
    return todaysSessions.reduce((total, session) => {
      return total + Number(session.duration_minutes || 0);
    }, 0);
  }, [todaysSessions]);

  const progressPercent = Math.min(
    100,
    Math.round(
      (completedMinutes / DAILY_TARGET_MINUTES) * 100
    )
  );

  // --------------------------------------------------
  // SUBJECT TODAY
  // --------------------------------------------------

  const getSubjectCompletedMinutes = (subjectId: number) => {
    return todaysSessions
      .filter(
        (session) =>
          Number(session.subject_id) === subjectId
      )
      .reduce((total, session) => {
        return total + Number(session.duration_minutes || 0);
      }, 0);
  };

  // --------------------------------------------------
  // WEEKLY DATA
  // --------------------------------------------------

  const weekStart = useMemo(() => {
    return getStartOfWeek(currentTime);
  }, [currentTime]);

  const weeklySessions = useMemo(() => {
    const weekEnd = new Date(weekStart);

    weekEnd.setDate(weekEnd.getDate() + 7);

    return sessions.filter((session) => {
      if (!session.start_time) return false;

      const sessionDate = new Date(session.start_time);

      return (
        sessionDate >= weekStart &&
        sessionDate < weekEnd
      );
    });
  }, [sessions, weekStart]);

  const weeklyCompletedMinutes = useMemo(() => {
    return weeklySessions.reduce((total, session) => {
      return total + Number(session.duration_minutes || 0);
    }, 0);
  }, [weeklySessions]);

  const weeklyTargetMinutes = DAILY_TARGET_MINUTES * 7;

  const weeklyProgressPercent = Math.min(
    100,
    Math.round(
      (weeklyCompletedMinutes / weeklyTargetMinutes) *
        100
    )
  );

  // --------------------------------------------------
  // WEEKLY DAILY BREAKDOWN
  // --------------------------------------------------

  const weeklyDays = useMemo(() => {
    const days = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);

      date.setDate(weekStart.getDate() + i);

      const daySessions = weeklySessions.filter(
        (session) => {
          if (!session.start_time) return false;

          return isSameDay(
            new Date(session.start_time),
            date
          );
        }
      );

      const minutes = daySessions.reduce(
        (total, session) => {
          return (
            total +
            Number(session.duration_minutes || 0)
          );
        },
        0
      );

      days.push({
        date,
        minutes,
      });
    }

    return days;
  }, [weeklySessions, weekStart]);

  // --------------------------------------------------
  // WEEKLY SUBJECT BREAKDOWN
  // --------------------------------------------------

  const weeklySubjectData = useMemo(() => {
    return SUBJECTS.map((subjectItem) => {
      const minutes = weeklySessions
        .filter(
          (session) =>
            Number(session.subject_id) ===
            subjectItem.id
        )
        .reduce((total, session) => {
          return (
            total +
            Number(session.duration_minutes || 0)
          );
        }, 0);

      return {
        ...subjectItem,
        minutes,
      };
    });
  }, [weeklySessions]);

  // --------------------------------------------------
  // STUDY STREAK
  // --------------------------------------------------

  const studyStreak = useMemo(() => {
    let streak = 0;

    const checkDate = new Date(currentTime);
    checkDate.setHours(0, 0, 0, 0);

    // If today has no study, start checking from yesterday.
    const studiedToday = sessions.some((session) => {
      if (!session.start_time) return false;

      return (
        isSameDay(
          new Date(session.start_time),
          checkDate
        ) &&
        Number(session.duration_minutes || 0) > 0
      );
    });

    if (!studiedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      const hasStudy = sessions.some((session) => {
        if (!session.start_time) return false;

        return (
          isSameDay(
            new Date(session.start_time),
            checkDate
          ) &&
          Number(session.duration_minutes || 0) > 0
        );
      });

      if (!hasStudy) {
        break;
      }

      streak++;

      checkDate.setDate(
        checkDate.getDate() - 1
      );
    }

    return streak;
  }, [sessions, currentTime]);

  // --------------------------------------------------
  // EXAM COUNTDOWN
  // --------------------------------------------------

  const examCountdown = useMemo(() => {
    const difference =
      EXAM_DATE.getTime() -
      currentTime.getTime();

    if (difference <= 0) {
      return {
        finished: true,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    const totalSeconds = Math.floor(
      difference / 1000
    );

    const days = Math.floor(
      totalSeconds / 86400
    );

    const hours = Math.floor(
      (totalSeconds % 86400) / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    return {
      finished: false,
      days,
      hours,
      minutes,
      seconds,
    };
  }, [currentTime]);

  // --------------------------------------------------
  // TIME LEFT IN TODAY
  // --------------------------------------------------

  const dayEndCountdown = useMemo(() => {
    const nextMidnight = new Date(currentTime);
    nextMidnight.setHours(24, 0, 0, 0);

    const difference = Math.max(
      0,
      nextMidnight.getTime() - currentTime.getTime()
    );

    const totalSeconds = Math.floor(
      difference / 1000
    );

    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    return {
      hours,
      minutes,
      seconds,
    };
  }, [currentTime]);

  // --------------------------------------------------
  // MANUAL ADD STUDY
  // --------------------------------------------------

  const handleSaveStudy = async (e: any) => {
    e.preventDefault();

    if (!topic.trim() || !duration) {
      alert(
        "Please topic aur duration dono daalo!"
      );
      return;
    }

    const durationMinutes = parseInt(duration);

    if (
      isNaN(durationMinutes) ||
      durationMinutes <= 0
    ) {
      alert(
        "Duration valid minutes mein daalo!"
      );
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } =
        await supabase
          .from("study_sessions")
          .insert([
            {
              subject_id: parseInt(subject),
              duration_minutes:
                durationMinutes,
              notes: topic.trim(),
              student: studentName,
              start_time:
                new Date().toISOString(),
            },
          ])
          .select()
          .single();

      if (error) {
        console.error(
          "Supabase Error:",
          error
        );

        alert(
          "Database Error: " +
            error.message
        );

        return;
      }

      if (data) {
        setSessions((previous) => [
          data,
          ...previous,
        ]);
      }

      alert(
        "Padhai successfully save ho gayi! 🎉"
      );

      setShowModal(false);
      setTopic("");
      setDuration("");
    } catch (error: any) {
      console.error(
        "Save Error:",
        error
      );

      alert(
        "Connection Error: " +
          error.message
      );
    } finally {
      setIsSaving(false);
    }
  };

  // --------------------------------------------------
  // START TIMER
  // --------------------------------------------------

  const startTimer = () => {
    if (timerRunning) return;

    const now = new Date();

    setTimerStartTime(now);
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  // --------------------------------------------------
  // STOP TIMER
  // --------------------------------------------------

  const stopTimer = async () => {
    if (
      !timerRunning ||
      !timerStartTime
    ) {
      return;
    }

    setIsTimerSaving(true);

    const seconds = Math.floor(
      (Date.now() -
        timerStartTime.getTime()) /
        1000
    );

    const minutes = Math.max(
      1,
      Math.floor(seconds / 60)
    );

    try {
      const { data, error } =
        await supabase
          .from("study_sessions")
          .insert([
            {
              subject_id:
                parseInt(timerSubject),

              duration_minutes:
                minutes,

              notes:
                "Live timer study session",

              student: studentName,

              start_time:
                timerStartTime.toISOString(),
            },
          ])
          .select()
          .single();

      if (error) {
        console.error(
          "Timer save error:",
          error
        );

        alert(
          "Timer save nahi hua: " +
            error.message
        );

        return;
      }

      if (data) {
        setSessions((previous) => [
          data,
          ...previous,
        ]);
      }

      alert(
        `${formatMinutes(
          minutes
        )} study time save ho gaya! 🎉`
      );

      setTimerRunning(false);
      setTimerSeconds(0);
      setTimerStartTime(null);
    } catch (error: any) {
      console.error(
        "Timer error:",
        error
      );

      alert(
        "Timer save error: " +
          error.message
      );
    } finally {
      setIsTimerSaving(false);
    }
  };

  // --------------------------------------------------
  // CURRENT TIME
  // --------------------------------------------------

  const formattedCurrentTime =
    currentTime.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }
    );

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans relative">

      <div className="max-w-md mx-auto pb-32">

        {/* ================= HEADER ================= */}

        <div className="mb-6 mt-4">

          <h1 className="text-3xl font-bold">
            Good Morning, {studentName} 👋
          </h1>

          <p className="text-zinc-500 text-sm mt-2">
            Current time:{" "}
            {formattedCurrentTime}
          </p>

          {/* EXAM COUNTDOWN */}

          <div className="mt-4 border border-zinc-800 bg-zinc-900 rounded-xl p-5 text-center">

            <p className="text-zinc-400 text-xs uppercase mb-2">
              CA Intermediate Target
            </p>

            <h2 className="text-yellow-400 font-bold text-lg tracking-widest">
              1 MAY 2027
            </h2>

            {examCountdown.finished ? (
              <p className="text-red-400 font-bold mt-2">
                EXAM TIME!
              </p>
            ) : (
              <>
                <p className="text-zinc-300 text-sm mt-2">
                  {examCountdown.days} DAYS LEFT
                </p>

                <div className="grid grid-cols-3 gap-2 mt-4">

                  <div className="bg-black rounded-lg p-2">
                    <p className="text-yellow-400 text-lg font-bold">
                      {examCountdown.hours}
                    </p>

                    <p className="text-zinc-500 text-[10px]">
                      HOURS
                    </p>
                  </div>

                  <div className="bg-black rounded-lg p-2">
                    <p className="text-yellow-400 text-lg font-bold">
                      {examCountdown.minutes}
                    </p>

                    <p className="text-zinc-500 text-[10px]">
                      MINUTES
                    </p>
                  </div>

                  <div className="bg-black rounded-lg p-2">
                    <p className="text-yellow-400 text-lg font-bold">
                      {examCountdown.seconds}
                    </p>

                    <p className="text-zinc-500 text-[10px]">
                      SECONDS
                    </p>
                  </div>

                </div>
              </>
            )}

          </div>

        </div>

        {/* ================= TODAY TARGET ================= */}

        <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">

          <div className="flex justify-between items-end border-b border-zinc-800 pb-3 mb-4">

            <div>
              <p className="text-zinc-400 text-xs uppercase mb-1">
                Today's Target
              </p>

              <p className="font-bold text-xl">
                8 Hours
              </p>
            </div>

            <div className="text-right">

              <p className="text-zinc-400 text-xs uppercase mb-1">
                Completed
              </p>

              <p className="font-bold text-xl text-yellow-400">
                {formatMinutes(
                  completedMinutes
                )}
              </p>

            </div>

          </div>

          <div className="w-full bg-zinc-800 rounded-full h-3 mb-2 overflow-hidden">

            <div
              className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
              }}
            />

          </div>

          <p className="text-right text-xs text-zinc-500 font-bold">
            {progressPercent}%
          </p>

          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
            <div>
              <p className="text-zinc-500 text-xs uppercase">
                Day Ends In
              </p>
              <p className="text-zinc-300 text-xs mt-1">
                Resets at 12:00 AM
              </p>
            </div>

            <p className="text-yellow-400 font-bold text-lg tabular-nums">
              {String(dayEndCountdown.hours).padStart(2, "0")}:{String(
                dayEndCountdown.minutes
              ).padStart(2, "0")}:{String(
                dayEndCountdown.seconds
              ).padStart(2, "0")}
            </p>
          </div>

        </div>

        {/* ================= LIVE TIMER ================= */}

        <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5">

          <div className="flex justify-between items-center mb-4">

            <div>

              <p className="text-zinc-400 text-xs uppercase">
                Live Study Timer
              </p>

              <p className="text-3xl font-bold mt-1">
                {formatTimer(
                  timerSeconds
                )}
              </p>

            </div>

            <div
              className={`w-3 h-3 rounded-full ${
                timerRunning
                  ? "bg-green-500 animate-pulse"
                  : "bg-zinc-600"
              }`}
            />

          </div>

          <select
            value={timerSubject}
            disabled={timerRunning}
            onChange={(e) =>
              setTimerSubject(
                e.target.value
              )
            }
            className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl outline-none mb-3"
          >

            {SUBJECTS.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}

          </select>

          {!timerRunning ? (
            <button
              onClick={startTimer}
              className="w-full bg-green-500 hover:bg-green-400 text-black p-3 rounded-xl font-bold transition-all"
            >
              ▶ Start Studying
            </button>
          ) : (
            <button
              onClick={stopTimer}
              disabled={isTimerSaving}
              className="w-full bg-red-500 hover:bg-red-400 text-white p-3 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {isTimerSaving
                ? "Saving..."
                : "■ Stop & Save"}
            </button>
          )}

        </div>

        {/* ================= WEEKLY ANALYTICS ================= */}

        <div className="mb-8">

          <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">

            <h3 className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
              Weekly Analytics
            </h3>

            <span className="text-xs text-zinc-500">
              Mon - Sun
            </span>

          </div>

          {/* WEEK TOTAL */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">

            <div className="flex justify-between items-end">

              <div>

                <p className="text-zinc-400 text-xs uppercase">
                  This Week
                </p>

                <p className="text-2xl font-bold mt-1">
                  {formatMinutes(
                    weeklyCompletedMinutes
                  )}
                </p>

              </div>

              <div className="text-right">

                <p className="text-zinc-500 text-xs">
                  Target
                </p>

                <p className="text-yellow-400 font-bold">
                  {formatMinutes(
                    weeklyTargetMinutes
                  )}
                </p>

              </div>

            </div>

            <div className="w-full bg-zinc-800 rounded-full h-3 mt-4 overflow-hidden">

              <div
                className="bg-yellow-400 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${weeklyProgressPercent}%`,
                }}
              />

            </div>

            <p className="text-right text-xs text-zinc-500 mt-2">
              {weeklyProgressPercent}% of weekly target
            </p>

          </div>

          {/* STREAK */}

          <div className="grid grid-cols-2 gap-3 mb-4">

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">

              <p className="text-zinc-500 text-xs uppercase">
                Study Streak
              </p>

              <p className="text-2xl font-bold text-yellow-400 mt-1">
                🔥 {studyStreak}
              </p>

              <p className="text-xs text-zinc-500">
                {studyStreak === 1
                  ? "day"
                  : "days"}
              </p>

            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">

              <p className="text-zinc-500 text-xs uppercase">
                Sessions
              </p>

              <p className="text-2xl font-bold mt-1">
                {weeklySessions.length}
              </p>

              <p className="text-xs text-zinc-500">
                this week
              </p>

            </div>

          </div>

          {/* MON-SUN */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">

            <p className="text-zinc-400 text-xs uppercase font-bold mb-4">
              Daily Breakdown
            </p>

            <div className="flex flex-col gap-4">

              {weeklyDays.map(
                (day, index) => {

                  const percentage =
                    Math.min(
                      100,
                      Math.round(
                        (day.minutes /
                          DAILY_TARGET_MINUTES) *
                          100
                      )
                    );

                  const dayName =
                    day.date.toLocaleDateString(
                      "en-IN",
                      {
                        weekday: "short",
                      }
                    );

                  return (
                    <div
                      key={getDateKey(
                        day.date
                      )}
                    >

                      <div className="flex justify-between items-center mb-1">

                        <div className="flex items-center gap-2">

                          <p className="text-sm font-bold">
                            {dayName}
                          </p>

                          {isSameDay(
                            day.date,
                            currentTime
                          ) && (
                            <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold">
                              TODAY
                            </span>
                          )}

                        </div>

                        <p className="text-xs text-zinc-400">
                          {formatMinutes(
                            day.minutes
                          )}
                        </p>

                      </div>

                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">

                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </div>

          {/* SUBJECT WEEKLY */}

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mt-4">

            <p className="text-zinc-400 text-xs uppercase font-bold mb-4">
              Subject-wise This Week
            </p>

            <div className="flex flex-col gap-4">

              {weeklySubjectData.map(
                (item) => {

                  const percentage =
                    weeklyCompletedMinutes > 0
                      ? Math.round(
                          (item.minutes /
                            weeklyCompletedMinutes) *
                            100
                        )
                      : 0;

                  return (
                    <div key={item.id}>

                      <div className="flex justify-between items-center mb-1">

                        <p className="text-sm font-bold">
                          {item.name}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {formatMinutes(
                            item.minutes
                          )}
                        </p>

                      </div>

                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">

                        <div
                          className={`${item.color} h-2 rounded-full transition-all duration-500`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </div>

        </div>

        {/* ================= SUBJECTS ================= */}

        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">

          <h3 className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
            Today's Subjects
          </h3>

          <button
            onClick={fetchSessions}
            className="text-xs text-yellow-400"
          >
            ↻ Refresh
          </button>

        </div>

        {isLoading ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">

            <p className="text-zinc-400">
              Loading study data...
            </p>

          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {SUBJECTS.map((item) => {

              const completed =
                getSubjectCompletedMinutes(
                  item.id
                );

              const percentage =
                Math.min(
                  100,
                  Math.round(
                    (completed /
                      item.targetMinutes) *
                      100
                  )
                );

              return (
                <div
                  key={item.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                >

                  <div className="flex justify-between items-center mb-2">

                    <p className="font-bold">
                      {item.name}
                    </p>

                    <p className="text-sm text-zinc-400">
                      {formatMinutes(
                        completed
                      )}{" "}
                      /{" "}
                      {formatMinutes(
                        item.targetMinutes
                      )}
                    </p>

                  </div>

                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">

                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-500`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />

                  </div>

                  <p className="text-right text-xs text-zinc-500 mt-1">
                    {percentage}%
                  </p>

                </div>
              );
            })}

          </div>
        )}

        {/* ================= TODAY HISTORY ================= */}

        <div className="mt-8">

          <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">

            <h3 className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
              Today's Study History
            </h3>

            <span className="text-xs text-zinc-500">
              {todaysSessions.length} sessions
            </span>

          </div>

          {todaysSessions.length === 0 ? (

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">

              <p className="text-zinc-500">
                Aaj abhi koi study session nahi hai.
              </p>

            </div>

          ) : (

            <div className="flex flex-col gap-3">

              {todaysSessions.map(
                (session) => {

                  const sessionSubject =
                    SUBJECTS.find(
                      (item) =>
                        item.id ===
                        Number(
                          session.subject_id
                        )
                    );

                  const sessionDate =
                    session.start_time
                      ? new Date(
                          session.start_time
                        )
                      : null;

                  const sessionTime =
                    sessionDate
                      ? sessionDate.toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute:
                              "2-digit",
                            hour12: true,
                          }
                        )
                      : "";

                  return (
                    <div
                      key={session.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                    >

                      <div className="flex justify-between items-start gap-3">

                        <div className="min-w-0">

                          <p className="font-bold text-base">
                            {sessionSubject?.name ||
                              "Unknown Subject"}
                          </p>

                          <p className="text-sm text-zinc-400 mt-1 truncate">
                            {session.notes ||
                              "Study Session"}
                          </p>

                        </div>

                        <div className="text-right shrink-0">

                          <p className="text-yellow-400 font-bold">
                            {formatMinutes(
                              Number(
                                session.duration_minutes ||
                                  0
                              )
                            )}
                          </p>

                          <p className="text-xs text-zinc-500 mt-1">
                            {sessionTime}
                          </p>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>

      </div>

      {/* ================= ADD BUTTON ================= */}

      <button
        onClick={() =>
          setShowModal(true)
        }
        className="fixed bottom-6 right-6 bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg shadow-yellow-400/20 font-bold w-16 h-16 rounded-full text-3xl flex items-center justify-center transition-all z-10"
      >
        +
      </button>

      {/* ================= ADD STUDY MODAL ================= */}

      {showModal && (

        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">

            <h2 className="text-2xl font-bold mb-6 text-center">
              Add Study 📚
            </h2>

            <form
              onSubmit={
                handleSaveStudy
              }
              className="flex flex-col gap-4"
            >

              {/* SUBJECT */}

              <div>

                <label className="text-sm text-zinc-400 block mb-2">
                  Subject
                </label>

                <select
                  value={subject}
                  onChange={(e) =>
                    setSubject(
                      e.target.value
                    )
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none focus:border-yellow-400"
                >

                  {SUBJECTS.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* TOPIC */}

              <div>

                <label className="text-sm text-zinc-400 block mb-2">
                  What did you complete?
                </label>

                <input
                  type="text"
                  value={topic}
                  onChange={(e) =>
                    setTopic(
                      e.target.value
                    )
                  }
                  placeholder="Topic or Chapter name..."
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none focus:border-yellow-400"
                />

              </div>

              {/* DURATION */}

              <div>

                <label className="text-sm text-zinc-400 block mb-2">
                  Duration (Minutes)
                </label>

                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) =>
                    setDuration(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 60"
                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none focus:border-yellow-400"
                />

              </div>

              {/* BUTTONS */}

              <div className="flex gap-3 mt-4">

                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 p-4 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black p-4 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : "Save"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}