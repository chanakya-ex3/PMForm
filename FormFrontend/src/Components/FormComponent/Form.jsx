import React, { useState, useEffect, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import FieldComponent from '../FieldComponents/FieldComponent';
import { formData, site_idlist } from '../../core/ObjectData';
import { deleteKeys, getKey } from '../../localstorage/localstorage';

const apiUrl = import.meta.env.VITE_API_URL;

const DynamicForm = ({ placemarks, position }) => {
  const [formValues, setFormValues] = useState({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [sectionTitles, setSectionTitles] = useState(Object.keys(formData));
  const [loading, setLoading] = useState(false);
  const [formId, setFormId] = useState(null);  // <-- form session ID from backend
  const pageController = useRef(null);

  useEffect(() => {
    getRole();
    startFormSession();
  }, []);

  useEffect(() => {
    if (position?.latitude && position?.longitude) {
      initializeLocationFields();
    }
  }, [position]);

  const startFormSession = async () => {

  try {
    const role = await getKey('role');
    const name = await getKey('name');
    const mobile = await getKey('phoneNumber');
    const location = await getKey('location');
    const agency = await getKey('agency');
    const userId = localStorage.getItem('userId'); // or any key you're using

    const res = await fetch(`${apiUrl}start-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, mobile, location, agency, role }), // pass the value here
    });

    if (res.ok) {
      const data = await res.json();
      setFormId(data.formId);
    } else {
      console.error('Failed to start form session');
    }
  } catch (error) {
    console.error('Error starting form session:', error);
  }
};


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

  const handleFieldChange = async (id, valueMap) => {
    if (valueMap?.image) {
      try {
        const compressedFile = await imageCompression(valueMap.image, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        valueMap.image = compressedFile;
      } catch (error) {
        console.error("Image compression failed:", error);
      }
    }

    if (id === 'siteIdentityCode') {
      const site = site_idlist[valueMap.value];
      if (site) {
        setFormValues(prev => ({
          ...prev,
          [id]: valueMap,
          siteName: { value: site.anchorSiteName },
          region: { value: site.province },
          cityTown: { value: site.city },
        }));
      } else {
        setFormValues(prev => ({
          ...prev,
          [id]: valueMap,
          siteName: { value: '' },
          region: { value: '' },
          cityTown: { value: '' },
        }));
      }
    } else {
      setFormValues(prev => ({
        ...prev,
        [id]: valueMap,
      }));
    }
  };

  const goToNextPage = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields.');
      return;
    }
    const success = await submitCurrentPage();
    if (!success) return;

    if (currentPageIndex < sectionTitles.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
      pageController.current?.scrollTo({ top: currentPageIndex * 500, behavior: 'smooth' });
    }
  };

  const submitCurrentPage = async () => {
    if (!formId) {
      alert('Form session not initialized.');
      return false;
    }

    const sectionTitle = sectionTitles[currentPageIndex];
    const fields = formData[sectionTitle].filter(field => field.roles.includes(userRole));

    const pageData = new FormData();
    pageData.append('page', sectionTitle);

    for (let field of fields) {
      const valueObj = formValues[field.id];
      if (valueObj?.value !== undefined) {
        pageData.append(field.id, valueObj.value);
      }
      if (valueObj?.image) {
        pageData.append(field.id, valueObj.image);
      }
    }

    try {
      const response = await fetch(`${apiUrl}submit/${formId}`, {
        method: 'POST',
        body: pageData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        alert('Failed to save current page data: ' + errorText);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Network error:', err);
      alert('Network error while saving page. Try again.');
      return false;
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
        if (
          value === null ||
          value === undefined ||
          (typeof value === 'string' && value.trim() === '')
        ) {
          return false;
        }
      }
    }
    return true;
  };

  // Final submit calls finalize endpoint
  const submitForm = async () => {
    if (!formId) {
      alert('Form session not initialized.');
      return;
    }

    setLoading(true);
    try {
      // Submit last page before finalizing
      const lastPageSuccess = await submitCurrentPage();
      if (!lastPageSuccess) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${apiUrl}submit/${formId}/finalize`, {
        method: 'POST',
      });

      if (response.ok) {
        // Assuming server returns the PDF file as blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'form-data.pdf';
        a.click();
        window.URL.revokeObjectURL(url);

        alert('Form submitted and PDF downloaded successfully!');
        setFormValues({});
        setCurrentPageIndex(0);
        // Optionally reset formId and start a new session
        startFormSession();
      } else {
        const errorText = await response.text();
        alert(`Failed to finalize form: ${errorText}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    deleteKeys();
    window.location.reload();
  };

  if (userRole === null || !formId) {
    return <div>Loading Form...</div>;
  }

  return (
    <div>
      {/* App Bar */}
      <div className="fixed top-0 left-0 right-0 p-4 bg-violet-400 dark:text-white shadow-md flex justify-between items-center z-50">
        <span className="flex items-center gap-2">
          <p className='font-extrabold dark:text-white text-black m-0'>Form App: </p>
          <p className='font-extrabold text-white dark:text-black m-0'>{sectionTitles[currentPageIndex]}</p>
        </span>
        <button onClick={logout} className="bg-red-500 p-2 rounded">
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="mt-16 pb-24">
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
                {fields.length === 0 ? (
                  <p>Nothing to fill here for this role.</p>
                ) : (
                  fields.map(field => (
                    <FieldComponent
                      key={field.id}
                      field={field}
                      disabled={field.disabled || loading}
                      onChanged={handleFieldChange}
                      validator={(value) => {
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
        <div className="fixed bottom-0 left-0 right-0 p-4 shadow-lg dark:bg-white bg-black">
          <div className="flex justify-between items-center">
            <button
              onClick={goToPreviousPage}
              disabled={loading || currentPageIndex === 0}
              className={`px-4 py-2 rounded ${loading || currentPageIndex === 0 ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-300'}`}
            >
              Previous
            </button>

            <div className="text-white font-semibold dark:text-black">
              Page {currentPageIndex + 1} of {sectionTitles.length}
            </div>

            {currentPageIndex === sectionTitles.length - 1 ? (
              <button
                onClick={submitForm}
                disabled={loading}
                className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500'}`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white "
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    <span>Submitting...</span>
                  </span>
                ) : (
                  'Submit'
                )}
              </button>
            ) : (
              <button
                onClick={goToNextPage}
                disabled={loading}
                className={`px-4 py-2 rounded bg-gray-300 dark:text-white text-black ${loading ? 'cursor-not-allowed' : ''}`}
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
