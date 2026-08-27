"use client";

import { FormEvent, ReactNode, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Hexagon, Lock, Mail, Moon, ShieldCheck, Sun, User } from "lucide-react";
import { ApiError, registerUser } from "@/lib/api-client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.416 2.06-1.25 2.86-.902.86-1.99 1.36-2.98 1.28-.113-1.11.42-2.13 1.25-2.94.87-.84 2.03-1.36 2.98-1.2ZM20.5 17.1c-.36.83-.79 1.6-1.29 2.31-.68.98-1.24 1.66-1.68 2.03-.68.62-1.41.94-2.2.96-.56.02-1.24-.16-2.03-.53-.79-.37-1.51-.55-2.17-.55-.69 0-1.43.18-2.23.55-.8.37-1.44.56-1.94.58-.75.03-1.5-.3-2.24-.99-.47-.4-1.06-1.11-1.76-2.13-.75-1.09-1.37-2.36-1.86-3.8-.53-1.56-.79-3.07-.79-4.53 0-1.67.36-3.11 1.08-4.32.57-.97 1.32-1.74 2.26-2.3.94-.56 1.96-.85 3.05-.87.6 0 1.38.19 2.36.56.98.37 1.6.56 1.87.56.2 0 .9-.22 2.08-.65 1.14-.4 2.1-.57 2.88-.5 2.13.17 3.73 1.01 4.79 2.53-1.9 1.15-2.85 2.77-2.83 4.85.02 1.62.6 2.97 1.75 4.03.52.5 1.1.88 1.75 1.15-.14.41-.29.8-.46 1.16Z" />
    </svg>
  );
}

function Field({
  label,
  icon,
  dark,
  children,
}: {
  label: string;
  icon: ReactNode;
  dark: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={`text-xs font-medium sm:text-sm ${dark ? "text-slate-200" : "text-slate-700"}`}>{label}</span>
      <div className="relative flex items-center">
        <span className={`pointer-events-none absolute left-3 ${dark ? "text-slate-500" : "text-slate-400"}`}>{icon}</span>
        {children}
      </div>
    </label>
  );
}

export default function SignupPage() {
  const [dark, setDark] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await registerUser({ email, full_name: fullName, password });
      setSuccessMessage(response.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = `h-[clamp(2.1rem,5vh,2.5rem)] w-full rounded-lg border pl-10 pr-10 text-sm shadow-sm outline-none transition-colors focus:ring-2 ${
    dark
      ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/30"
      : "border-slate-200 bg-slate-50 text-navy-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20"
  }`;

  return (
    <div className={`flex h-[100dvh] w-full overflow-hidden ${dark ? "bg-slate-950" : "bg-white"}`}>
      {/* Left panel */}
      <div className="relative hidden w-[36%] flex-col justify-between overflow-hidden p-8 text-white lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/signup-fabric.png')" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,31,61,0.55) 0%, rgba(15,31,61,0.15) 35%, rgba(15,31,61,0.15) 65%, rgba(15,31,61,0.75) 100%)",
          }}
        />

        <div className="relative flex items-center gap-2">
          <Hexagon className="h-8 w-8" strokeWidth={2.5} />
          <div>
            <p className="text-sm font-bold tracking-wide">BUSINESS ERP</p>
            <p className="text-xs text-slate-200">Intelligent Business Management</p>
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Secure. Smart. Connected.</p>
            <p className="text-xs text-slate-200">All your business operations in one place.</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div
        className={`relative flex w-full flex-col justify-center overflow-y-auto px-[clamp(1rem,4vw,3rem)] py-[clamp(0.75rem,3vh,2rem)] lg:w-[64%] ${dark ? "text-slate-100" : "text-navy-900"}`}
      >
        <button
          type="button"
          onClick={() => setDark((v) => !v)}
          className={`absolute right-4 top-4 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
            dark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          Theme
        </button>

        <div
          className={`mx-auto w-full max-w-xl rounded-2xl border p-[clamp(1.25rem,4vh,2.5rem)] shadow-sm ${
            dark ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/60"
          }`}
        >
          {successMessage ? (
            <div className="flex flex-col items-start gap-4">
              <span className={`flex h-12 w-12 items-center justify-center rounded-full ${dark ? "bg-emerald-500/20" : "bg-emerald-50"}`}>
                <ShieldCheck className="h-6 w-6 text-emerald-500" />
              </span>
              <h1 className="text-2xl font-bold">Account created</h1>
              <p className={dark ? "text-slate-300" : "text-slate-600"}>{successMessage}</p>
              <Link
                href="/login"
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-navy-900 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Back to Sign in
              </Link>
            </div>
          ) : (
            <>
              <p className={`text-xs font-semibold tracking-widest ${dark ? "text-indigo-400" : "text-indigo-600"}`}>GET STARTED</p>
              <h1 className="mt-[clamp(0.25rem,1vh,0.5rem)] text-[clamp(1.15rem,4vh,1.9rem)] font-bold leading-tight">
                Create your <span className="text-indigo-600">ERP</span> Dashboard account
              </h1>
              <p className={`mt-[clamp(0.25rem,1vh,0.5rem)] text-xs sm:text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                Set up your account to request access
              </p>

              <form onSubmit={handleSubmit} className="mt-[clamp(0.5rem,2.5vh,1.5rem)] flex flex-col gap-[clamp(0.4rem,1.6vh,0.75rem)]">
                <div className="grid grid-cols-1 gap-[clamp(0.4rem,1.6vh,0.75rem)] sm:grid-cols-2 sm:gap-3">
                  <Field label="Full Name" icon={<User className="h-4 w-4" />} dark={dark}>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Enter your full name"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Email" icon={<Mail className="h-4 w-4" />} dark={dark}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Password" icon={<Lock className="h-4 w-4" />} dark={dark}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Create a password"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className={`absolute right-3 ${dark ? "text-slate-500" : "text-slate-400"}`}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </Field>

                  <Field label="Confirm Password" icon={<Lock className="h-4 w-4" />} dark={dark}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Re-enter your password"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className={`absolute right-3 ${dark ? "text-slate-500" : "text-slate-400"}`}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </Field>
                </div>

                {error ? <p className="text-sm text-red-500">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 flex h-[clamp(2.1rem,5vh,2.5rem)] items-center justify-center rounded-lg bg-gradient-to-r from-navy-900 to-indigo-600 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                >
                  {isSubmitting ? "Creating account..." : "Sign Up"}
                </button>
              </form>

              <div className="my-[clamp(0.5rem,2vh,1rem)] flex items-center gap-3">
                <div className={`h-px flex-1 ${dark ? "bg-slate-700" : "bg-slate-200"}`} />
                <span className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>or continue with</span>
                <div className={`h-px flex-1 ${dark ? "bg-slate-700" : "bg-slate-200"}`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSocialNotice("Google sign-up isn't available yet — please use your email.")}
                  className={`flex h-[clamp(1.9rem,4.4vh,2.25rem)] items-center justify-center gap-2 rounded-lg border text-sm font-medium ${
                    dark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <GoogleIcon /> Google
                </button>
                <button
                  type="button"
                  onClick={() => setSocialNotice("Apple sign-up isn't available yet — please use your email.")}
                  className={`flex h-[clamp(1.9rem,4.4vh,2.25rem)] items-center justify-center gap-2 rounded-lg border text-sm font-medium ${
                    dark ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <AppleIcon /> Apple
                </button>
              </div>
              {socialNotice ? <p className={`mt-2 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{socialNotice}</p> : null}

              <p className={`mt-[clamp(0.5rem,2vh,1rem)] text-center text-xs sm:text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-indigo-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
