import { FiInfo } from "react-icons/fi";

function FormSection({ 
  formData, 
  handleChange, 
  handleKeyPress, 
  handleFileDrop, 
  handleSubmit,
  getRootProps,
  getInputProps,
  isDragActive 
}) {
  return (
    <div className="form-box">
      <h2>PaLMTo Trajectory Generation</h2>
      <form onSubmit={handleSubmit} encType='multipart/form-data'>
        <div className="form-group">
          <label className="required">
            Cell Size
            <span className="required-mark">*</span>
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
          <label className="required">
            Number of Trajectories
            <span className="required-mark">*</span>
            <FiInfo title="Quantity of new trajectories to be generated" className="info-icon"/>
          </label>
          <input 
            name="num_trajectories" 
            type="number" 
            value={formData.num_trajectories} 
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
          <input 
            name="trajectory_length" 
            type="number" 
            value={formData.trajectory_length} 
            onChange={handleChange} 
            step="100"
            min="100"
            disabled={formData.generation_method === "point_to_point"}
            className={formData.generation_method === "point_to_point" ? "disabled-input" : ""}
            required={formData.generation_method !== "point_to_point"}
          />
        </div>

        <div className="form-group">
          <label >
            Location <em>(optional)</em>
            <FiInfo title="Name of city with which new trajectories are to be superimposed. Leave this blank if visualizing trajectories are not required" className="info-icon"/>
          </label>
          <input 
            name="locationName" 
            type="text" 
            value={formData.locationName} 
            onChange={handleChange}
            onKeyDown={handleKeyPress}
          />
        </div>

        <div className="form-group">
          <label className="required">
            Generation Method
            <span className="required-mark">*</span>
            <FiInfo title="Approach via which trajectories should be generated" className="info-icon"/>
          </label>
          <select 
            name="generation_method" 
            value={formData.generation_method} 
            onChange={handleChange} 
            required
          >
            <option value="">Select a Method</option>
            <option value="length_constrained">Length Constrained</option>
            <option value="point_to_point">Point to Point</option>
          </select>
        </div>

        <div className="form-group">
          <label className="required">
            Sample Trajectory
            <span className="required-mark">*</span>
            <FiInfo title="Sample trajectory on which synthetic trajectories are based" className="info-icon"/>
          </label>
          <div {...getRootProps({ className: "dropzone" })}>
            <input {...getInputProps()} />
            {
              isDragActive ? 
                (<p>Drop the file here ...</p>) : 
                formData.file ? 
                  (<p>{formData.file.name}</p>) : 
                  (<p>Drag & drop a file here, or click to select one</p>)
            }
          </div>
        </div>
        <button type='submit'>Generate</button>
      </form>
    </div>
  );
}

export default FormSection; 