import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Coffee } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("marketer@brewhaus.coffee");
  const [password, setPassword] = useState("brewhaus");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate("/");
    } else {
      setError("Invalid credentials. Try the demo login.");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side: Hero Image & Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-mocha-dark overflow-hidden items-center justify-center">
        {/* We use an elegant abstract gradient/coffee colored background if no image is available */}
        <div className="absolute inset-0 bg-gradient-to-br from-mocha to-mocha-dark opacity-90 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center mix-blend-overlay opacity-50 z-0"></div>
        
        <div className="relative z-10 p-16 text-surface-white max-w-xl">
          <div className="text-caramel bg-caramel/20 p-4 rounded-2xl inline-block mb-8 backdrop-blur-sm">
            <Coffee className="w-12 h-12" />
          </div>
          <h1 className="text-5xl font-serif font-bold mb-6 leading-tight">
            Crafting connections, one cup at a time.
          </h1>
          <p className="text-lg text-surface-white/80 font-sans">
            AI-native shopper engagement for specialty coffee brands. Understand your audience, launch tailored campaigns, and grow your community seamlessly.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface">
        <div className="max-w-md w-full">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-serif font-bold text-mocha-dark mb-2">Welcome Back</h2>
            <p className="text-text/70">Sign in to your Brewhaus workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-error/10 text-error p-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-mocha mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@brewhaus.coffee"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-mocha mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="w-full btn-primary py-3 mt-4 text-base">
              Sign In
            </button>
            
            <div className="mt-6 text-center text-sm text-text/50">
              <p>Demo Login: <span className="font-mono text-caramel">marketer@brewhaus.coffee</span> / <span className="font-mono text-caramel">brewhaus</span></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
