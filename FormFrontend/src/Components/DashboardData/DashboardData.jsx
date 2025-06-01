import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DashboardData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isSearched, setIsSearched] = useState(false); // Track if search was performed
  const [selectedItems, setSelectedItems] = useState([]); // Track selected items for deletion
  const apiUrl = import.meta.env.VITE_API_URL;

  // Fetch data based on the selected date range (on button click)
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}data?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            Authorization: `${localStorage.getItem("token")}`,
          },
        }
      );
      const result = await response.json();
      setData(result.data || []);
      setIsSearched(true); // Set the flag to true after search
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting selected items
  const handleDelete = async () => {
    if (selectedItems.length === 0) {
      alert("No items selected for deletion.");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}delete-data`, {
        method: "DELETE",
        headers: {
          Authorization: `${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedItems }),
      });
      if (response.status === 200) {
        alert("Items deleted successfully.");
        setData(data.filter(item => !selectedItems.includes(item._id))); // Remove deleted items from the UI
        setSelectedItems([]); // Clear selection
      } else {
        alert("Failed to delete items.");
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const toggleSelection = (id) => {
    setSelectedItems((prevSelectedItems) =>
      prevSelectedItems.includes(id)
        ? prevSelectedItems.filter((item) => item !== id)
        : [...prevSelectedItems, id]
    );
  };

  // Download CSV
  const downloadCSV = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}data/download?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            Authorization: `${localStorage.getItem("token")}`,
          },
        }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "form_data.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download CSV:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-300 p-4">
        Loading...
      </div>
    );
  }

  // Collect all unique keys across all items
  const allKeys = new Set();
  data.forEach((item) => {
    Object.keys({ ...(item.textData || {}), ...(item.images || {}) }).forEach((key) => {
      allKeys.add(key);
    });
  });

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen relative">
      {/* Floating Delete Button */}
      {selectedItems.length > 0 && (
        <button
          onClick={handleDelete}
          className="absolute top-6 right-6 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700"
        >
          Delete
        </button>
      )}

      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Form Data
      </h2>

      {/* Date Range Picker */}
      <div className="mb-6 flex space-x-4">
        <div>
          <label className="block text-gray-700 dark:text-gray-300">Start Date</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="yyyy/MM/dd"
            className="p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300">End Date</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            dateFormat="yyyy/MM/dd"
            className="p-2 border rounded"
          />
        </div>
        {/* Search Button */}
        <button
          onClick={fetchData}
          className="self-center p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Fetch
        </button>
        {/* Download CSV Button */}
        <button
          onClick={downloadCSV}
          className="self-center p-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Download CSV
        </button>
      </div>

      {/* No Data Found Message */}
      {isSearched && data.length === 0 && (
        <div className="text-center text-gray-600 dark:text-gray-300">
          No data found for the selected date range.
        </div>
      )}

      {/* Data Table */}
      {data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left">
                {[...allKeys].map((key) => (
                  <th key={key} className="px-6 py-3">{key}</th>
                ))}
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">PDF</th>
                <th className="px-6 py-3">Select</th> {/* Column for selection */}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                return (
                  <tr key={item._id} className="border-b border-gray-200 dark:border-gray-700">
                    {[...allKeys].map((key) => (
                      <td key={key} className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {item.textData?.[key] && <div>{item.textData[key]}</div>}
                        {item.images?.[key] && (
                          <img
                            src={item.images[key]}
                            alt={key}
                            className="max-w-[100px] rounded-lg border dark:border-gray-600"
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {item.pdfUrl && (
                        <a
                          href={item.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-600 hover:text-violet-800"
                        >
                          View PDF
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item._id)}
                        onChange={() => toggleSelection(item._id)}
                        className="form-checkbox text-blue-600"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
