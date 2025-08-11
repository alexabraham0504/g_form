import { useState } from 'react';
import { generateQuestions } from '../services/gemini';

const AIGenerationModal = ({ isOpen, onClose, onQuestionsGenerated, formTitle }) => {
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [questionTypes, setQuestionTypes] = useState({
    shortAnswer: 2,
    paragraph: 1,
    multipleChoice: 1,
    checkboxes: 1
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedStats, setGeneratedStats] = useState({});
  const [currentStep, setCurrentStep] = useState(1); // 1: Select questions count, 2: Select question types

  const questionCounts = [5, 10, 15];

  const updateQuestionType = (type, value) => {
    // Calculate current total excluding the current type
    const currentTotal = Object.entries(questionTypes).reduce((sum, [key, count]) => {
      return key === type ? sum : sum + count;
    }, 0);
    
    // Ensure the new value doesn't exceed the total questions
    const maxAllowed = totalQuestions - currentTotal;
    const newValue = Math.max(0, Math.min(value, maxAllowed));
    
    setQuestionTypes(prev => ({
      ...prev,
      [type]: newValue
    }));
  };

  // Reset question types when total questions change
  const handleTotalQuestionsChange = (count) => {
    setTotalQuestions(count);
    // Reset question types to default distribution, ensuring total equals exactly the count
    let shortAnswer = Math.ceil(count * 0.4);
    let paragraph = Math.ceil(count * 0.2);
    let multipleChoice = Math.ceil(count * 0.2);
    let checkboxes = Math.floor(count * 0.2);
    
    // Adjust to ensure total equals count
    const total = shortAnswer + paragraph + multipleChoice + checkboxes;
    if (total > count) {
      // Reduce from largest categories first
      const excess = total - count;
      if (shortAnswer >= excess) {
        shortAnswer -= excess;
      } else {
        const remaining = excess - shortAnswer;
        shortAnswer = 0;
        if (paragraph >= remaining) {
          paragraph -= remaining;
        } else {
          const stillRemaining = remaining - paragraph;
          paragraph = 0;
          if (multipleChoice >= stillRemaining) {
            multipleChoice -= stillRemaining;
          } else {
            multipleChoice = 0;
            checkboxes = Math.max(0, checkboxes - (stillRemaining - multipleChoice));
          }
        }
      }
    } else if (total < count) {
      // Add to largest category
      const deficit = count - total;
      shortAnswer += deficit;
    }
    
    setQuestionTypes({
      shortAnswer,
      paragraph,
      multipleChoice,
      checkboxes
    });
  };

  const handleNext = () => {
    if (!formTitle.trim()) {
      setError('Please enter a form title first');
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
    setError('');
  };

  const handleGenerate = async () => {
    const totalSelected = Object.values(questionTypes).reduce((sum, count) => sum + count, 0);
    if (totalSelected !== totalQuestions) {
      setError(`Please distribute exactly ${totalQuestions} questions across all types`);
      return;
    }

    try {
      setIsGenerating(true);
      setError('');
      
      console.log('Starting AI generation with:', { formTitle, totalQuestions, questionTypes });
      const generatedQuestions = await generateQuestions(formTitle, totalQuestions, questionTypes);
      console.log('Generated questions:', generatedQuestions);
      
      // Set success stats
      setGeneratedStats({
        totalQuestions: generatedQuestions.length,
        questionTypes: questionTypes
      });
      
      onQuestionsGenerated(generatedQuestions);
      setShowSuccess(true);
      
      // Auto close success popup after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Generation error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-out'
    }}>
                           <div className="modal-content" style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '450px',
          width: '85%',
          maxHeight: '70vh',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          position: 'relative',
          animation: 'popupSlideIn 0.4s ease-out'
        }}>
        {/* Decorative background elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '100px',
          height: '100px',
          background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(103, 58, 183, 0.05) 100%)',
          borderRadius: '50%',
          backdropFilter: 'blur(10px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.08) 0%, rgba(103, 58, 183, 0.03) 100%)',
          borderRadius: '50%',
          backdropFilter: 'blur(10px)'
        }}></div>

                 {/* Header Section */}
         <div style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           padding: '1.2rem 1.2rem 0.8rem',
           color: 'white',
           position: 'relative',
           overflow: 'hidden'
         }}>
           <div style={{
             position: 'absolute',
             top: '-20px',
             right: '-20px',
             width: '80px',
             height: '80px',
             background: 'rgba(255, 255, 255, 0.1)',
             borderRadius: '50%',
             backdropFilter: 'blur(10px)'
           }}></div>
           
           <div style={{
             display: 'flex',
             justifyContent: 'space-between',
             alignItems: 'center',
             position: 'relative',
             zIndex: 1
           }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{
                 width: '35px',
                 height: '35px',
                 background: 'rgba(255, 255, 255, 0.2)',
                 borderRadius: '50%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 backdropFilter: 'blur(10px)',
                 border: '1px solid rgba(255, 255, 255, 0.3)'
               }}>
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                 </svg>
               </div>
               <div>
                 <h2 style={{ 
                   margin: 0, 
                   fontSize: '1.2rem', 
                   fontWeight: '700',
                   background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                   backgroundClip: 'text',
                   WebkitBackgroundClip: 'text',
                   WebkitTextFillColor: 'transparent'
                 }}>
                   AI Question Generation
                 </h2>
                 <p style={{ margin: '0.2rem 0 0', opacity: 0.9, fontSize: '0.75rem' }}>
                   {currentStep === 1 ? 'Step 1: Select number of questions' : 'Step 2: Select question types'}
                 </p>
               </div>
             </div>
                            <button
                 onClick={onClose}
                 style={{
                   background: 'rgba(255, 255, 255, 0.2)',
                   border: '1px solid rgba(255, 255, 255, 0.3)',
                   borderRadius: '50%',
                   width: '32px',
                   height: '32px',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   cursor: 'pointer',
                   color: 'white',
                   fontSize: '16px',
                   transition: 'all 0.2s',
                   backdropFilter: 'blur(10px)'
                 }}
               onMouseEnter={(e) => {
                 e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                 e.target.style.transform = 'scale(1.1)';
               }}
               onMouseLeave={(e) => {
                 e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                 e.target.style.transform = 'scale(1)';
               }}
             >
               ×
             </button>
           </div>
         </div>

                                    {/* Content Section */}
          <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.8)', overflowY: 'auto', maxHeight: 'calc(70vh - 120px)' }}>
           {error && (
             <div style={{
               padding: '1rem',
               background: 'linear-gradient(135deg, #fee 0%, #fcc 100%)',
               color: '#c33',
               borderRadius: '12px',
               marginBottom: '1.5rem',
               border: '1px solid rgba(204, 51, 51, 0.2)',
               display: 'flex',
               alignItems: 'center',
               gap: '0.5rem'
             }}>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
               </svg>
               {error}
             </div>
           )}

           {currentStep === 1 ? (
             /* Step 1: Select number of questions */
             <>
               {/* Form Title Section */}
                               <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.3rem', 
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.8rem'
                  }}>
                    Form Title
                  </label>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.05) 0%, rgba(103, 58, 183, 0.02) 100%)',
                    border: '2px solid rgba(103, 58, 183, 0.2)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: '#374151',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>
                    {formTitle || 'Untitled Form'}
                  </div>
                </div>

                              {/* Total Questions Section */}
                               <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.4rem', 
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.8rem'
                  }}>
                    How many questions would you like to generate?
                  </label>
                                   <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                    {questionCounts.map(count => (
                      <button
                        key={count}
                        onClick={() => handleTotalQuestionsChange(count)}
                        style={{
                          padding: '0.6rem 1.2rem',
                          border: totalQuestions === count ? '2px solid #673ab7' : '2px solid rgba(103, 58, 183, 0.2)',
                          borderRadius: '10px',
                          background: totalQuestions === count 
                            ? 'linear-gradient(135deg, #673ab7 0%, #5e35b1 100%)' 
                            : 'linear-gradient(135deg, rgba(103, 58, 183, 0.05) 0%, rgba(103, 58, 183, 0.02) 100%)',
                          color: totalQuestions === count ? 'white' : '#673ab7',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          transition: 'all 0.3s ease',
                          boxShadow: totalQuestions === count 
                            ? '0 4px 15px rgba(103, 58, 183, 0.3)' 
                            : '0 2px 8px rgba(103, 58, 183, 0.1)',
                          minWidth: '50px'
                        }}
                        onMouseEnter={(e) => {
                          if (totalQuestions !== count) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(103, 58, 183, 0.2)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (totalQuestions !== count) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 8px rgba(103, 58, 183, 0.1)';
                          }
                        }}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
               </div>

               {/* Action Buttons */}
                               <div style={{ 
                  display: 'flex', 
                  gap: '0.6rem', 
                  justifyContent: 'flex-end',
                  paddingTop: '0.4rem',
                  borderTop: '1px solid rgba(103, 58, 183, 0.1)'
                }}>
                 <button
                   onClick={onClose}
                   style={{
                     padding: '0.5rem 1rem',
                     border: '2px solid rgba(103, 58, 183, 0.3)',
                     borderRadius: '6px',
                     background: 'white',
                     cursor: 'pointer',
                     color: '#673ab7',
                     fontWeight: '600',
                     fontSize: '0.8rem',
                     transition: 'all 0.2s'
                   }}
                   onMouseEnter={(e) => {
                     e.target.style.background = 'rgba(103, 58, 183, 0.05)';
                     e.target.style.transform = 'translateY(-1px)';
                   }}
                   onMouseLeave={(e) => {
                     e.target.style.background = 'white';
                     e.target.style.transform = 'translateY(0)';
                   }}
                 >
                   Cancel
                 </button>
                                    <button
                     onClick={handleNext}
                     style={{
                       padding: '0.6rem 1.2rem',
                       border: 'none',
                       borderRadius: '8px',
                       background: 'linear-gradient(135deg, #673ab7 0%, #5e35b1 100%)',
                       color: 'white',
                       cursor: 'pointer',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.4rem',
                       fontWeight: '600',
                       fontSize: '0.9rem',
                       transition: 'all 0.3s ease',
                       boxShadow: '0 4px 15px rgba(103, 58, 183, 0.3)'
                     }}
                   onMouseEnter={(e) => {
                     e.target.style.transform = 'translateY(-2px)';
                     e.target.style.boxShadow = '0 8px 25px rgba(103, 58, 183, 0.4)';
                   }}
                   onMouseLeave={(e) => {
                     e.target.style.transform = 'translateY(0)';
                     e.target.style.boxShadow = '0 4px 15px rgba(103, 58, 183, 0.3)';
                   }}
                 >
                   Next
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                   </svg>
                 </button>
               </div>
             </>
           ) : (
             /* Step 2: Select question types */
             <>
                               {/* Summary Section */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(103, 58, 183, 0.05) 100%)',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(103, 58, 183, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.8rem' }}>Form Title</span>
                      <span style={{ fontWeight: '500', color: '#673ab7', fontSize: '0.9rem' }}>{formTitle || 'Untitled Form'}</span>
                    </div>
                    <div style={{ width: '1px', height: '30px', background: 'rgba(103, 58, 183, 0.2)' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.8rem' }}>Total Questions</span>
                      <span style={{ fontWeight: '500', color: '#673ab7', fontSize: '1rem' }}>{totalQuestions}</span>
                    </div>
                  </div>
                </div>

               {/* Question Type Distribution Section */}
                               <div style={{ marginBottom: '1rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.85rem'
                  }}>
                    Distribute your {totalQuestions} questions across different types:
                  </label>
                                   <div style={{ 
                    display: 'grid', 
                    gap: '0.5rem',
                    background: 'rgba(103, 58, 183, 0.03)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(103, 58, 183, 0.1)',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
                  }}>
                   {[
                     { key: 'shortAnswer', label: 'Short Answer', icon: '✏️' },
                     { key: 'paragraph', label: 'Paragraph', icon: '📝' },
                     { key: 'multipleChoice', label: 'Multiple Choice', icon: '🔘' },
                     { key: 'checkboxes', label: 'Checkboxes', icon: '☑️' }
                   ].map(({ key, label, icon }) => (
                                           <div key={key} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid rgba(103, 58, 183, 0.1)',
                        boxShadow: '0 2px 8px rgba(103, 58, 183, 0.05)',
                        minHeight: '50px'
                      }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <span style={{ fontSize: '1rem' }}>{icon}</span>
                         <span style={{ fontWeight: '500', color: '#374151', fontSize: '0.85rem' }}>{label}:</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         <button
                           onClick={() => updateQuestionType(key, questionTypes[key] - 1)}
                           style={{
                             width: '28px',
                             height: '28px',
                             border: '2px solid rgba(103, 58, 183, 0.3)',
                             borderRadius: '6px',
                             background: 'white',
                             cursor: 'pointer',
                             fontSize: '1rem',
                             fontWeight: '600',
                             color: '#673ab7',
                             transition: 'all 0.2s'
                           }}
                           onMouseEnter={(e) => {
                             e.target.style.background = 'rgba(103, 58, 183, 0.1)';
                             e.target.style.transform = 'scale(1.05)';
                           }}
                           onMouseLeave={(e) => {
                             e.target.style.background = 'white';
                             e.target.style.transform = 'scale(1)';
                           }}
                         >
                           -
                         </button>
                         <span style={{ 
                           minWidth: '32px', 
                           textAlign: 'center',
                           fontWeight: '600',
                           fontSize: '0.9rem',
                           color: '#673ab7'
                         }}>
                           {questionTypes[key]}
                         </span>
                         <button
                           onClick={() => updateQuestionType(key, questionTypes[key] + 1)}
                           disabled={Object.values(questionTypes).reduce((sum, count) => sum + count, 0) >= totalQuestions}
                           style={{
                             width: '28px',
                             height: '28px',
                             border: '2px solid rgba(103, 58, 183, 0.3)',
                             borderRadius: '6px',
                             background: Object.values(questionTypes).reduce((sum, count) => sum + count, 0) >= totalQuestions 
                               ? 'rgba(103, 58, 183, 0.1)' 
                               : 'white',
                             cursor: Object.values(questionTypes).reduce((sum, count) => sum + count, 0) >= totalQuestions 
                               ? 'not-allowed' 
                               : 'pointer',
                             fontSize: '1rem',
                             fontWeight: '600',
                             color: Object.values(questionTypes).reduce((sum, count) => sum + count, 0) >= totalQuestions 
                               ? 'rgba(103, 58, 183, 0.3)' 
                               : '#673ab7',
                             transition: 'all 0.2s',
                             opacity: Object.values(questionTypes).reduce((sum, count) => sum + count, 0) >= totalQuestions ? 0.5 : 1
                           }}
                           onMouseEnter={(e) => {
                             if (Object.values(questionTypes).reduce((sum, count) => sum + count, 0) < totalQuestions) {
                               e.target.style.background = 'rgba(103, 58, 183, 0.1)';
                               e.target.style.transform = 'scale(1.05)';
                             }
                           }}
                           onMouseLeave={(e) => {
                             if (Object.values(questionTypes).reduce((sum, count) => sum + count, 0) < totalQuestions) {
                               e.target.style.background = 'white';
                               e.target.style.transform = 'scale(1)';
                             }
                           }}
                         >
                           +
                         </button>
                       </div>
                     </div>
                   ))}
                 </div>

                                   <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.6rem', 
                    background: Object.values(questionTypes).reduce((sum, count) => sum + count, 0) === totalQuestions
                      ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(103, 58, 183, 0.05) 100%)', 
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: Object.values(questionTypes).reduce((sum, count) => sum + count, 0) === totalQuestions ? '#4CAF50' : '#673ab7',
                    textAlign: 'center',
                    border: `1px solid ${Object.values(questionTypes).reduce((sum, count) => sum + count, 0) === totalQuestions ? 'rgba(76, 175, 80, 0.2)' : 'rgba(103, 58, 183, 0.2)'}`
                  }}>
                    Total: {Object.values(questionTypes).reduce((sum, count) => sum + count, 0)} / {totalQuestions}
                    {Object.values(questionTypes).reduce((sum, count) => sum + count, 0) === totalQuestions && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>✓ Complete</span>
                    )}
                  </div>
               </div>

               {/* Action Buttons */}
                               <div style={{ 
                  display: 'flex', 
                  gap: '0.75rem', 
                  justifyContent: 'space-between',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid rgba(103, 58, 183, 0.1)'
                }}>
                 <button
                   onClick={handleBack}
                   style={{
                     padding: '0.6rem 1.2rem',
                     border: '2px solid rgba(103, 58, 183, 0.3)',
                     borderRadius: '8px',
                     background: 'white',
                     cursor: 'pointer',
                     color: '#673ab7',
                     fontWeight: '600',
                     fontSize: '0.9rem',
                     transition: 'all 0.2s',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '0.4rem'
                   }}
                   onMouseEnter={(e) => {
                     e.target.style.background = 'rgba(103, 58, 183, 0.05)';
                     e.target.style.transform = 'translateY(-1px)';
                   }}
                   onMouseLeave={(e) => {
                     e.target.style.background = 'white';
                     e.target.style.transform = 'translateY(0)';
                   }}
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                   </svg>
                   Back
                 </button>
                                    <button
                     onClick={handleGenerate}
                     disabled={isGenerating}
                     style={{
                       padding: '0.6rem 1.2rem',
                       border: 'none',
                       borderRadius: '8px',
                       background: isGenerating 
                         ? 'linear-gradient(135deg, #ccc 0%, #bbb 100%)' 
                         : 'linear-gradient(135deg, #673ab7 0%, #5e35b1 100%)',
                       color: 'white',
                       cursor: isGenerating ? 'not-allowed' : 'pointer',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.4rem',
                       fontWeight: '600',
                       fontSize: '0.9rem',
                       transition: 'all 0.3s ease',
                       boxShadow: isGenerating 
                         ? '0 2px 8px rgba(0, 0, 0, 0.1)' 
                         : '0 4px 15px rgba(103, 58, 183, 0.3)'
                     }}
                   onMouseEnter={(e) => {
                     if (!isGenerating) {
                       e.target.style.transform = 'translateY(-2px)';
                       e.target.style.boxShadow = '0 8px 25px rgba(103, 58, 183, 0.4)';
                     }
                   }}
                   onMouseLeave={(e) => {
                     if (!isGenerating) {
                       e.target.style.transform = 'translateY(0)';
                       e.target.style.boxShadow = '0 4px 15px rgba(103, 58, 183, 0.3)';
                     }
                   }}
                 >
                   {isGenerating ? (
                     <>
                                               <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '2px solid #fff',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginRight: '0.4rem'
                        }}></div>
                        <span>Generating Questions...</span>
                     </>
                   ) : (
                     <>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                       </svg>
                       Generate Questions
                     </>
                   )}
                 </button>
               </div>
             </>
           )}
         </div>
       </div>

       {/* Success Popup */}
       {showSuccess && (
         <div style={{
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           backgroundColor: 'rgba(0, 0, 0, 0.6)',
           backdropFilter: 'blur(8px)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           zIndex: 2000,
           animation: 'fadeIn 0.3s ease-out'
         }}>
           <div style={{
             background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
             color: 'white',
             padding: '0',
             borderRadius: '24px',
             boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
             textAlign: 'center',
             maxWidth: '500px',
             width: '90%',
             animation: 'popupSlideIn 0.4s ease-out',
             overflow: 'hidden',
             position: 'relative'
           }}>
             {/* Decorative background elements */}
             <div style={{
               position: 'absolute',
               top: '-30px',
               right: '-30px',
               width: '80px',
               height: '80px',
               background: 'rgba(255, 255, 255, 0.1)',
               borderRadius: '50%',
               backdropFilter: 'blur(10px)'
             }}></div>
             <div style={{
               position: 'absolute',
               bottom: '-20px',
               left: '-20px',
               width: '50px',
               height: '50px',
               background: 'rgba(255, 255, 255, 0.08)',
               borderRadius: '50%',
               backdropFilter: 'blur(10px)'
             }}></div>

             {/* Header Section */}
             <div style={{
               background: 'rgba(255, 255, 255, 0.1)',
               padding: '2rem 2rem 1.5rem',
               borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
               position: 'relative'
             }}>
               <div style={{
                 width: '80px',
                 height: '80px',
                 background: 'rgba(255, 255, 255, 0.2)',
                 borderRadius: '50%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 margin: '0 auto 1rem',
                 backdropFilter: 'blur(15px)',
                 border: '2px solid rgba(255, 255, 255, 0.3)',
                 boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
               }}>
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
               </div>
               <h3 style={{ 
                 margin: '0 0 0.5rem', 
                 fontSize: '1.5rem', 
                 fontWeight: '700',
                 background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                 backgroundClip: 'text',
                 WebkitBackgroundClip: 'text',
                 WebkitTextFillColor: 'transparent'
               }}>
                 Questions Generated Successfully!
               </h3>
               <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>
                 Your AI-generated questions have been added to your form
               </p>
             </div>

             {/* Content Section */}
             <div style={{
               padding: '2rem',
               background: 'rgba(255, 255, 255, 0.05)'
             }}>
               <div style={{
                 background: 'rgba(255, 255, 255, 0.1)',
                 padding: '1.5rem',
                 borderRadius: '16px',
                 border: '1px solid rgba(255, 255, 255, 0.2)',
                 marginBottom: '1.5rem'
               }}>
                 <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                   Generation Summary
                 </h4>
                 <div style={{ display: 'grid', gap: '0.75rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontWeight: '500' }}>Total Questions:</span>
                     <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                       {generatedStats.totalQuestions || 0}
                     </span>
                   </div>
                   {Object.entries(generatedStats.questionTypes || {}).map(([type, count]) => (
                     <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                         {type.replace(/([A-Z])/g, ' $1').trim()}:
                       </span>
                       <span style={{ fontWeight: '600' }}>{count}</span>
                     </div>
                   ))}
                 </div>
               </div>

               <button
                 onClick={() => {
                   setShowSuccess(false);
                   onClose();
                 }}
                 style={{
                   background: 'rgba(255, 255, 255, 0.2)',
                   border: '2px solid rgba(255, 255, 255, 0.3)',
                   borderRadius: '12px',
                   padding: '0.75rem 1.5rem',
                   color: 'white',
                   cursor: 'pointer',
                   fontSize: '1rem',
                   fontWeight: '600',
                   transition: 'all 0.3s ease',
                   backdropFilter: 'blur(10px)',
                   boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                   minWidth: '120px'
                 }}
                 onMouseEnter={(e) => {
                   e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                   e.target.style.transform = 'translateY(-2px)';
                   e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                 }}
                 onMouseLeave={(e) => {
                   e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                   e.target.style.transform = 'translateY(0)';
                   e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                 }}
               >
                 Continue
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

export default AIGenerationModal;
