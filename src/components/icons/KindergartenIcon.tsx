export function KindergartenIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 48 48"
      className={className}
      fill="none"
    >
      {/* House outline */}
      <path
        d="M24 4L6 18v10a4 4 0 0 0 4 4h4v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8h4a4 4 0 0 0 4-4V18L24 4Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Roof chimney */}
      <path
        d="M36 10v6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Eyes */}
      <circle cx="20" cy="17" r="1.5" fill="currentColor" />
      <circle cx="28" cy="17" r="1.5" fill="currentColor" />
      {/* Smile */}
      <path
        d="M21 20.5c0 0 1.5 2 3 2s3-2 3-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Heart */}
      <path
        d="M24 38c-1-1-8-5.5-8-10a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 4.5-7 9-8 10Z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}
