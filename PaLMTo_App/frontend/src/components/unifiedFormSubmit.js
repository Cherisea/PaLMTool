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

    // State variable for progress message
    const [progressMessage, setProgressMessage] = useState(''); 

    // State variable for showing cache popup window
    const [showCachePopUp, setShowCachePopup] = useState(false);

    // State variable for cache file name
    const [cacheFileName, setCacheFileName] = useState('');

    // State variable for default cache file from backend
    const [defaultCacheFile, setDefaultCacheFile] = useState('');

    // Handler of API calls
    const submitFormData = async (endpoint, payload) => {
    return await axios.post(endpoint, payload, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    };

    // Handler of cache popup window
    const handleSaveCache = async (save) => {
        if (save) {
            const newName = cacheFileName.trim() || defaultCacheFile
            if (newName != defaultCacheFile) {
                await axios.post('trajectory/rename_cache/', {
                    old_name: defaultCacheFile,
                    new_name: newName
                });

                setFormData(prev => ({
                    ...prev,
                    cache_file: newName
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    cache_file: defaultCacheFile
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                cache_file: defaultCacheFile,
                delete_cache_after: true
            }));
        }
        setShowCachePopup(false);
        setCurrentStep(3);
    }

    // Function to handle SSE progress updates
    const handleProgressUpdates = (taskId) => {
    const eventSource = new EventSource(`${process.env.REACT_APP_API_URL}/trajectory/progress/?task_id=${taskId}`);

    // Listen for messages
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'progress':
                setProgress(data.progress);
                setProgressMessage(data.message);
                break;
            case 'complete':
                setProgress(100);
                setStatsData(data.stats);
                setShowStats(true);

                setDefaultCacheFile(data.cache_file);

                setNotification({
                    type: 'success',
                    message: data.message
                });

                setIsLoading(false);
                eventSource.close();
                break;
            case 'error':
                setNotification({
                    type: 'error',
                    message: data.message
                });
                eventSource.close();
                break;
            case 'keepalive':
                break;
            default:
                console.log('Unknown event type:', data.type);
        }
    };

    // Listen for errors 
    eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        setNotification({
            type: 'error',
            message: 'Connection to progress stream failed'
        });
        eventSource.close();
    };

    return eventSource;
    }

    // Main entry for processing form and response
    const handleUnifiedSubmit = async (e, currentStep) => {
    e.preventDefault();

    if (currentStep === 1) {
        setCurrentStep(2)
        return;
    }

    try {
        let endpoint, payload;
        payload = new FormData();

        // Build ngram dict only in step 2 and if csv file is uploaded
        if (currentStep === 2) {
            if (!!formData.cache_file) {
                setCurrentStep(3);
                setIsLoading(false);
                return;
            } else {
                endpoint = '/trajectory/generate/ngrams';
                payload.append("cell_size", formData.cell_size);
                payload.append("file", formData.file);
                setIsLoading(true);
            }
            
        } else if (currentStep === 3) {
            endpoint = '/trajectory/generate/';
            payload.append("num_trajectories", formData.num_trajectories);
            payload.append("generation_method", formData.generation_method);
            payload.append("cache_file", formData.cache_file);

            if (formData.generation_method !== "point_to_point" && formData.trajectory_len) {
                payload.append("trajectory_len", formData.trajectory_len);
            }
            setIsLoading(true);
        }

        if (endpoint && payload) {
            const response = await submitFormData(endpoint, payload);

            if (currentStep === 2) {
                // Initiate progress updates listener
                const taskId = response.data.task_id;
                handleProgressUpdates(taskId);
            } else if (currentStep === 3) {
                setProgress(100);
                const generatedFile = response.data.generated_file;
                setGeneratedFileName(generatedFile);
                setVisualData(response.data.visualization);
                setHeatmapData(response.data.heatmap);

                setTimeout(() => {
                    setNotification({
                        type: 'success',
                        message: 'Trajectories generated successfully!'
                        });
                }, 1000);
                setIsLoading(false);
            }
        }
    } catch (error) {
        setNotification({
            type: 'error',
            message: currentStep === 2
                ? 'Failed to create ngram dictionaries. Please try again.'
                : 'Failed to generate trajectories. Please try again.'
        });
        setIsLoading(false);
    }

    };

    return {
    handleUnifiedSubmit,
    notification,
    isLoading,
    progress,
    progressMessage,
    setNotification,
    showCachePopUp,
    setCacheFileName,
    handleSaveCache,
    defaultCacheFile,
    setShowCachePopup
   };

}

export default UnifiedFormSubmit;