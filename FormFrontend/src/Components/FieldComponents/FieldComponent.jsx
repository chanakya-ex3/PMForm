import React, { useState, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

const FieldComponent = ({ field, onChanged, validator, value, initialValue, disabled }) => {
  const [selectedValue, setSelectedValue] = useState(initialValue?.value || '');
  const [selectedImage, setSelectedImage] = useState(initialValue?.image || null);
  const [base64Image, setBase64Image] = useState(initialValue?.base64 || null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setSelectedValue(initialValue.value || '');
      setSelectedImage(initialValue.image || null);
      setBase64Image(initialValue.base64 || null);
    }
  }, [initialValue]);

  useEffect(() => {
    // Cleanup object URL if used
    return () => {
      if (selectedImage && typeof selectedImage === 'string' && selectedImage.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setSelectedValue(val);
    onChanged(field.id, { value: val, image: selectedImage, base64: base64Image });
  };

  const handleImagePick = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageBase64 = reader.result;
        setBase64Image(imageBase64);
        setSelectedImage(URL.createObjectURL(file)); // Optional if not used
        onChanged(field.id, { value: selectedValue, image: file, base64: imageBase64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setBase64Image(null);
    onChanged(field.id, { value: selectedValue, image: null, base64: null });
  };

  const filteredOptions = field.values?.filter((val) =>
    val.toLowerCase().includes(selectedValue.toLowerCase())
  ) || [];
  // console.log('yew',field.required)
  return (
    <div className="flex flex-col gap-6 p-4 rounded-xl transition-all duration-300">
      {/* Text Input */}
      {field.type === 'TextField' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <input
            type={field.textType === 'numeric' ? 'number' : 'text'}
            value={selectedValue || ''}
            disabled={disabled}
            onChange={handleTextChange}
            placeholder={`Enter ${field.label}`}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
      )}

      {/* Dropdown Search */}
      {field.type === 'Dropdown' && (
        <div className="flex flex-col gap-2 relative">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}
          {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.values?.length < 10 ? (
            <select
              value={selectedValue}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedValue(val);
                onChanged(field.id, { value: val, image: selectedImage, base64: base64Image });
              }}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="" disabled>Select {field.label}</option>
              {field.values.map((val, idx) => (
                <option key={idx} value={val}>
                  {val}
                </option>
              ))}
            </select>
          ) : (
            <>
              <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-xl px-3 shadow-sm bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 transition">
                <FaSearch className="text-gray-400 dark:text-gray-300" />
                <input
                  type="text"
                  value={selectedValue}
                  disabled={disabled}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedValue(val);
                    setIsDropdownOpen(true);
                    onChanged(field.id, { value: val, image: selectedImage, base64: base64Image });
                  }}
                  placeholder={`Search ${field.label}`}
                  className="w-full py-3 outline-none bg-transparent text-black dark:text-white"
                  onFocus={() => setIsDropdownOpen(true)}
                />
                {selectedValue && (
                  <button
                    onClick={() => {
                      setSelectedValue('');
                      setIsDropdownOpen(false);
                      onChanged(field.id, { value: '', image: selectedImage, base64: base64Image });
                    }}
                    className="p-2 text-gray-400 dark:text-gray-300 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {isDropdownOpen && filteredOptions.length > 0 && (
                <ul className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredOptions.map((val, idx) => (
                    <li
                      key={idx}
                      onClick={() => {
                        setSelectedValue(val);
                        setIsDropdownOpen(false);
                        onChanged(field.id, { value: val, image: selectedImage, base64: base64Image });
                      }}
                      className="px-4 py-2 hover:bg-blue-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition"
                    >
                      {val}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* Image Picker */}
      {field.photoRequired && (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label} Image
          {field.required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <label htmlFor={`image-upload-${field.id}`} className="cursor-pointer block">
              <div className="w-full h-48 border-2 border-dashed rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition overflow-hidden">
                {base64Image ? (
                  <img src={base64Image} alt="Selected" className="object-cover w-full h-full rounded-xl" />
                ) : (
                  <span className="text-gray-400 dark:text-gray-300">Tap to capture image</span>
                )}
              </div>
            </label>
            <input
              id={`image-upload-${field.id}`}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImagePick}
              className="hidden"
            />
            {base64Image && (
              <button
                onClick={removeImage}
                className=" text-gray-400 dark:text-gray-300 hover:text-gray-600 absolute top-3 right-3 rounded-full     flex items-center justify-center"
              >
                <FaTimes/>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldComponent;
