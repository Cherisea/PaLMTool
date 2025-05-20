// import logo from './logo.svg';
import React, { useState } from "react"
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
    number_of_trajectories: 1000,
    trajectory_length: 0,
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
      // You can add your save logic here
      console.log("Saving location:", formData.locationCoordinates);
      // For example, you might want to update the location name based on coordinates
      // or save the coordinates to a database
    }
  };

  const handleSubmit = (e) => {
    // Deactivate default form handling in browser
    e.preventDefault();

    const payload = new FormData();
    payload.append("cell_size", formData.cell_size);
    payload.append("number_of_trajectories", formData.number_of_trajectories);
    payload.append("trajectory_length", formData.trajectory_length);
    payload.append("generation_method", formData.generation_method);
    payload.append("file", formData.file);
    payload.append("location", formData.locationName);

    if (formData.locationCoordinates) {
      payload.append("latitude", formData.locationCoordinates.lat);
      payload.append("longitude", formData.locationCoordinates.lng);
    }

    fetch("http://localhost:8000/trajectory", {
      method: "POST",
      body: payload,
    })
    .then((res) => res.json())
    .then((data) => {
      alert("Upload successful!");
      console.log(data);
    })
    .catch((err) => console.error("Upload failed",err));
  };

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