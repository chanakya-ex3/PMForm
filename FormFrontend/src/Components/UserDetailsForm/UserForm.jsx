import React, { useState, useEffect } from 'react';
import { getKey, setKey } from '../../localstorage/localstorage'; // Assuming you have the local storage helper functions

const UserDetailsForm = ({ placemarks, position }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [location, setLocation] = useState('');
  const [agency, setAgency] = useState('');
  const [role, setRole] = useState('');
  const [roles] = useState([
    'Project',
    'Preventive Maintenance',
    'Preventive Maintenance Audit',
    'Energy Team',
  ]);

  useEffect(() => {
    if (placemarks && placemarks.length > 0) {
      const place = placemarks[0];
      const locationText = `${place.locality}, ${place.administrativeArea}`;
      setLocation(locationText);
    }
  }, [placemarks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name && mobile && location && agency && role) {
      await setKey('name', name);
      await setKey('phoneNumber', mobile);
      await setKey('location', location);
      await setKey('agency', agency);
      await setKey('role', role);

      window.location.reload();

      setName('');
      setMobile('');
      setLocation('');
      setAgency('');
      setRole('');
    } else {
      alert('Please fill in all fields.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg transition-all">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">User Details Form</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Mobile */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Number:</label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Enter your mobile number"
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location:</label>
          <input
            type="text"
            value={location}
            disabled
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter your location"
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Agency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agency Name:</label>
          <input
            type="text"
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            placeholder="Enter your agency name"
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role:</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Select Role</option>
            {roles.map((roleOption, index) => (
              <option key={index} value={roleOption}>
                {roleOption}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <div className=''>
        <button
  type="submit"
  className="w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 
    bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600"
>
  Submit
</button>


        </div>
      </form>
    </div>
  );
};

export default UserDetailsForm;
