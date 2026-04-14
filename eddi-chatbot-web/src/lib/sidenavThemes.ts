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
    newChatBg: "#3B82F6",
    newChatText: "#FFFFFF",
    newChatHoverBg: "#2563EB",
    searchBg: "#252A3A",
    searchBorder: "#2D3348",
    userCardBg: "#252A3A",
    footerBorder: "#2D3348",
    logoBg: "#2D3348",
    logoText: "#3B82F6",
  },
  {
    id: "glass",
    name: "Frosted Glass",
    bg: "#F7F8FC",
    headerBg: "#F7F8FC",
    headerBorder: "transparent",
    text: "#1A1E2E",
    textDim: "#9CA3AF",
    border: "rgba(0,0,0,0.06)",
    activeBg: "#FFFFFF",
    activeBorder: "#DDD6FE",
    activeText: "#7C3AED",
    hoverBg: "rgba(255,255,255,0.7)",
    newChatBg: "#7C3AED",
    newChatText: "#FFFFFF",
    newChatHoverBg: "#6D28D9",
    searchBg: "rgba(255,255,255,0.6)",
    searchBorder: "rgba(0,0,0,0.06)",
    userCardBg: "rgba(255,255,255,0.6)",
    footerBorder: "rgba(0,0,0,0.06)",
    logoBg: "#EDE9FE",
    logoText: "#7C3AED",
  },
  {
    id: "warm",
    name: "Warm Sand",
    bg: "#FAF8F5",
    headerBg: "#FAF8F5",
    headerBorder: "#EDE8E0",
    text: "#292524",
    textDim: "#A8A29E",
    border: "#EDE8E0",
    activeBg: "#FFF7ED",
    activeBorder: "#FED7AA",
    activeText: "#B45309",
    hoverBg: "#F5F0E8",
    newChatBg: "#B45309",
    newChatText: "#FFFFFF",
    newChatHoverBg: "#92400E",
    searchBg: "#F5F0E8",
    searchBorder: "#EDE8E0",
    userCardBg: "#F5F0E8",
    footerBorder: "#EDE8E0",
    logoBg: "#FEF3C7",
    logoText: "#B45309",
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    bg: "#0F172A",
    headerBg: "#0F172A",
    headerBorder: "#1E293B",
    text: "#F1F5F9",
    textDim: "#94A3B8",
    border: "#1E293B",
    activeBg: "#1E293B",
    activeBorder: "#0EA5E9",
    activeText: "#7DD3FC",
    hoverBg: "#162033",
    newChatBg: "#0EA5E9",
    newChatText: "#FFFFFF",
    newChatHoverBg: "#0284C7",
    searchBg: "#1E293B",
    searchBorder: "#1E293B",
    userCardBg: "#1E293B",
    footerBorder: "#1E293B",
    logoBg: "#164E63",
    logoText: "#22D3EE",
  },
];

export function getSidenavDesign(id: string): SidenavDesign {
  return SIDENAV_DESIGNS.find((d) => d.id === id) || SIDENAV_DESIGNS[0];
}
