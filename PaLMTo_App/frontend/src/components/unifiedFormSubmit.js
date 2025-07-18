import { useState } from "react";
import axios from "axios";

function UnifiedFormSubmit(formData, setCurrentStep, setShowStats, setStatsData,
    setGeneratedFileName, setVisualData, setHeatmapData, setFormData) {
    // State variable for notification message
  const [notification, setNotification] = useState(null);

  // State variable for loading status
  const [isLoading, setIsLoading] = useState(false);

  // State variable for current progress
  const [progress, setProgress] = useState(0);

  // Handler of API calls
  const submitFormData = async (endpoint, payload) => {
    return await axios.post(endpoint, payload, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
  };

  // Main entry for processing form and response
  const handleUnifiedSubmit = async (e, currentStep) => {
    e.preventDefault();

    if (currentStep === 1) {
        setCurrentStep(2)
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
        let endpoint, payload;

        // Build ngram dict only in step 2 and if csv file is uploaded
        if (currentStep === 2 && !!formData.file) {
            endpoint = '/trajectory/generate/ngrams';
            payload = new FormData();
            payload.append("cell_size", formData.cell_size);
            payload.append("file", formData.file);
        } else if (currentStep === 3) {
            endpoint = '/trajectory/generate/';
            payload = new FormData();
            payload.append("num_trajectories", formData.num_trajectories);
            payload.append("generation_method", formData.generation_method);
            payload.append("ngram_file", formData.ngram_file);

            if (formData.generation_method !== "point_to_point" && formData.trajectory_len) {
                payload.append("trajectory_len", formData.trajectory_len);
            }
        }

        if (endpoint && payload) {
            const response = await submitFormData(endpoint, payload);

            setProgress(100);

            if (currentStep === 2) {
                setNotification({
                    type: 'success',
                    message: 'Ngram dictionaries created successfully!'
                  });
                setStatsData(response.data.stats);
                setShowStats(true);

                // Update formData with the returned ngram file
                setFormData(prev => ({
                    ...prev,
                    ngram_file: response.data.ngram_file
                }));

                setCurrentStep(3);
            } else if (currentStep === 3) {
                // const generatedFile = response.data.generated_file;
                // setGeneratedFileName(generatedFile);
                setVisualData(response.data.visualization);
                setHeatmapData(response.data.heatmap);

                setTimeout(() => {
                    setNotification({
                        type: 'success',
                        message: 'Trajectories generated successfully!'
                      });
                }, 1000);
            }
        }
    } catch (error) {
        setNotification({
            type: 'error',
            message: currentStep === 2
              ? 'Failed to create ngram dictionaries. Please try again.'
              : 'Failed to generate trajectories. Please try again.'
        });
    } finally {
        clearInterval(progressInterval);
        setIsLoading(false);
    }

   };

   return {
    handleUnifiedSubmit,
    notification,
    isLoading,
    progress,
    setNotification
   };

}

export default UnifiedFormSubmit;