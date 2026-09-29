"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  useEffect(() => {
    // CA Exam Date: 1 May 2027 (Tum isko apne hisaab se change kar sakte ho)
    const targetDate = new Date("May 1, 2027 00:00:00").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="border-2 border-zinc-800 bg-zinc-950 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-extrabold mb-2 text-yellow-400 tracking-wider">🎯 CA EXAM</h1>
        <h2 className="text-xl mb-8 font-medium text-zinc-400">1 MAY 2027</h2>
        
        <div className="text-5xl font-mono font-bold flex flex-col gap-4 mb-10">
          <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
            <span>{timeLeft.days}</span>
            <span className="text-sm font-sans text-zinc-500 mb-1">DAYS</span>
          </div>
          <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
            <span>{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="text-sm font-sans text-zinc-500 mb-1">HOURS</span>
          </div>
          <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="text-sm font-sans text-zinc-500 mb-1">MINUTES</span>
          </div>
          <div className="flex justify-between items-end border-b border-zinc-800 pb-2 text-red-400">
            <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="text-sm font-sans text-red-900 mb-1">SECONDS</span>
          </div>
        </div>

        <button className="bg-white hover:bg-zinc-200 text-black font-bold py-4 px-6 rounded-xl w-full transition-all text-lg">
          Login to Dashboard
        </button>
      </div>
    </div>
  );
}