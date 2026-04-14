export interface PanelHeaderDesign {
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
}

const panelHeaderDesign: PanelHeaderDesign = {
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
};

export default panelHeaderDesign;
