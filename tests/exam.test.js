import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Logic mirrored from src/examUtils.js ────────────────────────────────────

const DEFAULT_EXAM_DURATION_SECONDS = 5 * 60;

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function calculateRemainingSeconds(deadlineMs, nowMs = Date.now()) {
  const diffMs = deadlineMs - nowMs;
  return Math.max(0, Math.ceil(diffMs / 1000));
}

function getAnswerCounts(questions, selectedAnswers) {
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

function calculateScore(questions, selectedAnswers) {
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
  return { score: correctCount, totalQuestions, correctCount, incorrectCount, unansweredCount, percentage };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_QUESTIONS = [
  { id: 1, question: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
  { id: 2, question: 'Q2', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
  { id: 3, question: 'Q3', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
  { id: 4, question: 'Q4', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
  { id: 5, question: 'Q5', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
];

// ─── Timer Behaviour ──────────────────────────────────────────────────────────

describe('Exam Timer — formatTime', () => {
  it('formats 5 minutes as 05:00', () => {
    assert.equal(formatTime(300), '05:00');
  });

  it('formats 0 seconds as 00:00', () => {
    assert.equal(formatTime(0), '00:00');
  });

  it('formats 90 seconds as 01:30', () => {
    assert.equal(formatTime(90), '01:30');
  });

  it('formats 59 seconds as 00:59', () => {
    assert.equal(formatTime(59), '00:59');
  });

  it('clamps negative input to 00:00', () => {
    assert.equal(formatTime(-5), '00:00');
  });

  it('handles non-number input gracefully, returning 00:00', () => {
    assert.equal(formatTime(null), '00:00');
    assert.equal(formatTime(undefined), '00:00');
  });
});

describe('Exam Timer — calculateRemainingSeconds (deadline-based)', () => {
  it('returns correct remaining seconds for a future deadline', () => {
    const now = Date.now();
    const deadline = now + 300_000; // 5 minutes from now
    const remaining = calculateRemainingSeconds(deadline, now);
    assert.equal(remaining, 300);
  });

  it('returns 0 when deadline has already passed', () => {
    const now = Date.now();
    const deadline = now - 5_000; // 5 seconds in the past
    const remaining = calculateRemainingSeconds(deadline, now);
    assert.equal(remaining, 0);
  });

  it('returns 0 exactly at the deadline moment', () => {
    const now = Date.now();
    assert.equal(calculateRemainingSeconds(now, now), 0);
  });

  it('uses default parameter Date.now() when nowMs is omitted', () => {
    // Deadline 10 minutes in the future; remaining must be close to 600 seconds
    const deadline = Date.now() + 600_000;
    const remaining = calculateRemainingSeconds(deadline);
    assert.ok(remaining >= 599 && remaining <= 600, `Expected ~600, got ${remaining}`);
  });

  it('default exam duration is exactly 300 seconds (5 minutes)', () => {
    assert.equal(DEFAULT_EXAM_DURATION_SECONDS, 300);
  });
});

// ─── Scoring ──────────────────────────────────────────────────────────────────

describe('Exam Scoring — calculateScore', () => {
  it('scores 100% when all answers are correct', () => {
    const answers = { 0: 0, 1: 2, 2: 1, 3: 3, 4: 0 };
    const result = calculateScore(MOCK_QUESTIONS, answers);
    assert.equal(result.correctCount, 5);
    assert.equal(result.incorrectCount, 0);
    assert.equal(result.unansweredCount, 0);
    assert.equal(result.percentage, 100);
  });

  it('scores 0% when all answers are wrong', () => {
    const answers = { 0: 3, 1: 1, 2: 3, 3: 0, 4: 2 };
    const result = calculateScore(MOCK_QUESTIONS, answers);
    assert.equal(result.correctCount, 0);
    assert.equal(result.incorrectCount, 5);
    assert.equal(result.unansweredCount, 0);
    assert.equal(result.percentage, 0);
  });

  it('scores partially with some correct and some unanswered', () => {
    const answers = { 0: 0, 1: 2 }; // 2 correct, 3 unanswered
    const result = calculateScore(MOCK_QUESTIONS, answers);
    assert.equal(result.correctCount, 2);
    assert.equal(result.incorrectCount, 0);
    assert.equal(result.unansweredCount, 3);
    assert.equal(result.percentage, 40);
  });

  it('scores 0 with no answers at all', () => {
    const result = calculateScore(MOCK_QUESTIONS, {});
    assert.equal(result.correctCount, 0);
    assert.equal(result.unansweredCount, 5);
    assert.equal(result.percentage, 0);
  });

  it('handles null selectedAnswers without throwing', () => {
    const result = calculateScore(MOCK_QUESTIONS, null);
    assert.equal(result.correctCount, 0);
    assert.equal(result.unansweredCount, 5);
  });

  it('score + incorrectCount + unansweredCount always equals totalQuestions', () => {
    const answers = { 0: 0, 1: 1, 2: 1, 3: 3 }; // Q1 correct, Q2 wrong, Q3 correct, Q4 correct, Q5 unanswered
    const result = calculateScore(MOCK_QUESTIONS, answers);
    assert.equal(result.correctCount + result.incorrectCount + result.unansweredCount, result.totalQuestions);
  });
});

// ─── Answer Counts ────────────────────────────────────────────────────────────

describe('Exam Completion Flow — getAnswerCounts', () => {
  it('returns 0 answered, all unanswered when no answers selected', () => {
    const { answeredCount, unansweredCount } = getAnswerCounts(MOCK_QUESTIONS, {});
    assert.equal(answeredCount, 0);
    assert.equal(unansweredCount, 5);
  });

  it('reflects every answered question when all answered', () => {
    const answers = { 0: 0, 1: 2, 2: 1, 3: 3, 4: 0 };
    const { answeredCount, unansweredCount } = getAnswerCounts(MOCK_QUESTIONS, answers);
    assert.equal(answeredCount, 5);
    assert.equal(unansweredCount, 0);
  });

  it('partial answers count correctly', () => {
    const answers = { 0: 1, 2: 3 };
    const { answeredCount, unansweredCount } = getAnswerCounts(MOCK_QUESTIONS, answers);
    assert.equal(answeredCount, 2);
    assert.equal(unansweredCount, 3);
  });

  it('answeredCount + unansweredCount === totalQuestions', () => {
    const answers = { 0: 0, 4: 2 };
    const { answeredCount, unansweredCount, totalQuestions } = getAnswerCounts(MOCK_QUESTIONS, answers);
    assert.equal(answeredCount + unansweredCount, totalQuestions);
  });
});
