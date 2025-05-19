// import logo from './logo.svg';
import React, { useState } from "react"
import { useDropzone } from "react-dropzone" 
import './App.css';
import {MapContainer, TileLayer, Marker, useMapEvents} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css";
import { FiInfo } from "react-icons/fi";

// Fix default icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:"https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });

  // No UI components are rendered
  return null;
}

function App() {
  const [formData, setFormData] = useState({
    cell_size: 50,
    number_of_trajectories: 1000,
    trajectory_length: 0,
    generation_method: "",
    location: null,
    file: null,
  })

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
      location: latlng,
    }));
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

    if (formData.location) {
      payload.append("latitude", formData.location.lat);
      payload.append("longitude", formData.location.lng);
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
        <div className="form-box">
          <h2>PaLMTo Trajectory Generation</h2>
          <form onSubmit={handleSubmit} encType='multipart/form-data'>
              <div className="form-group">
                <label>
                  Cell Size 
                  <FiInfo title="Size of each grid cell in meters representing a geological location over which trajectories are to be generated" className="info-icon"/>
                </label>
                <input 
                  name="cell_size" 
                  type="number" 
                  value={formData.cell_size} 
                  onChange={handleChange} 
                  step="50"
                  min="50"
                  required 
                />
              </div>

              <div className="form-group">
                <label>
                  Number of Trajectories
                  <FiInfo title="Quantity of new trajectories to be generated" className="info-icon"/>
                </label>
                <input 
                    name="number_of_trajectories" 
                    type="number" 
                    value={formData.number_of_trajectories} 
                    onChange={handleChange}
                    step="1000"
                    min="1000"
                    required 
                />
              </div>

              <div className="form-group">
                <label>
                  Trajectory Length <em>(optional)</em>
                  <FiInfo title="Number of points in a generated trajectory. Not applicable for point-to-point trajectory generation" className="info-icon"/>
                </label>
                <input name="trajectory_length" type="number" value={formData.trajectory_length} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>
                  Location
                  <FiInfo title="Name of city with which new trajectories are to be superimposed" className="info-icon"/>
                </label>
                <input name="location" type="text" value={formData.location} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label>
                  Generation Method
                  <FiInfo title="Approach via which trajectories should be generated" className="info-icon"/>
                </label>
                <select name="generation_method" value={formData.generation_method} onChange={handleChange} required>
                  <option value="">Select a Method</option>
                  <option value="length_constrained">Length Constrained</option>
                  <option value="point_to_point">Point to Point</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  Sample Trajectory
                  <FiInfo title="Sample trajectory on which synthetic trajectories are based" className="info-icon"/>
                </label>
                <div {...getRootProps({ className: "dropzone" })}>
                  <input {...getInputProps()} />
                  {
                    isDragActive ? (<p>Drop the file here ...</p>) : formData.file ? 
                    (<p>{formData.file.name}</p>) : 
                    (<p>Drag & drop a file here, or click to select one</p>)
                  }
                </div>
              </div>

              <button type='submit'>Generate</button>
            </form>
        </div>

        <div className="map-box">
              <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: "600px", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <LocationPicker onSelect={handleLocationSelect} />
                {formData.location && (<Marker position={formData.location} />)}
              </MapContainer>
        </div>
    </div>
  </div>
  );

}

export default App;

/* 

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
  }; 
*/