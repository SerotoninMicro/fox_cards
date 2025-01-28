class PracticeApp {
    constructor() {
        this.languages = languageConfig.languages;
        this.words = [];
        this.currentWordIndex = 0;
        this.selectedLanguageConfig = null;
        this.cacheKey = "seenWordsCache";
        this.cacheLimit = 100;
        this.loadCache();

        // Elements - updated to match your HTML
        this.elements = {
            languageSelect: document.getElementById("language-select"),
            levelSelect: document.getElementById("level-select"),
            startBtn: document.getElementById("start-btn"),
            wordDisplay: document.getElementById("word-display"),
            answerInput: document.getElementById("answer-input"),
            resultDisplay: document.getElementById("result"),
            submitBtn: document.getElementById("submit-btn"),
            welcomeScreen: document.getElementById("welcome-screen"),
            mainContent: document.querySelector("#main-content"),
        };

        // Event Listeners
        this.elements.languageSelect.addEventListener('change', () => this.populateLevels());
        this.elements.levelSelect.addEventListener('change', () => this.toggleStartButton());
        this.elements.startBtn.addEventListener('click', () => this.startPractice());
        this.elements.submitBtn.addEventListener('click', () => this.checkAnswer());
        this.elements.answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });

        this.initialize();
    }

    initialize() {
        this.populateLanguages();
        this.toggleStartButton();
    }

    populateLanguages() {
        const langSelect = this.elements.languageSelect;
        langSelect.innerHTML = '<option value="">Select Language</option>';
        
        for (const language in this.languages) {
            const option = document.createElement("option");
            option.value = language;
            option.textContent = language;
            langSelect.appendChild(option);
        }
        
        this.elements.levelSelect.innerHTML = '<option value="">Select Level</option>';
        this.elements.levelSelect.disabled = true;
    }

    populateLevels() {
        const selectedLanguage = this.elements.languageSelect.value;
        this.selectedLanguageConfig = this.languages[selectedLanguage];
        const levelSelect = this.elements.levelSelect;
        
        levelSelect.innerHTML = '<option value="">Select Level</option>';
        levelSelect.disabled = true;

        if (this.selectedLanguageConfig?.levels) {
            this.selectedLanguageConfig.levels.forEach(level => {
                const option = document.createElement("option");
                option.value = level.dataFile;
                option.textContent = level.name;
                levelSelect.appendChild(option);
            });
            levelSelect.disabled = false;
        }
    }

    toggleStartButton() {
        this.elements.startBtn.disabled = 
            !this.elements.languageSelect.value || 
            !this.elements.levelSelect.value;
    }

    async startPractice() {
        this.elements.welcomeScreen.style.display = 'none';
        this.elements.mainContent.style.display = 'block';
        await this.loadLevel();
    }

    async loadLevel() {
        const selectedFile = this.elements.levelSelect.value;
        if (!selectedFile) {
            alert("Please select a valid level to load.");
            return;
        }

        try {
            const response = await fetch(selectedFile);
            if (!response.ok) throw new Error(`Failed to load level: ${response.status}`);
            
            const data = await response.json();
            this.words = data.words || [];
            this.currentWordIndex = 0;
            this.elements.answerInput.value = ""; // Clear previous input

            if (this.words.length === 0) {
                alert("No words found in this level.");
                this.elements.wordDisplay.textContent = "No words available.";
                return;
            }

            this.showWord();
            this.elements.resultDisplay.textContent = "";
            this.elements.submitBtn.disabled = false;
        } catch (error) {
            console.error("Error loading level:", error);
            alert("Error loading level. Please try again.");
        }
    }

    loadCache() {
        const cache = document.cookie
            .split("; ")
            .find(row => row.startsWith(this.cacheKey + "="))
            ?.split("=")[1];

        this.seenWordsCache = cache ? JSON.parse(decodeURIComponent(cache)) : [];
    }

    // Save seen words back to cookies
    saveCache() {
        const cacheString = encodeURIComponent(JSON.stringify(this.seenWordsCache));
        document.cookie = `${this.cacheKey}=${cacheString}; path=/; max-age=31536000`; // 1 year expiry
    }

    // Add a word to the seen words cache
    updateCache(word) {
        this.seenWordsCache.push(word);

        // Maintain only the last 100 entries
        if (this.seenWordsCache.length > this.cacheLimit) {
            this.seenWordsCache.shift();
        }

        // Save updated cache
        this.saveCache();
    }

    showWord() {
        if (this.words.length > 0) {
            // Exclude words in the seenWordsCache
            const remainingWords = this.words.filter(
                word => !this.seenWordsCache.includes(word)
            );

            if (remainingWords.length === 0) {
                this.elements.wordDisplay.textContent = "All words have been seen or answered correctly.";
                this.elements.submitBtn.disabled = true;
                return;
            }

            // Select a word pseudo-randomly
            const randomIndex = Math.floor(Math.random() * remainingWords.length);
            const selectedWord = remainingWords[randomIndex];

            // Display the selected word
            const sourceProp = this.selectedLanguageConfig?.sourceProperty;
            this.elements.wordDisplay.textContent = sourceProp ? selectedWord[sourceProp] : "Invalid config";

            // Move the selected word to the current position (optional for order tracking)
            const selectedWordIndex = this.words.indexOf(selectedWord);
            [this.words[this.currentWordIndex], this.words[selectedWordIndex]] = [
                this.words[selectedWordIndex],
                this.words[this.currentWordIndex],
            ];
        } else {
            this.elements.wordDisplay.textContent = "No words available.";
        }
    }

    checkAnswer() {
        const userAnswer = this.elements.answerInput.value.trim().toLowerCase();
        if (!userAnswer) {
            this.elements.resultDisplay.textContent = "Please enter an answer.";
            this.elements.resultDisplay.style.color = "red";
            return;
        }

        const currentWord = this.words[this.currentWordIndex];
        if (!currentWord) return;

        const targetProp = this.selectedLanguageConfig?.targetProperty || "english";
        const correctAnswers = currentWord[targetProp].map(ans => ans.toLowerCase());

        const isCorrect = correctAnswers.includes(userAnswer);

        if (isCorrect) {
            this.elements.resultDisplay.textContent = "Correct!";
            this.elements.resultDisplay.style.color = "green";
            this.toggleAsciiArt(true);

            // Add the word to the cache to prevent repetition
            this.updateCache(currentWord);
        } else {
            this.elements.resultDisplay.textContent = `Incorrect! Correct answers: ${correctAnswers.join(", ")}`;
            this.elements.resultDisplay.style.color = "red";
            this.toggleAsciiArt(false);
        }

        setTimeout(() => this.nextWord(), 1000);
    }

    
    // Function to toggle ASCII art based on answer correctness
    toggleAsciiArt(isCorrect) {
        const correctArt = document.getElementById("ascii-art-correct");
        const incorrectArt = document.getElementById("ascii-art-incorrect");
    
        if (isCorrect) {
            correctArt.style.display = "block";
            incorrectArt.style.display = "none";
        } else {
            correctArt.style.display = "none";
            incorrectArt.style.display = "block";
        }
    }
    

    nextWord() {
        this.currentWordIndex++;
        
        if (this.currentWordIndex < this.words.length) {
            this.showWord();
            this.elements.answerInput.value = "";
            this.elements.resultDisplay.textContent = "";
            this.elements.submitBtn.disabled = false; // Re-enable for next word
        } else {
            this.elements.wordDisplay.textContent = "Practice complete!";
            this.elements.submitBtn.disabled = true;
        }
    }

}

document.addEventListener("DOMContentLoaded", () => {
    new PracticeApp();
});