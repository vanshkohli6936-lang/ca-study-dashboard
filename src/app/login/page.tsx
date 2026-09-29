"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [user, setUser] = useState("Gaurav");

  const handleLogin = (e: any) => {
    e.preventDefault();

    // Selected student ka naam browser mein save hoga
    localStorage.setItem("student", user);

    alert(`Welcome ${user}! Dashboard khul raha hai...`);

    setTimeout(() => {
      router.push("/dashboard");
    }, 100);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="border-2 border-zinc-800 bg-zinc-950 p-8 rounded-2xl text-center shadow-2xl max-w-sm w-full">
        <h1 className="text-3xl font-bold mb-8">Login</h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">

          <div className="text-left">
            <label className="text-sm text-zinc-400 mb-2 block">
              Who is studying?
            </label>

            <select
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-4 rounded-xl outline-none focus:border-yellow-400 cursor-pointer"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            >
              <option value="Gaurav">👦 Gaurav</option>
              <option value="Gurleen">👧 Gurleen</option>
            </select>
          </div>

          <div className="text-left">
            <label className="text-sm text-zinc-400 mb-2 block">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter password"
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-4 rounded-xl outline-none focus:border-yellow-400"
              required
            />
          </div>

          <button
            type="submit"
            className="bg-white hover:bg-zinc-200 text-black font-bold py-4 px-6 rounded-xl mt-4 transition-all text-lg"
          >
            Start Studying 🚀
          </button>

        </form>
      </div>
    </div>
  );
}