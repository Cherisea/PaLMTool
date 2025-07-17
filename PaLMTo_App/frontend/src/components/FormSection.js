import { useState, useEffect } from "react";
import StatisticsPopup from "./backendStats";
import DocLinks from "./docLinks";
import FormSteps from "./formSteps";
import axios from 'axios';

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

    if (currentStep === 2) {
      await handleNgramSubmit(e);
      setCurrentStep(currentStep + 1);
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      return;
    }

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

  const handleNgramSubmit = async (e) => {
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
      // Construct request payload
      const payload = new FormData();   //??? What's FormData()?
      payload.append("cell_size", formData.cell_size);
      if (formData.file) {
        payload.append("file", formData.file);
      }

      const response = await axios.post('/trajectory/generate/ngrams', payload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;

      setNotification({
        type: 'success',
        message: 'Ngram dictionaries created successfully!'
      })

      setProgress(100);
      setShowStats(true);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to create ngram dictionaries. Please try agin.'
      })
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }

    
  }

  const handleDotClick = (stepNum) => {
    if (stepNum < currentStep) {
      setCurrentStep(currentStep - 1)
    }
  }

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
          const isStepThree = currentStep === 3;
          const canGoToStep = stepNum < currentStep;

          return (
            <div key={stepNum} style={{ display: "flex", alignItems: "center"}}>
              <div
                className={`step ${currentStep >= stepNum ? 'active' : ''} ${!canGoToStep && stepNum !== currentStep ? 'disabled' : ''}`}
                onClick={() => handleDotClick(stepNum)}
                tabIndex={canGoToStep ? 0 : -1}
                role="button"
                aria-current={currentStep === stepNum}
                aria-label={`Go to step ${stepNum}`}
                style={{ cursor: canGoToStep ? "pointer" : (stepNum === currentStep ? "default" : "not-allowed"), opacity: canGoToStep || stepNum === currentStep ? 1 : 0.5 }}
                onKeyDown={e => {if ((e.key === "Enter" || e.key === " ") && canGoToStep) setCurrentStep(stepNum); }}
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
          <FormSteps 
            currentStep={currentStep}
            formData={formData}
            handleChange={handleChange}
            getSampleRootProps={getSampleRootProps}
            getSampleInputProps={getSampleInputProps}
            isSampleDragActive={isSampleDragActive}
            getNgramRootProps={getNgramRootProps}
            getNgramInputProps={getNgramInputProps}
            isNgramDragActive={isNgramDragActive}
            isLoading={isLoading}
            progress={progress}
          />
        </form>
      </div>

      <DocLinks />
    </div>
  );
}

export default FormSection; 