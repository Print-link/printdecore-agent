import { useTheme } from "../../contexts/ThemeContext";

const AccessDeniedFallback = () => {
  const { theme } = useTheme();
  return (
    <div
      className={`p-6 rounded-lg ${
        theme === "dark"
          ? "bg-gray-800 border border-gray-700"
          : "bg-white border border-gray-200"
      }`}
    >
      <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
        Access denied. Manager role required.
      </p>
    </div>
  );
};

export default AccessDeniedFallback;
