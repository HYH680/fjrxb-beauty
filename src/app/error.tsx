"use client";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0d10] px-4 text-center text-zinc-100">
      <h1 className="text-2xl font-semibold tracking-tight">这一页出了点问题</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
        可以再试一次。若一直如此，请稍后再来。
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-zinc-600">编号 {error.digest}</p>
      )}
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-8 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm text-white hover:bg-[#2563eb]"
      >
        再试一次
      </button>
    </div>
  );
}
