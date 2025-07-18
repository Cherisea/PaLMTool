// External libraries
import React, { useState } from "react"
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
    accept: {"text/csv": [".csv"]},
  });

  // Second drag zone instance for ngram files
  const {getRootProps: getNgramRootProps,
         getInputProps: getNgramInputProps,
         isDragActive: isNgramDragActive
  } = useDropzone({
    onDrop: handleNgramFileDrop,
    multiple: false,
    accept: {"application/json": [".json"]},
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

  return (
    <div className="App">
      <div className="layout">
        <FormSection
          formData={formData}
          setFormData={setFormData}
          handleChange={handleChange}
          getSampleRootProps={getSampleRootProps}
          getSampleInputProps={getSampleInputProps}
          isSampleDragActive={isSampleDragActive}
          getNgramRootProps={getNgramRootProps}
          getNgramInputProps={getNgramInputProps}
          isNgramDragActive={isNgramDragActive}
          stats={statsData}
          setStatsData={setStatsData}
          setGeneratedFileName={setGeneratedFileName}
          setVisualData={setVisualData}
          setHeatmapData={setHeatmapData}
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