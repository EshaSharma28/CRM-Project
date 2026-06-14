import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Lock, Mail, Sparkles, Coffee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Bean as CoffeeBean, SolidBean, PourOver } from "../components/CoffeeDoodles";

const FrenchPress = ({ className }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Plunger rod & knob */}
    <path d="M50 15v15M45 15h10" />
    <circle cx="50" cy="12" r="3" fill="currentColor" />
    {/* Lid */}
    <path d="M30 30h40" strokeWidth="2" />
    {/* Body */}
    <rect x="35" y="30" width="30" height="45" rx="3" fill="currentColor" fillOpacity="0.08" />
    <path d="M35 30v42a8 8 0 008 8h14a8 8 0 008-8V30" strokeWidth="1.5" />
    {/* Handle */}
    <path d="M65 40h6a8 8 0 010 16h-6" strokeWidth="1.5" />
    {/* Coffee fill */}
    <rect x="37" y="50" width="26" height="22" rx="2" fill="currentColor" fillOpacity="0.15" />
    {/* Base */}
    <path d="M32 80h36" strokeWidth="2" />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState("marketer@brewhaus.coffee");
  const [password, setPassword] = useState("brewhaus");
  const [error, setError] = useState("");
  const [isSpilling, setIsSpilling] = useState(false);
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const formRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (login(email, password)) {
      setIsSpilling(true);
      await new Promise(r => setTimeout(r, 1200));
      navigate("/", { state: { fromLogin: true } });
    } else {
      setError("Invalid credentials. Try the demo login.");
    }
  };

  return (
    <div className="flex min-h-screen font-sans">
      
      {/* Spill Overlay - Gooey Physics */}
      <AnimatePresence>
        {isSpilling && (
          <>
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <filter id="goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" result="goo" />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
            </svg>

            <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden" style={{ filter: "url(#goo)" }}>
              {/* Base cover to ensure no gaps */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.8 }}
                className="absolute inset-0 bg-[#3E2723]"
              />

              {/* Main expanding blob */}
              <motion.div 
                initial={{ scale: 0, x: "-50%", y: "-50%" }}
                animate={{ scale: 150 }}
                transition={{ duration: 1.2, ease: "circIn" }}
                style={{ left: btnPos.x, top: btnPos.y, borderRadius: "50%" }}
                className="absolute w-24 h-24 bg-[#3E2723]"
              />

              {/* Splash Particles */}
              {Array.from({ length: 40 }).map((_, i) => {
                const targetX = btnPos.x + (Math.random() - 0.5) * window.innerWidth * 1.5;
                const targetY = window.innerHeight + 200;
                const size = 30 + Math.random() * 80;
                return (
                  <motion.div
                    key={i}
                    initial={{ x: btnPos.x, y: btnPos.y, scale: 0 }}
                    animate={{ x: targetX, y: targetY, scale: [0, 1, 0.5] }}
                    transition={{
                      x: { duration: 1.2 + Math.random() * 0.5, ease: "easeOut" },
                      y: { duration: 1.2 + Math.random() * 0.5, ease: "easeIn" },
                      scale: { duration: 1.2 + Math.random() * 0.5 }
                    }}
                    className="absolute rounded-full bg-[#3E2723]"
                    style={{ width: size, height: size, left: -size/2, top: -size/2 }}
                  />
                );
              })}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Left Panel: Brand Side */}
      <div className="hidden lg:flex w-1/2 bg-[#F0EBE1] relative overflow-hidden flex-col justify-between p-16">
        
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
            {/* Thick Cream Wave */}
            <path 
              d="M -100 500 C 200 400, 400 600, 700 450 C 900 350, 1100 400, 1100 400 L 1100 600 C 900 700, 700 600, 400 700 C 100 800, -100 700, -100 700 Z" 
              fill="#F4F0E6" 
              opacity="0.6"
            />
            {/* Second lighter wave */}
            <path 
              d="M -100 400 C 300 200, 600 700, 1100 300 L 1100 1000 L -100 1000 Z" 
              fill="#EFEADF" 
              opacity="0.4"
            />
            
            {/* Thin Solid Lines */}
            <path 
              d="M -50 150 C 300 100, 600 500, 1050 0" 
              fill="none" 
              stroke="#3E2723" 
              strokeWidth="1" 
              opacity="0.1"
            />
            <path 
              d="M -50 600 C 200 450, 400 850, 1050 650" 
              fill="none" 
              stroke="#3E2723" 
              strokeWidth="1" 
              opacity="0.1"
            />
            
            {/* Looping Dashed Line */}
            <path 
              d="M -50 800 C 100 900, 300 950, 250 750 C 200 550, -50 700, 150 850 C 350 1000, 700 800, 1050 900" 
              fill="none" 
              stroke="#3E2723" 
              strokeWidth="1.5" 
              strokeDasharray="8 8" 
              opacity="0.15"
            />
          </svg>

          {/* Floating Coffee Beans - bigger sizes */}
          <motion.div animate={{ y: [-8, 8, -8], rotate: [15, 25, 15] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[22%] left-[10%] text-[#B5A593] opacity-60">
            <SolidBean className="w-10 h-10" />
          </motion.div>
          <motion.div animate={{ y: [10, -10, 10], rotate: [-40, -30, -40] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[38%] left-[5%] text-[#C9BAA9] opacity-70">
            <SolidBean className="w-14 h-14" />
          </motion.div>
          <motion.div animate={{ y: [-5, 5, -5], rotate: [-10, 0, -10] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[40%] right-[12%] text-[#B5A593] opacity-50">
            <SolidBean className="w-8 h-8" />
          </motion.div>
          <motion.div animate={{ y: [8, -8, 8], rotate: [30, 45, 30] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[20%] right-[20%] text-[#C2B29F] opacity-80">
            <SolidBean className="w-12 h-12" />
          </motion.div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center h-full pt-12">
          {/* Logo Placeholder */}
          <div className="mb-12 text-[#3E2723] flex flex-col items-center">
            <h2 className="text-2xl font-serif tracking-widest leading-tight font-bold">BREWHAUS</h2>
            <p className="text-[10px] tracking-[0.3em] mt-1 font-medium">COFFEE CO.</p>
          </div>

          <h1 className="text-[3.5rem] font-serif font-bold text-[#3E2723] leading-tight mb-16">
            Crafting connections,<br/>one cup at a time.
          </h1>

          <div className="flex-1 flex items-center justify-center">
            <FrenchPress className="w-32 h-32 text-[#3E2723] opacity-90" />
          </div>
          
          <p className="text-[15px] font-serif italic text-[#3E2723] mt-12 max-w-sm leading-relaxed opacity-90">
            "From estate to cup, we ensure every roast<br/>tells a story of craftsmanship and care."
          </p>
        </div>
      </div>

      {/* Right Panel: Form Side */}
      <div 
        className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-hidden"
        style={{ backgroundColor: '#FAFAFA', backgroundImage: 'radial-gradient(#E0E0E0 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        <div className="bg-white p-10 rounded-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] max-w-md w-full relative z-10">
          
          <div className="mb-8 text-[#3E2723]">
             <h2 className="text-xl font-serif tracking-widest leading-tight mb-1">BREWHAUS</h2>
             <p className="text-[8px] tracking-widest">COFFEE CO.</p>
          </div>

          <h2 className="text-3xl font-serif font-bold text-[#3E2723] mb-2">Welcome Back</h2>
          <p className="text-[#5D4037] text-sm mb-8">
            Log in to manage your specialty coffee workspace.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-[11px] font-bold text-[#5D4037] uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-[#8D6E63]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F5EEDB] border border-transparent rounded-lg pl-11 pr-4 py-3 text-[#3E2723] placeholder-[#8D6E63] focus:outline-none focus:border-[#3E2723]/30 transition-colors"
                  placeholder="marketer@brewhaus.coffee"
                  required
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-bold text-[#5D4037] uppercase tracking-wider">Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-[#8D6E63]" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F5EEDB] border border-transparent rounded-lg pl-11 pr-4 py-3 text-[#3E2723] placeholder-[#8D6E63] focus:outline-none focus:border-[#3E2723]/30 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#3E2723] hover:bg-[#2C1C19] text-[#F0EBE1] font-bold py-3.5 rounded-lg transition-colors mt-2 shadow-sm"
            >
              Sign In to Workspace
            </button>

          </form>

          {/* Try Brewhaus Copilot Banner */}
          <div className="mt-6 bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#4E6B52] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#3E2723] text-sm">Try Brewhaus Copilot</p>
              <p className="text-[10px] font-bold text-[#4E6B52] uppercase tracking-widest">Next-Gen Roastery Intelligence</p>
            </div>
          </div>

          {/* Demo Account Card */}
          <div className="mt-4 bg-[#FFF3E0]/60 border border-[#FFE0B2] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="font-bold text-[#3E2723] text-sm">Demo Account</p>
            </div>
            <div className="space-y-1.5 pl-8">
              <p className="text-sm text-[#5D4037]">
                Email: <code className="bg-white/80 px-2 py-0.5 rounded text-[#3E2723] text-xs font-mono border border-[#FFE0B2]">marker@brewhaus.coffee</code>
              </p>
              <p className="text-sm text-[#5D4037]">
                Pass: <code className="bg-white/80 px-2 py-0.5 rounded text-[#3E2723] text-xs font-mono border border-[#FFE0B2]">brewhaus</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
