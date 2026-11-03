import { useState } from "react";
import { useAppContext } from "@/context/AppContext"; // 1. Import the context hook
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 2. Access the login and signup functions from your Global Manager
  const { login, signup } = useAppContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        // Calls the Supabase signup logic from AppContext
        await signup(email, password, name);
        console.log("Registration successful");
      } else {
        // Calls the Supabase login logic from AppContext
        await login(email, password);
        console.log("Login successful");
      }
      // Note: Navigation to "/" is handled automatically inside AppContext.tsx
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      console.error("Auth error:", message);
      alert(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <Card className="w-full max-w-md border-0 bg-white shadow-2xl rounded-none">
        <CardHeader className="space-y-3 text-center pb-8 pt-12">
          <CardTitle className="font-serif text-3xl tracking-tight text-stone-900">
            STYLE MATRIX
          </CardTitle>
          <CardDescription className="text-stone-500 uppercase tracking-[0.2em] text-xs font-semibold">
            {isSignUp ? "Establish Your Identity" : "Access Your Wardrobe"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-none border-stone-300 focus-visible:ring-stone-800 focus-visible:ring-1 h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-none border-stone-300 focus-visible:ring-stone-800 focus-visible:ring-1 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-none border-stone-300 focus-visible:ring-stone-800 focus-visible:ring-1 h-11"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-none bg-stone-900 hover:bg-stone-800 text-white uppercase tracking-[0.15em] text-xs h-12 mt-2 transition-all"
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center pb-12 pt-4">
          <p className="text-[11px] text-stone-500 uppercase tracking-widest">
            {isSignUp ? "Already a member?" : "New to the matrix?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-bold text-stone-900 hover:text-stone-600 transition-colors ml-1"
            >
              {isSignUp ? "SIGN IN" : "CREATE ACCOUNT"}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}