/** Shared settings affordance, with teeth and a centre hole. */
export function GearIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 2h4l.6 2.8 1.9 1.1 2.7-.9 2 3.5-2.1 1.9v2.2l2.1 1.9-2 3.5-2.7-.9-1.9 1.1L14 21h-4l-.6-2.8-1.9-1.1-2.7.9-2-3.5 2.1-1.9v-2.2L2.8 8.5l2-3.5 2.7.9 1.9-1.1L10 2Z" />
    <circle cx="12" cy="11.5" r="3.1" />
  </svg>;
}
