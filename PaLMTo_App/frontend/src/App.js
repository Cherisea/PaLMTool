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
  // Declare a state variable for storing download links
  const [downloadLink, setDownloadLink] = useState('');

  // Declare a state variable for form submission
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Declare state variables for form
  const [formData, setFormData] = useState({
    cell_size: 50,
    num_trajectories: 1000,
    trajectory_len: 100,
    generation_method: "",
    locationCoordinates: null,  
    file: null,
  })

  // Declare a state variable for center of map
  const [mapCenter, setMapCenter] = useState([41.1579, -8.63]);

  // Create an axios instance for communicating with backend API
  const api = axios.create({
    baseURL: '/trajectory/generate/',
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

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

    setMapCenter(latlng)
  };

  // Handler for saving generated trajectories to local machine
  const handleSave = () => {
    if (downloadLink) {
      window.open(downloadLink, '_blank');
    } else {
      alert("No generated file available for download. Please generate trajectories first.")
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

    if (formData.file) {
      payload.append("file", formData.file);
    }

    if (formData.generation_method !== "point_to_point" && formData.trajectory_len) {
      payload.append("trajectory_len", formData.trajectory_len);
    }

    try {
      const response = await api.post('', payload);
      alert("New trajectories successfully generated!");
      console.log(response.data);

      // Extract download link from response sent from backend
      const generatedFile = response.data.generated_file;
      setDownloadLink(`${process.env.REACT_APP_API_URL}/trajectory/download/${generatedFile}`);
      setIsSubmitted(true)
    } catch (error) {
      console.error("Configuration not set:", error.response?.data || error.message);
      alert("Failed to set correct parameters for trajectory generation. Please try again.")
    };
  }

  return (
    <div className="App">
      <div className="layout">
        <FormSection
          formData={formData}
          handleChange={handleChange}
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
        />

        <button className="save-button" onClick={handleSave} disabled={!isSubmitted}>
          Save Trajectories
        </button>
      </div>
    </div>
  );
}

export default App;