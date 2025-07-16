// External libraries
import React, { useState } from "react"
import axios from "axios";
import { useDropzone } from "react-dropzone" 
import L from "leaflet"

// Two main sections of app
import FormSection from './components/FormSection';
import MapSection from './components/MapSection';

// Styling sheets
import './App.css';
import "leaflet/dist/leaflet.css";
import './components/backendStats.css';
import './components/mapMatchInput.css';
import './components/formSteps.css';

// Fix default icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:"https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

// Main React component 
function App() {
  // Declare a state variable for storing file name of generated trajectories
  const [generatedFileName, setGeneratedFileName] = useState(null);

  // Declare a state variable for storing backend statistics
  const [statsData, setStatsData] = useState(null);

  // Declare a state variable for storing heatmap GeoJSON data
  const [heatmapData, setHeatmapData] = useState(null);

  // Declare a state variable for storing GeoJSON data
  const [visualData, setVisualData] = useState(null);

  // Declare state variables for form
  const [formData, setFormData] = useState({
    cell_size: 50,
    num_trajectories: 100,
    trajectory_len: 100,
    generation_method: "",
    locationCoordinates: null,  
    file: null,
    ngram_file: null,
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

  // Handler for the first drop zone files
  const handleSampleFileDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    const maxSize = 500 * 1024 * 1024;

    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 500 MB.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      file: file,
    }));
  };

  // Handler for the second drop zone files
  const handleNgramFileDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    const maxSize = 500 * 1024 * 1024;

    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 500 MB.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      ngram_file: file,
    }));
  }

  // First drag zone instance for sample trajectory
  const {getRootProps: getSampleRootProps, 
         getInputProps: getSampleInputProps, 
         isDragActive: isSampleDragActive} = useDropzone({
    onDrop: handleSampleFileDrop,
    multiple: false,
    accept: {"application/json": [".json"], "text/csv": [".csv"]},
  });

  // Second drag zone instance for ngram files
  const {getRootProps: getNgramRootProps,
         getInputProps: getNgramInputProps,
         isDragActive: isNgramDragActive
  } = useDropzone({
    onDrop: handleNgramFileDrop,
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
  const handleDownload = (filename) => {
    if (filename) {
      const downloadUrl = `${process.env.REACT_APP_API_URL}/trajectory/download/${filename}`
      window.open(downloadUrl, '_blank');
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

    if (formData.ngram_file) {
      payload.append("ngram_file", formData.ngram_file);
    }

    if (formData.generation_method !== "point_to_point" && formData.trajectory_len) {
      payload.append("trajectory_len", formData.trajectory_len);
    }

    try {
      const response = await api.post('', payload);

      // Extract download link from response sent from backend
      const generatedFile = response.data.generated_file;

      // Store file name of generated trajectories
      setGeneratedFileName(generatedFile);
      
      // Extract backend statistics
      setStatsData(response.data.stats)

      // Extract GeoJSON feature collection from backend response
      setVisualData(response.data.visualization)
      setHeatmapData(response.data.heatmap)
    } catch (error) {
      console.error("Configuration not set:", error.response?.data || error.message);
      throw error;
    }
  }

  return (
    <div className="App">
      <div className="layout">
        <FormSection
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          getSampleRootProps={getSampleRootProps}
          getSampleInputProps={getSampleInputProps}
          isSampleDragActive={isSampleDragActive}
          getNgramRootProps={getNgramRootProps}
          getNgramInputProps={getNgramInputProps}
          isNgramDragActive={isNgramDragActive}
          stats={statsData}
        />
        
        <MapSection
          mapCenter={mapCenter}
          locationCoordinates={formData.locationCoordinates}
          onLocationSelect={handleLocationSelect}
          visualData={visualData}
          heatmapData={heatmapData}
          generatedFileName={generatedFileName}
          onDownload={handleDownload}
          numTrajs={formData.num_trajectories}
        />
       
      </div>
    </div>
  );
}

export default App;