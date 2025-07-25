import { FiFileText, FiInfo, FiBook } from "react-icons/fi";
import { useState } from "react";

function FormSteps({ 
  currentStep,
  formData, 
  handleChange, 
  getSampleRootProps,
  getSampleInputProps,
  isSampleDragActive,
  getCacheRootProps,
  getCacheInputProps,
  isCacheDragActive,
  isLoading,
  progress,
  progressMessage,
  showCachePopUp,
  setCacheFileName,
  handleSaveCache,
  defaultCacheFile
}) {
  const [showSaveInput, setShowSaveInput] = useState(false);

  // STEP 1: Overview of trajectory generation process
  const renderStep1 = () => (
    <div className="step-content">
      <h2 className="formsteps-title">WebPaLMTo Trajectory Generation</h2>

      <div className="overview-section">
        <p className="overview-description">
          Welcome to WebPaLMTo! This tool generates synthetic trajectories using a two-step process:
        </p>

        <div className="process-steps">
          <div className="process-step">
            <div className="step-content">
              <h3>Step 1: Model Training/Loading</h3>
              <p>
                This tool utilizes <a href="https://en.wikipedia.org/wiki/Word_n-gram_language_model" target="_blank" rel="noopener noreferrer">ngram language model</a> for generating realistic trajectories. To build a "corpus" of location
                points, it extracts bigrams and trigrams from sample trajectories. Alternatively, we provide 
                a custom file format that records previously constructed ngram dictionaries, allowing users to skip
                the time-consuming first step. 
              </p>
            </div>
          </div>

          <div className="process-step">
            <div className="step-content">
              <h3>Step 2: Trajectory Generation</h3>
              <p>
                Configure generation parameters including the number of trajectories, 
                generation method (Length Constrained or Point-to-Point), and optional 
                trajectory length. The trained model will create synthetic trajectories 
                based on your specifications.
              </p>
            </div>
          </div>
        </div>

      <div className="button-container">
        <button type="submit">Get Started</button>
      </div>
      </div>
    </div>
  );

  // STEP 2: Model training
  const renderStep2 = () => (
    <div className="step-content">
      <div className="form-group">
        <label className="required">
          File Upload
          <span className="required-mark">*</span>
          <FiInfo title="Sample trajectory which synthetic trajectories will be generated from. Must be a csv file with three columns: 'trip_id', 'timestamp', 'geometry'" className="info-icon"/>
        </label>
        <div className="dropzone-row">
          {/* Dropzone for sample trajectory file  */}
          <div 
            {...getSampleRootProps({ 
                className: `dropzone${formData.cache_file ? ' disabled-dropzone' : ''}`,
                tabIndex: formData.cache_file ? -1 : 0 
            })}
            aria-disabled={!!formData.cache_file}  
          >
            <input {...getSampleInputProps()} 
              disabled={!!formData.cache_file}
            />
            <div className="dropzone-content">
              <FiFileText className="dropzone-icon" />
              {
                isSampleDragActive ? 
                  (<p>Drop the file here ...</p>) : 
                  formData.file ? 
                    (<p>{formData.file.name}</p>) : 
                    (<p>Sample Trajectories</p>)
              }
            </div>
          </div>
          
          {/* Dropzone for cache file */}
          <div 
            {...getCacheRootProps({ 
              className: `dropzone${formData.file ? ' disabled-dropzone' : ''}`,
              tabIndex: formData.file ? -1 : 0
            })}
            aria-disabled={!!formData.file}
          >
            <input 
              {...getCacheInputProps()} 
              disabled={!!formData.file}
            />
            <div className="dropzone-content">
              <FiBook className="dropzone-icon" />
              {
                isCacheDragActive ? 
                  (<p>Drop the file here ...</p>) : 
                  formData.cache_file ? 
                    (<p>{formData.cache_file.name}</p>) : 
                    (<p>Ngram Dictionaries</p>)
              }
            </div>
          </div>
        </div>
        <p className="note">
          <i>
            Note: Download <a href={`${process.env.REACT_APP_API_URL}/trajectory/download/demo.csv`} download>demo trajectory file</a>
             {' '}or <a href={`${process.env.REACT_APP_API_URL}/trajectory/download/demo_cache.pkl`} download>demo ngram file</a>
             {' '}to jump start.
          </i>
        </p>
      </div>

      <div className="form-group">
        <label className="required">
          Cell Side
          <span className="required-mark">*</span>
          <FiInfo title="Side length of each grid cell in meters representing a geological location over which trajectories are to be generated" className="info-icon"/>
        </label>
        <input 
          name="cell_size" 
          type="number" 
          value={formData.cell_size} 
          onChange={handleChange} 
          step="50"
          min="50"
          required 
          disabled={!!formData.cache_file}
        />
      </div>

      <div className="button-container">
        <button type="submit" 
                disabled={!formData.cache_file && (!formData.file || !formData.cell_size) }
        >
          {formData.cache_file ? 'Load' : 'Train'}
          {isLoading && (
            <div className="progress-container">
              <div className="progress-bar" >
                <div 
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </button>

        {isLoading && (
          <div className="progress-text">
          {progress}% -- {progressMessage || 'Processing...'}
        </div>
        )}
      </div>

      {showCachePopUp && (
        <div className="popup-overlay">
    
            {!showSaveInput ? (
              <div className="popup-content">
                <h3>Cache File Options</h3>
                <p>The cache file was created. Would you like to save it or delete it at the end of the session?</p>
                <div className="popup-actions">
                  <button type="button" onClick={() => setShowSaveInput(true)}>Save</button>
                  <button type="button" className="danger-button" onClick={() => handleSaveCache(false)}>Delete</button>
                </div>
              </div>
            ) : (
              <div className="popup-content">
                <div>
                  <h3>Save As</h3>
                    <input
                      type="text"
                      onChange={e => setCacheFileName(e.target.value)}
                      placeholder={defaultCacheFile}
                    ></input>
                </div>

                <div className="popup-actions">
                  <button type="button" onClick={() => handleSaveCache(true)}>Confirm</button>
                  <button type="button" className="danger-button" onClick={() => setShowSaveInput(false)} >Cancel</button>
                </div>
              </div>
            )}       
          
        </div>
      )}
    </div>
  );

  // STEP 3: Trajectory generation parameters
  const renderStep3 = () => (
    <div className="step-content">
      {formData.cache_file && (
        <div className="cache-info-section">
          <h3>Cached Model</h3>
          <p>Loaded cache file: <strong>{formData.cache_file.name}</strong></p>
        </div>
      )}

      <div className="form-group">
        <label className="required">
          Number of Generated Trajectories
          <span className="required-mark">*</span>
          <FiInfo title="Quantity of new trajectories to be generated" className="info-icon"/>
        </label>
        <input 
          name="num_trajectories" 
          type="number" 
          value={formData.num_trajectories} 
          onChange={handleChange}
          step="100"
          min="100"
          required 
        />
      </div>

      <div className="form-group">
        <label className="required">
          Generation Method <span className="required-mark">*</span>
          <FiInfo 
            title="Approach via which trajectories should be generated. 'Length-constrained' method generates new
            trajectories with a predefined length; 'Point-to-Point' fills the gap between two bigrams" 
            className="info-icon"
          />
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
          disabled={formData.generation_method === "point_to_point" || formData.generation_method === ""}
          className={formData.generation_method === "point_to_point" ? "disabled-input" : ""}
          required={formData.generation_method !== "point_to_point"}
        />
      </div>

      <div className="button-container">
        <button type='submit' disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate'}
          {isLoading && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
        </button>
      </div>
    </div>
  );

  // Render the appropriate step based on currentStep
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return renderCurrentStep();
}

export default FormSteps;