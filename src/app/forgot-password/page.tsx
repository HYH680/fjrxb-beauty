"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  KeyRound,
  Lock,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { AuthLayout, AUTH_BTN, AUTH_LINK } from "@/components/AuthLayout";

type Step = "email" | "verify" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState("");
  const [resetOpen, setResetOpen] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/auth/forgot-password")
      .then((res) => res.json())
      .then((data) => setResetOpen(Boolean(data.open)))
      .catch(() => setResetOpen(false));
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendCode = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败");
        return;
      }

      if (typeof data.devCode === "string" && data.devCode) {
        setDevCode(data.devCode);
        setCode(data.devCode);
      } else {
        setDevCode("");
      }

      setStep("verify");
      startCountdown();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "验证失败");
        return;
      }

      setResetToken(data.resetToken);
      setStep("reset");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "重置失败");
        return;
      }

      setStep("done");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["输入邮箱", "验证码", "新密码"];
  const stepIndex = step === "email" ? 0 : step === "verify" ? 1 : step === "reset" ? 2 : 3;

  const subtitles: Record<Step, string> = {
    email: "输入注册邮箱，我们将发送验证码",
    verify: "输入邮箱收到的 6 位验证码",
    reset: "设置你的新密码",
    done: "密码已成功重置",
  };

  if (resetOpen === false) {
    return (
      <AuthLayout title="找回密码" subtitle="邮件通道尚未开通">
        <p className="text-sm leading-6 text-zinc-400">
          当前未配置可用的发信通道，公开重置已关闭。请联系站点管理员处理账号密码。
        </p>
        <Link
          href="/login"
          className={`mt-6 inline-flex items-center gap-2 text-sm ${AUTH_LINK}`}
        >
          <ArrowLeft className="h-4 w-4" />
          返回登录
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="找回密码" subtitle={subtitles[step]}>
      {step !== "done" && (
        <div className="mb-6 flex items-center justify-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i <= stepIndex
                    ? "bg-pine text-white"
                    : "bg-stone-200 text-stone-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`hidden text-xs sm:inline ${
                  i <= stepIndex ? "text-ink" : "text-stone-400"
                }`}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <div
                  className={`h-px w-6 sm:w-10 ${
                    i < stepIndex ? "bg-pine" : "bg-line"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === "email" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
          className="space-y-5"
        >
          <div>
            <label className="mb-1.5 block text-sm text-stone-500">注册邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#12151c] text-zinc-100 py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-stone-400 focus:border-[#3b82f6]"
                placeholder="邮箱"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={AUTH_BTN}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            发送验证码
          </button>
        </form>
      )}

          {step === "verify" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyCode();
          }}
          className="space-y-5"
        >
          <div>
            <label className="mb-1.5 block text-sm text-stone-500">6 位验证码</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-white/10 bg-[#12151c] text-zinc-100 py-2.5 pl-10 pr-4 text-center font-mono text-lg tracking-[0.5em] outline-none placeholder:text-stone-400 focus:border-[#3b82f6]"
                placeholder="000000"
              />
            </div>
            <p className="mt-2 text-xs text-stone-400">
              验证码已发送至 {email}，15 分钟内有效
            </p>
            {devCode ? (
              <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                开发环境未配置发信，本次验证码：
                <span className="ml-1 font-mono text-sm tracking-widest text-amber-100">
                  {devCode}
                </span>
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className={AUTH_BTN}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            验证
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
              }}
              className="flex items-center gap-1 text-stone-500 hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              更换邮箱
            </button>
            <button
              type="button"
              disabled={countdown > 0 || loading}
              onClick={sendCode}
              className="text-pine hover:underline disabled:text-stone-400"
            >
              {countdown > 0 ? `${countdown}s 后重发` : "重新发送"}
            </button>
          </div>
        </form>
      )}

      {step === "reset" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resetPassword();
          }}
          className="space-y-5"
        >
          <div>
            <label className="mb-1.5 block text-sm text-stone-500">新密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#12151c] text-zinc-100 py-2.5 pl-10 pr-10 text-sm outline-none placeholder:text-stone-400 focus:border-[#3b82f6]"
                placeholder="至少 8 位，含字母和数字"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-zinc-300"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-stone-500">确认新密码</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#12151c] text-zinc-100 px-4 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-[#3b82f6]"
              placeholder="再次输入新密码"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={AUTH_BTN}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            确认修改密码
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="text-stone-600">你的密码已成功修改，请使用新密码登录。</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-full bg-pine py-3 text-sm text-white hover:bg-pine-dark"
          >
            前往登录
          </button>
        </div>
      )}

      {step !== "done" && (
        <p className="mt-6 text-center text-sm text-stone-400">
          <Link href="/login" className="text-pine hover:underline">
            返回登录
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
