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

export const SIDENAV_DESIGNS: SidenavDesign[] = [
  {
    id: "clean",
    name: "Clean White",
    bg: "#FFFFFF",
    headerBg: "#FFFFFF",
    headerBorder: "#F0F0F0",
    text: "#1A1E2E",
    textDim: "#868E96",
    border: "#F0F0F0",
    activeBg: "#F0FBF5",
    activeBorder: "#B3D9CC",
    activeText: "#008555",
    hoverBg: "#F8F9FA",
    newChatBg: "#008555",
    newChatText: "#FFFFFF",
    newChatHoverBg: "#006E47",
    searchBg: "#F8F9FA",
    searchBorder: "#ECEEF1",
    userCardBg: "#F8F9FA",
    footerBorder: "#F0F0F0",
    logoBg: "#E6F4EF",
    logoText: "#008555",
  },
  {
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
  },
];

export function getSidenavDesign(id: string): SidenavDesign {
  return SIDENAV_DESIGNS.find((d) => d.id === id) || SIDENAV_DESIGNS[0];
}
