import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
};

export default function SukiLoadingMark({ size = 20, className = "" }: Props) {
  return (
    <Image
      src="/suki-mark.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`suki-loader-mark shrink-0 object-contain ${className}`}
    />
  );
}
