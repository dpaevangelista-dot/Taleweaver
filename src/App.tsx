import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Shield, Map, Clock, User, Sparkles, Loader2, ChevronRight, 
  Volume2, VolumeX, Play, Film, Clapperboard, X, BarChart2, Brain, 
  Users, Zap, BookOpen, Compass, Home, Flame, Target, Trophy, Info, Heart
} from 'lucide-react';

const apiKey = process.env.GEMINI_API_KEY; // Provided by environment

// --- Evolution Configuration ---
const ATTRIBUTES = {
  athletics: { 
    verb: "Conquering", 
    icon: Flame, 
    color: "text-red-500", 
    bg: "bg-red-500/10",
    description: "Physical dominance and raw endurance." 
  },
  intellectual: { 
    verb: "Deciphering", 
    icon: Brain, 
    color: "text-blue-500", 
    bg: "bg-blue-500/10",
    description: "The power of logic and strategic wit." 
  },
  social: { 
    verb: "Commanding", 
    icon: Users, 
    color: "text-green-500", 
    bg: "bg-green-500/10",
    description: "Magnetic influence and diplomatic charisma." 
  },
  metaphysical: { 
    verb: "Transcending", 
    icon: Zap, 
    color: "text-purple-500", 
    bg: "bg-purple-500/10",
    description: "Connection to the spiritual or magical unknown." 
  },
  heart: {
    verb: "Enduring",
    icon: Heart,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    description: "Willpower and emotional challenges."
  }
};

const getAdjective = (level) => {
  const lv = Math.min(Math.max(level, 1), 10);
  const grades = [
    "", "Feeble", "Average", "Capable", "Impressive", "Elite", 
    "Exceptional", "Heroic", "Master", "Legendary", "Absolute"
  ];
  return grades[lv];
};

const getXPNeeded = (level) => level * 2; 

const CINEMATIC_QUOTES = [
  "May the Force be with you.",
  "I'll be back.",
  "Here's looking at you, kid.",
  "Houston, we have a problem.",
  "There's no place like home.",
  "To infinity and beyond!",
  "Why so serious?",
  "I see dead people.",
  "You can't handle the truth!",
  "Life finds a way.",
  "I am Iron Man.",
  "Roads? Where we're going we don't need roads.",
  "I love the smell of napalm in the morning.",
  "Fasten your seatbelts. It's going to be a bumpy night."
];

// --- Utility Functions ---
const pcmToWav = (pcmData, sampleRate) => {
  const buffer = new ArrayBuffer(44 + pcmData.byteLength);
  const view = new DataView(buffer);
  const writeString = (v, offset, str) => {
    for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.byteLength, true);
  const pcmView = new Int16Array(pcmData);
  for (let i = 0; i < pcmView.length; i++) view.setInt16(44 + i * 2, pcmView[i], true);
  return new Blob([buffer], { type: 'audio/wav' });
};

const base64ToArrayBuffer = (base64) => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
};

// --- API Implementation ---
const callGeminiAPI = async (contents, systemPrompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemPrompt }] } })
  });
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "FADE OUT.";
};

const generateNarration = async (text) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: `Narrate with blockbuster cinematic weight: ${text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } } }
    }
  };
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      const sampleRate = parseInt(part.inlineData.mimeType.match(/rate=(\d+)/)?.[1] || "24000", 10);
      return URL.createObjectURL(pcmToWav(base64ToArrayBuffer(part.inlineData.data), sampleRate));
    }
  } catch (e) { return null; }
};

const generateImage = async (prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
  try {
    const response = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ instances: { prompt }, parameters: { sampleCount: 1 } }) 
    });
    const result = await response.json();
    if (result.predictions?.[0]?.bytesBase64Encoded) return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
  } catch (e) { return null; }
};

export default function App() {
  const [gameState, setGameState] = useState('setup'); // setup, playing, portfolio
  const [character, setCharacter] = useState(() => {
    const saved = localStorage.getItem('screenplayer_character');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved character', e);
      }
    }
    return { 
      name: '', 
      background: 'Outcast', 
      timePeriod: 'Neon-Cyberpunk', 
      location: 'District Zero',
      attributes: { athletics: 1, intellectual: 1, social: 1, metaphysical: 1, heart: 1 },
      xp: { athletics: 0, intellectual: 0, social: 0, metaphysical: 0, heart: 0 },
      portrait: null
    };
  });

  useEffect(() => {
    localStorage.setItem('screenplayer_character', JSON.stringify(character));
  }, [character]);

  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState('');
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isLoading) {
      setLoadingQuote(CINEMATIC_QUOTES[Math.floor(Math.random() * CINEMATIC_QUOTES.length)]);
      interval = setInterval(() => {
        setLoadingQuote(CINEMATIC_QUOTES[Math.floor(Math.random() * CINEMATIC_QUOTES.length)]);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const getSystemPrompt = () => {
    const { attributes } = character;
    return `You are the Master Storyteller of the Screenplayer app, synthesizing Truby, Vogler, and McKee.
    
    HERO: ${character.name} (${character.background}).
    CAPACITIES (Action-Verb State):
    - Athletics: ${ATTRIBUTES.athletics.verb} ${getAdjective(attributes.athletics)} (${attributes.athletics}/10)
    - Intellectual: ${ATTRIBUTES.intellectual.verb} ${getAdjective(attributes.intellectual)} (${attributes.intellectual}/10)
    - Social: ${ATTRIBUTES.social.verb} ${getAdjective(attributes.social)} (${attributes.social}/10)
    - Metaphysical: ${ATTRIBUTES.metaphysical.verb} ${getAdjective(attributes.metaphysical)} (${attributes.metaphysical}/10)
    - Heart: ${ATTRIBUTES.heart.verb} ${getAdjective(attributes.heart)} (${attributes.heart}/10)
    WORLD: ${character.location}, ${character.timePeriod}.
    
    DIRECIVES:
    1. TRUBY: Test the hero's Moral Weakness.
    2. VOGLER: Frame scenes as stages of the Hero's Journey.
    3. MCKEE: Create a "Gap" and a "Value Shift" in every beat.
    
    FORMAT:
    - Exactly ONE paragraph of cinematic text.
    - End with a life-or-death choice.
    - MANDATORY: Tag the attribute trained by the user's action at the end: [TRAIN: ATHLETICS], [TRAIN: INTELLECTUAL], [TRAIN: SOCIAL], [TRAIN: METAPHYSICAL], or [TRAIN: HEART].`;
  };

  const generatePortrait = async (stats) => {
    let visualEffects = "";
    if (stats.athletics > 4) visualEffects += "powerful muscular build, battle-hardened, ";
    if (stats.metaphysical > 4) visualEffects += "glowing ethereal eyes, mystical aura, stardust fragments, ";
    if (stats.intellectual > 4) visualEffects += "sharp calculating gaze, analytical presence, holding an ancient device, ";
    if (stats.social > 4) visualEffects += "charismatic aura, noble posture, magnetic expression, ";
    if (stats.heart > 4) visualEffects += "radiant inner light, fierce determined eyes, unyielding stance, ";
    
    const prompt = `Cinematic 70mm film hero portrait, ${character.background} in ${character.timePeriod}. ${visualEffects} Chiaroscuro lighting, Vogler mythic style, masterpiece quality.`;
    const url = await generateImage(prompt);
    if (url) setCharacter(prev => ({ ...prev, portrait: url }));
  };

  const startGame = async () => {
    if (!character.name || !character.location) return;
    setGameState('playing');
    setIsLoading(true);
    
    if (!character.portrait) {
      const initialStats = { athletics: 1, intellectual: 1, social: 1, metaphysical: 1, heart: 1 };
      if (character.background === 'Outcast') initialStats.athletics = 2;
      if (character.background === 'Mentor') initialStats.intellectual = 2;
      if (character.background === 'Chosen One') initialStats.metaphysical = 2;
      
      setCharacter(prev => ({ ...prev, attributes: initialStats }));
      await generatePortrait(initialStats);
    }

    const text = await callGeminiAPI([{ role: 'user', parts: [{ text: "ACTION! The movie begins." }] }], getSystemPrompt());
    await processBeat(text, []);
    setIsLoading(false);
  };

  const processBeat = async (text, history) => {
    let trainedAttr = null;
    const cleanText = text.replace(/\[TRAIN: (\w+)\]/i, (match, attr) => {
      trainedAttr = attr.toLowerCase();
      return "";
    }).trim();

    if (trainedAttr && character.attributes[trainedAttr]) {
      updateStats(trainedAttr);
    }

    const [audioUrl, imageUrl] = await Promise.all([
      generateNarration(cleanText),
      generateImage(`Cinematic film still, masterwork. Scene: ${cleanText.substring(0, 200)}`)
    ]);

    const msg = { 
      role: 'model', 
      text: cleanText, 
      id: Date.now(), 
      audioUrl, 
      imageUrl,
      trained: trainedAttr
    };
    
    setChatHistory([...history, msg]);

    if (!isMuted && audioUrl) {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(audioUrl); 
      audioRef.current = audio; 
      audio.play().catch(() => {});
    }
  };

  const updateStats = (attr) => {
    setCharacter(prev => {
      const level = prev.attributes[attr];
      const newXP = prev.xp[attr] + 1;
      const needed = getXPNeeded(level);
      
      let nextLevel = level;
      let nextXP = newXP;

      if (nextXP >= needed && level < 10) {
        nextLevel += 1;
        nextXP = 0;
        setTimeout(() => generatePortrait({ ...prev.attributes, [attr]: nextLevel }), 500);
      }

      return {
        ...prev,
        attributes: { ...prev.attributes, [attr]: nextLevel },
        xp: { ...prev.xp, [attr]: nextXP }
      };
    });
  };

  const handleAction = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const userMsg = { role: 'user', text: inputText.trim(), id: Date.now() };
    const history = [...chatHistory, userMsg];
    setChatHistory(history);
    setInputText('');
    setIsLoading(true);

    try {
      const text = await callGeminiAPI(history.map(m => ({ role: m.role, parts: [{ text: m.text }] })), getSystemPrompt());
      await processBeat(text, history);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleReturnToMain = () => {
    setGameState('setup');
    setChatHistory([]);
  };

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans selection:bg-amber-500">
        <div className="max-w-xl w-full bg-zinc-900 rounded-[2.5rem] border border-white/5 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>
          <div className="text-center space-y-4">
            <div className="p-4 bg-amber-500 rounded-2xl w-fit mx-auto"><Clapperboard size={32} className="text-black" /></div>
            {/* Title scaled for small screens */}
            <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none">Screenplayer</h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.4em]">Cinematic Narrative Engine v8.1</p>
          </div>
          <div className="space-y-4 mt-8">
            <input value={character.name} onChange={e => setCharacter({...character, name: e.target.value})} placeholder="Protagonist Name" className="w-full bg-black border border-white/10 rounded-2xl p-5 outline-none focus:border-amber-500 font-bold" />
            <select value={character.background} onChange={e => setCharacter({...character, background: e.target.value})} className="w-full bg-black border border-white/10 rounded-2xl p-5 outline-none font-bold text-zinc-400">
              <option>Outcast</option><option>Chosen One</option><option>Reluctant Hero</option><option>Anti-Hero</option><option>Mentor</option>
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input value={character.timePeriod} onChange={e => setCharacter({...character, timePeriod: e.target.value})} placeholder="Time Period" className="bg-black border border-white/10 rounded-2xl p-5 outline-none focus:border-amber-500 font-bold" />
              <input value={character.location} onChange={e => setCharacter({...character, location: e.target.value})} placeholder="Location" className="bg-black border border-white/10 rounded-2xl p-5 outline-none focus:border-amber-500 font-bold" />
            </div>
            <button onClick={startGame} className="w-full bg-amber-500 text-black py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-white transition-all transform active:scale-95 shadow-lg text-lg">
              {character.portrait ? 'CONTINUE ACTION!' : 'ACTION!'}
            </button>
            {character.portrait && (
              <button 
                onClick={() => setCharacter({ name: '', background: 'Outcast', timePeriod: 'Neon-Cyberpunk', location: 'District Zero', attributes: { athletics: 1, intellectual: 1, social: 1, metaphysical: 1, heart: 1 }, xp: { athletics: 0, intellectual: 0, social: 0, metaphysical: 0, heart: 0 }, portrait: null })} 
                className="w-full text-xs text-zinc-500 hover:text-red-500 uppercase tracking-widest font-black transition-colors"
              >
                Reset Character Progress
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'portfolio') {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex flex-col">
        <header className="p-6 flex items-center justify-between border-b border-white/5">
          <button onClick={() => setGameState('playing')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
            <X size={24} className="group-hover:rotate-90 transition-transform" /> 
            <span className="text-xs font-black uppercase tracking-widest">Close Portfolio</span>
          </button>
          <span className="font-black italic uppercase text-amber-500 tracking-tighter">Protagonist Portfolio</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative group">
              <div className="aspect-[3/4] bg-zinc-950 rounded-[4rem] overflow-hidden shadow-2xl border border-white/10 relative">
                {character.portrait ? (
                  <img src={character.portrait} alt="Hero" className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={48} className="animate-spin text-amber-500/20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-800">Developing Hero...</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                <div className="absolute bottom-12 left-12">
                  <h2 className="text-5xl sm:text-6xl font-black italic uppercase tracking-tighter leading-none">{character.name}</h2>
                  <p className="text-amber-500 font-black uppercase tracking-[0.2em] text-sm mt-4 border-l-2 border-amber-500 pl-4">{character.background}</p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 p-4 sm:p-6 bg-amber-500 text-black rounded-full shadow-2xl transform rotate-12 font-black text-lg sm:text-xl italic uppercase">Level {Object.values(character.attributes).reduce((a,b) => a+b, 0)}</div>
            </div>

            <div className="space-y-10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600 mb-8 flex items-center gap-3">
                  <Trophy size={16} /> Characteristic Grading
                </h3>
                <div className="grid gap-6">
                  {Object.entries(ATTRIBUTES).map(([key, meta]) => {
                    const level = character.attributes[key];
                    const xp = character.xp[key];
                    const needed = getXPNeeded(level);
                    const progress = (xp / needed) * 100;
                    
                    return (
                      <div key={key} className="space-y-3">
                        <div className="flex items-end justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 ${meta.bg} rounded-2xl ${meta.color}`}><meta.icon size={24} /></div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{meta.label || key}</p>
                              <p className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase leading-none mt-1">
                                {meta.verb} <span className="text-white">{getAdjective(level)}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">{level}</span>
                            <span className="text-zinc-700 text-[10px] font-black ml-1 uppercase">/ 10</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div className={`h-full bg-amber-500 transition-all duration-1000 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]`} style={{ width: `${progress}%` }}></div>
                          </div>
                          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-600 px-1">
                            <span>Training Progress</span>
                            <span>{xp} / {needed} Script Actions</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-zinc-900/50 p-8 rounded-[3rem] border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5"><Info size={80} /></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <Target size={14} /> Production Rules
                </h4>
                <p className="text-zinc-400 text-xs leading-relaxed uppercase font-medium">
                  Your hero develops through <span className="text-white">Script Actions</span>. Reaching level 10 marks the absolute human limit.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-amber-500">
      <header className="border-b border-white/5 p-4 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-xl z-50 shadow-xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={handleReturnToMain} className="p-2 hover:bg-white/10 rounded-full transition-all text-zinc-500 hover:text-white" title="Return to Start"><Home size={20} /></button>
          <span className="font-black uppercase tracking-tighter text-lg sm:text-xl italic">Screenplayer</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setGameState('portfolio')} className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-zinc-800 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-lg">
            <BarChart2 size={16} /> <span className="hidden xs:inline">Portfolio</span>
          </button>
          <button onClick={() => setIsMuted(!isMuted)} className={`p-2 sm:p-2.5 rounded-xl transition-all ${isMuted ? 'text-zinc-600 bg-white/5' : 'text-amber-500 bg-amber-500/10'}`}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-12 pb-32">
        <div className="max-w-4xl mx-auto py-8">
          {chatHistory.map((msg, idx) => {
            const isModel = msg.role === 'model';
            return (
              <div key={msg.id || idx} className={`flex flex-col mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 ${isModel ? 'items-start' : 'items-end'}`}>
                <div className={`w-full max-w-[95%] sm:max-w-[85%] rounded-[3rem] overflow-hidden shadow-2xl border ${isModel ? 'bg-zinc-900 border-white/5' : 'bg-white border-white text-black'}`}>
                  {isModel && msg.imageUrl && (
                    <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                      <img src={msg.imageUrl} alt="Scene" className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60"></div>
                    </div>
                  )}
                  <div className="p-6 sm:p-12 relative">
                    {isModel && (
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3 px-3 py-1.5 bg-black/40 rounded-full border border-white/5">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Beat</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {msg.trained && (
                            <span className="text-[8px] font-black uppercase px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20 shadow-sm">
                              Training: {msg.trained}
                            </span>
                          )}
                          {msg.audioUrl && <button onClick={() => { const a = new Audio(msg.audioUrl); a.play(); }} className="p-2.5 bg-amber-500 rounded-2xl text-black shadow-lg hover:scale-110 transition-transform"><Play size={16} fill="currentColor" /></button>}
                        </div>
                      </div>
                    )}
                    <p className={`whitespace-pre-wrap leading-relaxed ${isModel ? 'font-serif text-lg sm:text-2xl text-zinc-100' : 'font-black text-lg italic sm:text-2xl'}`}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex flex-col items-center gap-3 bg-zinc-900/50 px-8 py-5 rounded-[2.5rem] border border-white/5 w-fit mx-auto animate-pulse shadow-2xl text-center">
              <div className="flex items-center gap-4">
                <Loader2 size={20} className="animate-spin text-amber-500" />
                <span className="text-xs font-black uppercase tracking-[0.5em] text-zinc-500 italic">Directing Scene...</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70 max-w-xs">"{loadingQuote}"</span>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-4 sm:p-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-40">
        <form onSubmit={handleAction} className="max-w-4xl mx-auto relative group pointer-events-auto">
          <input value={inputText} onChange={e => setInputText(e.target.value)} disabled={isLoading} placeholder="WRITE THE SCRIPT..." className="w-full bg-zinc-900 border-2 border-white/10 rounded-[2.5rem] py-5 sm:py-7 pl-6 sm:pl-10 pr-20 sm:pr-24 text-white font-black text-lg sm:text-xl focus:border-amber-500 transition-all outline-none shadow-2xl placeholder:text-zinc-800" />
          <button type="submit" disabled={isLoading || !inputText.trim()} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-4 sm:p-5 bg-amber-500 text-black rounded-3xl hover:bg-white transition-all transform active:scale-90 shadow-lg"><Send size={28} /></button>
        </form>
      </footer>
    </div>
  );
}
