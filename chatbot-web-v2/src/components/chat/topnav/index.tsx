import ThemeSwitcher from "@/components/ui/themeSwitcher.tsx";

interface TopNavProps {
  title: string | null;
}

const TopNav: React.FC<TopNavProps> = ({ title }) => {
  return (
    <div className="p-4 w-full flex justify-between items-center">
      <h2 className="text-lg font-semibold">{title ? title : "New Chat"}</h2>

      <ThemeSwitcher />
    </div>
  );
};

export default TopNav;
