import logo from "../../../assets/images/LogoArt.png";
import bgImage from "../../../assets/images/small-business-owner.jpg";

interface AuthLeftPanelProps {
  isRegister: boolean;
}

const CheckIcon = () => (
  <svg
    className="w-5 h-5 text-amber-400"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

export default function AuthLeftPanel({ isRegister }: AuthLeftPanelProps) {
  return (
    <div className="relative w-full lg:w-1/2 min-h-[40vh] lg:min-h-screen bg-gray-900 overflow-hidden hidden sm:block">
      <div className="absolute inset-0">
        <img
          src={bgImage}
          alt="Printing workspace"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />

      <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12">
        <div className="max-w-lg">
          <img
            src={logo}
            alt="Printdecore Logo"
            className="h-20 w-auto mb-10"
          />
          <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-4">
            {isRegister
              ? "Start growing your print business today"
              : "Welcome back to Printdecore"}
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            {isRegister
              ? "Join the leading marketplace for print vendors in Africa. Setup takes less than 5 minutes."
              : "Manage your orders, track revenue, and grow your printing business from your dashboard."}
          </p>

          <div className="flex flex-col sm:flex-row gap-5 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span>Free to join</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span>Secure payouts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon />
              <span>Full dashboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
