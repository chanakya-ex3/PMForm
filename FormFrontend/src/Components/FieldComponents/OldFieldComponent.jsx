import React, { useState, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

const FieldComponent = ({ field, onChanged, validator, value, initialValue }) => {
  const [selectedValue, setSelectedValue] = useState(initialValue?.value || '');
  const [selectedImage, setSelectedImage] = useState(initialValue?.image || null);
  const [base64Image, setBase64Image] = useState(initialValue?.base64 || null);

  useEffect(() => {
    if (initialValue) {
      setSelectedValue(initialValue.value);
      setSelectedImage(initialValue.image);
      setBase64Image(initialValue.base64);
    }
  }, [initialValue]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setSelectedValue(val);
    onChanged(field.id, { value: val, image: selectedImage });
  };

  const handleImagePick = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result);
        setSelectedImage(URL.createObjectURL(file));
        onChanged(field.id, { value: selectedValue, image: file, base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setBase64Image(null);
    onChanged(field.id, { value: selectedValue, image: null });
  };

  const filteredOptions = field.values?.filter((val) =>
    val.toLowerCase().includes(selectedValue.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col gap-5">
      {/* Text Input */}
      {field.type === 'TextField' && (
        <input
          type={field.textType === 'numeric' ? 'number' : 'text'}
          value={selectedValue || ''}
          onChange={handleTextChange}
          placeholder={field.label}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      )}

      {/* Searchable Dropdown */}
      {field.type === 'Dropdown' && (
        <div className="relative">
          <div className="flex items-center border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition">
            <FaSearch className="ml-3 text-gray-400" />
            <input
              type="text"
              value={selectedValue}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedValue(val);
                onChanged(field.id, { value: val, image: selectedImage, base64: base64Image });
              }}
              placeholder={field.label}
              className="w-full p-3 pl-2 outline-none rounded-lg"
            />
            {selectedValue && (
              <button
                onClick={() => setSelectedValue('')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {selectedValue && filteredOptions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
              {filteredOptions.map((val, idx) => (
                <li
                  key={idx}
                  onClick={() => {
                    setSelectedValue(val);
                    onChanged(field.id, { value: val, image: selectedImage, base64: base64Image });
                  }}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                >
                  {val}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Image Picker */}
      {field.photoRequired && (
        <div>
          <label className="block font-semibold text-gray-700 mb-2">{field.label} Image</label>
          <div className="relative">
            <label htmlFor={`image-upload-${field.id}`} className="block cursor-pointer">
              <div className="w-full h-44 border border-dashed rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition overflow-hidden">
                {selectedImage ? (
                  <img src={selectedImage} alt="Selected" className="object-cover w-full h-full" />
                ) : (
                  <span className="text-gray-500">Tap to capture image</span>
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
            {selectedImage && (
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
              >
                <FaTimes size={12} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldComponent;
