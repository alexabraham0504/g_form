// Remove the hardcoded API key import
// const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Debug function to check API key
const debugAPIKey = (apiKey) => {
  console.log('API Key available:', !!apiKey);
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  console.log('API Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');
};

export const generateQuestions = async (formTitle, totalQuestions, questionTypes, apiKey = null) => {
  try {
    // First try to use the passed API key, then fall back to environment variable
    let keyToUse = apiKey;
    if (!keyToUse) {
      keyToUse = import.meta.env.VITE_GEMINI_API_KEY;
    }
    
    // Debug API key
    debugAPIKey(keyToUse);
    
    // Check if API key is available
    if (!keyToUse) {
      throw new Error('Gemini API key is not configured. Please add your API key in the Settings page or check your .env file.');
    }

    const prompt = `Generate ${totalQuestions} questions for a form titled "${formTitle}". 
    
    Question type distribution:
    - Short Answer: ${questionTypes.shortAnswer}
    - Paragraph: ${questionTypes.paragraph}
    - Multiple Choice: ${questionTypes.multipleChoice}
    - Checkboxes: ${questionTypes.checkboxes}
    
    Please generate realistic and relevant questions that would be appropriate for this form topic. 
    For multiple choice and checkbox questions, provide 3-5 options each.
    
    Return the response as a JSON array with the following structure:
    [
      {
        "type": "short-answer|paragraph|multiple-choice|checkboxes",
        "questionText": "The question text",
        "options": ["option1", "option2", "option3"] (only for multiple-choice and checkboxes),
        "required": false
      }
    ]
    
    Make sure the questions are diverse, relevant to the form title, and professionally worded.`;

    // Use the correct Gemini API endpoint with the API key
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToUse}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const generatedText = data.candidates[0].content.parts[0].text;
      
      // Try to extract JSON from the response
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        return questions.map((q, index) => ({
          id: Date.now() + Math.random() + index,
          type: q.type,
          questionText: q.questionText,
          options: q.options || [],
          required: q.required || false
        }));
      } else {
        // Fallback: parse the text manually
        throw new Error('Could not parse AI response as JSON');
      }
    } else {
      throw new Error('Invalid response from Gemini API');
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    
    // Fallback: Generate sample questions if API fails
    console.log('Using fallback question generation');
    return generateFallbackQuestions(formTitle, totalQuestions, questionTypes);
  }
};

// Fallback function to generate sample questions when API fails
const generateFallbackQuestions = (formTitle, totalQuestions, questionTypes) => {
  const questions = [];
  let questionIndex = 0;

  // Generate short answer questions
  for (let i = 0; i < questionTypes.shortAnswer; i++) {
    questions.push({
      id: Date.now() + Math.random() + questionIndex++,
      type: 'short-answer',
      questionText: `What is your favorite aspect of ${formTitle.toLowerCase()}?`,
      options: [],
      required: false
    });
  }

  // Generate paragraph questions
  for (let i = 0; i < questionTypes.paragraph; i++) {
    questions.push({
      id: Date.now() + Math.random() + questionIndex++,
      type: 'paragraph',
      questionText: `Please describe your experience with ${formTitle.toLowerCase()} in detail.`,
      options: [],
      required: false
    });
  }

  // Generate multiple choice questions
  for (let i = 0; i < questionTypes.multipleChoice; i++) {
    questions.push({
      id: Date.now() + Math.random() + questionIndex++,
      type: 'multiple-choice',
      questionText: `How would you rate your satisfaction with ${formTitle.toLowerCase()}?`,
      options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
      required: false
    });
  }

  // Generate checkbox questions
  for (let i = 0; i < questionTypes.checkboxes; i++) {
    questions.push({
      id: Date.now() + Math.random() + questionIndex++,
      type: 'checkboxes',
      questionText: `Which features of ${formTitle.toLowerCase()} do you find most valuable?`,
      options: ['Quality', 'Price', 'Service', 'Convenience', 'Variety'],
      required: false
    });
  }

  return questions;
};
