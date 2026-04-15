export interface ChatTheme {
  id: string;
  name: string;
  topBar: { bg: string; text: string; textDim: string; border: string; dotColor: string };
  chatArea: { bg: string; shadow: string };
  userCard: { bg: string; border: string; text: string; timeDim: string };
  userAvatar: { bg: string; text: string };
  botCard: { bg: string; border: string; text: string };
  botAvatar: { bg: string; text: string };
  input: { bg: string; border: string; text: string; placeholder: string; buttonBg: string; buttonText: string };
  tags: { bg: string; border: string; text: string; hoverBg: string; hoverBorder: string; hoverText: string };
  actions: { color: string; hoverColor: string };
  sidebar: { bg: string; headerBg: string; text: string; textDim: string; border: string; activeBg: string; hoverBg: string; newChatBg: string; newChatText: string };
  landing: { bg: string; gradientTo: string; badgeBg: string; badgeText: string; badgeBorder: string };
}

const theme: ChatTheme = {
  id: "lavender",
  name: "Lavender",
  topBar: { bg: "#ECEEF1", text: "#1A1E2E", textDim: "#868E96", border: "#E2E5E9", dotColor: "#22C55E" },
  chatArea: { bg: "#F1F5F9", shadow: "none" },
  userCard: { bg: "#EDE9FE", border: "#DDD6FE", text: "#3B0764", timeDim: "#A78BFA" },
  userAvatar: { bg: "#7C3AED", text: "#fff" },
  botCard: { bg: "#FEFCEC", border: "#FEF099", text: "#3F3F00" },
  botAvatar: { bg: "#F59E0B", text: "#fff" },
  input: { bg: "#FFFFFF", border: "#E2E5E9", text: "#1A1E2E", placeholder: "#ADB5BD", buttonBg: "#008555", buttonText: "#fff" },
  tags: { bg: "#F5F3FF", border: "#DDD6FE", text: "#1A1E2E", hoverBg: "#EDE9FE", hoverBorder: "#A78BFA", hoverText: "#1A1E2E" },
  actions: { color: "#868E96", hoverColor: "#495057" },
  sidebar: { bg: "#FFFFFF", headerBg: "#FFFFFF", text: "#1A1E2E", textDim: "#868E96", border: "#E9ECEF", activeBg: "#F0F2F5", hoverBg: "#F8F9FA", newChatBg: "#1A1E2E", newChatText: "#FFFFFF" },
  landing: { bg: "#F8FAFB", gradientTo: "#FFFFFF", badgeBg: "#E6F4EF", badgeText: "#008555", badgeBorder: "#B3D9CC" },
};

export default theme;
