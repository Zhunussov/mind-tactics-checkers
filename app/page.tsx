"use client";

import React, { useState, useEffect } from "react";
import { 
  Trophy, Sparkles, RefreshCw, Layers, Users, Zap, 
  CheckCircle2, BrainCircuit, Search, Flame, MapPin, 
  Loader2, User, Mail, Lock, LogOut 
} from "lucide-react";

type PieceType = "pawn" | "king";
type PlayerColor = "w" | "b";

interface Piece {
  color: PlayerColor;
  type: PieceType;
  id: string;
}

type BoardState = (Piece | null)[][];

interface Move {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
  isKingTransition: boolean;
}

interface LeaderboardPlayer {
  rank: number;
  name: string;
  city: string;
  rating: number;
  winRate: string;
  level: number;
  avatar: string;
  streak: number;
  isCurrentUser?: boolean;
}

export default function MindTacticsCheckers() {
  const [board, setBoard] = useState<BoardState>([]);
  const [turn, setTurn] = useState<PlayerColor>("w");
  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);
  const [availableMoves, setAvailableMoves] = useState<Move[]>([]);
  const [gameMode, setGameMode] = useState<"ai" | "local" | "online">("ai");
  const [winner, setWinner] = useState<PlayerColor | "draw" | "time_w" | "time_b" | null>(null);
  
  // Экраны и авторизация
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signup");
  
  // Данные игрока
  const [playerNickname, setPlayerNickname] = useState("Гость");
  const [playerEmail, setPlayerEmail] = useState("");
  const [playerPassword, setPlayerPassword] = useState("");
  const [playerCity, setPlayerCity] = useState("Almaty");
  const [playerXP, setPlayerXP] = useState(0);
  const [playerRating, setPlayerRating] = useState(1200);
  const [winStreak, setWinStreak] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState("https://api.dicebear.com/7.x/avataaars/svg?seed=Felix");

  // БЛИЦ-ТАЙМЕРЫ (3 минуты = 180 секунд)
  const [whiteTime, setWhiteTime] = useState(180);
  const [blackTime, setBlackTime] = useState(180);

  // Фильтрация рейтинга и матчи
  const [selectedCityFilter, setSelectedCityFilter] = useState("All");
  const [selectedLeaderboardPlayer, setSelectedLeaderboardPlayer] = useState<LeaderboardPlayer | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchedOpponent, setMatchedOpponent] = useState<LeaderboardPlayer | null>(null);

  // Фичи и модалки
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [aiCoachReport, setAiCoachReport] = useState<string[] | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  const avatarOptions = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Max"
  ];

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardPlayer[]>([
    { rank: 1, name: "Арман К.", city: "Almaty", rating: 2410, winRate: "78%", level: 8, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James", streak: 12 },
    { rank: 2, name: "Данияр С.", city: "Astana", rating: 2295, winRate: "71%", level: 6, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max", streak: 7 },
    { rank: 3, name: "Алина М.", city: "Shymkent", rating: 2180, winRate: "69%", level: 5, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia", streak: 5 },
    { rank: 4, name: "Тимур Б.", city: "Semey", rating: 2105, winRate: "64%", level: 4, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", streak: 4 },
  ]);

  const playerLevel = Math.floor(playerXP / 1000) + 1;
  const currentLevelXP = playerXP % 1000;

  useEffect(() => {
    if (isLoggedIn) {
      const updatedList = [
        {
          rank: 0,
          name: `${playerNickname} (Вы)`,
          city: playerCity,
          rating: playerRating,
          winRate: "100%",
          level: playerLevel,
          avatar: selectedAvatar,
          streak: winStreak,
          isCurrentUser: true
        },
        { rank: 1, name: "Арман К.", city: "Almaty", rating: 2410, winRate: "78%", level: 8, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James", streak: 12 },
        { rank: 2, name: "Данияр С.", city: "Astana", rating: 2295, winRate: "71%", level: 6, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max", streak: 7 },
        { rank: 3, name: "Алина М.", city: "Shymkent", rating: 2180, winRate: "69%", level: 5, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia", streak: 5 },
        { rank: 4, name: "Тимур Б.", city: "Semey", rating: 2105, winRate: "64%", level: 4, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", streak: 4 },
      ].sort((a, b) => b.rating - a.rating);
      
      const rankedList = updatedList.map((player, index) => ({ ...player, rank: index + 1 }));
      setLeaderboardData(rankedList);
    }
  }, [isLoggedIn, playerNickname, playerCity, playerRating, playerLevel, selectedAvatar, winStreak]);

  // Счётчик времени матча
  useEffect(() => {
    if (board.length > 0 && !winner) {
      const interval = setInterval(() => {
        if (turn === "w") {
          setWhiteTime((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              handleMatchEnd("b", true); // Поражение белых по времени
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              handleMatchEnd("w", true); // Поражение черных по времени
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [turn, board, winner]);

  const initGame = (mode: "ai" | "local" | "online" = "ai", opponent: LeaderboardPlayer | null = null) => {
    const newBoard: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));
    let idCounter = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) newBoard[r][c] = { color: "b", type: "pawn", id: `b-${idCounter++}` };
          else if (r > 4) newBoard[r][c] = { color: "w", type: "pawn", id: `w-${idCounter++}` };
        }
      }
    }
    setBoard(newBoard);
    setTurn("w");
    setSelectedPiece(null);
    setAvailableMoves([]);
    setWinner(null);
    setAiCoachReport(null);
    setMoveHistory([]);
    setGameMode(mode);
    setIsThinking(false);
    setWhiteTime(180);
    setBlackTime(180);
    if (opponent) setMatchedOpponent(opponent);
  };

  const handleModeSelection = (mode: "ai" | "local" | "online") => {
    if (!isLoggedIn) {
      setAuthTab("signup");
      setIsAuthModalOpen(true);
      return;
    }

    if (mode === "online") {
      const filteredPool = leaderboardData.filter(p => !p.isCurrentUser);
      const randomOpponent = filteredPool[Math.floor(Math.random() * filteredPool.length)] || leaderboardData[1];
      setMatchedOpponent(randomOpponent);
      setIsMatchmaking(true);
      
      setTimeout(() => {
        setIsMatchmaking(false);
        initGame("online", randomOpponent);
      }, 2500);
    } else {
      initGame(mode);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authTab === "signup" && !playerNickname) return;
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
  };

  // ДВИЖОК РУССКИХ ШАШЕК
  const getAllCapturesForPlayer = (currentBoard: BoardState, player: PlayerColor): Move[] => {
    const captures: Move[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece && piece.color === player) {
          captures.push(...getPieceMoves(currentBoard, r, c).filter(m => m.captures.length > 0));
        }
      }
    }
    return captures;
  };

  const getPieceMoves = (currentBoard: BoardState, r: number, c: number): Move[] => {
    const piece = currentBoard[r][c];
    if (!piece) return [];
    const moves: Move[] = [];
    const captureDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    if (piece.type === "pawn") {
      const directions = piece.color === "w" ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]];
      directions.forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !currentBoard[nr][nc]) {
          moves.push({ from: [r, c], to: [nr, nc], captures: [], isKingTransition: nr === (piece.color === "w" ? 0 : 7) });
        }
      });
      captureDirections.forEach(([dr, dc]) => {
        const tr = r + dr, tc = c + dc, lr = r + dr * 2, lc = c + dc * 2;
        if (lr >= 0 && lr < 8 && lc >= 0 && lc < 8) {
          const target = currentBoard[tr][tc], landing = currentBoard[lr][lc];
          if (target && target.color !== piece.color && !landing) {
            moves.push({ from: [r, c], to: [lr, lc], captures: [[tr, tc]], isKingTransition: lr === (piece.color === "w" ? 0 : 7) });
          }
        }
      });
    } else {
      captureDirections.forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        let targetPiece: [number, number] | null = null;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const cell = currentBoard[nr][nc];
          if (!cell) {
            if (!targetPiece) {
              moves.push({ from: [r, c], to: [nr, nc], captures: [], isKingTransition: false });
            } else {
              moves.push({ from: [r, c], to: [nr, nc], captures: [targetPiece], isKingTransition: false });
            }
          } else if (cell.color === piece.color) {
            break;
          } else {
            if (targetPiece) break;
            targetPiece = [nr, nc];
          }
          nr += dr; nc += dc;
        }
      });
    }
    return moves;
  };

  const handleCellClick = (r: number, c: number) => {
    if (winner || isThinking || board.length === 0) return;
    
    // Блокируем клики по доске, если сейчас ход бота в онлайн или соло режимах
    if (turn === "b" && gameMode !== "local") return;

    const piece = board[r][c];
    if (piece && piece.color === turn) {
      const allCaptures = getAllCapturesForPlayer(board, turn);
      const pMoves = getPieceMoves(board, r, c);
      setAvailableMoves(allCaptures.length > 0 ? pMoves.filter(m => m.captures.length > 0) : pMoves);
      setSelectedPiece([r, c]);
      return;
    }

    const selectedMove = availableMoves.find(m => m.to[0] === r && m.to[1] === c);
    if (selectedPiece && selectedMove) {
      executeMove(selectedMove);
    } else {
      setSelectedPiece(null);
      setAvailableMoves([]);
    }
  };

  const executeMove = (move: Move) => {
    const newBoard = board.map(row => [...row]);
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    let piece = newBoard[fr][fc]!;

    if (move.isKingTransition || piece.type === "king") piece = { ...piece, type: "king" };
    newBoard[tr][tc] = piece;
    newBoard[fr][fc] = null;
    move.captures.forEach(([cr, cc]) => { newBoard[cr][cc] = null; });

    const notation = `${piece.color === "w" ? "Белые" : "Черные"}: (${fr},${fc}) ➔ (${tr},${tc})${move.captures.length ? " ⚔️" : ""}`;
    setMoveHistory(prev => [notation, ...prev.slice(0, 9)]);

    if (move.captures.length > 0) {
      const nextCaptures = getPieceMoves(newBoard, tr, tc).filter(m => m.captures.length > 0);
      if (nextCaptures.length > 0) {
        setBoard(newBoard);
        setSelectedPiece([tr, tc]);
        setAvailableMoves(nextCaptures);
        return;
      }
    }

    setBoard(newBoard);
    setSelectedPiece(null);
    setAvailableMoves([]);

    const nextPlayer = turn === "w" ? "b" : "w";
    let hasMoves = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (newBoard[r][c]?.color === nextPlayer && getPieceMoves(newBoard, r, c).length > 0) {
          hasMoves = true;
          break;
        }
      }
    }

    if (!hasMoves) {
      handleMatchEnd(turn);
    } else {
      setTurn(nextPlayer);
    }
  };

  const handleMatchEnd = (matchWinner: PlayerColor, isTimeOut: boolean = false) => {
    if (isTimeOut) {
      setWinner(matchWinner === "w" ? "time_w" : "time_b");
    } else {
      setWinner(matchWinner);
    }

    if (matchWinner === "w") {
      setPlayerXP(prev => prev + 500);
      setPlayerRating(prev => prev + 25);
      setWinStreak(prev => prev + 1);
      
      if (gameMode === "online" && matchedOpponent) {
        setLeaderboardData(prev => prev.map(p => 
          p.name === matchedOpponent.name ? { ...p, rating: Math.max(1000, p.rating - 20) } : p
        ));
      }
    } else {
      setPlayerRating(prev => Math.max(1000, prev - 20));
      setWinStreak(0);
      
      if (gameMode === "online" && matchedOpponent) {
        setLeaderboardData(prev => prev.map(p => 
          p.name === matchedOpponent.name ? { ...p, rating: p.rating + 25 } : p
        ));
      }
    }

    if (matchWinner === "w") {
      setAiCoachReport([
        isTimeOut ? "🧠 Анализ MindTactics Coach: Отличная динамика! Ты превзошел соперника по скорости принятия решений." : "🧠 Анализ MindTactics Coach: Мастерский контроль центра поля! Твой прорыв по флангу лишил соперника пространства.",
        "💡 Совет: Твой стрик растет! Продолжай удерживать дальнобойных дамок на крайних диагоналях для контроля углов."
      ]);
    } else {
      setAiCoachReport([
        isTimeOut ? "⚠️ Анализ MindTactics Coach: Время вышло! В 3-минутном Блице старайся делать очевидные ходы быстрее, не задумываясь дольше 5 секунд." : "⚠️ Анализ MindTactics Coach: Критическая ошибка! Ты оставил открытой тыловую линию, что позволило сопернику прорваться.",
        "💡 Совет: Никогда не уводи шашки с последней горизонтали слишком рано, держи их как резерв защиты."
      ]);
    }
  };

  const handleExitToLobby = () => {
    setBoard([]);
    setWinner(null);
    setAiCoachReport(null);
  };

  // ХОД ИИ АКТИВИРУЕТСЯ СТРОГО ЕСЛИ РЕЖИМ НЕ LOCAL
  useEffect(() => {
    if (turn === "b" && !winner && board.length > 0 && gameMode !== "local") {
      setIsThinking(true);
      const delay = gameMode === "online" ? 2000 : 700;

      const timer = setTimeout(() => {
        const allCaptures = getAllCapturesForPlayer(board, "b");
        let aiMoves = allCaptures.length > 0 ? allCaptures : [];

        if (aiMoves.length === 0) {
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if (board[r][c]?.color === "b") {
                aiMoves.push(...getPieceMoves(board, r, c));
              }
            }
          }
        }

        if (aiMoves.length === 0) {
          handleMatchEnd("w");
          setIsThinking(false);
          return;
        }

        const bestMove = aiMoves.find(m => m.captures.length > 0) || aiMoves.find(m => m.isKingTransition) || aiMoves[Math.floor(Math.random() * aiMoves.length)];
        setIsThinking(false);
        executeMove(bestMove);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [turn, gameMode, board, winner]);

  // Форматирование секунд в вид 00:00
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-amber-500/30 flex flex-col justify-between">
      
      <header className="border-b border-slate-800 px-6 py-4 flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center relative group">
            <Layers className="h-6 w-6 text-white absolute transform -translate-y-0.5 group-hover:scale-110 transition" />
            <div className="h-5 w-5 rounded-full border-2 border-white/40 mt-1 opacity-80" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Mind Tactics: Elite Checkers
            </h1>
            <p className="text-xxs text-amber-400 font-medium tracking-wider uppercase">3-Min Blitz & Strategy Trainer</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                <span>Стрик: <span className="font-bold text-orange-400">{winStreak} 🔥</span></span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
                <img src={selectedAvatar} alt="Avatar" className="w-8 h-8 rounded-lg bg-slate-800" />
                <div className="text-left pr-2 hidden sm:block">
                  <p className="text-xs font-bold leading-none">{playerNickname}</p>
                  <p className="text-xxs text-slate-400 font-mono mt-0.5">{playerRating} Elo</p>
                </div>
              </div>
              <button onClick={() => setIsLoggedIn(false)} className="text-slate-400 hover:text-red-400 p-1 transition">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button onClick={() => { setAuthTab("signup"); setIsAuthModalOpen(true); }} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition">
              Войти в аккаунт
            </button>
          )}

          <button onClick={() => setIsProModalOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-orange-500/10 transition">
            Go Pro
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full flex-grow">
        
        {board.length === 0 ? (
          <>
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm relative overflow-hidden">
                <h2 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Ваш Прогресс</h2>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-black text-amber-400">Уровень {playerLevel}</span>
                  <span className="text-xs text-slate-400">{currentLevelXP} / 1000 XP</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full" style={{ width: `${currentLevelXP / 10}%` }} />
                </div>
                {isLoggedIn && (
                  <div className="pt-2">
                    <span className="text-xs text-slate-400 block mb-2">Сменить аватарку:</span>
                    <div className="flex space-x-2">
                      {avatarOptions.map((av, idx) => (
                        <img 
                          key={idx} src={av} onClick={() => setSelectedAvatar(av)}
                          className={`w-9 h-9 rounded-xl cursor-pointer p-0.5 bg-slate-950 border-2 transition ${selectedAvatar === av ? "border-amber-500 scale-105" : "border-transparent opacity-60"}`} 
                          alt="avatar-opt"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {!isLoggedIn && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xxs flex items-center justify-center text-center p-4">
                    <p className="text-xs text-amber-400/90 font-bold bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-xl">Авторизуйтесь для сохранения прогресса</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 flex flex-col justify-center">
              <div className="text-center space-y-2 mb-4">
                <h2 className="text-2xl font-black tracking-tight text-white">Выберите режим сражения</h2>
                <p className="text-sm text-slate-400">Гостевой просмотр активен. Зайдите в аккаунт, чтобы начать матч.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div onClick={() => handleModeSelection("ai")} className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-5 rounded-2xl cursor-pointer transition transform hover:-translate-y-1 group relative">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:bg-amber-500 group-hover:text-black transition">
                        <BrainCircuit className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-sm text-white">Одиночная vs ИИ-Бот</h3>
                        <p className="text-xs text-slate-400">3-минутный Блиц тактики против адаптивного ИИ</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div onClick={() => handleModeSelection("local")} className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-5 rounded-2xl cursor-pointer transition transform hover:-translate-y-1 group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-sm text-white">Вдвоем (Один экран)</h3>
                        <p className="text-xs text-slate-400">Поочередная игра для двух людей с таймером</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div onClick={() => handleModeSelection("online")} className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-5 rounded-2xl cursor-pointer transition transform hover:-translate-y-1 group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition">
                        <Zap className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-sm text-white">Онлайн Блиц-Дуэли</h3>
                        <p className="text-xs text-slate-400">Быстрый рейтинговый матч 3-Min Blitz</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Рейтинг по Городам</h2>
                  <select 
                    value={selectedCityFilter} onChange={(e) => setSelectedCityFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xxs p-1 rounded-lg text-amber-400 font-bold focus:outline-none"
                  >
                    <option value="All">Все города</option>
                    <option value="Almaty">Алматы</option>
                    <option value="Astana">Астана</option>
                    <option value="Shymkent">Шымкент</option>
                    <option value="Semey">Семей</option>
                  </select>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {leaderboardData
                    .filter(p => selectedCityFilter === "All" || p.city === selectedCityFilter)
                    .map((p) => (
                      <div 
                        key={p.rank} onClick={() => setSelectedLeaderboardPlayer(p)}
                        className={`flex justify-between items-center text-xs p-2 rounded-xl transition transform hover:-translate-y-0.5 border ${p.isCurrentUser ? "bg-amber-500/10 border-amber-500/60" : "bg-slate-950/60 border-slate-800 hover:border-amber-500/30 cursor-pointer"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <img src={p.avatar} alt="p-av" className="w-6 h-6 rounded bg-slate-800" />
                          <div>
                            <p className={`font-bold ${p.isCurrentUser ? "text-amber-400" : "text-slate-200"}`}>{p.name}</p>
                            <p className="text-xxs text-slate-500 flex items-center"><MapPin className="h-2 w-2 mr-0.5" />{p.city}</p>
                          </div>
                        </div>
                        <span className="font-mono text-xxs text-amber-400 font-bold">{p.rating} Elo</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ЭКРАН АРЕНЫ */
          <div className="col-span-1 lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center w-full">
            
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl h-fit space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Ходы партии</h3>
                <button onClick={handleExitToLobby} className="text-xxs text-red-400 hover:underline font-bold">Сдаться / Выйти</button>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl h-48 overflow-y-auto font-mono text-xxs text-slate-400 space-y-1 text-left">
                {moveHistory.length === 0 && <p className="text-slate-600 italic">История пуста...</p>}
                {moveHistory.map((h, i) => <p key={i} className="border-b border-slate-900 pb-0.5">{h}</p>)}
              </div>
            </div>

            <div className="flex flex-col items-center space-y-4">
              
              {/* ВИЗУАЛЬНЫЕ БЛИЦ-ТАЙМЕРЫ ДЛЯ ИГРОКОВ */}
              <div className="w-full max-w-[420px] flex justify-between items-center px-2 bg-slate-900/40 border border-slate-800/80 p-2.5 rounded-xl">
                <div className={`px-3 py-1 rounded-lg border font-mono text-xs font-bold transition-colors ${turn === 'w' ? 'bg-amber-500 text-black border-amber-400' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                  ⚪ {formatTime(whiteTime)}
                </div>
                <span className="text-xxs text-slate-500 font-bold uppercase tracking-wider">Blitz 3 Min</span>
                <div className={`px-3 py-1 rounded-lg border font-mono text-xs font-bold transition-colors ${turn === 'b' ? 'bg-amber-500 text-black border-amber-400' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                  ⚫ {formatTime(blackTime)}
                </div>
              </div>

              <div className="h-6 w-full flex items-center justify-center">
                {isThinking && (
                  <div className="flex items-center space-x-2 text-xs font-bold px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    <span>{gameMode === "online" ? `⚡ ${matchedOpponent?.name || "Оппонент"} думает...` : "🤖 ИИ просчитывает комбинацию..."}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between w-full max-w-[420px] text-xs text-slate-400 font-bold px-1">
                <span>Вы (Белые)</span>
                <span className="text-amber-400 bg-slate-900 px-3 py-0.5 rounded-full border border-slate-800 uppercase tracking-wide">
                  ХОД: {turn === "w" ? "БЕЛЫХ" : "ЧЕРНЫХ"}
                </span>
                <span>{gameMode === "ai" ? "ИИ-Бот" : gameMode === "online" ? matchedOpponent?.name : "Игрок 2 (Черные)"}</span>
              </div>

              <div className={`aspect-square w-full max-w-[420px] bg-slate-900 p-2 rounded-2xl border border-slate-800 grid grid-cols-8 gap-0.5 shadow-2xl relative ${isThinking ? "opacity-90 cursor-not-allowed" : ""}`}>
                {board.map((row, r) =>
                  row.map((piece, c) => {
                    const isDark = (r + c) % 2 === 1;
                    const isSelected = selectedPiece?.[0] === r && selectedPiece?.[1] === c;
                    const isAvailable = availableMoves.some(m => m.to[0] === r && m.to[1] === c);
                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        className={`relative flex items-center justify-center cursor-pointer aspect-square rounded ${isDark ? "bg-slate-950 hover:bg-slate-900/60" : "bg-slate-900/10"} ${isSelected ? "ring-2 ring-amber-500" : ""}`}
                      >
                        {isAvailable && <div className="absolute h-3 w-3 rounded-full bg-emerald-500 opacity-90 animate-pulse" />}
                        {piece && (
                          <div className={`w-4/5 h-4/5 rounded-full flex items-center justify-center border shadow-xl transition-transform ${piece.color === "w" ? "bg-gradient-to-b from-slate-100 to-slate-300 border-slate-400" : "bg-gradient-to-b from-slate-800 to-slate-950 border-slate-900"}`}>
                            {piece.type === "king" && <Trophy className="h-4 w-4 text-amber-500" />}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl h-fit space-y-3">
              <h3 className="font-bold text-sm text-purple-400 uppercase tracking-wider">Разбор AI Coach</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Доиграйте партию до конца, чтобы получить подробные разборы тактических ходов от искусственного интеллекта.</p>
            </div>

          </div>
        )}
      </main>

      {/* Модалка авторизации */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-2xl space-y-4 text-left shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex space-x-4 text-sm font-bold">
                <button onClick={() => setAuthTab("signup")} className={`pb-1 border-b-2 ${authTab === "signup" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400"}`}>Регистрация</button>
                <button onClick={() => setAuthTab("signin")} className={`pb-1 border-b-2 ${authTab === "signin" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400"}`}>Вход</button>
              </div>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-500 hover:text-white text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authTab === "signup" && (
                <div>
                  <label className="text-xxs uppercase tracking-wider text-slate-400 font-bold block mb-1">Никнейм</label>
                  <input type="text" required value={playerNickname} onChange={(e) => setPlayerNickname(e.target.value)} placeholder="IvanDraughts" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500" />
                </div>
              )}
              <div>
                <label className="text-xxs uppercase tracking-wider text-slate-400 font-bold block mb-1">Email</label>
                <input type="email" required value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} placeholder="player@tactics.kz" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-slate-400 font-bold block mb-1">Пароль</label>
                <input type="password" required value={playerPassword} onChange={(e) => setPlayerPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500" />
              </div>
              {authTab === "signup" && (
                <div>
                  <label className="text-xxs uppercase tracking-wider text-slate-400 font-bold block mb-1">Ваш Город</label>
                  <select value={playerCity} onChange={(e) => setPlayerCity(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none text-slate-300">
                    <option value="Almaty">Алматы</option>
                    <option value="Astana">Астана</option>
                    <option value="Shymkent">Шымкент</option>
                    <option value="Semey">Семей</option>
                  </select>
                </div>
              )}
              <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 font-bold py-2.5 rounded-xl text-xs text-white transition mt-4 shadow-lg shadow-orange-500/10">
                {authTab === "signup" ? "Создать аккаунт" : "Войти"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Экран матчмейкинга */}
      {isMatchmaking && matchedOpponent && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full border border-amber-500/20 animate-ping" />
            <div className="absolute h-24 w-24 rounded-full border border-amber-500/40 animate-pulse" />
            <Search className="h-8 w-8 text-amber-400 animate-spin" />
          </div>
          <div className="space-y-2 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 max-w-xs w-full">
            <img src={matchedOpponent.avatar} alt="Opponent" className="w-12 h-12 mx-auto rounded-xl bg-slate-950 border border-slate-800" />
            <div>
              <h3 className="text-sm font-black text-white">Противник: {matchedOpponent.name}</h3>
              <p className="text-xxs text-amber-400 font-medium tracking-wider flex items-center justify-center mt-1">
                <MapPin className="h-2.5 w-2.5 mr-0.5 text-amber-500" /> {matchedOpponent.city} • {matchedOpponent.rating} Elo
              </p>
            </div>
          </div>
          <p className="text-xxs text-slate-500 animate-pulse uppercase tracking-widest font-mono">Синхронизация игрового поля блица...</p>
        </div>
      )}

      {/* Экран окончания игры (С ИСПРАВЛЕННЫМ ТАЙМАУТОМ ВРЕМЕНИ) */}
      {winner && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-2xl text-center space-y-5 shadow-2xl">
            <div>
              <span className="text-4xl block mb-2">
                {winner === "w" || winner === "time_w" ? "🏆" : "💀"}
              </span>
              <h3 className={`font-black text-2xl tracking-tight ${winner === "w" || winner === "time_w" ? "text-amber-400" : "text-red-500"}`}>
                {winner === "w" && "МАТЧ ВЫИГРАН!"}
                {winner === "time_w" && "ПОБЕДА ПО ВРЕМЕНИ! ⏱️"}
                {winner === "b" && "ПОРАЖЕНИЕ"}
                {winner === "time_b" && "ПРОИГРЫШ ПО ВРЕМЕНИ! ⏱️"}
              </h3>
              {(winner === "w" || winner === "time_w") && <p className="text-xxs text-orange-400 font-bold tracking-wider uppercase mt-1">СТРИК ПРОДОЛЖЕН! 🔥</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/60 text-left text-xs">
              <div className="space-y-1">
                <p className="text-slate-500 font-bold">Вы ({playerNickname}):</p>
                <p className="font-mono text-emerald-400 font-bold text-sm">+{winner === "w" || winner === "time_w" ? "25" : "-20"} Elo</p>
                <p className="text-xxs text-slate-400">+{winner === "w" || winner === "time_w" ? "500" : "0"} XP</p>
              </div>
              <div className="space-y-1 border-l border-slate-800 pl-3">
                <p className="text-slate-500 font-bold">{gameMode === "online" ? matchedOpponent?.name : "ИИ-Бот"}:</p>
                <p className={`font-mono font-bold text-sm ${winner === "w" || winner === "time_w" ? "text-red-400" : "text-emerald-400"}`}>{winner === "w" || winner === "time_w" ? "-20" : "+25"} Elo</p>
              </div>
            </div>

            {aiCoachReport && (
              <div className="bg-purple-950/20 border border-purple-900/40 p-4 rounded-xl text-left space-y-2">
                <h4 className="font-bold text-xs text-purple-400 uppercase tracking-wider flex items-center"><BrainCircuit className="h-3.5 w-3.5 mr-1.5 text-purple-400" />Отчет ИИ-Помощника:</h4>
                {aiCoachReport.map((line, idx) => <p key={idx} className="text-xxs text-slate-300 leading-relaxed">{line}</p>)}
              </div>
            )}

            <button onClick={handleExitToLobby} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 transition">
              Вернуться в лобби
            </button>
          </div>
        </div>
      )}

      {/* Модалка профиля лидеров */}
      {selectedLeaderboardPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-xs w-full p-6 rounded-2xl text-center space-y-4 shadow-2xl">
            <img src={selectedLeaderboardPlayer.avatar} alt="Profile" className="w-20 h-20 mx-auto rounded-2xl bg-slate-950 border border-slate-800 p-1" />
            <div>
              <h3 className="font-black text-lg text-white">{selectedLeaderboardPlayer.name}</h3>
              <p className="text-xs text-amber-400 font-medium">Ранг в системе • {selectedLeaderboardPlayer.city}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl text-left text-xs space-y-1.5 font-medium text-slate-300 border border-slate-800/50">
              <p>Уровень Стратега: <span className="text-white font-bold">Level {selectedLeaderboardPlayer.level}</span></p>
              <p>Текущий рейтинг: <span className="text-amber-400 font-mono font-bold">{selectedLeaderboardPlayer.rating} Elo</span></p>
              <p>Процент побед: <span className="text-emerald-400 font-bold">{selectedLeaderboardPlayer.winRate}</span></p>
              <p>Лучший стрик: <span className="text-orange-400 font-bold">{selectedLeaderboardPlayer.streak} 🔥</span></p>
            </div>
            <button onClick={() => setSelectedLeaderboardPlayer(null)} className="w-full py-2 bg-slate-800 text-xs font-bold rounded-xl hover:bg-slate-700 text-slate-200">
              Закрыть профиль
            </button>
          </div>
        </div>
      )}

      {/* Модалка Pro тарифа */}
      {isProModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-xs w-full p-5 rounded-2xl space-y-4 text-center">
            <h3 className="font-black text-xl text-amber-400">MindTactics Pro</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Откройте продвинутый анализ ошибок, кастомные неоновые скины доски и премиум-аватарки всего за <span className="font-bold text-white">$5.99 / месяц</span>.</p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => setIsProModalOpen(false)} className="py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-400">Отмена</button>
              <button onClick={() => setIsProModalOpen(false)} className="py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-xs shadow-md">Купить за $5.99</button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-900 py-6 text-center text-xxs text-slate-600 w-full bg-slate-950">
        <p className="font-bold">Mind Tactics: Elite Checkers System © 2026</p>
        <p className="text-slate-700 pt-0.5">Designed & Developed by <span className="font-bold text-amber-500/70">TEMIRLAN ZHUNUSSOV</span>. All rights reserved.</p>
      </footer>
    </div>
  );
}
