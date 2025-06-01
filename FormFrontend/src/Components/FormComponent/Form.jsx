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
  const [loading, setLoading] = useState(false); // <-- New loading state
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

  const submitForm = async () => {
    setLoading(true); // <-- start loading spinner
    try {
      const name = await getKey("name");
      const phone = await getKey("phoneNumber");
      const location = await getKey("location");
      const agency = await getKey("agency");
      const role = await getKey("role");

      const formDataToSend = new FormData();

      formDataToSend.append('name', name ?? '');
      formDataToSend.append('phone', phone ?? '');
      formDataToSend.append('location', location ?? '');
      formDataToSend.append('agency', agency ?? '');
      formDataToSend.append('role', role ?? '');

      Object.entries(formValues).forEach(([key, value]) => {
        if (value?.value !== undefined && value?.value !== null) {
          formDataToSend.append(key, value.value.toString());
        }
        if (value?.image && typeof value.image === 'object') {
          formDataToSend.append(key, value.image);
        }
      });

      const response = await fetch(`${apiUrl}submit`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        alert('Form submitted successfully!');
        setFormValues({});
        setCurrentPageIndex(0);
      } else {
        const errorText = await response.text();
        alert(`Failed to submit form: ${errorText}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false); // <-- stop loading spinner
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
                      disabled={field.disabled || loading} // disable while loading
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit'
          )}
        </button>
      ) : (
        <button
          onClick={goToNextPage}
          disabled={loading}
          className={`px-4 py-2 rounded ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500'}`}
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
