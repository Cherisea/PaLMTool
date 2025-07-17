import { useState, useEffect } from "react";

// Components import
import StatisticsPopup from "./backendStats";
import DocLinks from "./docLinks";
import FormSteps from "./formSteps";
import UnifiedFormSubmit from "./unifiedFormSubmit";

function FormSection({ 
  formData, 
  handleChange, 
  getSampleRootProps,
  getSampleInputProps,
  isSampleDragActive,
  getNgramRootProps,
  getNgramInputProps,
  isNgramDragActive,
  stats,
  setStatsData,
  setGeneratedFileName,
  setVisualData,
  setHeatmapData,
}) {
  // State variable for stats popup window
  const [showStats, setShowStats] = useState(false);

  // State variable for current step 
  const [currentStep, setCurrentStep] = useState(1);

  const {
    handleUnifiedSubmit,
    notification,
    isLoading,
    progress,
    setNotification
  } = UnifiedFormSubmit(formData, setCurrentStep, setShowStats, setStatsData);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  const handleDotClick = (stepNum) => {
    if (stepNum < currentStep) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="form-box">
      {/* Popup window of backend statistics */}
      <StatisticsPopup
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
      />

      {/* Notification banner */}
      {notification && (
        <div className={`notification-banner ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Step indicator */}
      <div className="step-indicator">
        {[1, 2, 3].map((stepNum) => {
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
      
      {/* Main form content */}
      <div className="form-content">
        <form onSubmit={e => handleUnifiedSubmit(e, currentStep)} encType='multipart/form-data'>
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
            setGeneratedFileName={setGeneratedFileName}
            setVisualData={setVisualData}
            setHeatmapData={setHeatmapData}
          />
        </form>
      </div>

      {/* Footer area */}
      <DocLinks />
    </div>
  );
}

export default FormSection; 