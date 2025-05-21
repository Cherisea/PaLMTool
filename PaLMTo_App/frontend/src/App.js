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

function App() {
  const [formData, setFormData] = useState({
    cell_size: 50,
    num_trajectories: 1000,
    trajectory_length: 100,
    generation_method: "",
    locationName: "",  // For city name
    locationCoordinates: null,  // For map marker
    file: null,
  })

  const [mapCenter, setMapCenter] = useState([51.505, -0.09]);

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
    baseURL: '/trajectory/config/set',
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation(formData.locationName);
    }
  };

  // Handler for text and standard file input
  const handleChange = (e) => {
    // Extract properties of event with object destructuring
    const {name, value, files} = e.target;

    // Invoke function with values from an arrow function
    setFormData((prev) => ({
        ...prev,
        [name]: files? files[0]: value,
      })
    );
  };

  // Handler for drop zone files
  const handleFileDrop = (acceptedFiles) => {
    setFormData((prev) => ({
      ...prev,
      file: acceptedFiles[0],
    }));
  };

  // Drag zone configuration
  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop: handleFileDrop,
    multiple: false,
    accept: {"application/json": [".json"], "text/csv": [".csv"]},
  });

  const handleLocationSelect = (latlng) => {
    setFormData((prev) => ({
      ...prev,
      locationCoordinates: latlng,
    }));
  };

  const handleSave = () => {
    if (formData.locationCoordinates) {
      // TODO: You can add your save logic here
      console.log("Saving location:", formData.locationCoordinates);
      // For example, you might want to update the location name based on coordinates
      // or save the coordinates to a database
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    // Deactivate default form handling in browser
    e.preventDefault();

    const payload = new FormData();
    payload.append("cell_size", formData.cell_size);
    payload.append("num_trajectories", formData.num_trajectories);
    payload.append("generation_method", formData.generation_method);
    // payload.append("file", formData.file);
    // payload.append("location", formData.locationName);

    // if (formData.locationCoordinates) {
    //   payload.append("latitude", formData.locationCoordinates.lat);
    //   payload.append("longitude", formData.locationCoordinates.lng);
    // }
    if (formData.generation_method != "point_to_point" && formData.trajectory_length) {
      payload.append("trajectory_length", formData.trajectory_length);
    }

    try {
      const response = await api.post('', payload);
      alert("Configuration of trajectory generation set properly!");
      console.log(response.data);
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
      </div>
    </div>
  );
}

export default App;