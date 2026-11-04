import { useState } from "react";
import { Navigate } from "react-router-dom";
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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 2. Access the login and signup functions from your Global Manager
  const { login, signup, session } = useAppContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isSignUp) {
        // Calls the Supabase signup logic from AppContext
        await signup(email, password, name);
      } else {
        // Calls the Supabase login logic from AppContext
        await login(email, password);
      }
      // The redirect below takes over as soon as there is a session
    } catch (error) {
      setError(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (session) return <Navigate to="/wardrobe" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tighter">Style Matrix</CardTitle>
          <CardDescription>
            {isSignUp ? "Create your account" : "Sign in to your wardrobe"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

            <Button type="submit" size="lg" disabled={submitting} className="w-full h-11">
              {submitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "New to Style Matrix?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              {isSignUp ? "Sign in" : "Create account"}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
