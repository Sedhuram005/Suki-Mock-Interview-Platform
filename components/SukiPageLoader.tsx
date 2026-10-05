import Image from "next/image";

export default function SukiPageLoader({
  caption = "Loading",
}: {
  caption?: string;
}) {
  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-white/20 backdrop-blur-md px-6"
      role="status"
      aria-live="polite"
    >
      <Image
        src="/suki-logo-hq-transparent.png"
        alt="Suki Software Solutions"
        width={800}
        height={284}
        priority
        className="suki-loader-wordmark h-auto w-56 object-contain sm:w-64"
      />
      <p className="mt-6 text-sm font-semibold tracking-[0.22em] text-slate-600 uppercase">
        {caption}
      </p>
    </div>
  );
}
