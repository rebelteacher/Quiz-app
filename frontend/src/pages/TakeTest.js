import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TakeTest = ({ user }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      const response = await axios.get(`${API}/tests/${testId}/take`);
      setTest(response.data);
    } catch (e) {
      toast.error("Failed to load test");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId, answerIndex) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleNext = () => {
    if (currentQuestion < test.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    const unanswered = test.questions.filter(q => answers[q.id] === undefined);
    
    if (unanswered.length > 0) {
      toast.warning(`Warning: You have ${unanswered.length} unanswered questions`);
      // Still allow submission
    }
    
    setSubmitting(true);
    
    try {
      const submissionAnswers = test.questions.map(q => ({
        question_id: q.id,
        selected_answer: answers[q.id] !== undefined ? answers[q.id] : -1
      }));
      
      await axios.post(`${API}/submissions`, {
        test_id: testId,
        answers: submissionAnswers
      });
      
      toast.success("Test submitted successfully!");
      navigate(`/results/${testId}`);
    } catch (e) {
      toast.error("Failed to submit test");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!test) return null;

  const question = test.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / test.questions.length) * 100;
  const isLastQuestion = currentQuestion === test.questions.length - 1;

  return (
    <div className="dashboard" data-testid="take-test-page">
      <div className="test-container">
        <div className="test-progress" data-testid="test-progress">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: "600", color: "#2d3748" }}>{test.title}</span>
            <span style={{ color: "#718096" }}>Question {currentQuestion + 1} of {test.questions.length}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="question-card" data-testid="question-card">
          <div className="question-header">
            <div className="question-number">Question {currentQuestion + 1}</div>
            <div className="question-standard" data-testid="question-standard">{question.standard}</div>
          </div>
          
          <div className="question-text" data-testid="question-text">{question.question_text}</div>
          
          <div className="options-list">
            {question.options.map((option, index) => (
              <button
                key={index}
                className={`option-button ${answers[question.id] === index ? "selected" : ""}`}
                onClick={() => handleSelectAnswer(question.id, index)}
                data-testid={`option-${index}`}
              >
                <span style={{ fontWeight: "600", marginRight: "0.75rem", color: "#ff8c42" }}>
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="test-navigation">
          <button 
            className="btn btn-secondary" 
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            style={{ opacity: currentQuestion === 0 ? 0.5 : 1 }}
            data-testid="previous-btn"
          >
            ← Previous
          </button>
          
          {isLastQuestion ? (
            <button 
              className="btn btn-primary" 
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="submit-test-btn"
            >
              {submitting ? "Submitting..." : "Submit Test"}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleNext} data-testid="next-btn">
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeTest;
