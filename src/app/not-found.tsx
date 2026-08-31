import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0d10] px-4 text-center text-zinc-100">
      <h1 className="text-2xl font-semibold tracking-tight">找不到这一页</h1>
      <p className="mt-3 text-sm text-zinc-400">地址可能写错了，或服务已经下架。</p>
      <div className="mt-8 flex gap-6 text-sm">
        <Link href="/products" className="text-[#93c5fd] underline">
          浏览目录
        </Link>
        <Link href="/" className="text-zinc-500 hover:text-zinc-200">
          回首页
        </Link>
      </div>
    </div>
  );
}
