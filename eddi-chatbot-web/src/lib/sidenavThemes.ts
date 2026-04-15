export interface SidenavDesign {
  id: string;
  name: string;
  bg: string;
  headerBg: string;
  headerBorder: string;
  text: string;
  textDim: string;
  border: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  hoverBg: string;
  newChatBg: string;
  newChatText: string;
  newChatHoverBg: string;
  searchBg: string;
  searchBorder: string;
  userCardBg: string;
  footerBorder: string;
  logoBg: string;
  logoText: string;
}

export const SIDENAV_DESIGN: SidenavDesign = {
  id: "dark",
  name: "Dark Slate",
  bg: "#1A1E2E",
  headerBg: "#1A1E2E",
  headerBorder: "#2D3348",
  text: "#E2E5E9",
  textDim: "#9CA3AF",
  border: "#2D3348",
  activeBg: "#2D3348",
  activeBorder: "#3B82F6",
  activeText: "#FFFFFF",
  hoverBg: "#252A3A",
  newChatBg: "#10B981",
  newChatText: "#FFFFFF",
  newChatHoverBg: "#059669",
  searchBg: "#252A3A",
  searchBorder: "#2D3348",
  userCardBg: "#252A3A",
  footerBorder: "#2D3348",
  logoBg: "#2D3348",
  logoText: "#3B82F6",
};

export const SIDENAV_DESIGNS: SidenavDesign[] = [SIDENAV_DESIGN];

export function getSidenavDesign(_id?: string): SidenavDesign {
  return SIDENAV_DESIGN;
}
