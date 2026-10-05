import SukiLoadingMark from "@/components/SukiLoadingMark";

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
      <SukiLoadingMark size={168} className="h-32 w-32 sm:h-36 sm:w-36" />
      <p className="mt-6 text-sm font-semibold tracking-[0.22em] text-slate-600 uppercase">
        {caption}
      </p>
    </div>
  );
}
