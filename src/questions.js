/**
 * Dummy Multiple Choice Questions dataset for Athena Examination Portal.
 * Contains 10 sample multiple-choice questions with 4 options and 1 correct answer each.
 */
export const QUESTIONS = [
  {
    id: 1,
    question: "Which HTML5 element is used to specify a header for a document or section?",
    options: ["<header>", "<top>", "<head>", "<section-header>"],
    correctAnswer: 0
  },
  {
    id: 2,
    question: "Which CSS property is used to control the layout of items in a single direction (row or column)?",
    options: ["display: flex", "display: grid", "float: left", "position: absolute"],
    correctAnswer: 0
  },
  {
    id: 3,
    question: "In JavaScript, which operator compares both value and type without performing type conversion?",
    options: ["==", "!=", "===", "="],
    correctAnswer: 2
  },
  {
    id: 4,
    question: "What is the primary role of an Operating System kernel?",
    options: [
      "Manage hardware resources and system memory",
      "Format external flash drives",
      "Compile high-level source code into bytecode",
      "Render 3D web graphics"
    ],
    correctAnswer: 0
  },
  {
    id: 5,
    question: "Which HTTP status code indicates that the server cannot find the requested resource?",
    options: ["200 OK", "301 Moved Permanently", "404 Not Found", "500 Internal Server Error"],
    correctAnswer: 2
  },
  {
    id: 6,
    question: "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
    options: ["Queue", "Stack", "Binary Search Tree", "Array List"],
    correctAnswer: 1
  },
  {
    id: 7,
    question: "In relational databases, what constraint uniquely identifies each record in a table?",
    options: ["Foreign Key", "Index Key", "Primary Key", "Check Constraint"],
    correctAnswer: 2
  },
  {
    id: 8,
    question: "What protocol provides end-to-end encrypted communication for web traffic?",
    options: ["HTTP", "HTTPS", "FTP", "Telnet"],
    correctAnswer: 1
  },
  {
    id: 9,
    question: "What is the worst-case time complexity of binary search on a sorted array of n elements?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
    correctAnswer: 1
  },
  {
    id: 10,
    question: "Which browser security policy prevents scripts from one origin from accessing data from another origin?",
    options: [
      "Same-Origin Policy",
      "Content Security Protocol",
      "CORS Bypass Policy",
      "Local Storage Restriction"
    ],
    correctAnswer: 0
  }
];
