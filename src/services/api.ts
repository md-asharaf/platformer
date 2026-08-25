import type { ApiResponse, QuizQuestion } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const PROJECT_ID = import.meta.env.VITE_PROJECT_ID || '';

export const fetchQuestions = async (): Promise<QuizQuestion[]> => {
  if (!API_BASE_URL || !PROJECT_ID) {
    console.warn("API Base URL or Project ID is missing. Generating mock data.");
    return generateMockQuestions();
  }

  const response = await fetch(`${API_BASE_URL}/projects/${PROJECT_ID}/quiz`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  const result: ApiResponse<QuizQuestion[]> = await response.json();
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.message || 'Unknown API Error');
  }
};

const generateMockQuestions = (): QuizQuestion[] => {
  return [
    {
      prompt: { label: "Question 1", value: "What is 2 + 2?" },
      answer: { label: "Answer", value: "4" },
      hint: { label: "Hint", value: "It's an even number." },
      options: ["3", "4", "5", "6"],
    },
    {
      prompt: { label: "Question 2", value: "What is the capital of France?" },
      answer: { label: "Answer", value: "Paris" },
      options: ["London", "Berlin", "Paris", "Madrid"],
    },
    {
      prompt: { label: "Question 3", value: "Which planet is known as the Red Planet?" },
      answer: { label: "Answer", value: "Mars" },
      hint: { label: "Hint", value: "Named after the Roman god of war." },
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
    }
  ];
};
