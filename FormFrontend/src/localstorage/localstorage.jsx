// Utility functions for localStorage in React (web)

const setKey = (key, value) => {
    localStorage.setItem(key, value);
  }
  
  const getKey = (key) => {
    return localStorage.getItem(key);
  }
  
  const deleteKeys = () => {
    localStorage.clear();
  }
  
  export { setKey, getKey, deleteKeys };
  