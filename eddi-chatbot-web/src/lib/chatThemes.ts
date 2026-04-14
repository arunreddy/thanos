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
  id: "emerald",
  name: "Emerald",
  topBar: { bg: "#FFFFFF", text: "#1A1E2E", textDim: "#868E96", border: "#E2E5E9", dotColor: "#22C55E" },
  chatArea: { bg: "#ECEEF1", shadow: "inset 0 2px 6px rgba(0,0,0,0.06)" },
  userCard: { bg: "#FFFFFF", border: "#E2E5E9", text: "#1A1E2E", timeDim: "#ADB5BD" },
  userAvatar: { bg: "#7C3AED", text: "#fff" },
  botCard: { bg: "#FFFFFF", border: "#E2E5E9", text: "#1A1E2E" },
  botAvatar: { bg: "#008555", text: "#fff" },
  input: { bg: "#FFFFFF", border: "#E2E5E9", text: "#1A1E2E", placeholder: "#ADB5BD", buttonBg: "#008555", buttonText: "#fff" },
  tags: { bg: "#F8F9FA", border: "#DEE2E6", text: "#495057", hoverBg: "#E6F4EF", hoverBorder: "#008555", hoverText: "#008555" },
  actions: { color: "#868E96", hoverColor: "#495057" },
  sidebar: { bg: "#FFFFFF", headerBg: "#FFFFFF", text: "#1A1E2E", textDim: "#868E96", border: "#E9ECEF", activeBg: "#F0F2F5", hoverBg: "#F8F9FA", newChatBg: "#1A1E2E", newChatText: "#FFFFFF" },
  landing: { bg: "#F8FAFB", gradientTo: "#FFFFFF", badgeBg: "#E6F4EF", badgeText: "#008555", badgeBorder: "#B3D9CC" },
};

export default theme;
