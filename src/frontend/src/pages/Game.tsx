import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScoreEntry } from "../backend.d.ts";
import { CANVAS_HEIGHT, CANVAS_WIDTH, WEATHER_ICONS } from "../game/constants";
import {
  createInitialState,
  handleCanvasClick,
  spawnWave,
  updateGame,
} from "../game/gameLogic";
import { renderCanvasHUD, renderGame } from "../game/renderer";
import type { GameScreen, GameState, HUDState } from "../game/types";
import { useActor } from "../hooks/useActor";

// ─── HUD Component ───────────────────────────────────────────────────────────

function GameHUD({ hud, onPause }: { hud: HUDState; onPause: () => void }) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 pointer-events-none">
      <div className="flex items-start justify-between px-3 py-2 bg-black/70 border-b border-green-800/50 backdrop-blur-sm">
        {/* Left: Trees + Ancient */}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🌳</span>
            <span className="text-xs text-green-300 font-semibold">
              {hud.treeCount} trees
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-amber-400">
              🏆 {hud.ancientCount}/100
            </span>
          </div>
        </div>

        {/* Center: Wave + Area */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-xs text-yellow-300 font-bold tracking-wider">
            WAVE {hud.wave}
          </div>
          <div className="text-[10px] text-cyan-300 truncate max-w-[160px]">
            {hud.area}
          </div>
          {hud.natureAnger && (
            <div className="text-[10px] text-red-400 animate-pulse font-bold">
              ⚠️ NATURE ANGRY!
            </div>
          )}
        </div>

        {/* Right: Score + Weather + Pause */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">
              {WEATHER_ICONS[hud.weather as keyof typeof WEATHER_ICONS]}
            </span>
            <span className="text-[10px] text-slate-300 capitalize">
              {hud.weather}
            </span>
          </div>
          <div className="text-sm font-bold text-yellow-400">
            {hud.score.toLocaleString()}
          </div>
          <button
            type="button"
            data-ocid="game.pause_button"
            className="pointer-events-auto bg-green-900/60 hover:bg-green-800/80 border border-green-700 text-green-300 text-xs px-2 py-1 rounded transition-colors"
            onClick={onPause}
          >
            ⏸
          </button>
        </div>
      </div>

      {/* Auli Rage Meter */}
      <div className="px-3 py-1 bg-black/50 border-b border-red-900/30">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-red-400 font-bold w-16">
            😡 AULI RAGE
          </span>
          <div className="flex-1 h-2 bg-red-950 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${hud.auliBeastMode ? "bg-red-400 animate-pulse" : "bg-red-600"}`}
              style={{ width: `${hud.auliRage}%` }}
            />
          </div>
          <span className="text-[10px] text-red-300 w-8 text-right">
            {hud.auliRage}%
          </span>
          {hud.auliBeastMode && (
            <span className="text-[10px] text-red-400 font-bold animate-pulse">
              🔥 BEAST!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Start Screen ─────────────────────────────────────────────────────────────

const TREE_EMOJIS = ["🌳", "🌸", "🍎", "🌱", "🌿", "🎋", "🌲", "🍃"];

function StartScreen({
  onStart,
  onHighScores,
  topScores,
}: {
  onStart: (name: string) => void;
  onHighScores: () => void;
  topScores: ScoreEntry[];
}) {
  const [name, setName] = useState("Guardian");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-950/40 via-background to-background pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full">
        {TREE_EMOJIS.map((emoji, i) => (
          <div
            key={emoji}
            className="absolute text-4xl opacity-20 animate-bounce"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + i * 0.4}s`,
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 max-w-lg w-full fade-in">
        {/* Title */}
        <div className="text-center">
          <div className="text-6xl mb-2">🌳</div>
          <h1 className="font-display text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-emerald-600 leading-tight tracking-tight">
            Garden
            <br />
            Guardians
          </h1>
          <p className="text-green-400/70 text-sm mt-2 font-body">
            Protect the living ecosystem from chaos villains
          </p>
        </div>

        {/* Name input */}
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <label
            htmlFor="guardian-name"
            className="text-green-300 text-xs font-semibold tracking-widest uppercase"
          >
            Guardian Name
          </label>
          <input
            id="guardian-name"
            data-ocid="game.player_name_input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full bg-green-950/50 border border-green-700 text-green-100 text-center rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50 placeholder-green-700"
            placeholder="Enter your name"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            data-ocid="game.start_button"
            onClick={() => onStart(name.trim() || "Guardian")}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold py-3 px-6 rounded-xl text-lg shadow-lg shadow-green-900/50 transition-all hover:scale-105 active:scale-95"
          >
            🌱 Start Game
          </button>
          <button
            type="button"
            data-ocid="game.high_scores_button"
            onClick={onHighScores}
            className="w-full bg-amber-900/40 hover:bg-amber-800/50 border border-amber-700/50 text-amber-300 font-semibold py-2 px-6 rounded-xl transition-all hover:border-amber-500"
          >
            🏆 High Scores
          </button>
        </div>

        {/* Instructions */}
        <div className="w-full max-w-xs bg-green-950/40 border border-green-800/40 rounded-xl p-3 text-xs text-green-300/80 space-y-1">
          <div className="font-bold text-green-300 mb-1">How to Play:</div>
          <div>🖱️ Click canvas to direct riders to a spot</div>
          <div>👆 Click a villain to send all riders to attack</div>
          <div>🌳 Protect trees — grow 100 ancient trees to win!</div>
          <div>⎵ Space = Pause &nbsp;|&nbsp; R = Restart (game over)</div>
          <div>😡 Watch Auli&apos;s rage meter — full = BEAST MODE!</div>
        </div>

        {/* Mini leaderboard preview */}
        {topScores.length > 0 && (
          <div className="w-full max-w-xs">
            <div className="text-[10px] text-amber-400/60 text-center mb-1 font-bold tracking-wider">
              TOP SCORES
            </div>
            {topScores.slice(0, 3).map((s, i) => (
              <div
                key={String(s.id)}
                className="flex justify-between text-[10px] text-slate-400 py-0.5 border-b border-green-900/30"
              >
                <span className="text-amber-400">{["🥇", "🥈", "🥉"][i]}</span>
                <span>{s.playerName}</span>
                <span className="text-green-400">
                  {Number(s.score).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────

function GameOverScreen({
  score,
  wave,
  victory,
  playerName,
  onRestart,
  onSubmitScore,
  topScores,
  isSubmitting,
  submitted,
}: {
  score: number;
  wave: number;
  victory: boolean;
  playerName: string;
  onRestart: () => void;
  onSubmitScore: () => void;
  topScores: ScoreEntry[];
  isSubmitting: boolean;
  submitted: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-green-950/20 via-background to-background pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-5 px-4 max-w-md w-full slide-up">
        <div className="text-center">
          <div className="text-6xl mb-2">{victory ? "🏆" : "💀"}</div>
          <h2
            className={`font-display text-4xl font-black ${victory ? "text-amber-300" : "text-red-400"}`}
          >
            {victory ? "VICTORY!" : "GAME OVER"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {victory
              ? "You grew the Great Garden of Life!"
              : "The ecosystem has collapsed..."}
          </p>
        </div>

        {/* Stats */}
        <div className="w-full max-w-xs bg-green-950/40 border border-green-800/40 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Guardian</span>
            <span className="text-green-300 font-bold">{playerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Final Score</span>
            <span className="text-yellow-400 font-bold text-lg">
              {score.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Wave Reached</span>
            <span className="text-green-300 font-bold">{wave}</span>
          </div>
        </div>

        {/* Submit score */}
        {!submitted && (
          <button
            type="button"
            data-ocid="game.submit_score_button"
            onClick={onSubmitScore}
            disabled={isSubmitting}
            className="w-full max-w-xs bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 disabled:opacity-50 text-black font-bold py-2.5 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            {isSubmitting ? "Submitting..." : "📤 Submit Score"}
          </button>
        )}
        {submitted && (
          <div className="text-green-400 text-sm font-semibold flex items-center gap-2">
            <span>✅</span> Score submitted!
          </div>
        )}

        {/* Leaderboard */}
        {topScores.length > 0 && (
          <div className="w-full max-w-xs" data-ocid="scores.list">
            <div className="text-xs text-amber-400/70 text-center mb-2 font-bold tracking-wider">
              LEADERBOARD
            </div>
            {topScores.slice(0, 5).map((s, i) => (
              <div
                key={String(s.id)}
                data-ocid={`scores.item.${i + 1}`}
                className="flex items-center justify-between text-xs py-1.5 border-b border-green-900/30"
              >
                <span className="text-amber-400 w-6">{i + 1}.</span>
                <span className="text-slate-300 flex-1 truncate">
                  {s.playerName}
                </span>
                <span className="text-green-400 font-bold">
                  {Number(s.score).toLocaleString()}
                </span>
                <span className="text-slate-500 ml-2">
                  W{Number(s.waveReached)}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          data-ocid="game.start_button"
          onClick={onRestart}
          className="w-full max-w-xs bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold py-2.5 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
        >
          🔄 Play Again
        </button>
        <button
          type="button"
          data-ocid="game.quit_button"
          onClick={onRestart}
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          ← Back to Menu
        </button>
      </div>
    </div>
  );
}

// ─── High Scores Screen ───────────────────────────────────────────────────────

function HighScoresScreen({
  scores,
  isLoading,
  onBack,
}: {
  scores: ScoreEntry[];
  isLoading: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 via-background to-background pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-5 px-4 max-w-md w-full fade-in">
        <div className="text-center">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="font-display text-4xl font-black text-amber-300">
            High Scores
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Garden Guardians Hall of Fame
          </p>
        </div>

        <div className="w-full max-w-sm bg-green-950/40 border border-green-800/40 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-green-400 animate-pulse">
              Loading scores...
            </div>
          ) : scores.length === 0 ? (
            <div
              data-ocid="scores.list"
              className="p-8 text-center text-slate-500"
            >
              No scores yet. Be the first!
            </div>
          ) : (
            <div data-ocid="scores.list">
              <div className="flex items-center justify-between px-4 py-2 bg-green-900/30 text-xs text-slate-400 font-bold border-b border-green-800/30">
                <span className="w-8">#</span>
                <span className="flex-1">Player</span>
                <span>Score</span>
                <span className="ml-4">Wave</span>
              </div>
              {scores.slice(0, 10).map((s, i) => (
                <div
                  key={String(s.id)}
                  data-ocid={`scores.item.${i + 1}`}
                  className={`flex items-center justify-between px-4 py-2.5 border-b border-green-900/20 text-sm ${i < 3 ? "bg-amber-950/20" : ""}`}
                >
                  <span className="w-8 text-amber-400 font-bold">
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`}
                  </span>
                  <span className="flex-1 text-slate-300 truncate font-medium">
                    {s.playerName}
                  </span>
                  <span className="text-yellow-400 font-bold">
                    {Number(s.score).toLocaleString()}
                  </span>
                  <span className="text-slate-500 ml-4 text-xs">
                    W{Number(s.waveReached)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-2"
        >
          ← Back to Menu
        </button>
      </div>
    </div>
  );
}

// ─── Pause Overlay ─────────────────────────────────────────────────────────────

function PauseOverlay({
  onResume,
  onQuit,
}: {
  onResume: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 slide-up">
        <div className="text-5xl">⏸</div>
        <h3 className="font-display text-3xl font-black text-yellow-300">
          PAUSED
        </h3>
        <p className="text-green-300/60 text-sm">Press SPACE to continue</p>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            data-ocid="game.resume_button"
            onClick={onResume}
            className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold py-2 px-8 rounded-xl transition-all hover:scale-105"
          >
            ▶ Resume
          </button>
          <button
            type="button"
            data-ocid="game.quit_button"
            onClick={onQuit}
            className="bg-red-900/50 hover:bg-red-800/60 border border-red-700 text-red-300 font-semibold py-2 px-6 rounded-xl transition-all"
          >
            ✕ Quit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Game Component ───────────────────────────────────────────────────────

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const animFrameRef = useRef<number>(0);
  const screenRef = useRef<GameScreen>("start");

  const [screen, setScreen] = useState<GameScreen>("start");
  const [hud, setHud] = useState<HUDState>({
    score: 0,
    wave: 1,
    area: "Backyard Garden",
    treeCount: 0,
    maxTrees: 54,
    ancientCount: 0,
    auliRage: 0,
    weather: "sun",
    natureAnger: false,
    paused: false,
    victory: false,
    gameOver: false,
    auliBeastMode: false,
  });
  const [paused, setPaused] = useState(false);
  const [gameOverData, setGameOverData] = useState<{
    score: number;
    wave: number;
    victory: boolean;
    playerName: string;
  } | null>(null);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [canvasShake, setCanvasShake] = useState(false);
  const canvasShakeRef = useRef(false);

  const { actor } = useActor();

  const { data: topScores = [], refetch: refetchScores } = useQuery<
    ScoreEntry[]
  >({
    queryKey: ["topScores"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTopScores();
    },
    enabled: !!actor,
  });

  const submitScoreMutation = useMutation({
    mutationFn: async ({
      playerName,
      score,
      wave,
    }: { playerName: string; score: number; wave: number }) => {
      if (!actor) return;
      await actor.submitScore(playerName, BigInt(score), BigInt(wave));
    },
    onSuccess: () => {
      setScoreSubmitted(true);
      refetchScores();
    },
  });

  // ─── Game Loop ─────────────────────────────────────────────────────────────

  const startGameLoop = useCallback(() => {
    let lastHudUpdate = 0;

    const loop = () => {
      const gs = gameStateRef.current;
      if (!gs) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      updateGame(gs);
      renderGame(ctx, gs);
      renderCanvasHUD(ctx, gs);

      // Canvas shake
      if (gs.canvasShaking && !canvasShakeRef.current) {
        canvasShakeRef.current = true;
        setCanvasShake(true);
        setTimeout(() => {
          canvasShakeRef.current = false;
          setCanvasShake(false);
        }, 500);
      }

      // Update HUD (throttled to every 6 frames)
      lastHudUpdate++;
      if (lastHudUpdate >= 6) {
        lastHudUpdate = 0;
        setHud({
          score: gs.score,
          wave: gs.wave,
          area: gs.area,
          treeCount: gs.trees.length,
          maxTrees: 54,
          ancientCount: gs.totalAncientGrown,
          auliRage: gs.auliRage,
          weather: gs.weather,
          natureAnger: gs.natureAnger,
          paused: gs.paused,
          victory: gs.victory,
          gameOver: gs.gameOver,
          auliBeastMode: gs.auliBeastMode,
        });
      }

      // Check game over
      if (gs.gameOver && screenRef.current === "playing") {
        setGameOverData({
          score: gs.score,
          wave: gs.wave,
          victory: gs.victory,
          playerName: gs.playerName,
        });
        screenRef.current = "gameover";
        setScreen("gameover");
        setScoreSubmitted(false);
        return; // Stop loop
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, []);

  // ─── Start Game ────────────────────────────────────────────────────────────

  const handleStartGame = useCallback((playerName: string) => {
    const gs = createInitialState(playerName);
    spawnWave(gs);
    gameStateRef.current = gs;
    screenRef.current = "playing";
    setScreen("playing");
    setPaused(false);
  }, []);

  // ─── Effect: Start loop when screen = playing ──────────────────────────────

  useEffect(() => {
    if (screen !== "playing") {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    startGameLoop();
    return () => cancelAnimationFrame(animFrameRef.current);
    // startGameLoop is stable (no deps), screen drives the effect
  }, [screen, startGameLoop]);

  // ─── Keyboard Handler ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && screenRef.current === "playing") {
        e.preventDefault();
        const gs = gameStateRef.current;
        if (!gs) return;
        gs.paused = !gs.paused;
        setPaused(gs.paused);
      }
      if (e.code === "KeyR" && screenRef.current === "gameover") {
        screenRef.current = "start";
        setScreen("start");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ─── Canvas Click ──────────────────────────────────────────────────────────

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const gs = gameStateRef.current;
      if (!gs || gs.paused || gs.gameOver) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;
      handleCanvasClick(gs, canvasX, canvasY);
    },
    [],
  );

  // ─── Pause / Resume ────────────────────────────────────────────────────────

  const handlePause = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs) return;
    gs.paused = true;
    setPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs) return;
    gs.paused = false;
    setPaused(false);
  }, []);

  const handleQuit = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    gameStateRef.current = null;
    screenRef.current = "start";
    setScreen("start");
    setPaused(false);
  }, []);

  // ─── Submit Score ──────────────────────────────────────────────────────────

  const handleSubmitScore = useCallback(() => {
    if (!gameOverData) return;
    submitScoreMutation.mutate({
      playerName: gameOverData.playerName,
      score: gameOverData.score,
      wave: gameOverData.wave,
    });
  }, [gameOverData, submitScoreMutation]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (screen === "start") {
    return (
      <StartScreen
        onStart={handleStartGame}
        onHighScores={() => {
          screenRef.current = "highscores";
          setScreen("highscores");
        }}
        topScores={topScores}
      />
    );
  }

  if (screen === "highscores") {
    return (
      <HighScoresScreen
        scores={topScores}
        isLoading={false}
        onBack={() => {
          screenRef.current = "start";
          setScreen("start");
        }}
      />
    );
  }

  if (screen === "gameover" && gameOverData) {
    return (
      <GameOverScreen
        score={gameOverData.score}
        wave={gameOverData.wave}
        victory={gameOverData.victory}
        playerName={gameOverData.playerName}
        onRestart={() => {
          screenRef.current = "start";
          setScreen("start");
        }}
        onSubmitScore={handleSubmitScore}
        topScores={topScores}
        isSubmitting={submitScoreMutation.isPending}
        submitted={scoreSubmitted}
      />
    );
  }

  // Playing screen — full screen, canvas fills viewport
  return (
    <div className="fixed inset-0 bg-background overflow-hidden flex flex-col">
      {/* HUD */}
      {screen === "playing" && <GameHUD hud={hud} onPause={handlePause} />}

      {/* Canvas fills remaining space */}
      <div className="relative flex-1 mt-[72px]">
        <canvas
          ref={canvasRef}
          data-ocid="game.canvas_target"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleCanvasMouseDown}
          className={`block cursor-crosshair ${canvasShake ? "canvas-shake" : ""}`}
          style={{
            width: "100%",
            height: "100%",
            background: "#0d1f1a",
            objectFit: "fill",
          }}
          tabIndex={0}
        />

        {/* Pause Overlay */}
        {paused && screen === "playing" && (
          <PauseOverlay onResume={handleResume} onQuit={handleQuit} />
        )}

        {/* Bottom info bar overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 border-t border-green-900/30 px-4 py-1 flex items-center justify-between text-[10px] text-slate-500">
          <span>🖱️ Click to direct riders · Click villain to attack</span>
          <span>⎵ Pause · R Restart</span>
          <span>🏆 Grow 100 ancient trees to win</span>
        </div>
      </div>
    </div>
  );
}
