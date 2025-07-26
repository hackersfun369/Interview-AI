const pdfInput = document.getElementById("pdf-upload");
const pdfContent = document.getElementById("pdf-content");
const generateButton = document.getElementById("generate-questions");
const questionsList = document.getElementById("questions-list");
const liveText = document.getElementById("live-text");
const feedbackDisplay = document.getElementById("feedback-display");
const startInterview = document.querySelector(".startInterview");
const chatBars = document.querySelector(".chatBars");
const reportSection = document.querySelector("#report-section");
const stopinterview = document.querySelector("#stopinterview");
const chatbox = document.querySelector(".chatbox");
const chatContainer = document.querySelector(".chatContainer");
const videos = document.querySelector(".videos");
const actions = document.querySelector(".actions");

let resumeContent = "";
let recognition; // Declared globally for access in stop function

// Extract text from PDF
const extractTextFromPage = async (page) => {
    const textContent = await page.getTextContent();
    return textContent.items.map((item) => item.str).join(" ");
};

const displayPDFText = async (pdfDoc) => {
    let fullText = "";
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const pageText = await extractTextFromPage(page);
        fullText += `Page ${pageNum}:\n\n${pageText}\n\n`;
    }
    pdfContent.textContent = fullText;
    resumeContent = fullText;
    //console.log("Extracted Resume Content:", resumeContent);
};

// Handle PDF Upload
pdfInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            const typedArray = new Uint8Array(this.result);
            pdfjsLib
                .getDocument(typedArray)
                .promise.then((pdfDoc) => {
                    displayPDFText(pdfDoc);
                })
                .catch((err) => {
                    pdfContent.textContent = "Error loading PDF: " + err.message;
                    console.error("Error loading PDF:", err);
                });
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        pdfContent.textContent = "Please upload a valid PDF file.";
    }
});

// Toggle chatbox visibility
chatBars.addEventListener("click", function () {
    chatContainer.classList.toggle("active");
});

// Generate interview questions
const generateQuestions = () => {
    generateButton.addEventListener("click", async () => {
        userResponses = [];
        ratings = [];
        queue = [];
        improvementSuggestions = [];
        reportSection.innerHTML = "";
        if (!resumeContent) {
            alert("Please upload a PDF and extract its content first!");
            return;
        }
        try {
            const response = await fetch("http://localhost:3000/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resumeContent }),
            });
            if (!response.ok) throw new Error("Failed to fetch questions.");
            const data = await response.json();
            if (!data || !Array.isArray(data.questions)) throw new Error("Invalid response format.");

            console.log("Parsed Data:", data);
            questionsList.innerHTML = "";
            data.questions.forEach((question, index) => {
                const test1 = question.split("\"")[1];
                queue.push(test1);
                const li = document.createElement("li");
                li.textContent = `${index + 1}. ${question}`;
                questionsList.appendChild(li);
            });

            feedbacking(queue);
        } catch (err) {
            console.error("Error:", err);
            alert("An error occurred while generating questions.");
        }
    });
};

// Ask a question using text-to-speech
const askQuestion = (content) => {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(content);
        appendAi(content);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            utterance.voice = voices.find((voice) => voice.lang === "en-US") || voices[0];
        }
        utterance.onend = resolve; 
        speechSynthesis.speak(utterance);
    });
};

// Append AI messages to chatbox
const appendAi = (content) => {
    const aiMessage = document.createElement("div");
    aiMessage.classList.add("aiMessage");
    aiMessage.textContent = content;
    chatbox.appendChild(aiMessage);
    chatbox.scrollTop = chatbox.scrollHeight;
};

// Append User messages to chatbox
const appendUser = (content) => {
    const userMessage = document.createElement("div");
    userMessage.classList.add("userMessage");
    userMessage.textContent = content;
    chatbox.appendChild(userMessage);
    chatbox.scrollTop = chatbox.scrollHeight;
};

// Handle user's spoken response
const replyQuestion = (question) => {
    return new Promise((resolve) => {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new window.SpeechRecognition();
        recognition.interimResults = true;
        recognition.continuous = true;

        let fullText = "";
        let isLogged = false;

        recognition.addEventListener("result", (e) => {
            const text = Array.from(e.results).map((result) => result[0].transcript).join("");
            liveText.innerText = text;

            if (e.results[0].isFinal) {
                fullText = text.trim();
                if (fullText.toLowerCase().includes("record complete") && !isLogged) {
                    isLogged = true;
                    let cleanedText = fullText.replace(/record complete/gi, "").trim();
                    appendUser(cleanedText);
                    recognition.stop();
                    resolve(cleanedText);
                }
            }
        });

        recognition.addEventListener("end", () => {
            if (!fullText.toLowerCase().includes("record complete") && !isLogged) {
                resolve(null);
            }
        });

        recognition.start();
    });
};

let queue = [];
let userResponses = [];
let ratings = [];
let improvementSuggestions = [];

const getFeedback = async (question, userResponse) => {
    try {
        const response = await fetch("http://localhost:3000/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, userResponse }),
        });
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const textData = await response.text();
        const responseArray = textData.trim().split(":");
        const rating = responseArray[4].split(",")[0]
        const test = responseArray[5].split('\"')[1];
        const cleanedImprovedText = test.replace(/\\/gi, "").trim();
        console.log(cleanedImprovedText);
        userResponses.push(userResponse);
        ratings.push(rating);
        improvementSuggestions.push(cleanedImprovedText);
    } catch (err) {
        console.error("Error fetching feedback:", err);
        feedbackDisplay.textContent = "Error fetching feedback.";
    }
};


// Process interview questions
async function feedbacking(questions) {
    for (const question of questions) {
        await askQuestion(question);
        const userResponse = await replyQuestion(question);
        if (userResponse) {
            await getFeedback(question, userResponse);
        } else {
            break;
        }
    }
    displayReport();
}

// Display interview report
const displayReport = () => {
    reportSection.innerHTML = `<button class="reload" onclick="reload()">Restart</button>`;
    userResponses.forEach((response, i) => {
        reportSection.innerHTML += `
            <div class="reportItem">
                <div class="itemHead">
                <h3 class="quesNum">Question #${i+1}</h3>
                <h3 class="rate">Rating : ${ratings[i]}</h3>
                </div>
                <div class="queue">${queue[i]}</div>
                <div class="answer"><strong>Your Response:</strong><br> ${response}</div>
                <div class="improvedText"><strong>Suggestions:</strong><br> ${improvementSuggestions[i]}</div>
            </div>`;
    });
};

// Stop interview
stopinterview.addEventListener("click", () => {
    videos.style.display = "none";
    actions.style.display = "none";
    chatBars.style.display = 'none';
    speechSynthesis.cancel();
    if (recognition) recognition.stop();
    stopWebCam();
    displayReport();
    chatContainer.style.display = "none";
});

// Stop webcam
function stopWebCam() {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        stream.getTracks().forEach(track => track.stop());
    }).catch(err => console.error("Error stopping webcam:", err));

}
function reload(){
    window.location.reload();
}


generateQuestions();
