interface TopNavProps {
  title: string | null;
}

const TopNav: React.FC<TopNavProps> = ({ title }) => {
  return (
    <div className="p-4 w-full">
      <h2 className="text-lg font-semibold">{title ? title : "New Chat"}</h2>
    </div>
  );
};

export default TopNav;
