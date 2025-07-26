// Check for browser compatibility
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    alert("Your browser does not support Speech Recognition.");
} else {
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep recognizing until stopped
    recognition.interimResults = true; // Show interim results

    const outputDiv = document.getElementById('output');

    // Event handler for when speech recognition starts
    recognition.onstart = function() {
        outputDiv.innerHTML = "Listening... Speak now!";
    };

    // Event handler for when speech recognition results are available
    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        outputDiv.innerHTML = transcript; // Display the recognized speech
    };

    // Event handler for when speech ends
    recognition.onspeechend = function() {
        outputDiv.innerHTML += "<br>Speech has ended.";
        recognition.stop(); // Stop recognizing
    };

    // Start speech recognition on button click
    document.getElementById('start-btn').onclick = function() {
        recognition.start();
        outputDiv.innerHTML = ""; // Clear previous results
    };
}
