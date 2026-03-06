import { Toaster } from "@/components/ui/sonner";
import React from "react";
import Game from "./pages/Game";

export default function App() {
  return (
    <>
      <Game />
      <Toaster />
      <footer className="fixed bottom-0 left-0 right-0 text-center py-1 text-[10px] text-slate-600 bg-black/30 pointer-events-none z-50">
        © {new Date().getFullYear()}. Built with{" "}
        <span className="text-red-500">♥</span> using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          className="text-green-400 hover:text-green-300 pointer-events-auto transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          caffeine.ai
        </a>
      </footer>
    </>
  );
}
