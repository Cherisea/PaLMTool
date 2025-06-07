import { FiInfo } from "react-icons/fi";
import { useState } from "react";

function FormSection({ 
  formData, 
  handleChange, 
  handleSubmit,
  getRootProps,
  getInputProps,
  isDragActive
}) {
  // State variable for loading status
  const [isLoading, setIsLoading] = useState(false);

  // State variable for current progress
  const [progress, setProgress] = useState(0);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setProgress(0);

    // Simulate progress update
    const progressInterval = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prevProgress + 10;
      })
    }, 900);

    try {
      await handleSubmit(e);
      setProgress(100);
    } catch (error) {
      console.error("Form submission error: ", error)
    } finally {
      // clearInterval(progressInterval)
      setIsLoading(false);
    }
  };

  return (
    <div className="form-box">
      <h2>PaLMTo Trajectory Generation</h2>
      <form onSubmit={handleFormSubmit} encType='multipart/form-data'>
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
          <label className="required">
            Generation Method <span className="required-mark">*</span>
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
          <label>
            Trajectory Length <em>(optional)</em>
            <FiInfo title="Number of points in a generated trajectory. Not applicable for point-to-point trajectory generation" className="info-icon"/>
          </label>
          <input 
            name="trajectory_len" 
            type="number" 
            value={formData.trajectory_len} 
            onChange={handleChange} 
            step="100"
            min="100"
            disabled={formData.generation_method === "point_to_point"}
            className={formData.generation_method === "point_to_point" ? "disabled-input" : ""}
            required={formData.generation_method !== "point_to_point"}
          />
        </div>

        <div className="form-group">
          <label className="required">
            Sample Trajectory <em>(optional)</em>
            <FiInfo title="Sample trajectory which synthetic trajectories will be generated from. Must be a csv file with three columns: 'trip_id', 'timestamp', 'geometry'" className="info-icon"/>
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
          <p className="note">
            <i>
              Note: Use <a href={`${process.env.REACT_APP_API_URL}/trajectory/download/demo.csv`} download>demo trajectory file</a> by leaving this field blank.
            </i>
          </p>
        </div>

        <div className="button-container">
          <button type='submit' disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
          {isLoading && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}

        </div>
        
      </form>
    </div>
  );
}

export default FormSection; 