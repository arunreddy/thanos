export interface PanelHeaderDesign {
  id: string;
  name: string;
  bg: string;
  titleColor: string;
  subtitleColor: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  actionBg: string;
  actionBorder: string;
  actionColor: string;
  actionHoverColor: string;
  closeColor: string;
  divider: boolean;
  dividerColor: string;
  shadow: string;
  rounded: boolean;
}

export const PANEL_HEADER_DESIGNS: PanelHeaderDesign[] = [
  {
    id: "minimal",
    name: "Minimal Clean",
    bg: "#ECEEF1",
    titleColor: "#1A1E2E",
    subtitleColor: "#868E96",
    iconBg: "#E6F4EF",
    iconColor: "#008555",
    badgeBg: "#E7F5FF",
    badgeColor: "#1971C2",
    badgeBorder: "#D0EBFF",
    actionBg: "#FFFFFF",
    actionBorder: "#DEE2E6",
    actionColor: "#495057",
    actionHoverColor: "#1A1E2E",
    closeColor: "#868E96",
    divider: false,
    dividerColor: "transparent",
    shadow: "none",
    rounded: false,
  },
  {
    id: "card",
    name: "Floating Card",
    bg: "#ECEEF1",
    titleColor: "#1A1E2E",
    subtitleColor: "#868E96",
    iconBg: "#E6F4EF",
    iconColor: "#008555",
    badgeBg: "#E7F5FF",
    badgeColor: "#1971C2",
    badgeBorder: "#D0EBFF",
    actionBg: "#F8F9FA",
    actionBorder: "#E2E5E9",
    actionColor: "#495057",
    actionHoverColor: "#1A1E2E",
    closeColor: "#868E96",
    divider: false,
    dividerColor: "transparent",
    shadow: "0 2px 8px rgba(0,0,0,0.06)",
    rounded: true,
  },
  {
    id: "dark",
    name: "Dark Header",
    bg: "#1A1E2E",
    titleColor: "#FFFFFF",
    subtitleColor: "#94A3B8",
    iconBg: "rgba(0,133,85,0.2)",
    iconColor: "#22C55E",
    badgeBg: "rgba(59,130,246,0.15)",
    badgeColor: "#60A5FA",
    badgeBorder: "rgba(59,130,246,0.25)",
    actionBg: "rgba(255,255,255,0.07)",
    actionBorder: "rgba(255,255,255,0.12)",
    actionColor: "rgba(255,255,255,0.6)",
    actionHoverColor: "#FFFFFF",
    closeColor: "rgba(255,255,255,0.4)",
    divider: false,
    dividerColor: "transparent",
    shadow: "0 2px 8px rgba(0,0,0,0.2)",
    rounded: false,
  },
  {
    id: "gradient",
    name: "Green Gradient",
    bg: "linear-gradient(135deg, #008555, #00A86B)",
    titleColor: "#FFFFFF",
    subtitleColor: "rgba(255,255,255,0.7)",
    iconBg: "rgba(255,255,255,0.2)",
    iconColor: "#FFFFFF",
    badgeBg: "rgba(255,255,255,0.15)",
    badgeColor: "#FFFFFF",
    badgeBorder: "rgba(255,255,255,0.25)",
    actionBg: "rgba(255,255,255,0.15)",
    actionBorder: "rgba(255,255,255,0.2)",
    actionColor: "rgba(255,255,255,0.8)",
    actionHoverColor: "#FFFFFF",
    closeColor: "rgba(255,255,255,0.6)",
    divider: false,
    dividerColor: "transparent",
    shadow: "none",
    rounded: false,
  },
  {
    id: "bordered",
    name: "Bottom Border",
    bg: "#FFFFFF",
    titleColor: "#1A1E2E",
    subtitleColor: "#868E96",
    iconBg: "#E6F4EF",
    iconColor: "#008555",
    badgeBg: "#E7F5FF",
    badgeColor: "#1971C2",
    badgeBorder: "#D0EBFF",
    actionBg: "#FFFFFF",
    actionBorder: "#DEE2E6",
    actionColor: "#495057",
    actionHoverColor: "#1A1E2E",
    closeColor: "#868E96",
    divider: true,
    dividerColor: "#008555",
    shadow: "none",
    rounded: false,
  },
  {
    id: "glass",
    name: "Frosted Glass",
    bg: "rgba(255,255,255,0.6)",
    titleColor: "#1A1E2E",
    subtitleColor: "#6B7280",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    badgeBg: "#F0FDFA",
    badgeColor: "#0D9488",
    badgeBorder: "#99F6E4",
    actionBg: "rgba(255,255,255,0.5)",
    actionBorder: "rgba(0,0,0,0.08)",
    actionColor: "#6B7280",
    actionHoverColor: "#1A1E2E",
    closeColor: "#9CA3AF",
    divider: false,
    dividerColor: "transparent",
    shadow: "0 1px 4px rgba(0,0,0,0.04)",
    rounded: false,
  },
];

export function getPanelHeaderDesign(id: string): PanelHeaderDesign {
  return PANEL_HEADER_DESIGNS.find((d) => d.id === id) || PANEL_HEADER_DESIGNS[0];
}
