import { FiFileText, FiInfo, FiBook } from "react-icons/fi";
import { useState, useEffect } from "react";
import StatisticsPopup from "./backendStats";
import DocLinks from "./docLinks";

function FormSection({ 
  formData, 
  handleChange, 
  handleSubmit,
  getSampleRootProps,
  getSampleInputProps,
  isSampleDragActive,
  getNgramRootProps,
  getNgramInputProps,
  isNgramDragActive,
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
  const [currentStep, setCurrentStep] = useState(2);

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

  const canProceed = () => {
    if (currentStep === 2) {
      return (formData.file || formData.ngram_file) && formData.cell_size;
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
        {[1, 2, 3].map((stepNum) => {
          const isStepThree = stepNum === 3;
          const canGoToStep = 
              !isStepThree || canProceed() || currentStep === 3;

          return (
            <div key={stepNum} style={{ display: "flex", alignItems: "center"}}>
              <div
                className={`step ${currentStep >= stepNum ? 'active' : ''} ${!canGoToStep ? 'disabled' : ''}`}
                onClick={() => canGoToStep && setCurrentStep(stepNum)}
                tabIndex={canGoToStep ? 0 : -1}
                role="button"
                aria-current={currentStep === stepNum}
                aria-label={`Go to step ${stepNum}`}
                style={{ cursor: canGoToStep ? "pointer" : "not-allowed", opacity: canGoToStep ? 1 : 0.5 }}
                onKeyDown={e => {if (e.key === "Enter" || e.key === " ") setCurrentStep(stepNum); }}
              >
                <div className="step-dot">{stepNum}</div>
                <span className="step-label">
                  {stepNum === 1 ? "Overview" : stepNum === 2 ? "Model" : "Trajectory"}
                </span>
              </div>
              {stepNum < 3 && <div className="step-line"></div>}
            </div>
          );
        })}
      </div>

      <div className="form-content">
        <form onSubmit={handleFormSubmit} encType='multipart/form-data'>
        {/* STEP 2: model training */}
        {currentStep === 2 && (
          <div className="step-contet">
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
        )}

        {/* STEP 2: additional parameters for trajectory generation */}
        {currentStep === 3 && (
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
        )}

        </form>
      </div>

      <DocLinks />
    </div>
  );
}

export default FormSection; 