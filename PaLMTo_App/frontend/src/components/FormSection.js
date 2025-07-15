import { FiInfo } from "react-icons/fi";
import { useState, useEffect } from "react";
import StatisticsPopup from "./BackendStats";
import DocLinks from "./DocLinks";

function FormSection({ 
  formData, 
  handleChange, 
  handleSubmit,
  getRootProps,
  getInputProps,
  isDragActive,
  stats
}) {
  // State variable for stats popup window
  const [showStats, setShowStats] = useState(false);

  // State variable for notification message
  const [notification, setNotification] = useState(null);

  // State variable for loading status
  const [isLoading, setIsLoading] = useState(false);

  // State variable for current progress
  const [progress, setProgress] = useState(0);

  // State variable for current step 
  const [currentStep, setCurrentStep] = useState(1);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
    }, 1100);

    try {
      await handleSubmit(e);
      setProgress(100);
      setShowStats(true);

      setTimeout(() => {
        setNotification({
          type: 'success',
          message: 'Trajectories generated successfully!'
        })
      }, 1000);
    } catch (error) {
      console.error("Form submission error: ", error);
      setNotification({
        type: 'error',
        message: 'Failed to generate trajectories. Please try again.'
      });
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(2);
  };

  const prevStep = () => {
    setCurrentStep(1);
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.file && formData.cell_size;
    };
    return true;
  };

  return (
    <div className="form-box">
      <StatisticsPopup
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
      />

      {notification && (
        <div className={`notification-banner ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Step indicator */}
      <div className="step-indicator">
        <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
          <div className="step-dot">1</div>
          <span className="step-label">Model Training</span>
        </div>

        <div className="step-line"></div>

        <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
          <div className="step-dot">2</div>
          <span className="step-label">Trajectory Generation</span>
        </div>
      </div>

      <div className="form-content">
        <form onSubmit={handleFormSubmit} encType='multipart/form-data'>
        {/* STEP 1: model training */}
        {currentStep === 1 && (
          <div className="step-contet">
            <div className="form-group">
                <label className="required">
                  File Upload
                  <span className="required-mark">*</span>
                  <FiInfo title="Sample trajectory which synthetic trajectories will be generated from. Must be a csv file with three columns: 'trip_id', 'timestamp', 'geometry'" className="info-icon"/>
                </label>
                <div className="dropzone-row">
                  {/* Dropzone for sample trajectory file  */}
                  <div {...getRootProps({ className: "dropzone" })}>
                    <input {...getInputProps()} />
                    {
                      isDragActive ? 
                        (<p>Drop the file here ...</p>) : 
                        formData.file ? 
                          (<p>{formData.file.name}</p>) : 
                          (<p>Sample Trajectory</p>)
                    }
                  </div>
                  
                  {/* Dropzone for ngram dictionary file */}
                  <div {...getRootProps({ className: "dropzone" })}>
                    <input {...getInputProps()} />
                    {
                      isDragActive ? 
                        (<p>Drop the file here ...</p>) : 
                        formData.file ? 
                          (<p>{formData.file.name}</p>) : 
                          (<p>Ngram Dictionary</p>)
                    }
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
                />
              </div>

              <div className="step-button-container">
                <span
                  onClick={canProceed() ? nextStep : undefined}
                  className={`next-text${canProceed()? '' : ' disabled'}`}
                  tabIndex={canProceed() ? 0 : -1}
                  role="button"
                  aria-disabled={!canProceed()}
                >
                  next &gt;&gt;
                </span>
              </div>
          </div>
        )}

        {/* STEP 2: additional parameters for trajectory generation */}
        {currentStep === 2 && (
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

            <div className="prev-button-container">
              <span
                onClick={prevStep}
                className="prev-text"
                tabIndex={0}
                role="button"
              >
                &lt;&lt; prev
              </span>
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
          </div>
        )}

        </form>
      </div>

      <DocLinks />
    </div>
  );
}

export default FormSection; 