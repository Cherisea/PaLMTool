import { FiFileText, FiInfo, FiBook } from "react-icons/fi";

function FormSteps({ 
  currentStep,
  formData, 
  handleChange, 
  getSampleRootProps,
  getSampleInputProps,
  isSampleDragActive,
  getNgramRootProps,
  getNgramInputProps,
  isNgramDragActive,
  isLoading,
  progress
}) {
  // STEP 1: Overview of trajectory generation process
  const renderStep1 = () => (
    <div>
      <h2>WebPaLMTo Trajectory Generation</h2>
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
                className: `dropzone${formData.ngram_file ? ' disabled-dropzone' : ''}`,
                tabIndex: formData.ngram_file ? -1 : 0 
            })}
            aria-disabled={!!formData.ngram_file}  
          >
            <input {...getSampleInputProps()} 
              disabled={!!formData.ngram_file}
            />
            <div className="dropzone-content">
              <FiFileText className="dropzone-icon" />
              {
                isSampleDragActive ? 
                  (<p>Drop the file here ...</p>) : 
                  formData.file ? 
                    (<p>{formData.file.name}</p>) : 
                    (<p>Sample Trajectory</p>)
              }
            </div>
          </div>
          
          {/* Dropzone for ngram dictionary file */}
          <div 
            {...getNgramRootProps({ 
              className: `dropzone${formData.file ? ' disabled-dropzone' : ''}`,
              tabIndex: formData.file ? -1 : 0
            })}
            aria-disabled={!!formData.file}
          >
            <input 
              {...getNgramInputProps()} 
              disabled={!!formData.file}
            />
            <div className="dropzone-content">
              <FiBook className="dropzone-icon" />
              {
                isNgramDragActive ? 
                  (<p>Drop the file here ...</p>) : 
                  formData.ngram_file ? 
                    (<p>{formData.ngram_file.name}</p>) : 
                    (<p>Ngram Dictionary</p>)
              }
            </div>
          </div>
        </div>
        <p className="note">
          <i>
            Note: Use <a href={`${process.env.REACT_APP_API_URL}/trajectory/download/demo.csv`} download>demo trajectory file</a> by leaving this field blank.
          </i>
        </p>
      </div>

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
          disabled={!!formData.ngram_file}
        />
      </div>

      <div className="button-container">
        <button type="submit">{formData.ngram_file ? 'Load' : 'Train'}</button>
      </div>
    </div>
  );

  // STEP 3: Trajectory generation parameters
  const renderStep3 = () => (
    <div className="step-content">
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