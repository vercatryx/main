import React from "react";
import {logoPath} from "@/components/logoPath";

export default function LogoWineFill({
                                         width = 300,
                                         height = 240,
                                         duration = 8,
                                         hold = 0.04,
                                         easing = "ease-in-out",
                                         color = "#DC2626",         // ← red fill color
                                         baseColor = "#e6e6e6",     // ← background fill color
                                         outlineColor = "#ffffff",  // ← stroke outline
                                         strokeWidth = 6,
                                         className = ""
                                     }) {
    const fillFraction = (1 - hold) / 2;
    const fillEndPct = Math.round(fillFraction * 100);
    const holdEndPct = Math.round((fillFraction + hold) * 100);

    const uid = React.useMemo(() => Math.random().toString(36).slice(2, 9), []);
    const clipId = `logoClip-${uid}`;

    const style = `
    .logo-root { display:inline-block; line-height:0 }

    .logo-base { fill:${baseColor}; stroke:none }
    .logo-red { fill:${color}; stroke:none }
    .logo-outline { fill:none; stroke:${outlineColor}; stroke-width:${strokeWidth};
                    stroke-linejoin:round; stroke-linecap:round }

    .logo-clip-rect {
      transform-origin: 50% 100%;
      transform-box: fill-box;
      transform: scaleY(0);
      animation: logoFill ${duration}s ${easing} infinite;
      will-change: transform;
    }

    @keyframes logoFill {
      0%   { transform: scaleY(0); }
      ${fillEndPct}% { transform: scaleY(1); }
      ${holdEndPct}% { transform: scaleY(1); }
      100% { transform: scaleY(0); }
    }
  `;

    // --- Your full SVG PATH ---
    const pathD = logoPath;

    return (
        <div className={`logo-root ${className}`} style={{ width }}>
            <style>{style}</style>

            <svg
                width={width}
                height={height}
                viewBox="55 117 340 268"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                        <rect
                            className="logo-clip-rect"
                            x="55"
                            y="117"
                            width="340"
                            height="268"
                        />
                    </clipPath>
                </defs>

                {/* background fill */}
                <path d={pathD} className="logo-base" />

                {/* animated red fill */}
                <g clipPath={`url(#${clipId})`}>
                    <path d={pathD} className="logo-red" />
                </g>

                {/* outline stroke on top */}
                <path d={pathD} className="logo-outline" />
            </svg>
        </div>
    );
}