import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../../components/icons';

export default function LoadingScreen() {
  const { theme } = useTheme();

  return (
    <div className={`flex items-center justify-center h-screen ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className={`text-lg ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Loading...
        </p>
      </div>
    </div>
  );
}

