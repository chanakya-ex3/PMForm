import React, { useEffect, useState } from 'react';
import './App.css'; // Import CSS for styling
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import UserDetailsForm from './Components/UserDetailsForm/UserForm'; // Import UserDetailsForm component
import DynamicForm from './Components/FormComponent/Form'; // Import DynamicForm component
import { getKey, setKey, deleteKeys } from './localstorage/localstorage'; // Utility functions to handle local storage
import { getCurrentLocation } from './location/locationService'; // Service to fetch location
import Dashboard from './Components/Dashboard/Dashboard';

const App = () => {
  const [name, setName] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [location, setLocation] = useState(null);
  const [agency, setAgency] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [placemarks, setPlacemarks] = useState([]);
  const [position, setPosition] = useState({ latitude: 0, longitude: 0 });

  useEffect(() => {
    // Fetch stored user data

    const fetchUserData = async () => {
      const storedName = await getKey('name');
      const storedPhoneNumber = await getKey('phoneNumber');
      const storedLocation = await getKey('location');
      const storedAgency = await getKey('agency');
      const storedRole = await getKey('role');

      setName(storedName);
      setPhoneNumber(storedPhoneNumber);
      setLocation(storedLocation);
      setAgency(storedAgency);
      setRole(storedRole);
    };

    // Fetch location data
    const fetchLocationData = async () => {
      try {
        const { placemarks, position } = await getCurrentLocation();
        setPlacemarks(placemarks);
        setPosition(position);
    
        if (placemarks.length > 0) {
          const place = placemarks[0];
          if (place.locality && place.administrativeArea) {
            setLocation(`${place.locality}, ${place.administrativeArea}`);
          }
        }
      } catch (err) {
        console.error("Failed to fetch location:", err);
      } finally {
        // Always run this, even if error occurs
      }
    };
    

    fetchUserData();
    fetchLocationData();
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    deleteKeys();
    setName(null);
    setPhoneNumber(null);
    setLocation(null);
    setAgency(null);
    setRole(null);
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <h2>LoadingApp...</h2>
      </div>
    );
  }

  return (
    <Router>
      <div>
        <Routes>
          <Route
            path="/"
            element={
              !name ? (
                <UserDetailsForm placemarks={placemarks} position={position} />
              ) : (
                <DynamicForm placemarks={placemarks} position={position} />
              )
            }
          />
          <Route path="/view-details" element={<Dashboard  />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
