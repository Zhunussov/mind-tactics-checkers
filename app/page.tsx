
"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Trophy, Sparkles, RefreshCw, Users, Zap, 
  CheckCircle2, BrainCircuit, Loader2,
  ArrowRight, ShieldCheck, CreditCard,
  Layers, Search, Flame, MapPin, User, Mail, Lock, LogOut,
  Target, Globe, ChevronRight, XCircle, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  INITIAL_BOARD, 
  Piece, 
  getAllValidMoves, 
  getValidMoves,
  makeMove, 
  Move, 
  boardToString, 
  getPieceColor 
} from '@/lib/game-logic';
import { Leaderboard, MOCK_PLAYERS } from '@/components/checkers/leaderboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { postMatchAICoachAnalysis } from '@/ai/flows/post-match-ai-coach-analysis-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

type ScreenState = 'lobby' | 'matchmaking' | 'arena';

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
];

const CITIES = ['Almaty', 'Astana', 'Shymkent', 'Semey'];

export default function MindTacticsApp() {
  const { toast } = useToast();
  
  // App & User State
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('lobby');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  
  // Dynamic Global State
  const [globalPlayers, setGlobalPlayers] = useState(MOCK_PLAYERS);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);
  
  // Game Engine State
  const [board, setBoard] = useState<Piece[][]>(INITIAL_BOARD);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [captureChainPiece, setCaptureChainPiece] = useState<{ r: number; c: number } | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [gameMode, setGameMode] = useState<'ai' | 'online' | 'local'>('ai');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium'>('medium');
  const [gameOver, setGameOver] = useState<string | null>(null);

  // Result & AI State
  const [showResultModal, setShowResultModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiCoachFeedback, setAiCoachFeedback] = useState<string[]>([]);
  const [eloChanges, setEloChanges] = useState({ player: 0, opponent: 0 });

  // Initialization
  useEffect(() => {
    const saved = localStorage.getItem('mind-tactics-user-v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserProfile(parsed);
      setIsLoggedIn(true);
    }
  }, []);

  const saveUser = (data: any) => {
    localStorage.setItem('mind-tactics-user-v4', JSON.stringify(data));
    setUserProfile(data);
    setIsLoggedIn(true);
    setShowAuthModal(false);
  };

  const logout = () => {
    localStorage.removeItem('mind-tactics-user-v4');
    setUserProfile(null);
    setIsLoggedIn(false);
  };

  const updateLeaderboardStats = (playerEloChange: number, opponentId: string | undefined, opponentEloChange: number) => {
    if (opponentId) {
      setGlobalPlayers(prev => prev.map(p => {
        if (p.id === opponentId) {
          return { ...p, elo: Math.max(100, (p.elo || 1200) + opponentEloChange) };
        }
        return p;
      }));
    }
  };

  const runAICoach = async (winnerColor: string) => {
    setIsAnalyzing(true);
    try {
      const boardStr = boardToString(board);
      const result = await postMatchAICoachAnalysis({
        boardState: boardStr,
        playerColor: 'white'
      });
      setAiCoachFeedback(result.feedbackPoints);
    } catch (error) {
      setAiCoachFeedback([
        "Strategic evaluation unavailable.",
        "System focus: Maintain center control.",
        "Tactical note: Watch for back-rank incursions."
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleWin = useCallback(() => {
    setGameOver('w');
    setShowResultModal(true);
    
    const xpGain = 500;
    const eloGain = 25;
    const opponentLoss = -20;

    setEloChanges({ player: eloGain, opponent: opponentLoss });

    const updatedUser = { 
      ...userProfile, 
      xp: (userProfile?.xp || 0) + xpGain, 
      elo: (userProfile?.elo || 1200) + eloGain,
      streak: (userProfile?.streak || 0) + 1 
    };
    
    saveUser(updatedUser);
    updateLeaderboardStats(eloGain, opponentProfile?.id, opponentLoss);
    runAICoach('w');
  }, [userProfile, opponentProfile]);

  const handleLoss = useCallback(() => {
    setGameOver('b');
    setShowResultModal(true);

    const eloLoss = -20;
    const opponentGain = 25;

    setEloChanges({ player: eloLoss, opponent: opponentGain });

    const updatedUser = { 
      ...userProfile, 
      elo: Math.max(100, (userProfile?.elo || 1200) + eloLoss),
      streak: 0 
    };
    
    saveUser(updatedUser);
    updateLeaderboardStats(eloLoss, opponentProfile?.id, opponentGain);
    runAICoach('b');
  }, [userProfile, opponentProfile]);

  // AI Game Logic
  const handleAIMove = useCallback(async () => {
    if (turn === 'b' && !gameOver && (gameMode === 'ai' || gameMode === 'online')) {
      setIsThinking(true);
      const delay = gameMode === 'online' ? 2000 : (difficulty === 'easy' ? 1000 : 1500);
      await new Promise(r => setTimeout(r, delay));

      let moves: Move[] = [];
      if (captureChainPiece) {
        moves = getValidMoves(board, captureChainPiece.r, captureChainPiece.c, true);
      } else {
        moves = getAllValidMoves(board, 'b');
      }

      if (moves.length === 0) {
        if (!captureChainPiece) handleWin();
        else { setCaptureChainPiece(null); setTurn('w'); }
        setIsThinking(false);
        return;
      }

      const move = moves.some(m => m.captures)
        ? moves.find(m => m.captures)!
        : moves[Math.floor(Math.random() * moves.length)];
      
      const newBoard = makeMove(board, move);
      setBoard(newBoard);
      
      if (move.captures) {
        const further = getValidMoves(newBoard, move.to.r, move.to.c, true);
        if (further.length > 0) {
          setCaptureChainPiece({ r: move.to.r, c: move.to.c });
          setIsThinking(false);
          return;
        }
      }

      setCaptureChainPiece(null);
      setTurn('w');
      setIsThinking(false);
      if (getAllValidMoves(newBoard, 'w').length === 0) handleLoss();
    }
  }, [turn, board, gameOver, gameMode, difficulty, captureChainPiece, handleWin, handleLoss]);

  useEffect(() => {
    if (turn === 'b' && !gameOver) handleAIMove();
  }, [turn, gameOver, handleAIMove]);

  const startMatchmaking = () => {
    if (!isLoggedIn) { setShowAuthModal(true); return; }
    setCurrentScreen('matchmaking');
    const available = globalPlayers.filter(p => p.id !== 'active-user');
    const randomOpponent = available[Math.floor(Math.random() * available.length)];
    setOpponentProfile(randomOpponent);

    setTimeout(() => {
      setCurrentScreen('arena');
      setGameMode('online');
      resetGameState();
    }, 3500);
  };

  const handleModeSelect = (mode: 'ai' | 'local' | 'online') => {
    if (!isLoggedIn) { setShowAuthModal(true); return; }
    
    if (mode === 'online') {
      startMatchmaking();
    } else {
      setGameMode(mode);
      setOpponentProfile(mode === 'ai' ? { name: 'Neural Core v4.0', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AI', elo: 2400, level: 15 } : null);
      setCurrentScreen('arena');
      resetGameState();
    }
  };

  const resetGameState = () => {
    setBoard(INITIAL_BOARD);
    setTurn('w');
    setSelected(null);
    setCaptureChainPiece(null);
    setGameOver(null);
    setShowResultModal(false);
    setAiCoachFeedback([]);
  };

  const handleSquareClick = (r: number, c: number) => {
    if ((turn === 'b' && gameMode !== 'local') || isThinking || gameOver) return;

    if (captureChainPiece) {
      if (r === captureChainPiece.r && c === captureChainPiece.c) { setSelected({ r, c }); return; }
      const moves = getValidMoves(board, captureChainPiece.r, captureChainPiece.c, true);
      const move = moves.find(m => m.to.r === r && m.to.c === c);
      if (move) {
        const newBoard = makeMove(board, move);
        setBoard(newBoard);
        const further = getValidMoves(newBoard, move.to.r, move.to.c, true);
        if (further.length > 0) {
          setCaptureChainPiece({ r: move.to.r, c: move.to.c });
          setSelected({ r: move.to.r, c: move.to.c });
        } else {
          setCaptureChainPiece(null);
          setSelected(null);
          setTurn(turn === 'w' ? 'b' : 'w');
        }
      }
      return;
    }

    const pieceColor = getPieceColor(board[r][c]);
    if (pieceColor === turn) {
      setSelected({ r, c });
    } else if (selected) {
      const moves = getAllValidMoves(board, turn);
      const move = moves.find(m => m.from.r === selected.r && m.from.c === selected.c && m.to.r === r && m.to.c === c);
      if (move) {
        const newBoard = makeMove(board, move);
        setBoard(newBoard);
        if (move.captures) {
          const further = getValidMoves(newBoard, move.to.r, move.to.c, true);
          if (further.length > 0) {
            setCaptureChainPiece({ r: move.to.r, c: move.to.c });
            setSelected({ r: move.to.r, c: move.to.c });
            return;
          }
        }
        setSelected(null);
        setCaptureChainPiece(null);
        setTurn(turn === 'w' ? 'b' : 'w');
        const nextMoves = getAllValidMoves(newBoard, turn === 'w' ? 'b' : 'w');
        if (nextMoves.length === 0) turn === 'w' ? handleWin() : handleLoss();
      } else setSelected(null);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'lobby':
        return (
          <LobbyScreen 
            user={userProfile} 
            isLoggedIn={isLoggedIn}
            onLogout={logout}
            onSelectMode={handleModeSelect}
            onLoginClick={() => setShowAuthModal(true)}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            players={globalPlayers}
            onShowPro={() => setShowProModal(true)}
          />
        );
      case 'matchmaking':
        return <MatchmakingScreen opponent={opponentProfile} />;
      case 'arena':
        return (
          <ArenaScreen 
            user={userProfile}
            opponent={opponentProfile}
            board={board}
            turn={turn}
            isThinking={isThinking}
            gameMode={gameMode}
            onSquareClick={handleSquareClick}
            selected={selected}
            captureChainPiece={captureChainPiece}
            onForfeit={() => setCurrentScreen('lobby')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body antialiased selection:bg-primary selection:text-primary-foreground">
      <Toaster />
      
      {renderScreen()}

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="p-0 border-none bg-transparent max-w-md shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Account Authentication</DialogTitle>
            <DialogDescription>Initialize your identity or reconnect to the grid.</DialogDescription>
          </DialogHeader>
           <AuthForm onFinish={saveUser} />
        </DialogContent>
      </Dialog>

      {/* Pro Modal */}
      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="glass border-white/10 rounded-[40px] p-8 max-w-lg amber-glow">
          <DialogHeader>
            <DialogTitle className="text-3xl font-headline font-black italic uppercase italic text-primary flex items-center gap-3">
              <Zap className="w-8 h-8" /> UNLOCK PRO GRID
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest pt-2">
              The ultimate strategic advantage
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-6">
            <div className="text-5xl font-black italic tracking-tighter text-center">
              $5.99 <span className="text-xl text-muted-foreground">/ month</span>
            </div>
            <ul className="space-y-4">
              {[
                "Deep AI Tactical Analytics post-match",
                "Neon & Cyberpunk Board Skins",
                "Exclusive High-Tier Global Tournaments",
                "Verified Pro Badge in Global Grid",
                "Ad-Free Command Center Experience"
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Button className="w-full h-14 bg-primary text-background font-black uppercase italic rounded-2xl text-lg shadow-[0_0_20px_hsl(var(--primary)/.3)]">
              INITIALIZE PRO SUBSCRIPTION
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="glass border-white/10 sm:max-w-xl text-foreground rounded-[40px] p-0 overflow-hidden amber-glow">
          <DialogHeader className="sr-only">
            <DialogTitle>{gameOver === 'w' ? 'Tactical Victory' : 'Tactical Defeat'}</DialogTitle>
            <DialogDescription>Performance summary and AI coaching analytics.</DialogDescription>
          </DialogHeader>
          <div className={`p-8 text-center space-y-8 ${gameOver === 'w' ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
            <div className="space-y-2">
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center glass amber-glow ${gameOver === 'w' ? 'text-primary' : 'text-destructive'}`}>
                {gameOver === 'w' ? <Trophy className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
              </div>
              <h2 className={`text-5xl font-headline font-black italic uppercase tracking-tighter ${gameOver === 'w' ? 'text-primary' : 'text-destructive'}`}>
                {gameOver === 'w' ? '🏆 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ'}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ResultCard profile={userProfile} eloChange={eloChanges.player} xpProgress={((userProfile?.xp || 0) % 1000) / 10} />
              <ResultCard profile={opponentProfile} eloChange={eloChanges.opponent} isOpponent />
            </div>

            <div className="glass p-6 rounded-3xl bg-black/40 border-white/5 text-left space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> AI COACH ANALYSIS
               </h3>
               {isAnalyzing ? (
                 <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <p className="text-xs font-bold text-muted-foreground uppercase animate-pulse">Scanning tactical nodes...</p>
                 </div>
               ) : (
                 <ul className="space-y-3">
                   {aiCoachFeedback.map((point, idx) => (
                     <li key={idx} className="flex gap-3 text-xs font-bold leading-tight">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-muted-foreground">{point}</span>
                     </li>
                   ))}
                 </ul>
               )}
            </div>

            <Button size="lg" onClick={() => setCurrentScreen('lobby')} className="w-full rounded-2xl h-14 bg-primary text-background font-black uppercase italic">
              RETURN TO COMMAND CENTER
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-Screens & Components

function LobbyScreen({ user, isLoggedIn, onLogout, onSelectMode, onLoginClick, difficulty, setDifficulty, players, onShowPro }: any) {
  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 animate-in fade-in duration-500">
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="relative">
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
             <div className="relative glass w-12 h-12 rounded-2xl flex items-center justify-center border-primary/20">
                <Layers className="w-6 h-6 text-primary" />
             </div>
          </div>
          <div>
            <h1 className="text-3xl font-headline font-black italic uppercase tracking-tighter bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent leading-none">
              MIND TACTICS
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">ELITE CHECKERS SYSTEM</p>
          </div>
        </div>
        
        {isLoggedIn ? (
          <Button variant="ghost" onClick={onLogout} className="text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 hover:bg-white/5">
            <LogOut className="w-4 h-4 mr-2" /> DISCONNECT
          </Button>
        ) : (
          <Button onClick={onLoginClick} className="bg-primary text-background font-black uppercase italic rounded-xl px-8">
            SIGN IN
          </Button>
        )}
      </header>

      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass p-8 rounded-[40px] amber-glow border-white/5 flex flex-col items-center text-center space-y-6 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/.05),transparent)]">
            {isLoggedIn ? (
              <>
                <div className="relative">
                  <img src={user.avatar} className="w-32 h-32 rounded-full border-4 border-primary/20 shadow-2xl" alt="" />
                  <div className="absolute -bottom-2 -right-2 bg-primary text-background px-4 py-1.5 rounded-full text-xs font-black italic">
                    LVL {Math.floor((user.xp || 0) / 1000) + 1}
                  </div>
                </div>
                <div className="space-y-1">
                  <h2 className="text-4xl font-headline font-black uppercase italic tracking-tighter">{user.name}</h2>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] flex items-center justify-center gap-2">
                     <MapPin className="w-3 h-3 text-primary" /> {user.city}, KZ
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <Badge variant="secondary" className="bg-secondary/20 text-secondary font-black h-7 px-3 text-[10px]">
                      🔥 {user.streak || 0} STREAK
                    </Badge>
                    <Badge variant="outline" className="text-primary border-primary/50 font-black h-7 px-3 text-[10px]">
                      🏆 {user.elo || 1200} ELO
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 flex flex-col items-center gap-6">
                 <div className="w-20 h-20 rounded-full glass flex items-center justify-center text-muted-foreground/30">
                    <User className="w-10 h-10" />
                 </div>
                 <h2 className="text-2xl font-black uppercase italic italic tracking-tighter text-muted-foreground">GUEST TERMINAL</h2>
                 <Button onClick={onLoginClick} className="w-full h-12 bg-white/5 hover:bg-white/10 text-primary border border-primary/20 font-black uppercase italic">
                    INITIALIZE IDENTITY
                 </Button>
              </div>
            )}
          </div>
          
          <Leaderboard activeUser={isLoggedIn ? user : null} externalPlayers={players} />
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModeCard 
            title="NEURAL CORE" 
            desc="Battle proprietary AI logic. Test multi-node tactical responses." 
            icon={<Target className="w-10 h-10 text-primary" />}
            onClick={() => onSelectMode('ai')}
            extra={
              <div className="flex gap-2 mt-6">
                <Button variant={difficulty === 'easy' ? 'default' : 'outline'} className="rounded-xl text-[9px] font-black uppercase h-8 flex-1" onClick={(e) => { e.stopPropagation(); setDifficulty('easy'); }}>EASY</Button>
                <Button variant={difficulty === 'medium' ? 'default' : 'outline'} className="rounded-xl text-[9px] font-black uppercase h-8 flex-1" onClick={(e) => { e.stopPropagation(); setDifficulty('medium'); }}>MEDIUM</Button>
              </div>
            }
          />
          <ModeCard 
            title="GLOBAL GRID" 
            desc="Matchmaking against elite humans. Live 3-min engagement." 
            icon={<Zap className="w-10 h-10 text-primary" />}
            onClick={() => onSelectMode('online')}
            isHot
          />
          <ModeCard 
            title="LOCAL COMBAT" 
            desc="Offline tactical training. 2 Players, 1 Device engagement." 
            icon={<Users className="w-10 h-10 text-primary" />}
            onClick={() => onSelectMode('local')}
          />
          <ModeCard 
            title="PRO MODULE" 
            desc="Unlock AI Analytics & Global Pro Titles for just $5.99/mo." 
            icon={<CreditCard className="w-10 h-10 text-primary" />}
            onClick={onShowPro}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ModeCard({ title, desc, icon, onClick, isHot, extra }: any) {
  return (
    <div onClick={onClick} className="glass p-10 rounded-[40px] border-white/5 transition-all group cursor-pointer hover:amber-glow relative overflow-hidden hover:-translate-y-2">
      {isHot && <div className="absolute top-6 right-6 animate-pulse"><Badge className="bg-destructive text-white text-[9px] font-black uppercase italic tracking-tighter">LIVE GRID</Badge></div>}
      <div className="mb-6">{icon}</div>
      <h3 className="text-3xl font-headline font-black italic uppercase mb-3 text-primary tracking-tighter">{title}</h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed font-bold uppercase tracking-tight">{desc}</p>
      {extra}
    </div>
  );
}

function ArenaScreen({ user, opponent, board, turn, isThinking, gameMode, onSquareClick, selected, captureChainPiece, onForfeit }: any) {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-7xl flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl font-headline font-black tracking-tighter uppercase italic text-primary">THE ARENA</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">GRID PHASE ACTIVE</p>
        </div>
        <Button variant="ghost" onClick={onForfeit} className="rounded-full text-xs font-bold uppercase tracking-widest border border-white/5 hover:bg-white/5">
          <LogOut className="w-4 h-4 mr-2" /> FORFEIT MATCH
        </Button>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3">
          <MiniPlayerCard profile={user} title="COMMANDER" isPlayer />
        </div>

        <div className="lg:col-span-6 flex flex-col items-center gap-6">
          <div className="w-full glass py-3 rounded-full amber-glow flex items-center justify-center gap-4">
             {isThinking ? (
                <div className="flex items-center gap-2 text-primary animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-black uppercase italic tracking-tighter">
                    {gameMode === 'ai' ? "🤖 AI ENGINE PROCESSING..." : "⚡ OPPONENT DEPLOYING..."}
                  </span>
                </div>
             ) : (
                <span className="text-sm font-black uppercase tracking-widest flex items-center gap-2 italic">
                  <div className={`w-2.5 h-2.5 rounded-full ${turn === 'w' ? 'bg-white shadow-[0_0_8px_#fff]' : 'bg-primary shadow-[0_0_8px_hsl(var(--primary))]'}`} />
                  {turn === 'w' ? "YOUR ACTION" : "OPPONENT ACTION"}
                </span>
             )}
          </div>

          <div className="relative p-2 glass rounded-[40px] amber-glow border-white/10">
            <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] md:w-[480px] md:h-[480px] bg-muted/10 border-4 border-muted/20 rounded-2xl overflow-hidden shadow-2xl">
              {board.map((row: any[], r: number) => 
                row.map((piece, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const isSelected = selected?.r === r && selected?.c === c;
                  const moves = selected ? (
                    captureChainPiece && selected.r === captureChainPiece.r && selected.c === captureChainPiece.c 
                      ? getValidMoves(board, selected.r, selected.c, true)
                      : getAllValidMoves(board, turn).filter(m => m.from.r === selected.r && m.from.c === selected.c)
                  ) : [];
                  const isTarget = moves.some(m => m.to.r === r && m.to.c === c);

                  return (
                    <div 
                      key={`${r}-${c}`}
                      onClick={() => onSquareClick(r, c)}
                      className={`relative flex items-center justify-center cursor-pointer transition-all ${
                        isDark ? 'bg-black/40' : 'bg-transparent'
                      } ${isTarget ? 'bg-primary/20 ring-inset ring-2 ring-primary/40' : ''}`}
                    >
                      {piece && (
                        <div className={`
                          w-[75%] h-[75%] rounded-full flex items-center justify-center transition-all duration-300
                          ${piece.startsWith('w') ? 'piece-white' : 'piece-black'}
                          ${isSelected ? 'scale-110 ring-4 ring-primary' : ''}
                          ${captureChainPiece && r === captureChainPiece.r && c === captureChainPiece.c ? 'ring-4 ring-secondary animate-pulse' : ''}
                        `}>
                          {piece.endsWith('k') && <Crown className={`w-1/2 h-1/2 ${piece.startsWith('w') ? 'text-black/30' : 'text-primary'}`} />}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <MiniPlayerCard profile={opponent} title="OPPONENT" />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function MiniPlayerCard({ profile, title, isPlayer }: any) {
  return (
    <div className={`glass p-5 rounded-3xl border-white/5 space-y-4 amber-glow ${isPlayer ? 'bg-primary/5' : ''}`}>
      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="flex items-center gap-4">
        <img src={profile?.avatar || AVATARS[0]} className="w-14 h-14 rounded-full border-2 border-primary/20" alt="" />
        <div>
          <h4 className="font-headline font-black text-lg uppercase italic leading-none truncate w-32">{profile?.name || '---'}</h4>
          <p className="text-[10px] font-bold text-primary italic">{profile?.elo || 1200} ELO</p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ profile, eloChange, xpProgress, isOpponent }: any) {
  return (
    <div className="glass p-4 rounded-3xl space-y-3 bg-white/5 border-white/10">
      <img src={profile?.avatar} className={`w-16 h-16 rounded-full mx-auto border-2 ${isOpponent ? 'border-destructive/20' : 'border-primary/20'}`} alt="" />
      <div className="space-y-1">
        <p className="text-xs font-black uppercase italic">{profile?.name}</p>
        <p className={`text-lg font-black italic ${eloChange > 0 ? 'text-emerald-400' : 'text-destructive'}`}>
          {profile?.elo} ({eloChange > 0 ? '+' : ''}{eloChange} ELO)
        </p>
        {!isOpponent && (
          <div className="space-y-1 pt-2">
            <p className="text-[8px] font-black uppercase text-muted-foreground">XP PROGRESS</p>
            <Progress value={xpProgress} className="h-1 bg-muted/30" />
          </div>
        )}
      </div>
    </div>
  );
}

function MatchmakingScreen({ opponent }: any) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => setDots(d => d.length < 3 ? d + '.' : ''), 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 relative overflow-hidden">
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[800px] h-[800px] border border-primary/20 rounded-full animate-ping" />
          <Globe className="absolute w-[400px] h-[400px] text-primary/10 animate-[spin_20s_linear_infinite]" />
       </div>

       <div className="relative text-center space-y-12 max-w-2xl w-full">
          {!opponent ? (
            <div className="flex flex-col items-center gap-6">
              <Loader2 className="w-20 h-20 animate-spin text-primary" />
              <h1 className="text-5xl font-headline font-black italic uppercase tracking-tighter">SCANNING GRID{dots}</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.8em] text-muted-foreground">CONNECTING TO GLOBAL NODES</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-500">
               <div className="flex flex-col items-center gap-4">
                  <Crown className="w-12 h-12 text-primary animate-bounce" />
                  <h1 className="text-4xl font-headline font-black italic uppercase tracking-tighter">OPPONENT IDENTIFIED</h1>
               </div>
               
               <div className="glass p-10 rounded-[50px] amber-glow flex items-center gap-8 bg-black/40 border-white/10">
                  <div className="relative">
                    <img src={opponent.avatar} className="w-32 h-32 rounded-full border-4 border-primary" alt="" />
                    <div className="absolute -bottom-2 -right-2 bg-primary text-background px-4 py-1 rounded-full text-sm font-black italic">LVL {opponent.level}</div>
                  </div>
                  <div className="text-left space-y-2">
                     <h2 className="text-4xl font-black italic uppercase tracking-tighter">{opponent.name}</h2>
                     <div className="flex gap-4">
                        <div className="text-xs font-bold text-primary italic uppercase tracking-widest">{opponent.elo} ELO</div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {opponent.city}
                        </div>
                     </div>
                  </div>
               </div>
               <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.3em] animate-pulse">ARENA DEPLOYMENT IN PROGRESS...</p>
            </div>
          )}
       </div>
       <Footer />
    </div>
  );
}

function AuthForm({ onFinish }: { onFinish: (data: any) => void }) {
  const [activeTab, setActiveTab] = useState('signup');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', city: 'Almaty', avatar: AVATARS[0] });

  return (
    <Card className="w-full glass border-white/10 overflow-hidden amber-glow rounded-[40px]">
      <CardContent className="p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-headline font-black italic uppercase tracking-tighter text-primary leading-none">MIND TACTICS</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">IDENTITY INITIALIZATION</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 h-12 glass border-white/10 rounded-2xl mb-8 p-1">
            <TabsTrigger value="signup" className="rounded-xl font-black italic uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-background">SIGN UP</TabsTrigger>
            <TabsTrigger value="signin" className="rounded-xl font-black italic uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-background">SIGN IN</TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Codename</label>
              <Input placeholder="Nickname" className="h-11 glass border-white/10 rounded-xl" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Secure Email</label>
              <Input type="email" placeholder="Email" className="h-11 glass border-white/10 rounded-xl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Password</label>
                  <Input type="password" placeholder="••••" className="h-11 glass border-white/10 rounded-xl" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">City</label>
                  <Select value={formData.city} onValueChange={(v) => setFormData({...formData, city: v})}>
                     <SelectTrigger className="h-11 glass border-white/10 rounded-xl font-bold uppercase text-[10px] italic">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent className="glass border-white/10">
                        {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                     </SelectContent>
                  </Select>
               </div>
            </div>

            <div className="space-y-4 pt-2">
              <label className="text-[9px] font-black uppercase text-center block text-muted-foreground">Identity Signature (Avatar)</label>
              <div className="flex justify-center gap-3">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setFormData({...formData, avatar: av})}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all w-12 h-12 ${
                      formData.avatar === av ? 'border-primary ring-2 ring-primary/50' : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <img src={av} alt="Avatar" className="w-full h-full" />
                  </button>
                ))}
              </div>
            </div>

            <Button 
              onClick={() => onFinish({ ...formData, xp: 0, streak: 0, elo: 1200 })}
              disabled={!formData.name || !formData.email || !formData.password}
              className="w-full h-14 bg-primary text-background font-black text-lg rounded-2xl italic mt-4"
            >
              FINALIZE IDENTITY <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </TabsContent>

          <TabsContent value="signin" className="space-y-6">
             <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Email</label>
                  <Input placeholder="Email" className="h-12 glass border-white/10 rounded-xl" />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Password</label>
                  <Input type="password" placeholder="••••••••" className="h-12 glass border-white/10 rounded-xl" />
               </div>
             </div>
             <Button className="w-full h-14 glass hover:bg-white/5 font-black uppercase italic rounded-2xl text-primary border-primary/20">
                RECONNECT TO GRID
             </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Footer() {
  return (
    <footer className="w-full max-w-7xl mx-auto mt-auto py-12 text-center border-t border-white/5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-black italic">
        Mind Tactics: Elite Checkers System © 2026 • Designed & Developed by TEMIRLAN ZHUNUSSOV. All rights reserved.
      </p>
    </footer>
  );
}
