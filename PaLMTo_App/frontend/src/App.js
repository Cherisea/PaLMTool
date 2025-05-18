import logo from './logo.svg';
import React, { useState } from "react"
import './App.css';
import {MapContainer, TileLayer, Marker, useMapEvents} from "react-leaflet"
import L from "leaflet"

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
    cell_size: 0,
    number_of_trajectories: 0,
    trajectory_length:0,
    generation_method: "",
    location: null,
    file: null,
  })

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
    <div className="App" style={{ padding: "2rem" }}>
      <h2>Upload Trajectory&Select Location</h2>
      <form onSubmit={handleSubmit} encType='multipart/form-data'>
          <div>
            <label>Cell Size</label>
            <input name="cell_size" value={formData.cell_size} onChange={handleChange} required />
          </div>
          <div>
            <label>Number of Trajectories</label>
            <input name="number_of_trajectories" value={formData.number_of_trajectories} onChange={handleChange} required />
          </div>
          <div>
            <label>Trajectory Length</label>
            <input name="trajectory_length" value={formData.trajectory_length} onChange={handleChange} required />
          </div>
          <div>
            <label>Generation Method</label>
            <input name="generation_method" value={formData.generation_method} onChange={handleChange} required />
          </div>
          <div>
            <label>File Upload</label>
            <input type="file" name="file" onChange={handleChange} required />
          </div>

          <div style={{ margin: "1rem 0" }}>
              <label>Location</label>
              <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: "300px", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <LocationPicker onSelect={handleLocationSelect} />
                {formData.location && (
                  <Marker position={formData.location} />
                )}
            </MapContainer>
          </div>

          <button type='submit'>Generate</button>
      </form>
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