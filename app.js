import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';


const app = express();
const PORT = 3000;
const API_KEY = "n5aUGJtw4Q1TqUVJJzOdIsRt7gKaRGZa";

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request body



app.get("/", (req, res) => {
    res.sendFile(path.join("D:/webdev/interviewAi/", "public", "index.html"));
});

// Route to generate interview questions
app.post('/generate-questions', async (req, res) => {
    const { resumeContent } = req.body;

    if (!resumeContent || resumeContent.trim() === "") {
        return res.status(400).json({ error: "Resume content is required." }); // Validate input
    }

    const rules = `
    The following structure should guide the questioning process for the interviewer:
    Begin the conversation by inviting the candidate to share about themselves and their professional journey.
    Create a dialogue where the candidate elaborates on their technical skill set, explaining how they applied their knowledge of programming languages and tools in real-world scenarios.
    Ask the questions related to projects mentioned in the resume.
    Present scenarios that require the candidate to describe their problem-solving approach.
    If any details on internships are mentioned in the resume, guide the candidate to provide an in-depth view of their roles and responsibilities during internships.
    Ask how their internship experiences influenced their technical and interpersonal growth if mentioned in the resume.
    Pose hypothetical scenarios where the candidate must apply their technical and creative thinking.
    Explore their knowledge of advanced topics.
    Prompt the candidate to discuss their career aspirations and how they envision their role contributing to the company.
    Provide an opportunity for the candidate to ask questions and foster a two-way dialogue.
    All generated questions should have proper numbering. The overall structure should balance the sections appropriately.
    Display only the questions in json format with each question as an element of the array. Avoid generic or repetitive questions and maintain a conversational tone.
    The conversation must last for 10-15 minutes.
    Ensure the questions are dynamic, encouraging detailed and thoughtful responses while maintaining a conversational tone.
    `;

    const payload = {
        model: "ministral-8b-2410",
        messages: [
            {
                role: "user",
                content: `Resume Content:\n${resumeContent}\n\nRules:\n${rules}\n\nBased on the above, create a questionary structure that aligns with the job role and interview guidelines.
                The questions should not repeat.
                `,
            },
        ],
    };

    try {
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`); // Improved error message
        }

        const data = await response.json();
        const questionsText = data.choices[0].message.content;
        const questionsArray = questionsText
            .split('\n')
            .filter(question => question.trim() !== "" && question.includes("?"));

        res.json({ questions: questionsArray });
    } catch (err) {
        console.error("Error while generating questions:", err.message);
        res.status(500).json({ error: "Failed to generate questions. Please try again later." });
    }
});

// Route to generate feedback
app.post('/feedback', async (req, res) => {
    const { question, userResponse } = req.body;

    if (!question || !userResponse) {
        return res.status(400).json({ error: "Both question and user response are required." }); // Validate input
    }

    const payload1 = {
        model: "ministral-8b-2410",
        messages: [
            {
                role: "user",
                content: `
                    Question: "${question}"
                    User Response: "${userResponse}"
                    Task: Provide feedback on the user's response to the given question in the following structured format:
                    {
    question: The question asked.,
    short_feedback: A brief, positive evaluation in 5 words.,
    rating: Rate the response out of 5 (numeric).,
    improvement_suggestions: Rewrite the user's response in a professional tone and structure, as if the user were answering during an actual interview. The response should be clear, concise, and specific to the question.
}
                    Ensure that all feedback is actionable, specific, professional, and directly relevant to the question and response should be in text.
                `,
            },
        ],
    };

    try {
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(payload1),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`); // Improved error handling
        }

        const data = await response.json();
        const feedback = data.choices[0].message.content;

        res.json({ feedback });
    } catch (err) {
        console.error("Error while generating feedback:", err.message);
        res.status(500).json({ error: "Failed to generate feedback. Please try again later." });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
