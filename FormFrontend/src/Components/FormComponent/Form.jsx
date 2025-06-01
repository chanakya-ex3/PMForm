import React, { useState, useEffect, useRef } from 'react';
import FieldComponent from '../FieldComponents/FieldComponent';
import { formData, site_idlist } from '../../core/ObjectData';
import { deleteKeys, getKey } from '../../localstorage/localstorage';

const apiUrl = import.meta.env.VITE_API_URL;

const DynamicForm = ({ placemarks, position }) => {
  const [formValues, setFormValues] = useState({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [sectionTitles, setSectionTitles] = useState(Object.keys(formData));
  const pageController = useRef(null);

  useEffect(() => {
    getRole();
  }, []);

  useEffect(() => {
    if (position?.latitude && position?.longitude) {
      initializeLocationFields();
    }
  }, [position]);

  const getRole = async () => {
    const role = await getKey('role');
    setUserRole(role);
  };

  const initializeLocationFields = () => {
    setFormValues(prev => ({
      ...prev,
      latitude: { value: String(position.latitude ?? '') },
      longitude: { value: String(position.longitude ?? '') },
    }));
  };

  const handleFieldChange = (id, valueMap) => {
    console.log("Field changed:", id, valueMap); // Debug log

    // Check if the field ID is 'siteId' and prefill other fields if necessary
    if (id === 'siteIdentityCode') {
      const site = site_idlist[valueMap.value]; // Assuming siteData is available
      if (site) {
        setFormValues(prev => ({
          ...prev,
          [id]: valueMap,
          siteName: { value: site.anchorSiteName }, // Fill siteName field
          region: { value: site.province }, // Fill region field
          cityTown: { value: site.city }, // Fill cityTown field
        }));
        console.log(formValues)
      } else {
        // If no site found, clear those fields
        
        setFormValues(prev => ({
          ...prev,
          [id]: valueMap,
          siteName: { value: '' },
          region: { value: '' },
          cityTown: { value: '' },
        }));
      }
    } else {
      // For other fields, just update the valueMap as usual
      setFormValues(prev => ({
        ...prev,
        [id]: valueMap,
      }));
    }
  };

  const goToNextPage = () => {
    if (validateForm()) {
      if (currentPageIndex < sectionTitles.length - 1) {
        setCurrentPageIndex(prev => prev + 1);
        pageController.current?.scrollTo({ top: currentPageIndex * 500, behavior: 'smooth' });
      }
    } else {
      alert('Please fill in all required fields.');
    }
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      pageController.current?.scrollTo({ top: (currentPageIndex - 1) * 500, behavior: 'smooth' });
    }
  };

  const validateForm = () => {
    const sectionTitle = sectionTitles[currentPageIndex];
    const fields = formData[sectionTitle].filter(field =>
      field.roles.includes(userRole)
    );

    for (let field of fields) {
      if (field.required) {
        const valueObj = formValues[field.id];
        const value = valueObj?.value;

        // Check for empty string, null, or undefined
        console.log(value)
        if (
          value === null ||
          value === undefined ||
          (typeof value === 'string' && value.trim() === '')
        ) {
          console.warn(`Validation failed for required field: ${field.id}`);
          return false;
        }
      }
    }

    return true;
  };

  const submitForm = async () => {
    const name = await getKey("name");
    const phone = await getKey("phoneNumber");
    const location = await getKey("location");
    const agency = await getKey("agency");
    const role = await getKey("role");

    try {
      const formData = new FormData();

      // Append static fields
      formData.append('name', name ?? '');
      formData.append('phone', phone ?? '');
      formData.append('location', location ?? '');
      formData.append('agency', agency ?? '');
      formData.append('role', role ?? '');

      // Loop through dynamic formValues object
      Object.entries(formValues).forEach(([key, value]) => {
        // Add text field
        if (value?.value !== undefined && value?.value !== null) {
          formData.append(key, value.value.toString());
          console.log(`Appending value -> ${key}: ${value.value}`);
        }

        // Add image file
        if (value?.image && typeof value.image === 'object') {
          formData.append(key, value.image); // `value.image` must be a File or Blob
          console.log(`Appending image -> ${key}:`, value.image);
        }
      });

      // Debug all FormData entries
      for (let [key, val] of formData.entries()) {
        console.log(`${key}:`, val);
      }

      // Submit multipart/form-data
      const response = await fetch(`${apiUrl}submit`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Form submitted successfully!');
        setFormValues({});
        setCurrentPageIndex(0);
      } else {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        alert(`Failed to submit form: ${errorText}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const logout = () => {
    deleteKeys();
    window.location.reload();
  };

  if (userRole === null) {
    return <div>Loading Form...</div>;
  }
  
  return (
    <div>
      {/* App Bar */}
      <div className="fixed top-0 left-0 right-0 p-4 bg-violet-400 text-white shadow-md flex justify-between items-center z-50">
        <p className='font-bold'>Form App</p>
        <button onClick={logout} className="bg-red-500 p-2 rounded">
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="mt-16">
        <div>
          <div>Page {currentPageIndex + 1} of {sectionTitles.length}</div>
        </div>

        <div ref={pageController}>
          {sectionTitles.map((sectionTitle, idx) => {
            const fields = formData[sectionTitle].filter(field =>
              field.roles.includes(userRole)
            );
            return (
              <div
                key={sectionTitle}
                style={{ display: currentPageIndex === idx ? 'block' : 'none' }}
                className='flex flex-col gap-6 p-4 rounded-xl transition-all duration-300'
              >
                <h2>{sectionTitle}</h2>
                {fields.length === 0 ? (
                  <p>Nothing to fill here for this role.</p>
                ) : (
                  fields.map(field => (
                    <FieldComponent
                      key={field.id}
                      field={field}
                      disabled={field.disabled}
                      onChanged={handleFieldChange}
                      validator={(value) => {
                        console.log(field.required && !value);
                        return field.required && !value ? 'This field is required' : null;
                      }}
                      initialValue={formValues[field.id]}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <button
              onClick={goToPreviousPage}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Previous
            </button>

            {currentPageIndex === sectionTitles.length - 1 ? (
              <button
                onClick={submitForm}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Submit
              </button>
            ) : (
              <button
                onClick={goToNextPage}
                className="bg-blue-500  px-4 py-2 rounded"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicForm;
