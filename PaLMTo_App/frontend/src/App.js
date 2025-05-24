// import logo from './logo.svg';
import React, { useState } from "react"
import axios from "axios";
import { useDropzone } from "react-dropzone" 
import './App.css';
import L from "leaflet"
import "leaflet/dist/leaflet.css";
import FormSection from './components/FormSection';
import MapSection from './components/MapSection';

// Fix default icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:"https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

// Main React component 
function App() {

  // Declare state variables for form submission
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Declare state variables for form
  const [formData, setFormData] = useState({
    cell_size: 50,
    num_trajectories: 1000,
    trajectory_length: 100,
    generation_method: "",
    locationName: "",  // For city name
    locationCoordinates: null,  
    file: null,
  })

  // Declare a state variable for center of map
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]);

  // Declare a variable to compute location coordiates by name
  const searchLocation = async (cityName) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newCenter = [parseFloat(lat), parseFloat(lon)];
        setMapCenter(newCenter);
        setFormData(prev => ({
          ...prev,
          locationCoordinates: { lat: parseFloat(lat), lng: parseFloat(lon) }
        }));
      }
    } catch (error) {
      console.error("Error searching location:", error);
    }
  };

  // Create an axios instance for communicating with backend API
  const api = axios.create({
    baseURL: '/trajectory/generate/',
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  // Create a variable to process 'enter' in location field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation(formData.locationName);
    }
  };

  // Handler for text and standard file upload
  const handleChange = (e) => {
    // Extract properties of event with object destructuring
    const {name, value, files} = e.target;

    // Update form
    setFormData((prev) => ({
        ...prev,
        [name]: files? files[0]: value,
      })
    );
  };

  // Handler for drop zone files
  const handleFileDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    const maxSize = 100 * 1024 * 1024;
    
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 10 MB.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      file: file,
    }));
  };

  // Drag zone configuration
  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop: handleFileDrop,
    multiple: false,
    accept: {"application/json": [".json"], "text/csv": [".csv"]},
  });

  // Handler for updating cooridinates by dropping a marker on map
  const handleLocationSelect = (latlng) => {
    setFormData((prev) => ({
      ...prev,
      locationCoordinates: latlng,
    }));
  };

  // TODO: Handler for saving generated trajectories to local machine
  const handleSave = () => {
    if (formData.locationCoordinates) {
      console.warn("handleSave function not implemented yet.");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Construct request payload
    const payload = new FormData();
    payload.append("cell_size", formData.cell_size);
    payload.append("num_trajectories", formData.num_trajectories);
    payload.append("generation_method", formData.generation_method);
    payload.append("file", formData.file);

    if (formData.generation_method !== "point_to_point" && formData.trajectory_length) {
      payload.append("trajectory_length", formData.trajectory_length);
    }

    try {
      const response = await api.post('', payload);
      alert("Configuration of trajectory generation set properly!");
      console.log(response.data);
      setIsSubmitted(true)
    } catch (error) {
      console.error("Configuration not set:", error.response?.data || error.message);
      alert("Setting configuration failed. Please try again.")
    };
  }

  return (
    <div className="App">
      <div className="layout">
        <FormSection
          formData={formData}
          handleChange={handleChange}
          handleKeyPress={handleKeyPress}
          handleFileDrop={handleFileDrop}
          handleSubmit={handleSubmit}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
        />
        
        <MapSection
          mapCenter={mapCenter}
          locationCoordinates={formData.locationCoordinates}
          onLocationSelect={handleLocationSelect}
          onSave={handleSave}
        />

        <button className="save-button" onClick={handleSave} disabled={!isSubmitted}>
          Save Trajectories
        </button>
      </div>
    </div>
  );
}

export default App;