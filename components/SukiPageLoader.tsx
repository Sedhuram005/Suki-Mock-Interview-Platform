import Image from "next/image";

export default function SukiPageLoader({
  caption = "Loading",
}: {
  caption?: string;
}) {
  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-white/20 px-6 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
        <Image
          src="/suki-loader-symbol.png"
          alt="Suki"
          width={517}
          height={483}
          priority
          className="suki-loader-symbol block h-full w-full object-contain"
        />
      </div>
      <p className="mt-6 text-sm font-semibold tracking-[0.22em] text-slate-600 uppercase">
        {caption}
      </p>
      <div className="suki-loader-progress-track mt-5 h-1.5 w-36 overflow-hidden rounded-full bg-blue-100" aria-hidden="true">
        <span className="suki-loader-progress block h-full w-2/5 rounded-full bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-700" />
      </div>
    </div>
  );
}
