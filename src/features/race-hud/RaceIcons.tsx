// Line icons for the race screens (M1-7), in place of emoji. Emoji draw in
// the platform's own colours and sizes (Apple, Android and Windows differ), a
// screen reader reads them out ("trophy", "first place medal") in the middle
// of the label, and they ignore the light and dark theme. These are inline
// SVG: no external asset (CSP), currentColor, hidden from assistive tech, so
// the visible text next to them stays the accessible name.

import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number | string };

function Icon({ size = "1em", children, ...rest }: IconProps & { children: ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>{children}</svg>;
}

/** Watch the race again. */
export const ReplayIcon = (p: IconProps) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M10 9l5 3-5 3z" /></Icon>;
/** A record or the leaderboard. */
export const TrophyIcon = (p: IconProps) => <Icon {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4M8 20h8M9 17h6" /></Icon>;
/** A free race: the finish flag. */
export const FlagIcon = (p: IconProps) => <Icon {...p}><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></Icon>;
/** A mission: a target. */
export const TargetIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></Icon>;
/** Done, saved, passed. */
export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>;
/** Failed or needs attention. */
export const AlertIcon = (p: IconProps) => <Icon {...p}><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17.5v.01" /></Icon>;
/** Share a link. */
export const ShareIcon = (p: IconProps) => <Icon {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Icon>;
/** A hint or a fix. */
export const HintIcon = (p: IconProps) => <Icon {...p}><path d="M9 18h6M10 21h4" /><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-.9.7-1.5 1.6-1.5 2.5h-4c0-.9-.6-1.8-1.5-2.5z" /></Icon>;
/** Switch the race or replay camera (M2-1, M4-3). */
export const CameraIcon = (p: IconProps) => <Icon {...p}><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><circle cx="12" cy="13.5" r="3.2" /></Icon>;
/** F3 big map: zoom in, zoom out, close, and the expand mark on the corner map. */
export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const MinusIcon = (p: IconProps) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const ExpandIcon = (p: IconProps) => <Icon {...p}><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></Icon>;
/** The coach's course advice. */
export const CompassIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></Icon>;

/** Place 1, 2 or 3 as a medal with its number; the number is the content, the
 * ring only marks the podium. Pass the localized place as the label. */
export function MedalIcon({ place, label, size = 24 }: { place: 1 | 2 | 3; label: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} data-medal={place}>
    <path d="M8 2l2.5 6M16 2l-2.5 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
    <circle cx="12" cy="15" r="7" fill="none" stroke="currentColor" strokeWidth={2} />
    <text x="12" y="19" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">{place}</text>
  </svg>;
}
