import { useTheme } from "../../../contexts/ThemeContext";

const COUNTRY_CODES = [
  { code: "+233", flag: "\u{1F1EC}\u{1F1ED}" },
  { code: "+234", flag: "\u{1F1F3}\u{1F1EC}" },
  { code: "+254", flag: "\u{1F1F0}\u{1F1EA}" },
  { code: "+27", flag: "\u{1F1FF}\u{1F1E6}" },
];

interface PhoneInputProps {
  phoneCode: string;
  onPhoneCodeChange: (code: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (number: string) => void;
}

export default function PhoneInput({
  phoneCode,
  onPhoneCodeChange,
  phoneNumber,
  onPhoneNumberChange,
}: PhoneInputProps) {
  const { theme } = useTheme();
  const selected =
    COUNTRY_CODES.find((c) => c.code === phoneCode) ?? COUNTRY_CODES[0];

  return (
    <div
      className={`flex items-center rounded-md border focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-transparent ${
        theme === "dark"
          ? "bg-gray-700 border-gray-600"
          : "bg-white border-gray-300"
      }`}
    >
      {/* Country code selector — hidden native select on top of custom display */}
      <div className="relative flex items-center flex-shrink-0">
        <div
          className={`flex items-center gap-1 pl-3 pr-5 py-2.5 text-sm pointer-events-none ${
            theme === "dark" ? "text-gray-100" : "text-gray-900"
          }`}
        >
          <span>{selected.flag}</span>
          <span>{selected.code}</span>
        </div>
        <select
          value={phoneCode}
          onChange={(e) => onPhoneCodeChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          {COUNTRY_CODES.map(({ code, flag }) => (
            <option key={code} value={code}>
              {flag} {code}
            </option>
          ))}
        </select>
        {/* Single custom chevron */}
        <svg
          className={`absolute right-1 w-3.5 h-3.5 pointer-events-none ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      <span
        className={`self-stretch w-px my-2 flex-shrink-0 ${
          theme === "dark" ? "bg-gray-600" : "bg-gray-200"
        }`}
      />
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => onPhoneNumberChange(e.target.value)}
        placeholder="Mobile number"
        required
        className={`flex-1 min-w-0 px-3 py-2.5 border border-gray-50 text-sm focus:outline-none bg-transparent ${
          theme === "dark"
            ? "text-gray-100 placeholder-gray-400"
            : "text-gray-900 placeholder-gray-400"
        }`}
      />
    </div>
  );
}
