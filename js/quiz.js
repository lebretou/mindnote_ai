document.addEventListener('DOMContentLoaded', () => {
    const questionArea = document.getElementById('question-area');
    const answerArea = document.getElementById('answer-area');
    const explanationArea = document.getElementById('explanation-area');
    const explanationContent = explanationArea.querySelector('div');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    const backToNotesButton = document.getElementById('back-to-notes');
    const showAnswerButton = document.getElementById('show-answer-button');
    const nextQuestionButton = document.getElementById('next-question-button');
    const generateMoreButton = document.getElementById('generate-more-button');

    let currentQuestionIndex = 0;
    let quizData = []; // Array to hold { question, answer, explanation }
    let notesContent = ''; // To store notes content for generating more questions

    // --- Helper Functions ---
    function updateProgressBar() {
        const totalQuestions = quizData.length;
        if (totalQuestions === 0) {
            progressBar.style.width = '0%';
            progressText.textContent = '0/0';
            return;
        }
        const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        progressText.textContent = `${currentQuestionIndex + 1}/${totalQuestions}`;
    }

    function displayQuestion() {
        if (quizData.length === 0 || currentQuestionIndex >= quizData.length) {
            questionArea.textContent = 'No questions loaded or quiz finished.';
            answerArea.classList.add('hidden');
            explanationArea.classList.add('hidden');
            showAnswerButton.classList.add('hidden');
            nextQuestionButton.classList.add('hidden');
            generateMoreButton.classList.remove('hidden');
            updateProgressBar(); // Update progress for 0/0 or completion
            return;
        }

        const currentQuizItem = quizData[currentQuestionIndex];
        questionArea.textContent = currentQuizItem.question;
        answerArea.textContent = currentQuizItem.answer;
        explanationContent.innerHTML = currentQuizItem.explanation; // Use the div inside explanation-area

        // Reset view state
        answerArea.classList.add('hidden');
        explanationArea.classList.add('hidden');
        showAnswerButton.classList.remove('hidden');
        nextQuestionButton.classList.add('hidden');
        generateMoreButton.classList.add('hidden');

        updateProgressBar();
    }

    function fetchQuizQuestions(content, numQuestions = 5) {
        questionArea.textContent = 'Generating questions...';
        
        // Mock data for testing - use this if you can't connect to background script
        const mockQuizData = [
            {
                question: "What is the primary purpose of a variable in programming?",
                answer: "To store data for later use",
                explanation: "Variables are containers for storing data values that can be used and modified throughout a program."
            },
            {
                question: "What are the key features of object-oriented programming?",
                answer: "Encapsulation, inheritance, polymorphism, and abstraction",
                explanation: "These four pillars allow for code organization, reuse, and maintenance in complex applications."
            }
        ];

        // Comment out this block during testing if needed
        try {
            chrome.runtime.sendMessage(
                { type: 'GENERATE_QUIZ', content: content, count: numQuestions }, 
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Runtime error:", chrome.runtime.lastError);
                        questionArea.textContent = 'Error connecting to background service. Using sample questions instead.';
                        // Fall back to mock data
                        quizData = mockQuizData;
                        currentQuestionIndex = 0;
                        displayQuestion();
                        return;
                    }
                    
                    if (response && response.quiz) {
                        console.log("Received quiz data:", response.quiz);
                        quizData = response.quiz;
                        currentQuestionIndex = 0;
                        displayQuestion();
                    } else if (response && response.error) {
                        console.error('Error from background script:', response.error);
                        questionArea.textContent = `Error generating questions: ${response.error}. Using sample questions instead.`;
                        // Fall back to mock data
                        quizData = mockQuizData;
                        currentQuestionIndex = 0;
                        displayQuestion();
                    } else {
                        console.error('Invalid response from background script:', response);
                        questionArea.textContent = 'Failed to generate questions. Using sample questions instead.';
                        // Fall back to mock data
                        quizData = mockQuizData;
                        currentQuestionIndex = 0;
                        displayQuestion();
                    }
                }
            );
        } catch (error) {
            console.error("Failed to send message:", error);
            questionArea.textContent = 'Error connecting to service. Using sample questions instead.';
            // Fall back to mock data
            quizData = mockQuizData;
            currentQuestionIndex = 0;
            displayQuestion();
        }
    }

    // --- Event Listeners ---
    showAnswerButton.addEventListener('click', () => {
        answerArea.classList.remove('hidden');
        explanationArea.classList.remove('hidden');
        showAnswerButton.classList.add('hidden');
        nextQuestionButton.classList.remove('hidden');
    });

    nextQuestionButton.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });

    generateMoreButton.addEventListener('click', () => {
         if (!notesContent) {
            console.error("Notes content is not available to generate more questions.");
            questionArea.textContent = 'Error: Notes content missing.';
            return;
        }
        fetchQuizQuestions(notesContent);
    });

    backToNotesButton.addEventListener('click', () => {
        window.location.href = 'notes_view.html'; // Simple redirection
    });

    // --- Initialization ---
    // Retrieve notes content passed from notes_view.js (e.g., via chrome.storage)
    chrome.storage.local.get(['notesForQuiz'], (result) => {
        if (result.notesForQuiz) {
            notesContent = result.notesForQuiz;
            // Optionally clear the storage after retrieving
            // chrome.storage.local.remove('notesForQuiz'); 
            fetchQuizQuestions(notesContent);
        } else {
            questionArea.textContent = 'Could not load notes content to generate quiz.';
            // Optionally hide irrelevant buttons
            showAnswerButton.classList.add('hidden');
            generateMoreButton.classList.add('hidden');
        }
    });
}); 