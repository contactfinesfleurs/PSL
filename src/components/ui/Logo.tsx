type Props = {
  size?: number;
  className?: string;
};

export function Logo({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="6" fill="#1B3A6B" />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontFamily="Arial Black, Arial"
        fontWeight="900"
        fontSize="13"
        fill="white"
        stroke="white"
        strokeWidth="0.3"
      >
        PSL
      </text>
    </svg>
  );
}
