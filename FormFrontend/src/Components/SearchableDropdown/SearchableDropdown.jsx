import { useEffect, useRef, useState } from "react";

const SearchableDropdown = ({
  options,
  label,
  id,
  selectedVal,
  handleChange
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    document.addEventListener("click", toggle);
    return () => document.removeEventListener("click", toggle);
  }, []);

  const selectOption = (option) => {
    setQuery(() => "");
    handleChange(option[label]);
    setIsOpen((isOpen) => !isOpen);
  };

  function toggle(e) {
    setIsOpen(e && e.target === inputRef.current);
  }

  const getDisplayValue = () => {
    if (query) return query;
    if (selectedVal) return selectedVal;

    return "";
  };

  const filter = (options) => {
    return options.filter(
      (option) => option[label].toLowerCase().indexOf(query.toLowerCase()) > -1
    );
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        {/* Input Box */}
        <input
          ref={inputRef}
          type="text"
          value={getDisplayValue()}
          name="searchTerm"
          onChange={(e) => {
            setQuery(e.target.value);
            handleChange(null);
          }}
          onClick={toggle}
          placeholder="Select..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Arrow Icon */}
        <span
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-r-4 ${
            isOpen ? "border-t-0 border-b-4 border-b-gray-500" : "border-t-4 border-t-gray-500 border-b-0"
          }`}
        />
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 mt-1 max-h-60 overflow-y-auto rounded-lg shadow-md">
          {filter(options).map((option, index) => (
            <div
              onClick={() => selectOption(option)}
              className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${
                option[label] === selectedVal ? "bg-blue-200 text-blue-800 font-medium" : ""
              }`}
              key={`${id}-${index}`}
            >
              {option[label]}
            </div>
          ))}
          {filter(options).length === 0 && (
            <div className="px-4 py-2 text-gray-500 italic">No results</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
