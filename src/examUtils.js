/**
 * Exam Utilities for Athena Assessment Portal
 * Helper functions for counting answers, formatting time, and scoring.
 */

/**
 * Calculates answered and unanswered question counts.
 * @param {Array} questions - Array of question objects
 * @param {Object} selectedAnswers - Map of questionIndex -> selectedOptionIndex
 * @returns {{ answeredCount: number, unansweredCount: number, totalQuestions: number }}
 */
export function getAnswerCounts(questions, selectedAnswers) {
  const totalQuestions = questions ? questions.length : 0;
  let answeredCount = 0;

  if (selectedAnswers) {
    for (let i = 0; i < totalQuestions; i++) {
      const val = selectedAnswers[i];
      if (val !== undefined && val !== null && val !== '') {
        answeredCount++;
      }
    }
  }

  return {
    answeredCount,
    unansweredCount: totalQuestions - answeredCount,
    totalQuestions
  };
}

/**
 * Formats time in seconds to MM:SS display string.
 * @param {number} totalSeconds
 * @returns {string} Formatted MM:SS
 */
export function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Calculates remaining seconds given a deadline timestamp in milliseconds.
 * @param {number} deadlineMs
 * @param {number} [nowMs=Date.now()]
 * @returns {number} Remaining seconds (>= 0)
 */
export function calculateRemainingSeconds(deadlineMs, nowMs = Date.now()) {
  const diffMs = deadlineMs - nowMs;
  return Math.max(0, Math.ceil(diffMs / 1000));
}

/**
 * Calculates candidate score based on selected answers and question keys.
 * @param {Array} questions - Array of questions with correctAnswer property
 * @param {Object} selectedAnswers - Map of questionIndex -> selectedOptionIndex
 * @returns {{ score: number, totalQuestions: number, correctCount: number, incorrectCount: number, unansweredCount: number, percentage: number }}
 */
export function calculateScore(questions, selectedAnswers) {
  const totalQuestions = questions ? questions.length : 0;
  let correctCount = 0;

  for (let i = 0; i < totalQuestions; i++) {
    const selected = selectedAnswers ? selectedAnswers[i] : undefined;
    if (selected !== undefined && selected !== null && selected === questions[i].correctAnswer) {
      correctCount++;
    }
  }

  const { answeredCount, unansweredCount } = getAnswerCounts(questions, selectedAnswers);
  const incorrectCount = answeredCount - correctCount;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    score: correctCount,
    totalQuestions,
    correctCount,
    incorrectCount,
    unansweredCount,
    percentage
  };
}
