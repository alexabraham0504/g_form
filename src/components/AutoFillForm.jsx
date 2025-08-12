import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFormByPublicId, savePublicFormResponse, createForm } from '../services/firestore';

// Add CSS animations
const styles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }
`;

const AutoFillForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formUrl, setFormUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scrapedData, setScrapedData] = useState(null);
  const [autoFilledAnswers, setAutoFilledAnswers] = useState({});
  const [submissionTimestamp, setSubmissionTimestamp] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualQuestions, setManualQuestions] = useState('');
  const [formEntryId, setFormEntryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [responseOptions, setResponseOptions] = useState({
    count: 5,
    positiveCount: 3,
    negativeCount: 2
  });



  const validateGoogleFormUrl = (url) => {
    const googleFormPatterns = [
      /^https:\/\/docs\.google\.com\/forms\/d\/[a-zA-Z0-9_-]+\/viewform/,
      /^https:\/\/docs\.google\.com\/forms\/d\/[a-zA-Z0-9_-]+\/edit/,
      /^https:\/\/docs\.google\.com\/forms\/d\/[a-zA-Z0-9_-]+/,
      /^https:\/\/forms\.gle\/[a-zA-Z0-9_-]+/,
      /^https:\/\/goo\.gl\/forms\/[a-zA-Z0-9_-]+/
    ];
    const internalFormPattern = /\/public\/([a-zA-Z0-9_-]+)/;
    
    const isValid = googleFormPatterns.some(pattern => pattern.test(url)) || internalFormPattern.test(url);
    
    if (isValid) {
      console.log('URL validation passed for:', url);
    } else {
      console.log('URL validation failed for:', url);
    }
    
    return isValid;
  };

  const extractFormEntryId = (url) => {
    const googleFormMatch = url.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (googleFormMatch) return googleFormMatch[1];
    const internalFormMatch = url.match(/\/public\/([a-zA-Z0-9_-]+)/);
    return internalFormMatch ? internalFormMatch[1] : null;
  };

  const extractQuestionsFromHTML = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const questions = [];
    
    // Enhanced selectors for Google Forms
    const selectors = [
      // Primary selectors for Google Forms
      '.freebirdFormviewerViewItemsItemItemTitle',
      '.freebirdFormviewerViewItemsItemItemTitleText',
      '.freebirdFormviewerViewItemsItemItemTitleTextContainer',
      '[data-item-id] .freebirdFormviewerViewItemsItemItemTitle',
      '.freebirdFormviewerViewItemsItemItem',
      '.freebirdFormviewerViewItemsItemItemTitleTextContainer',
      '.freebirdFormviewerViewItemsItemItemTitleText',
      // Additional selectors for different  Form layouts
      '.freebirdFormviewerViewItemsItemItemTitleTextContainer span',
      '.freebirdFormviewerViewItemsItemItemTitleText span',
      '.freebirdFormviewerViewItemsItemItemTitle span',
      // Selectors for form sections
      '.freebirdFormviewerViewItemsItemItem',
      '.freebirdFormviewerViewItemsItemItemTitle',
      // Selectors for specific question types
      '[data-item-id]',
      '.freebirdFormviewerViewItemsItemItemTitleTextContainer div',
      '.freebirdFormviewerViewItemsItemItemTitleTextContainer p'
    ];
    
    let questionElements = [];
    
    // Try each selector
    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} potential questions using selector: ${selector}`);
        questionElements = Array.from(elements);
        break;
      }
    }
    
    // If no questions found with specific selectors, try a more comprehensive approach
    if (questionElements.length === 0) {
      console.log('No questions found with specific selectors, trying comprehensive approach');
      
      // Look for elements with data-item-id attribute (Google Forms specific)
      const itemElements = doc.querySelectorAll('[data-item-id]');
      console.log(`Found ${itemElements.length} elements with data-item-id`);
      
      itemElements.forEach((item, index) => {
        // Look for title elements within each item
        const titleSelectors = [
          '.freebirdFormviewerViewItemsItemItemTitle',
          '.freebirdFormviewerViewItemsItemItemTitleText',
          '.freebirdFormviewerViewItemsItemItemTitleTextContainer',
          'div[role="heading"]',
          'span[role="heading"]'
        ];
        
        for (const titleSelector of titleSelectors) {
          const titleElement = item.querySelector(titleSelector);
          if (titleElement) {
            const questionText = titleElement.textContent?.trim();
            if (questionText && questionText.length > 3) {
              questionElements.push(titleElement);
              break;
            }
          }
        }
      });
    }
    
    // If still no questions, try general text-based approach
    if (questionElements.length === 0) {
      console.log('Trying general text-based approach');
      const allElements = doc.querySelectorAll('*');
      const potentialQuestions = [];
      
      for (const element of allElements) {
        const text = element.textContent?.trim();
        if (text && text.length > 10 && text.length < 300 && 
            (text.includes('?') || text.includes('What') || text.includes('How') || 
             text.includes('Please') || text.includes('Tell') || text.includes('Enter') ||
             text.includes('Name') || text.includes('Email') || text.includes('Phone'))) {
          potentialQuestions.push(element);
        }
      }
      
      questionElements = potentialQuestions;
    }
    
    // Process and deduplicate questions
    const seenQuestions = new Set();
    questionElements.forEach((element, index) => {
      const questionText = element.textContent?.trim();
      // Skip the suspicious report question
      if (questionText && 
          questionText.length > 3 && 
          !seenQuestions.has(questionText) && 
          !questionText.includes("Does this form look suspicious? Report") && 
          !questionText.includes("suspicious") && 
          !questionText.includes("Report")) {
        seenQuestions.add(questionText);
        
        // Try to determine question type
        let questionType = 'text';
        let options = [];
        
        // Check if this is a multiple-choice question by looking for radio buttons
        const parentItem = element.closest('[data-item-id]') || element.parentElement;
        if (parentItem) {
          // Look for radio buttons (multiple choice)
          const radioInputs = parentItem.querySelectorAll('input[type="radio"]');
          if (radioInputs.length > 0) {
            questionType = 'multiple-choice';
            
            // Extract options
            const optionElements = parentItem.querySelectorAll('.freebirdFormviewerViewItemsItemChoice, .docssharedWizToggleLabeledLabelText');
            if (optionElements.length > 0) {
              options = Array.from(optionElements).map(opt => opt.textContent?.trim()).filter(Boolean);
            }
          }
          
          // Look for checkboxes
          const checkboxInputs = parentItem.querySelectorAll('input[type="checkbox"]');
          if (checkboxInputs.length > 0) {
            questionType = 'checkboxes';
            
            // Extract options
            const optionElements = parentItem.querySelectorAll('.freebirdFormviewerViewItemsItemChoice, .docssharedWizToggleLabeledLabelText');
            if (optionElements.length > 0) {
              options = Array.from(optionElements).map(opt => opt.textContent?.trim()).filter(Boolean);
            }
          }
          
          // Look for dropdown
          const selectElements = parentItem.querySelectorAll('select');
          if (selectElements.length > 0) {
            questionType = 'dropdown';
            
            // Extract options from select
            const optionElements = selectElements[0].querySelectorAll('option');
            if (optionElements.length > 0) {
              options = Array.from(optionElements).map(opt => opt.textContent?.trim()).filter(Boolean);
            }
          }
        }
        
        questions.push({
          id: `question_${index}`,
          text: questionText,
          type: questionType,
          options: options.length > 0 ? options : ['Option 1', 'Option 2', 'Option 3'] // Default options if none found
        });
      }
    });
    
    console.log('Filtered out any "suspicious report" questions');
    
    console.log(`Extracted ${questions.length} unique questions:`, questions.map(q => q.text));
    return questions;
  };

  const generateGeminiPrompt = (questions, namesList = []) => {
    const questionList = questions.map(q => {
      if (q.type === 'multiple-choice' || q.type === 'checkbox' || 
          q.type === 'multiple_choice' || q.type === 'checkboxes' || 
          q.type === 'dropdown') {
        return `${q.text} (${q.type})`;
      }
      return q.text;
    }).join('\n- ');
    
    const positiveCount = responseOptions.positiveCount;
    const negativeCount = responseOptions.negativeCount;
    
    // Check if we have a name question and names list
    const nameQuestion = questions.find(q => q.id === 'name_q' || (q.metadata && q.metadata.source === 'name_upload'));
    const hasNameDistribution = nameQuestion && namesList && namesList.length > 0;
    
    let nameInstructions = '';
    if (hasNameDistribution) {
      // Add instructions for name distribution
      nameInstructions = `\n\nFor the Name question, please use only these exact names from the provided list:\n${namesList.join(', ')}\n\nDistribute these names evenly across the ${responseOptions.count} response sets.`;
    }
    
    return `Please provide ${responseOptions.count} sets of realistic and appropriate answers for the following form questions. Each answer should be 1-3 sentences and contextually relevant.

Questions:
- ${questionList}

Make ${positiveCount} of the responses positive/favorable and ${negativeCount} negative/critical in sentiment.${nameInstructions}

For multiple choice or checkbox questions, provide a clear selection from the available options. DO NOT generate text answers for multiple choice questions - just select one of the available options exactly as it appears.

Please respond with only the answers, with each set of answers separated by "---" and each answer within a set on a new line.`;
  };

  const callGeminiAPI = async (prompt) => {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env file.');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  const parseGeminiResponse = (response, questions, namesList = []) => {
    const answerSets = response.split('---').map(set => set.trim());
    const allAnswerSets = [];
    answerSets.forEach((answerSet, setIndex) => {
      const answers = answerSet.split('\n').filter(line => line.trim());
      const answersMap = {};
      
      questions.forEach((question, index) => {
        if (index < answers.length) {
          // Handle multiple-choice and checkbox questions differently
          if (question.type === 'multiple-choice' || question.type === 'checkbox' || 
              question.type === 'multiple_choice' || question.type === 'checkboxes' || 
              question.type === 'dropdown') {
            // For multiple-choice questions, we need to extract the exact option
            // from the Gemini response
            const answerText = answers[index];
            
            // Special handling for name questions when we have a namesList
            const isNameQuestion = question.id === 'name_q' || 
                                  (question.metadata && question.metadata.source === 'name_upload') ||
                                  question.text.toLowerCase() === 'name' || 
                                  question.text.toLowerCase().includes('name');
            
            if (isNameQuestion && namesList && namesList.length > 0) {
              // For name questions, prioritize using names from the namesList
              // Try to find an exact match in the namesList first
              const nameMatch = namesList.find(name => 
                answerText.toLowerCase() === name.toLowerCase() || 
                answerText.includes(name));
              
              if (nameMatch) {
                // Use the exact name from the namesList
                answersMap[question.id] = nameMatch;
                console.log(`Using name from namesList for set ${setIndex + 1}: ${nameMatch}`);
              } else {
                // If no match in namesList, use a name from the list based on the setIndex
                // This ensures even distribution of names across answer sets
                const nameIndex = setIndex % namesList.length;
                answersMap[question.id] = namesList[nameIndex];
                console.log(`Assigning name for set ${setIndex + 1}: ${namesList[nameIndex]}`);
              }
            } else if (question.options && question.options.length > 0) {
              // For other multiple choice questions with options
              // First, check for exact matches
              const exactMatch = question.options.find(opt => 
                answerText.toLowerCase() === opt.toLowerCase() || 
                answerText.includes(opt));
              
              if (exactMatch) {
                // Use the exact option text from the question's options
                answersMap[question.id] = exactMatch;
              } else {
                // If no exact match, use the first option as fallback
                // This ensures we always select a valid option
                answersMap[question.id] = question.options[0];
              }
            } else {
              // If no options are available, just use the answer text
              answersMap[question.id] = answerText;
            }
          } else {
            // For text-based questions, use the answer as-is
            answersMap[question.id] = answers[index];
          }
        } else {
          answersMap[question.id] = 'No answer generated';
        }
      });
      
      allAnswerSets.push(answersMap);
    });
    // Return all answer sets instead of just the first one
    return allAnswerSets;
  };

  const submitToGoogleForm = async (formUrl, answers) => {
    try {
      console.log('Submitting responses to Google Form:', formUrl);
      
      // Extract form entry ID
      const entryId = extractFormEntryId(formUrl);
      if (!entryId) {
        throw new Error('Could not extract form ID from URL');
      }
      
      console.log('Form entry ID:', entryId);
      const formResponseUrl = `https://docs.google.com/forms/d/${entryId}/formResponse`;
      console.log('Form response URL:', formResponseUrl);
      
      // Create form data with proper entry IDs
      const formData = new URLSearchParams();
      Object.keys(answers).forEach((questionId, index) => {
        const answer = answers[questionId];
        if (answer && answer.trim()) {
          // Try different entry ID patterns
          formData.append(`entry.${index + 1}`, answer);
          formData.append(`entry.${index + 1}`, answer);
        }
      });
      
      console.log('Form data to submit:', Object.fromEntries(formData));
      
      // Enhanced proxy list with more reliable options
      const proxies = [
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://cors-anywhere.herokuapp.com/',
        'https://cors.bridged.cc/'
      ];

      let submitted = false;
      
      // Try each proxy
      for (const proxy of proxies) {
        try {
          console.log(`Trying to submit via proxy: ${proxy}`);
          
          const response = await fetch(proxy + encodeURIComponent(formResponseUrl), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            body: formData,
            mode: 'cors'
          });

          console.log(`Proxy response status: ${response.status}`);
          
          if (response.ok || response.status === 200 || response.status === 302) {
            console.log('Form submitted successfully via proxy');
            submitted = true;
            break;
          }
        } catch (error) {
          console.log(`Proxy ${proxy} failed for submission:`, error.message);
          continue;
        }
      }

      // If proxy submission failed, try direct submission with no-cors
      if (!submitted) {
        try {
          console.log('Trying direct submission with no-cors mode');
          const response = await fetch(formResponseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            mode: 'no-cors' 
          });
          
          console.log('Form submitted via direct method (no-cors)');
          submitted = true;
        } catch (error) {
          console.log('Direct submission failed:', error.message);
        }
      }

      // If still not submitted, try with iframe method
      if (!submitted) {
        try {
          console.log('Trying iframe submission method');
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = formResponseUrl;
          form.target = iframe.name;
          
          Object.keys(answers).forEach((questionId, index) => {
            const answer = answers[questionId];
            if (answer && answer.trim()) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = `entry.${index + 1}`;
              input.value = answer;
              form.appendChild(input);
            }
          });
          
          document.body.appendChild(form);
          form.submit();
          
          setTimeout(() => {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
          }, 1000);
          
          console.log('Form submitted via iframe method');
          submitted = true;
        } catch (error) {
          console.log('Iframe submission failed:', error.message);
        }
      }

      return submitted;
    } catch (error) {
      console.error('Error submitting to Google Form:', error);
      throw new Error('Failed to submit responses to Google Form');
    }
  };

  const handleScrapeAndAutoFill = async () => {
    if (!formUrl.trim()) {
      setError('Please enter a form URL');
      return;
    }

    console.log('Validating URL:', formUrl);
    if (!validateGoogleFormUrl(formUrl)) {
      setError('Please enter a valid form URL. Supported formats:\n\nInternal Forms:\n- localhost:5173/public/[ID] or any URL with /public/[ID]\n\nMake sure the form is publicly accessible and the URL is correct.');
      return;
    }
    
    // Clear previous messages
    setError('');
    setSuccess('');
    setShowModal(true);
    
    // The processForm function will be called when the user clicks Generate in the modal
  };
  
  const processForm = async () => {
    console.log('processForm started');
    
    // Validate that positive + negative equals total count
    if (responseOptions.positiveCount + responseOptions.negativeCount !== responseOptions.count) {
      alert(`The sum of positive (${responseOptions.positiveCount}) and negative (${responseOptions.negativeCount}) responses must equal the total count (${responseOptions.count}).`);
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    setShowModal(false);

    try {
      const internalFormMatch = formUrl.match(/\/public\/([a-zA-Z0-9_-]+)/);
      
      if (internalFormMatch) {
        const publicId = internalFormMatch[1];
        console.log('Processing internal form with publicId:', publicId);
        const form = await getFormByPublicId(publicId);
        
        console.log('Retrieved form:', form);
        console.log('Form structure:', {
          id: form.id,
          title: form.title,
          publicId: form.publicId,
          isPublished: form.isPublished,
          questions: form.questions
        });
        
        if (!form) {
          throw new Error('Internal form not found. Please check the URL.');
        }
        
        if (!form.isPublished) {
          console.log('Form is not published, but continuing anyway for testing');
          // throw new Error('This form is not published. Please publish the form first before using auto-fill.');
        }
        
        const questions = form.questions.map((q, index) => ({
          id: `question_${index}`,
          text: q.questionText,
          type: q.type || 'text',
          options: q.options || []
        }));
        
        if (questions.length === 0) {
          throw new Error('No questions found in the form.');
        }
        
        // Check if form has nameUpload data
        let namesList = [];
        if (form.nameUpload && form.nameUpload.enabled && form.nameUpload.names && form.nameUpload.names.length > 0) {
          namesList = form.nameUpload.names;
          console.log('Using names from nameUpload:', namesList);
        }
        
        const prompt = generateGeminiPrompt(questions, namesList);
        console.log('Generated prompt for Gemini');
        const geminiResponse = await callGeminiAPI(prompt);
        console.log('Gemini response received');
        const answerSets = parseGeminiResponse(geminiResponse, questions, namesList);
        console.log(`Parsed ${answerSets.length} answer sets`);
        
        // Use the first answer set for display in the UI
        const firstAnswerSet = answerSets[0] || {};
        console.log('First answer set for UI display:', firstAnswerSet);
        // Helper functions for title normalization and date formatting (if not already defined)
        function isoDate(d = new Date()) {
          return d.toISOString().slice(0, 10); // YYYY-MM-DD
        }
        
        // Remove trailing dates like " - 8/11/2025" or " - 2025-08-11"
        function stripTrailingDate(title) {
          if (!title || typeof title !== 'string') return title || '';
          return title.replace(/\s*[-–—]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\s*$/i, '').trim();
        }
        
        const parsedTitle = form.title || 'Internal Form';
        const cleanTitle = stripTrailingDate(parsedTitle);
        const finalTitle = `${cleanTitle} - ${isoDate()}`;
        console.log('Parsed title (internal):', parsedTitle);
        console.log('Clean title (internal):', cleanTitle);
        console.log('Final title (internal):', finalTitle);
        
        const formData = {
          url: formUrl,
          title: finalTitle,
          questions: questions,
          publicId: form.publicId || publicId, // Use form.publicId if available, otherwise use extracted publicId
          formId: form.id,
          userId: form.userId
        };
        console.log('Created formData:', formData);
        console.log('FormData publicId:', formData.publicId);
        console.log('FormData formId:', formData.formId);
        setScrapedData(formData);
        setAutoFilledAnswers(firstAnswerSet);
        
        // Submit responses directly with the data
        await handleSubmitResponsesWithData(formData, answerSets);
      } else {
        console.log('Fetching form HTML from:', formUrl);
        let html = null;
        
        // Try multiple approaches to fetch the form HTML
        const fetchMethods = [
          // Method 1: Try local server proxy (if available)
          async () => {
            try {
              console.log('Trying local server proxy...');
              const API_BASE_URL = import.meta.env.VITE_API_URL || '';
              const response = await fetch(`${API_BASE_URL}/api/proxy-form`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: formUrl })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.html) {
                  console.log('Successfully fetched HTML using local server proxy');
                  return data.html;
                }
              }
            } catch (error) {
              console.log('Local server proxy failed:', error.message);
            }
            return null;
          },
          
          // Method 2: Enhanced CORS proxies with better error handling
          async () => {
            const proxies = [
              'https://corsproxy.io/?',
              'https://api.codetabs.com/v1/proxy?quest=',
              'https://thingproxy.freeboard.io/fetch/',
              'https://cors.bridged.cc/',
              'https://api.allorigins.win/raw?url=',
              'https://cors-anywhere.herokuapp.com/'
            ];
            
            for (const proxy of proxies) {
              try {
                console.log(`Trying CORS proxy: ${proxy}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                
                const response = await fetch(proxy + encodeURIComponent(formUrl), {
                  method: 'GET',
                  headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  },
                  signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                  const html = await response.text();
                  console.log(`Successfully fetched HTML using ${proxy}, length:`, html.length);
                  return html;
                } else {
                  console.log(`Proxy ${proxy} returned status: ${response.status}`);
                }
              } catch (error) {
                console.log(`Proxy ${proxy} failed:`, error.message);
                continue;
              }
            }
            return null;
          },
          
          // Method 3: Try using a different approach with JSONP-like technique
          async () => {
            try {
              console.log('Trying JSONP-like approach...');
              // Create a script tag to bypass CORS
              return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `https://api.allorigins.win/get?url=${encodeURIComponent(formUrl)}&callback=handleFormData`;
                
                window.handleFormData = (data) => {
                  if (data && data.contents) {
                    console.log('Successfully fetched HTML using JSONP approach');
                    resolve(data.contents);
                  } else {
                    reject(new Error('No data received from JSONP'));
                  }
                  document.head.removeChild(script);
                  delete window.handleFormData;
                };
                
                script.onerror = () => {
                  document.head.removeChild(script);
                  delete window.handleFormData;
                  reject(new Error('JSONP script failed to load'));
                };
                
                document.head.appendChild(script);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                  if (document.head.contains(script)) {
                    document.head.removeChild(script);
                    delete window.handleFormData;
                    reject(new Error('JSONP request timed out'));
                  }
                }, 10000);
              });
            } catch (error) {
              console.log('JSONP approach failed:', error.message);
              return null;
            }
          },
          
          // Method 4: Try using a service worker approach (if available)
          async () => {
            try {
              console.log('Trying service worker approach...');
              if ('serviceWorker' in navigator) {
                const API_BASE_URL = import.meta.env.VITE_API_URL || '';
                const response = await fetch(`${API_BASE_URL}/api/form-proxy`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    url: formUrl,
                    method: 'GET'
                  })
                });
                
                if (response.ok) {
                  const html = await response.text();
                  console.log('Successfully fetched HTML using service worker');
                  return html;
                }
              }
            } catch (error) {
              console.log('Service worker approach failed:', error.message);
            }
            return null;
          },
          
          // Method 5: Try using Google Forms API approach
          async () => {
            try {
              console.log('Trying Google Forms API approach...');
              // Extract form ID from URL
              const formIdMatch = formUrl.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
              if (!formIdMatch) {
                console.log('Could not extract form ID from URL');
                return null;
              }
              
              const formId = formIdMatch[1];
              console.log('Extracted form ID:', formId);
              
              // Try to fetch form data using a different approach
              const response = await fetch(`https://docs.google.com/forms/d/${formId}/viewform`, {
                method: 'GET',
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.5',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept-Encoding': 'gzip, deflate',
                  'Connection': 'keep-alive',
                  'Upgrade-Insecure-Requests': '1'
                },
                mode: 'no-cors'
              });
              
              if (response.type === 'opaque') {
                console.log('Received opaque response, trying to process...');
                // For opaque responses, we can't read the content directly
                // But we can try to submit to the form
                return 'OPAQUE_RESPONSE';
              }
            } catch (error) {
              console.log('Google Forms API approach failed:', error.message);
            }
            return null;
          },
          
          // Method 6: Try using a different proxy service
          async () => {
            try {
              console.log('Trying alternative proxy service...');
              const alternativeProxies = [
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://thingproxy.freeboard.io/fetch/',
                'https://cors.bridged.cc/',
                'https://api.allorigins.win/raw?url=',
                'https://corsproxy.io/?'
              ];
              
              for (const proxy of alternativeProxies) {
                try {
                  console.log(`Trying alternative proxy: ${proxy}`);
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 5000);
                  
                  const response = await fetch(proxy + encodeURIComponent(formUrl), {
                    method: 'GET',
                    headers: {
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                      'Accept-Language': 'en-US,en;q=0.5',
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      'Accept-Encoding': 'gzip, deflate',
                      'Connection': 'keep-alive'
                    },
                    signal: controller.signal
                  });
                  
                  clearTimeout(timeoutId);
                  
                  if (response.ok) {
                    const html = await response.text();
                    console.log(`Successfully fetched HTML using alternative proxy ${proxy}, length:`, html.length);
                    return html;
                  }
                } catch (error) {
                  console.log(`Alternative proxy ${proxy} failed:`, error.message);
                  continue;
                }
              }
            } catch (error) {
              console.log('Alternative proxy service approach failed:', error.message);
            }
            return null;
          }
        ];
        
        // Try each method until one succeeds
        for (let i = 0; i < fetchMethods.length; i++) {
          try {
            console.log(`Trying fetch method ${i + 1}...`);
            html = await fetchMethods[i]();
            if (html) {
              console.log(`Successfully fetched HTML using method ${i + 1}`);
              break;
            }
          } catch (error) {
            console.log(`Fetch method ${i + 1} failed:`, error.message);
            continue;
          }
        }
        
        if (!html) {
          // If all methods fail, provide a more helpful error message
          throw new Error(`Failed to fetch the Google Form HTML. All methods failed.\n\nThis could be due to:\n1. The form is not publicly accessible\n2. Network connectivity issues\n3. CORS restrictions\n4. The form URL might be incorrect\n\nAlternative solutions:\n1. Try using the "Enter Questions Manually" option below\n2. Make sure the form is set to "Anyone with the link can respond"\n3. Try a different form URL\n4. Check your internet connection`);
        }
        
        // Handle special case for opaque responses
        if (html === 'OPAQUE_RESPONSE') {
          console.log('Received opaque response, providing manual option');
          setError(`The form was detected but we cannot read its content due to security restrictions.\n\nPlease use the "Enter Questions Manually" option below to:\n1. Manually enter the form questions\n2. Generate AI responses\n3. Submit to the Google Form\n\nThis is a common limitation when accessing Google Forms from web browsers.`);
          setShowManualInput(true);
          return;
        }

        // Parse the form and extract questions
        const questions = extractQuestionsFromHTML(html);
        console.log('Extracted questions:', questions);
        
        if (questions.length === 0) {
          console.log('HTML content preview:', html.substring(0, 1000));
          throw new Error('No questions found in the form. This might be due to:\n1. The form is not publicly accessible\n2. The form structure has changed\n3. CORS restrictions preventing proper HTML parsing\n\nPlease try:\n- Making sure the form is publicly accessible\n- Using a different form\n- Manually entering the questions using the "Enter Questions Manually" option');
        }
        const prompt = generateGeminiPrompt(questions);
        console.log('Generated prompt for Gemini');
        const geminiResponse = await callGeminiAPI(prompt);
        console.log('Gemini response received');
        const answers = parseGeminiResponse(geminiResponse, questions);
        console.log('Parsed answers:', answers);
        // Helper functions for title normalization and date formatting
        function isoDate(d = new Date()) {
          return d.toISOString().slice(0, 10); // YYYY-MM-DD
        }
        
        // Remove trailing dates like " - 8/11/2025" or " - 2025-08-11"
        function stripTrailingDate(title) {
          if (!title || typeof title !== 'string') return title || '';
          return title.replace(/\s*[-–—]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\s*$/i, '').trim();
        }
        
        // Extract title from HTML
        let parsedTitle = "External Google Form";
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          // Try to get title from various possible elements
          const titleElement = doc.querySelector('title') || 
                              doc.querySelector('.freebirdFormviewerViewHeaderTitle') ||
                              doc.querySelector('.freebirdFormviewerViewHeaderTitleText');
          
          if (titleElement && titleElement.textContent) {
            parsedTitle = titleElement.textContent.trim();
          }
          
          // Also try to extract from JSON if available
          const scriptElements = doc.querySelectorAll('script');
          for (const script of scriptElements) {
            if (script.textContent && script.textContent.includes('FB_PUBLIC_LOAD_DATA_')) {
              const match = script.textContent.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.+?\]);/);
              if (match && match[1]) {
                try {
                  const jsonData = JSON.parse(match[1]);
                  // Form title is typically in the first few elements of the array
                  if (jsonData && jsonData[1] && jsonData[1][8]) {
                    parsedTitle = jsonData[1][8];
                  }
                } catch (e) {
                  console.log('Error parsing form JSON data:', e);
                }
              }
            }
          }
        } catch (e) {
          console.log('Error extracting form title:', e);
        }
        
        // Clean the title and add ISO date
        const cleanTitle = stripTrailingDate(parsedTitle);
        const finalTitle = `${cleanTitle} - ${isoDate()}`;
        console.log('Parsed title:', parsedTitle);
        console.log('Clean title:', cleanTitle);
        console.log('Final title:', finalTitle);
        
        const formData = {
          url: formUrl,
          title: finalTitle,
          questions: questions,
          isExternal: true,
          formEntryId: extractFormEntryId(formUrl)
        };
        
        console.log('Created external form data:', formData);
        setScrapedData(formData);
        setAutoFilledAnswers(firstAnswerSet);
        
        // Submit to external Google Form
        const submitted = await submitToGoogleForm(formUrl, answers);
        
        if (submitted) {
          setSuccess('Form scraped successfully! They should now appear in the form owner\'s .');
          
          // Also save to Firestore for record keeping
          const firestoreData = {
            title: formData.title,
            description: `Auto-filled external form submitted to: ${formUrl}`,
            createdAt: new Date(),
            questions: formData.questions.map(question => ({
              type: question.type || 'text',
              questionText: question.text,
              options: question.options || [],
              required: false
            })),
            autoFilledAnswers: answers,
            originalUrl: formUrl,
            submissionTimestamp: new Date().toISOString(),
            submittedToGoogleForm: true,
            isExternal: true
          };

          await createForm(user.uid, firestoreData);
          
          // Clear success message after 5 seconds
          setTimeout(() => {
            setSuccess('');
          }, 5000);
          
          setTimeout(() => {
            navigate('/forms');
          }, 2000);
        } else {
          setError('Failed to scrape Form. The responses have been saved locally, but could not be submitted to the original form.');
        }
      }
    } catch (error) {
      console.error('Error during scraping:', error);
      console.log('Setting error:', error.message || 'An error occurred while scraping the form');
      setError(error.message || 'An error occurred while scraping the form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualQuestionsSubmit = async () => {
    if (!manualQuestions.trim()) {
      setError('Please enter the form questions');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const questionLines = manualQuestions.split('\n').filter(line => line.trim());
      const questions = questionLines.map((text, index) => {
        // Check if the question includes type information in parentheses
        const typeMatch = text.match(/\((multiple-choice|multiple_choice|checkboxes|checkbox|dropdown)\)\s*$/i);
        let questionType = 'text';
        let questionText = text.trim();
        let options = [];
        
        if (typeMatch) {
          // Extract the question type and remove it from the question text
          const matchedType = typeMatch[1].toLowerCase();
          questionText = text.replace(/\s*\([^)]+\)\s*$/, '').trim();
          
          // Map the matched type to the correct question type
          if (matchedType === 'multiple-choice' || matchedType === 'multiple_choice') {
            questionType = 'multiple-choice';
            options = ['Option 1', 'Option 2', 'Option 3'];
          } else if (matchedType === 'checkboxes' || matchedType === 'checkbox') {
            questionType = 'checkboxes';
            options = ['Option 1', 'Option 2', 'Option 3'];
          } else if (matchedType === 'dropdown') {
            questionType = 'dropdown';
            options = ['Option 1', 'Option 2', 'Option 3'];
          }
        }
        
        return {
          id: `question_${index}`,
          text: questionText,
          type: questionType,
          options: options
        };
      });

      if (questions.length === 0) {
        throw new Error('Please enter at least one question');
      }

      console.log('Manual questions:', questions);

      // Generate prompt for Gemini
      // For manual questions, we don't have nameUpload data directly
      // But we can check if there's a name question and use it
      let namesList = [];
      const nameQuestion = questions.find(q => 
        q.text.toLowerCase() === 'name' || 
        q.text.toLowerCase().includes('name') && 
        (q.type === 'dropdown' || q.type === 'multiple-choice')
      );
      
      if (nameQuestion && nameQuestion.options && nameQuestion.options.length > 0) {
        namesList = nameQuestion.options;
        console.log('Using names from name question options in handleGenerateManualResponses:', namesList);
      }
      
      const prompt = generateGeminiPrompt(questions, namesList);
      console.log('Generated prompt for Gemini');

      // Call Gemini API
      const geminiResponse = await callGeminiAPI(prompt);
      console.log('Gemini response received');

      // Parse Gemini response
      const answerSets = parseGeminiResponse(geminiResponse, questions, namesList);
      console.log(`Parsed ${answerSets.length} answer sets`);
      
      // Use the first answer set for display in the UI
      const firstAnswerSet = answerSets[0] || {};
      console.log('First answer set for UI display:', firstAnswerSet);

      // Helper functions for title normalization and date formatting (if not already defined)
      function isoDate(d = new Date()) {
        return d.toISOString().slice(0, 10); // YYYY-MM-DD
      }
      
      // Remove trailing dates like " - 8/11/2025" or " - 2025-08-11"
      function stripTrailingDate(title) {
        if (!title || typeof title !== 'string') return title || '';
        return title.replace(/\s*[-–—]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\s*$/i, '').trim();
      }
      
      const parsedTitle = 'Manual Form';
      const finalTitle = `${parsedTitle} - ${isoDate()}`;
      console.log('Final title (manual):', finalTitle);
      
      // Set the data
      setScrapedData({
        url: 'Manual Input',
        title: finalTitle,
        questions: questions
      });
      setAutoFilledAnswers(answers);

      setSuccess(`Successfully processed ${questions.length} questions and generated answers!`);

    } catch (error) {
      console.error('Error processing manual questions:', error);
      setError(error.message || 'An error occurred while processing the questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId, newAnswer) => {
    setAutoFilledAnswers(prev => ({
      ...prev,
      [questionId]: newAnswer
    }));
  };

  const handleSaveToFirestore = async () => {
    if (!scrapedData || Object.keys(autoFilledAnswers).length === 0) {
      setError('No data to save. Please scrape a form first.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Sanitize autoFilledAnswers to remove any undefined values
      const sanitizedAnswers = {};
      Object.keys(autoFilledAnswers).forEach(key => {
        if (autoFilledAnswers[key] !== undefined) {
          sanitizedAnswers[key] = autoFilledAnswers[key];
        }
      });
      
      // Filter out any suspicious report questions
      const filteredQuestions = scrapedData.questions.filter(question => {
        const questionText = question.text || question.questionText;
        return !questionText.includes("Does this form look suspicious? Report") && 
               !questionText.includes("suspicious") && 
               !questionText.includes("Report");
      });
      console.log('Questions (filtered for saving to Firestore):', filteredQuestions);
      
      // Create form data with sanitized values and default values for any potentially undefined fields
      const formData = {
        title: scrapedData.title || 'Untitled Form',
        description: scrapedData.url ? `Auto-filled form scraped from: ${scrapedData.url}` : 'Auto-filled form',
        createdAt: new Date(),
        questions: filteredQuestions.map(question => ({
          type: question.type || 'text',
          questionText: question.text || 'Untitled Question',
          options: question.options || [],
          required: false
        })).filter(q => q.questionText), // Filter out any questions with empty text
        autoFilledAnswers: sanitizedAnswers,
        originalUrl: scrapedData.url || '',
        submissionTimestamp: submissionTimestamp || new Date().toISOString()
      };

      await createForm(user.uid, formData);
      setSuccess('Form saved successfully!');
      
      setTimeout(() => {
        navigate('/forms');
      }, 1500);

    } catch (error) {
      console.error('Error saving form:', error);
      setError('Failed to save form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmitResponsesWithData = async (formData, answerSets) => {
    console.log('handleSubmitResponsesWithData called with:', { formData });
    console.log(`Processing ${answerSets.length} answer sets`);
    
    if (!formData) {
      console.log('No form data provided');
      setError('No form data available. Please scrape a form first.');
      return;
    }
    
    if (!formData.publicId) {
      console.log('No public ID in form data:', formData);
      setError('This form does not have a public ID. Only public forms can receive responses.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Form data:', formData);
      console.log('Public ID:', formData.publicId);
      console.log('Form ID:', formData.formId);
      
      // Filter out any suspicious report questions
      const questions = formData.questions.filter(question => {
        const questionText = question.text || question.questionText;
        return !questionText.includes("Does this form look suspicious? Report") && 
               !questionText.includes("suspicious") && 
               !questionText.includes("Report");
      });
      console.log('Questions (filtered):', questions);
      
      // Check if we have nameUpload data in the form
      let namesList = [];
      if (formData.nameUpload && formData.nameUpload.enabled && 
          formData.nameUpload.names && formData.nameUpload.names.length > 0) {
        namesList = formData.nameUpload.names;
        console.log('Using names from nameUpload in handleSubmitResponsesWithData:', namesList);
      }
      
      // If we don't have answer sets yet, generate them using Gemini
      if (!answerSets || answerSets.length === 0) {
        const prompt = generateGeminiPrompt(questions, namesList);
        const geminiResponse = await callGeminiAPI(prompt);
        answerSets = parseGeminiResponse(geminiResponse, questions, namesList);
        console.log(`Generated ${answerSets.length} response sets`);
      }
      
      // Process and save each answer set
      for (let i = 0; i < answerSets.length; i++) {
        const answerSet = answerSets[i];
        console.log(`Processing answer set ${i+1}/${answerSets.length}:`, answerSet);
        
        // Create a response object for this answer set
        const answersMap = {};
        
        questions.forEach((question) => {
          // Get the answer for this question from the answer set
          let answer = answerSet[question.id] || 'No answer generated';
          answersMap[question.text] = answer;
          
          // Log name usage for debugging
          const isNameQuestion = question.id === 'name_q' || 
                               (question.metadata && question.metadata.source === 'name_upload') ||
                               question.text.toLowerCase() === 'name' || 
                               question.text.toLowerCase().includes('name');
          
          if (isNameQuestion) {
            console.log(`Using name in set ${i+1}: ${answer}`);
          }
        });
        
        console.log('Answers map:', answersMap);
        
        if (Object.keys(answersMap).length > 0) {
          console.log('Saving response with publicId:', formData.publicId);
          await savePublicFormResponse(formData.publicId, { answers: answersMap });
          console.log('Response saved successfully');
        }
      }
      
      // Navigate immediately to responses page
      if (formData.formId) {
        console.log('Navigating to form responses:', formData.formId);
        navigate(`/form-responses/${formData.formId}`);
      } else {
        console.log('Navigating to forms list');
        navigate('/forms');
      }
      
    } catch (error) {
      console.error('Error submitting responses:', error);
      console.log('Setting error in handleSubmitResponsesWithData:', error.message);
      setError('Failed to submit responses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitResponses = async () => {
    if (!scrapedData) {
      setError('No form data available. Please scrape a form first.');
      return;
    }
    
    if (!scrapedData.publicId) {
      setError('This form does not have a public ID. Only public forms can receive responses.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Generate multiple sets of responses based on the count
      // Filter out any suspicious report questions
      const questions = scrapedData.questions.filter(question => {
        const questionText = question.text || question.questionText;
        return !questionText.includes("Does this form look suspicious? Report") && 
               !questionText.includes("suspicious") && 
               !questionText.includes("Report");
      });
      console.log('Questions (filtered):', questions);
      
      // Check if we have nameUpload data in the form
      let namesList = [];
      if (scrapedData.nameUpload && scrapedData.nameUpload.enabled && 
          scrapedData.nameUpload.names && scrapedData.nameUpload.names.length > 0) {
        namesList = scrapedData.nameUpload.names;
        console.log('Using names from nameUpload in handleSubmitResponses:', namesList);
      }
      
      const prompt = generateGeminiPrompt(questions, namesList);
      const geminiResponse = await callGeminiAPI(prompt);
      
      // Parse the response into answer sets using parseGeminiResponse
      const answerSets = parseGeminiResponse(geminiResponse, questions, namesList);
      console.log(`Generated ${answerSets.length} response sets`);
      
      // Process and save each answer set
      for (let i = 0; i < answerSets.length; i++) {
        const answerSet = answerSets[i];
        console.log(`Processing answer set ${i+1}/${answerSets.length}:`, answerSet);
        
        // Create a response object for this answer set
        const answersMap = {};
        
        questions.forEach((question) => {
          // Get the answer for this question from the answer set
          let answer = answerSet[question.id] || 'No answer generated';
          answersMap[question.text] = answer;
          
          // Log name usage for debugging
          const isNameQuestion = question.id === 'name_q' || 
                               (question.metadata && question.metadata.source === 'name_upload') ||
                               question.text.toLowerCase() === 'name' || 
                               question.text.toLowerCase().includes('name');
          
          if (isNameQuestion) {
            console.log(`Using name in set ${i+1}: ${answer}`);
          }
        });
        
        if (Object.keys(answersMap).length > 0) {
          await savePublicFormResponse(scrapedData.publicId, { answers: answersMap });
        }
      }
      
      // Navigate immediately to responses page
      if (scrapedData.formId) {
        navigate(`/form-responses/${scrapedData.formId}`);
      } else {
        navigate('/forms');
      }
      
    } catch (error) {
      console.error('Error submitting responses:', error);
      setError('Failed to submit responses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitToGoogleForm = async () => {
    if (!scrapedData || Object.keys(autoFilledAnswers).length === 0) {
      setError('No data to submit. Please scrape a form first.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('Submitting responses to Google Form...');
      
      // Submit to the original Google Form
      const submitted = await submitToGoogleForm(scrapedData.url, autoFilledAnswers);
      
      if (submitted) {
        setSuccess(' Form scraped successfully! They should now appear in the form owner\'s View Responses.');
        
        // Also save to Firestore
        // Filter out any suspicious report questions
        const filteredQuestions = scrapedData.questions.filter(question => {
          const questionText = question.text || question.questionText;
          return !questionText.includes("Does this form look suspicious? Report") && 
                 !questionText.includes("suspicious") && 
                 !questionText.includes("Report");
        });
        console.log('Questions (filtered for Google Form):', filteredQuestions);
        
        const formData = {
          title: scrapedData.title,
          description: `Auto-filled form submitted to: ${scrapedData.url}`,
          createdAt: new Date(),
          questions: filteredQuestions.map(question => ({
            type: question.type || 'text',
            questionText: question.text,
            options: question.options || [],
            required: false
          })),
          autoFilledAnswers: autoFilledAnswers,
          originalUrl: scrapedData.url,
          submissionTimestamp: submissionTimestamp || new Date().toISOString(),
          submittedToGoogleForm: true
        };

        await createForm(user.uid, formData);
        
        setTimeout(() => {
          navigate('/forms');
        }, 2000);
      } else {
        setError('Failed to submit to Google Form. The responses have been saved locally, but could not be submitted to the original form.');
      }

    } catch (error) {
      console.error('Error submitting to Google Form:', error);
      setError('Failed to submit responses to Google Form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Redirects user to production Google auth URL for Google Sheets integration
   * Uses production URL: https://forms-chi-sand.vercel.app/login/auth/google
   * Instead of localhost:3001/auth/google
   */
  const handleSaveToGoogleSheets = () => {
    // Redirect to production Google auth URL instead of localhost
    window.location.href = 'https://forms-chi-sand.vercel.app/login/auth/google';
  };

  return (
    <div className="auto-fill-container">
      {/* Inject CSS animations */}
      <style>{styles}</style>
      
      {/* Enhanced Header with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem 0',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background elements */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-20%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite'
        }}></div>
        
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(20px)'
        }}></div>
        
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '15%',
          width: '80px',
          height: '80px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          filter: 'blur(15px)'
        }}></div>

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              color: 'white',
              margin: 0,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              letterSpacing: '-0.5px'
            }}>Autofill Form</h1>
          </div>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            margin: 0,
            fontWeight: '500'
          }}>Generate and submit realistic responses to forms automatically</p>
        </div>
      </div>

      {/* Enhanced Content Area */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)',
              border: '1px solid rgba(103, 58, 183, 0.2)',
              borderRadius: '12px',
              color: '#673ab7',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <div className="auto-fill-content">
          <div className="scrape-section">
            {/* Enhanced URL Input Section */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
              borderRadius: '20px',
              border: '1px solid rgba(103, 58, 183, 0.1)',
              boxShadow: '0 20px 40px rgba(103, 58, 183, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)',
              padding: '2rem',
              marginBottom: '2rem',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <label style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#673ab7',
                  margin: 0
                }}>Form URL:</label>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                color: '#1e40af'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  fontWeight: '600'
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Supported Form Types
                </div>
                <p style={{ margin: 0, lineHeight: '1.4' }}>
                  <strong>Internal Forms:</strong> Any URL with /public/[ID]<br/>
                </p>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-end'
              }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="url"
                    placeholder="Enter public form URL (localhost:5174/public/...)"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      border: '2px solid rgba(103, 58, 183, 0.2)',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#673ab7';
                      e.target.style.boxShadow = '0 0 0 3px rgba(103, 58, 183, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(103, 58, 183, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                
                <button
                  onClick={handleScrapeAndAutoFill}
                  disabled={isLoading || !formUrl.trim()}
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '1rem',
                    cursor: isLoading || !formUrl.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(103, 58, 183, 0.3)',
                    opacity: isLoading || !formUrl.trim() ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: '180px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading && formUrl.trim()) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(103, 58, 183, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading && formUrl.trim()) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(103, 58, 183, 0.3)';
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      {scrapedData ? 'Submitting...' : 'Scraping...'}
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Generate & Submit
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                color: '#dc2626',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <span style={{ fontWeight: '600' }}>Error</span>
                </div>
                <p style={{ margin: 0, lineHeight: '1.5', whiteSpace: 'pre-line' }}>{error}</p>
                
                {error.includes('Failed to fetch') && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginTop: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#dc2626'
                    }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Alternative Solution:
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                      You can still use this form by manually entering the questions below. Click "Enter Questions Manually" and paste the questions from the Google Form, then we'll generate AI responses and submit them.
                    </p>
                  </div>
                )}
              </div>
            )}

            {success && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                color: '#16a34a',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span style={{ fontWeight: '600' }}>Success</span>
                </div>
                <p style={{ margin: 0, lineHeight: '1.5' }}>{success}</p>
              </div>
            )}

            {/* Action Buttons - Only show when scrapedData is available */}
            {scrapedData && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                borderRadius: '20px',
                border: '1px solid rgba(103, 58, 183, 0.1)',
                boxShadow: '0 20px 40px rgba(103, 58, 183, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)',
                padding: '2rem',
                marginBottom: '2rem',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#673ab7',
                    margin: 0
                  }}>Form Actions</h3>
                </div>
                
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  justifyContent: 'center'
                }}>
                  {/* Save to Firestore Button */}
                  <button
                    onClick={handleSaveToFirestore}
                    disabled={isLoading}
                    style={{
                      padding: '1rem 2rem',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)',
                      opacity: isLoading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      minWidth: '180px',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(5, 150, 105, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(5, 150, 105, 0.3)';
                      }
                    }}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save to Database
                  </button>

                  {/* Save to Google Sheets Button */}
                  <button
                    onClick={handleSaveToGoogleSheets}
                    disabled={isLoading}
                    style={{
                      padding: '1rem 2rem',
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)',
                      opacity: isLoading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      minWidth: '180px',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(14, 165, 233, 0.3)';
                      }
                    }}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Save to Google Sheets
                  </button>

                  {/* Submit to Google Form Button */}
                  <button
                    onClick={handleSubmitToGoogleForm}
                    disabled={isLoading || isSubmitting}
                    style={{
                      padding: '1rem 2rem',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: (isLoading || isSubmitting) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                      opacity: (isLoading || isSubmitting) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      minWidth: '180px',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && !isSubmitting) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && !isSubmitting) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)';
                      }
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Submit to Google Form
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Information Section - Only show when scrapedData is available */}
            {scrapedData && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                fontSize: '0.9rem',
                color: '#1e40af'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  fontWeight: '600'
                }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  What each action does:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <strong style={{ color: '#059669' }}>Save to Database:</strong>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      Saves the form data and responses to your local database for future reference.
                    </p>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <strong style={{ color: '#0ea5e9' }}>Save to Google Sheets:</strong>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      Exports the form data to Google Sheets. You'll be redirected to authenticate with Google.
                    </p>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <strong style={{ color: '#8b5cf6' }}>Submit to Google Form:</strong>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', lineHeight: '1.4' }}>
                      Submits the generated responses directly to the original Google Form.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showManualInput && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                borderRadius: '20px',
                border: '1px solid rgba(103, 58, 183, 0.1)',
                boxShadow: '0 20px 40px rgba(103, 58, 183, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)',
                padding: '2rem',
                marginBottom: '2rem',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <label style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#673ab7',
                    margin: 0
                  }}>Enter Form Questions (one per line):</label>
                </div>
                
                <textarea
                  value={manualQuestions}
                  onChange={(e) => setManualQuestions(e.target.value)}
                  rows="6"
                  placeholder="What is your name?&#10;How old are you?&#10;What is your favorite color?&#10;Tell us about yourself..."
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid rgba(103, 58, 183, 0.2)',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    resize: 'vertical',
                    minHeight: '120px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#673ab7';
                    e.target.style.boxShadow = '0 0 0 3px rgba(103, 58, 183, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(103, 58, 183, 0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                
                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                  <button
                    onClick={handleManualQuestionsSubmit}
                    disabled={isLoading || !manualQuestions.trim()}
                    style={{
                      padding: '1rem 2rem',
                      background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: isLoading || !manualQuestions.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(103, 58, 183, 0.3)',
                      opacity: isLoading || !manualQuestions.trim() ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginLeft: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && manualQuestions.trim()) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(103, 58, 183, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && manualQuestions.trim()) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(103, 58, 183, 0.3)';
                      }
                    }}
                  >
                    {isLoading ? (
                      <>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate Answers
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {!scrapedData && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
              borderRadius: '20px',
              border: '1px solid rgba(103, 58, 183, 0.1)',
              boxShadow: '0 20px 40px rgba(103, 58, 183, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)',
              padding: '2rem',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#673ab7',
                  margin: 0
                }}>How it works:</h3>
              </div>
              
              <ol style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 1.5rem 0'
              }}>
                {[
                  'Paste a form URL',
                  'Click "Generate & Submit" to extract questions',
                  'Set how many responses to generate and how many should be positive or negative',
                  'AI will generate realistic answers and submit them automatically',
                  'You\'ll be redirected to the form responses page to view results'
                ].map((step, index) => (
                  <li key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: 'rgba(103, 58, 183, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(103, 58, 183, 0.1)'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    <span style={{
                      color: '#374151',
                      lineHeight: '1.5',
                      fontSize: '1rem'
                    }}>{step}</span>
                  </li>
                ))}
              </ol>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginTop: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: 'rgba(251, 191, 36, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="16" height="16" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <strong style={{ color: '#f59e0b', fontSize: '1rem' }}>Note:</strong>
                </div>
                <p style={{
                  color: '#92400e',
                  margin: 0,
                  lineHeight: '1.5',
                  fontSize: '0.95rem'
                }}>
                  Internal forms created in this app are supported. If automated scraping fails, use the "Enter Questions Manually" option below.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Enhanced Response Generation Modal */}
        {showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
              padding: '2.5rem',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(103, 58, 183, 0.1)',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 style={{
                  margin: 0,
                  color: '#673ab7',
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>Response Generation Options</h2>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '1rem'
                }}>
                  Number of responses to generate:
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="20"
                  value={responseOptions.count}
                  onChange={(e) => setResponseOptions({...responseOptions, count: parseInt(e.target.value) || 1})}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid rgba(103, 58, 183, 0.2)',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#673ab7';
                    e.target.style.boxShadow = '0 0 0 3px rgba(103, 58, 183, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(103, 58, 183, 0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '1rem'
                }}>
                  Positive responses:
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max={responseOptions.count}
                  value={responseOptions.positiveCount}
                  onChange={(e) => {
                    const positiveCount = parseInt(e.target.value) || 0;
                    const totalCount = responseOptions.count;
                    const negativeCount = totalCount - positiveCount;
                    
                    if (positiveCount <= totalCount) {
                      setResponseOptions({
                        ...responseOptions, 
                        positiveCount: positiveCount,
                        negativeCount: negativeCount
                      });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid rgba(103, 58, 183, 0.2)',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#673ab7';
                    e.target.style.boxShadow = '0 0 0 3px rgba(103, 58, 183, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(103, 58, 183, 0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '1rem'
                }}>
                  Negative responses:
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max={responseOptions.count}
                  value={responseOptions.negativeCount}
                  onChange={(e) => {
                    const negativeCount = parseInt(e.target.value) || 0;
                    const totalCount = responseOptions.count;
                    const positiveCount = totalCount - negativeCount;
                    
                    if (negativeCount <= totalCount) {
                      setResponseOptions({
                        ...responseOptions, 
                        negativeCount: negativeCount,
                        positiveCount: positiveCount
                      });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid rgba(103, 58, 183, 0.2)',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#673ab7';
                    e.target.style.boxShadow = '0 0 0 3px rgba(103, 58, 183, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(103, 58, 183, 0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                color: '#1e40af'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Total: {responseOptions.positiveCount + responseOptions.negativeCount} / {responseOptions.count}</span>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem'
              }}>
                <button 
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.875rem 1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(103, 58, 183, 0.2)',
                    background: 'rgba(103, 58, 183, 0.05)',
                    color: '#673ab7',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(103, 58, 183, 0.1)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(103, 58, 183, 0.05)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={processForm}
                  style={{
                    padding: '0.875rem 1.5rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(103, 58, 183, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(103, 58, 183, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(103, 58, 183, 0.3)';
                  }}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoFillForm;